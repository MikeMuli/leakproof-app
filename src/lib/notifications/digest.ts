import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { OPEN_DISPUTE_STATES, type DiscrepancyState } from "../reconcile/state-machine";
import { sendNotification } from "./send";

/**
 * Computes "this week" (last 7 days by order date) settled/flagged totals across every
 * shop the seller owns and sends the digest. Callable on demand right now (see
 * /api/notifications/digest) — there is no recurring scheduler wired up yet. A weekly
 * cadence needs either Vercel Cron or a Supabase scheduled Edge Function, both of which
 * only make sense once this is deployed somewhere with a stable URL; running a real
 * cron against a local dev server isn't meaningful.
 */
export async function sendWeeklyDigest(supabase: SupabaseClient, sellerId: string): Promise<{ ok: boolean; errors: string[] }> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

  const { data: shops } = await supabase.from("shops").select("id").eq("seller_id", sellerId);
  const shopIds = (shops ?? []).map((s) => s.id);
  if (shopIds.length === 0) return { ok: false, errors: ["no shops"] };

  const { data: orders } = await supabase
    .from("orders")
    .select(`buyer_total_cents, discrepancies ( bucket, gap_cents, state, detected_at )`)
    .in("shop_id", shopIds)
    .gte("created_at_platform", since);

  let settledCents = 0;
  let flaggedCents = 0;
  for (const o of orders ?? []) {
    const discList = Array.isArray(o.discrepancies) ? o.discrepancies : [o.discrepancies];
    const disc = discList.filter(Boolean).sort((a, b) => (a && b ? Date.parse(b.detected_at) - Date.parse(a.detected_at) : 0))[0];
    const bucket = disc?.bucket ?? "UNKNOWN";
    if (bucket === "TIMING") continue;
    settledCents += o.buyer_total_cents;
    const state = (disc?.state ?? "detected") as DiscrepancyState;
    if (bucket === "DISPUTABLE" && OPEN_DISPUTE_STATES.includes(state)) flaggedCents += disc?.gap_cents ?? 0;
  }

  const result = await sendNotification(supabase, {
    type: "weekly_digest", sellerId, settledCents, flaggedCents, periodLabel: `${since} to today`,
  });
  return result;
}
