import { getAuthedUser } from "@/lib/supabase/getUser";
import { resolveParser, registerParser, listParsers, type ParsedSettlementRow } from "@/lib/parsers/registry";
import { shopeeMyIncomeV1 } from "@/lib/parsers/shopee.my.income.v1";
import { tiktokMySettlementV1 } from "@/lib/parsers/tiktok.my.settlement.v1";
import { shopeeMyOrdersV1 } from "@/lib/parsers/shopee.my.orders.v1";
import { tiktokMyOrdersV1 } from "@/lib/parsers/tiktok.my.orders.v1";
import { lazadaMyTransactionsV1 } from "@/lib/parsers/lazada.my.transactions.v1";
import { lazadaMyOrdersV1 } from "@/lib/parsers/lazada.my.orders.v1";
import { sniffHeaderRow } from "@/lib/parsers/sniff";
import { computeExpectedSettlement } from "@/lib/fee-engine";
import { classify } from "@/lib/reconcile/classify";
import { buildClassificationInput } from "@/lib/reconcile/match";
import type { Cents } from "@/lib/money";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendNotification } from "@/lib/notifications/send";

const DISPUTABLE_ALERT_THRESHOLD_CENTS = 1000; // RM10 — PRD E3: "new disputable item over a threshold"

// Idempotent-enough for a single dev process; a real registry init lives once at boot.
if (listParsers().length === 0) {
  registerParser(shopeeMyIncomeV1);
  registerParser(tiktokMySettlementV1);
  registerParser(shopeeMyOrdersV1);
  registerParser(tiktokMyOrdersV1);
  registerParser(lazadaMyTransactionsV1);
  registerParser(lazadaMyOrdersV1);
}

const DEFAULT_SHIPPING_CENTS = 490 as Cents; // flat assumption until a settlement line supplies the real figure

/**
 * Shared per-order pipeline: upsert the order, compute its expected settlement, record
 * whatever settlement lines exist (none, for an order-export-only ingest), classify, and
 * store the discrepancy. Used by both the settlement-report path (one line per order,
 * fees known) and the order-export path (multiple lines per order, no fees yet — a later
 * settlement upload re-classifies the same order once real settlement lines land, and the
 * dashboard already picks the most recent discrepancy per order).
 */
async function processOrder(params: {
  supabase: SupabaseClient;
  shopId: string;
  ingestId: string;
  platform: "shopee" | "tiktok" | "lazada";
  country: string;
  platformOrderId: string;
  status: "delivered" | "cancelled";
  createdAtPlatform: string;
  priceCents: Cents;
  shippingCents: Cents;
  settlementLines: ParsedSettlementRow[];
}): Promise<{ orderId: string; bucket: string; detectorType: string | null; gapCents: number } | { error: string }> {
  const { supabase, shopId, ingestId, platform, country, platformOrderId, status, createdAtPlatform, priceCents, shippingCents, settlementLines } = params;
  const nowIso = new Date().toISOString();

  const { data: orderRow, error: orderErr } = await supabase
    .from("orders")
    .upsert(
      {
        shop_id: shopId,
        platform_order_id: platformOrderId,
        created_at_platform: createdAtPlatform || null,
        status,
        buyer_total_cents: priceCents,
        currency: "MYR",
        source_ingest_id: ingestId,
      },
      { onConflict: "shop_id,platform_order_id" },
    )
    .select("id").single();
  if (orderErr) return { error: orderErr.message };

  const expected = computeExpectedSettlement({
    platform, country, category: "*",
    orderDate: createdAtPlatform || nowIso,
    priceCents, shippingCents, voucherCents: 0 as Cents,
  });

  await supabase.from("expected_settlements").insert({
    order_id: orderRow.id,
    fee_table_version: expected.feeTableVersion,
    commission_cents: expected.commissionCents,
    transaction_fee_cents: expected.transactionFeeCents,
    shipping_cents: expected.shippingCents,
    voucher_cents: expected.voucherCents,
    net_cents: expected.netCents,
  });

  if (settlementLines.length > 0) {
    await supabase.from("settlement_lines").insert(
      settlementLines.map((l) => ({
        shop_id: shopId, order_id: orderRow.id, type: l.type, amount_cents: l.amountCents,
        settlement_period_id: l.settlementPeriodId, raw_description: l.rawDescription, source_ingest_id: ingestId,
      })),
    );
  }

  const classification = classify(
    buildClassificationInput(platformOrderId, status, createdAtPlatform || nowIso, settlementLines, expected, nowIso),
  );

  await supabase.from("discrepancies").insert({
    order_id: orderRow.id,
    bucket: classification.bucket,
    detector_type: classification.detectorType,
    gap_cents: classification.gapCents,
  });

  return {
    orderId: orderRow.id as string,
    bucket: classification.bucket,
    detectorType: classification.detectorType,
    gapCents: classification.gapCents,
  };
}

