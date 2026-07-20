import type { SupabaseClient } from "@supabase/supabase-js";
import { OPEN_DISPUTE_STATES, type DiscrepancyState } from "../reconcile/state-machine";

export interface ReportOrderRow {
  shopName: string;
  platformOrderId: string;
  date: string;
  priceCents: number;
  commissionCents: number;
  transactionFeeCents: number;
  shippingCents: number;
  voucherCents: number;
  bucket: string;
  detectorType: string | null;
  gapCents: number;
}

export interface ShopSummary {
  shopName: string;
  settledCents: number;
  feesCents: number;
  flaggedCents: number;
  recoveredCents: number;
}

export interface ReportData {
  month: string; // "YYYY-MM"
  shops: ShopSummary[];
  totals: ShopSummary;
  orders: ReportOrderRow[];
}

/**
 * Gathers everything both renderers need for a monthly statement (PRD E4). Called with an
 * RLS-scoped client, so it can only ever see the calling seller's own shops — there is no
 * separate authorization check here because Postgres is already enforcing it.
 */
export async function gatherReportData(
  supabase: SupabaseClient,
  sellerId: string,
  shopIdFilter: string | null,
  month: string,
): Promise<ReportData> {
  const monthStart = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const nextMonth = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);

  let shopQuery = supabase.from("shops").select("id, shop_name").eq("seller_id", sellerId);
  if (shopIdFilter) shopQuery = shopQuery.eq("id", shopIdFilter);
  const { data: shops } = await shopQuery;
  const shopIds = (shops ?? []).map((s) => s.id);
  const shopNameById = new Map((shops ?? []).map((s) => [s.id, s.shop_name]));

  if (shopIds.length === 0) {
    const empty: ShopSummary = { shopName: "—", settledCents: 0, feesCents: 0, flaggedCents: 0, recoveredCents: 0 };
    return { month, shops: [], totals: empty, orders: [] };
  }

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      shop_id, platform_order_id, created_at_platform, buyer_total_cents,
      expected_settlements ( commission_cents, transaction_fee_cents, shipping_cents, voucher_cents ),
      discrepancies ( bucket, detector_type, gap_cents, state, detected_at )
    `)
    .in("shop_id", shopIds)
    .gte("created_at_platform", monthStart)
    .lt("created_at_platform", nextMonth);

  const reportOrders: ReportOrderRow[] = [];
  const bySho = new Map<string, ShopSummary>();
  for (const id of shopIds) {
    bySho.set(id, { shopName: shopNameById.get(id) ?? "shop", settledCents: 0, feesCents: 0, flaggedCents: 0, recoveredCents: 0 });
  }

  for (const o of orders ?? []) {
    const exp = Array.isArray(o.expected_settlements) ? o.expected_settlements[0] : o.expected_settlements;
    const discList = Array.isArray(o.discrepancies) ? o.discrepancies : [o.discrepancies];
    const disc = discList.filter(Boolean).sort((a, b) => (a && b ? Date.parse(b.detected_at) - Date.parse(a.detected_at) : 0))[0];
    const bucket = disc?.bucket ?? "UNKNOWN";
    const summary = bySho.get(o.shop_id)!;

    if (bucket !== "TIMING") {
      summary.settledCents += o.buyer_total_cents;
      summary.feesCents += (exp?.commission_cents ?? 0) + (exp?.transaction_fee_cents ?? 0) + (exp?.shipping_cents ?? 0) + (exp?.voucher_cents ?? 0);
      const state = (disc?.state ?? "detected") as DiscrepancyState;
      if (bucket === "DISPUTABLE" && OPEN_DISPUTE_STATES.includes(state)) summary.flaggedCents += disc?.gap_cents ?? 0;
      if (state === "recovered") summary.recoveredCents += disc?.gap_cents ?? 0;
    }

    reportOrders.push({
      shopName: shopNameById.get(o.shop_id) ?? "shop",
      platformOrderId: o.platform_order_id,
      date: o.created_at_platform ?? "",
      priceCents: o.buyer_total_cents,
      commissionCents: exp?.commission_cents ?? 0,
      transactionFeeCents: exp?.transaction_fee_cents ?? 0,
      shippingCents: exp?.shipping_cents ?? 0,
      voucherCents: exp?.voucher_cents ?? 0,
      bucket,
      detectorType: disc?.detector_type ?? null,
      gapCents: disc?.gap_cents ?? 0,
    });
  }

  const shopSummaries = Array.from(bySho.values());
  const totals: ShopSummary = shopSummaries.reduce(
    (acc, s) => ({
      shopName: "All shops",
      settledCents: acc.settledCents + s.settledCents,
      feesCents: acc.feesCents + s.feesCents,
      flaggedCents: acc.flaggedCents + s.flaggedCents,
      recoveredCents: acc.recoveredCents + s.recoveredCents,
    }),
    { shopName: "All shops", settledCents: 0, feesCents: 0, flaggedCents: 0, recoveredCents: 0 },
  );

  return { month, shops: shopSummaries, totals, orders: reportOrders };
}
