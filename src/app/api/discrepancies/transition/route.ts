import { getAuthedUser } from "@/lib/supabase/getUser";
import { canTransition, type DiscrepancyState } from "@/lib/reconcile/state-machine";

export async function POST(request: Request) {
  const { user, supabase } = await getAuthedUser(request);
  if (!user) return Response.json({ error: "not signed in" }, { status: 401 });

  const { discrepancyId, toState } = await request.json();
  if (!discrepancyId || !toState) return Response.json({ error: "discrepancyId and toState required" }, { status: 400 });

  // RLS scopes this to the caller's own orders — a foreign discrepancyId simply won't be found.
  const { data: current, error: findErr } = await supabase
    .from("discrepancies").select("order_id, bucket, detector_type, gap_cents, state")
    .eq("id", discrepancyId).single();
  if (findErr || !current) return Response.json({ error: "discrepancy not found" }, { status: 404 });

  if (!canTransition(current.state as DiscrepancyState, toState as DiscrepancyState)) {
    return Response.json({ error: `cannot move from ${current.state} to ${toState}` }, { status: 409 });
  }

  // Append a new row rather than mutating the old one (PRD: discrepancies are append-only —
  // sellers use these numbers in disputes, we must be able to show what we knew and when).
  const { data: next, error: insertErr } = await supabase
    .from("discrepancies")
    .insert({
      order_id: current.order_id, bucket: current.bucket, detector_type: current.detector_type,
      gap_cents: current.gap_cents, state: toState,
    })
    .select("id, state").single();
  if (insertErr) return Response.json({ error: insertErr.message }, { status: 500 });

  return Response.json({ ok: true, discrepancy: next });
}