export async function POST(request: Request) {
  const { user, supabase } = await getAuthedUser(request);
  if (!user) return Response.json({ error: "not signed in" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const shopId = form.get("shopId") as string | null;
  if (!file || !shopId) return Response.json({ error: "file and shopId are required" }, { status: 400 });

  const { data: seller } = await supabase
    .from("sellers").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!seller) return Response.json({ error: "seller not bootstrapped" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  let headerRow: string[];
  try {
    headerRow = await sniffHeaderRow(buffer, file.name);
  } catch (err) {
    return Response.json({ error: `could not read file: ${(err as Error).message}` }, { status: 400 });
  }

  const parser = resolveParser(headerRow);

  const { data: ingest, error: ingestErr } = await supabase
    .from("raw_ingests")
    .insert({
      seller_id: seller.id,
      shop_id: shopId,
      source_channel: "file_upload",
      file_path: file.name,
      parser_key: parser ? `${parser.platform}.${parser.country}.${parser.reportType}` : null,
      parser_version: parser?.formatVersion ?? null,
      status: parser ? "parsed" : "quarantined",
      quarantine_reason: parser ? null : "no parser matches this file's header row",
      // Column names only, never row data — this is what ops needs to ship a v2 parser
      // without ever touching the seller's actual financial figures (PRD A1).
      header_fingerprint: parser ? null : headerRow,
    })
    .select("id").single();
  if (ingestErr) return Response.json({ error: ingestErr.message }, { status: 500 });

  if (!parser) {
    // Never silently misparse (PRD §8.5) — quarantine and stop, don't guess.
    return Response.json({ quarantined: true, reason: "unrecognized file format", ingestId: ingest.id });
  }

  let ordersProcessed = 0;
  const notifyErrors: string[] = [];

  const { data: shopRow } = await supabase.from("shops").select("shop_name").eq("id", shopId).maybeSingle();
  const shopName = shopRow?.shop_name ?? "your shop";

  async function maybeNotify(bucket: string, detectorType: string | null, orderId: string, gapCents: number) {
    if (bucket !== "DISPUTABLE" || gapCents < DISPUTABLE_ALERT_THRESHOLD_CENTS) return;
    const result = await sendNotification(supabase, {
      type: "new_disputable_item", sellerId: seller!.id, shopName, orderId, detectorType: detectorType ?? "unknown", gapCents,
    });
    if (!result.ok) notifyErrors.push(...result.errors);
  }

  if (parser.kind === "order_export") {
    const parsed = await parser.parse(buffer) as import("@/lib/parsers/registry").OrderExportResult;

    for (const order of parsed.orders) {
      const priceCents = order.lines.reduce((s, l) => s + l.unitPriceCents * l.qty, 0) as Cents;
      const status = order.status.includes("cancel") ? "cancelled" as const : "delivered" as const;

      const result = await processOrder({
        supabase, shopId, ingestId: ingest.id, platform: parser.platform, country: parser.country,
        platformOrderId: order.platformOrderId, status, createdAtPlatform: order.createdAtPlatform,
        priceCents, shippingCents: DEFAULT_SHIPPING_CENTS, settlementLines: [],
      });
      if ("error" in result) return Response.json(result, { status: 500 });

      // Replace rather than accumulate order_lines on re-upload of the same order export.
      await supabase.from("order_lines").delete().eq("order_id", result.orderId);
      await supabase.from("order_lines").insert(
        order.lines.map((l) => ({ order_id: result.orderId, sku: l.sku, qty: l.qty, unit_price_cents: l.unitPriceCents })),
      );

      await maybeNotify(result.bucket, result.detectorType, order.platformOrderId, result.gapCents);
      ordersProcessed += 1;
    }
  } else {
    const parsed = await parser.parse(buffer) as import("@/lib/parsers/registry").ParseResult;

    for (const order of parsed.orders) {
      const lines = parsed.settlementLines.filter((l) => l.platformOrderId === order.platformOrderId);
      const shippingLine = lines.find((l) => l.type === "shipping_fee_charged");
      const status = order.status.includes("cancel") ? "cancelled" as const : "delivered" as const;

      const result = await processOrder({
        supabase, shopId, ingestId: ingest.id, platform: parser.platform, country: parser.country,
        platformOrderId: order.platformOrderId, status, createdAtPlatform: order.createdAtPlatform,
        priceCents: (order.unitPriceCents * order.qty) as Cents,
        shippingCents: (shippingLine?.amountCents ?? DEFAULT_SHIPPING_CENTS) as Cents,
        settlementLines: lines,
      });
      if ("error" in result) return Response.json(result, { status: 500 });

      await maybeNotify(result.bucket, result.detectorType, order.platformOrderId, result.gapCents);
      ordersProcessed += 1;
    }
  }

  return Response.json({ quarantined: false, ordersProcessed, ingestId: ingest.id, notifyErrors });
}
