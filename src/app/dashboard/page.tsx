import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import DashboardView, { type OrderRow } from "./DashboardView";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: seller } = await supabase
    .from("sellers").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!seller) redirect("/onboarding");

  const { data: shops } = await supabase.from("shops").select("id, shop_name, platform").eq("seller_id", seller.id);
  const shopIds = (shops ?? []).map((s) => s.id);
  if (shopIds.length === 0) redirect("/onboarding");
  const platformByShopId = new Map((shops ?? []).map((s) => [s.id, s.platform]));

  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id, shop_id, platform_order_id, created_at_platform, status, buyer_total_cents,
      expected_settlements ( commission_cents, transaction_fee_cents, shipping_cents, voucher_cents, net_cents, fee_table_version ),
      discrepancies ( id, bucket, detector_type, gap_cents, state, detected_at ),
      settlement_lines ( type, amount_cents, raw_description )
    `)
    .in("shop_id", shopIds)
    .order("created_at_platform", { ascending: false });

  if (error) {
    return <main style={{ padding: 40, fontFamily: "system-ui" }}>Failed to load dashboard: {error.message}</main>;
  }

  if (!orders || orders.length === 0) redirect("/onboarding");

  const rows: OrderRow[] = orders.map((o) => {
    const exp = Array.isArray(o.expected_settlements) ? o.expected_settlements[0] : o.expected_settlements;
    const discList = Array.isArray(o.discrepancies) ? o.discrepancies : [o.discrepancies];
    const disc = discList.filter(Boolean).sort((a, b) => (a && b ? Date.parse(b.detected_at) - Date.parse(a.detected_at) : 0))[0];
    return {
      id: o.id,
      platform: platformByShopId.get(o.shop_id) ?? "shopee",
      platformOrderId: o.platform_order_id,
      date: o.created_at_platform ?? "",
      status: o.status,
      priceCents: o.buyer_total_cents,
      commissionCents: exp?.commission_cents ?? 0,
      transactionFeeCents: exp?.transaction_fee_cents ?? 0,
      shippingCents: exp?.shipping_cents ?? 0,
      voucherCents: exp?.voucher_cents ?? 0,
      netCents: exp?.net_cents ?? 0,
      feeTableVersion: exp?.fee_table_version ?? "",
      bucket: (disc?.bucket ?? "UNKNOWN") as OrderRow["bucket"],
      detectorType: disc?.detector_type ?? null,
      gapCents: disc?.gap_cents ?? 0,
      discrepancyId: disc?.id ?? null,
      state: (disc?.state ?? "detected") as OrderRow["state"],
      lines: (Array.isArray(o.settlement_lines) ? o.settlement_lines : []).map((l) => ({
        type: l.type, amountCents: l.amount_cents, rawDescription: l.raw_description ?? "",
      })),
    };
  });

  let quarantineCount = 0;
  const isAdmin = isAdminEmail(user.email);
  if (isAdmin) {
    const admin = createAdminClient();
    const { count } = await admin
      .from("raw_ingests").select("id", { count: "exact", head: true }).eq("status", "quarantined");
    quarantineCount = count ?? 0;
  }

  const shopLabel = shops && shops.length > 1
    ? `${shops.length} shops`
    : shops?.[0]?.shop_name ?? "Your shop";

  return <DashboardView rows={rows} shopName={shopLabel} quarantineCount={quarantineCount} isAdmin={isAdmin} />;
}
