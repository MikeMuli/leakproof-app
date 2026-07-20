import "server-only";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export function generateInviteCode(): string {
  return randomBytes(9).toString("base64url"); // URL-safe, no padding
}

/**
 * Validates and consumes an invite in one step (marks it used only after confirming it's
 * valid), so a race between two signup attempts on the same invite can't both succeed.
 * Must be called with the admin (service-role) client — invites has no RLS policies for
 * any other role, by design.
 */
export async function consumeInvite(
  admin: SupabaseClient,
  email: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: invite, error } = await admin
    .from("invites")
    .select("id, email, used_at, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (error || !invite) return { ok: false, error: "Invalid invite code." };
  if (invite.email.toLowerCase() !== email.toLowerCase()) return { ok: false, error: "This invite was issued for a different email address." };
  if (invite.used_at) return { ok: false, error: "This invite has already been used." };
  if (new Date(invite.expires_at) < new Date()) return { ok: false, error: "This invite has expired." };

  const { error: updateErr, data: updated } = await admin
    .from("invites")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invite.id)
    .is("used_at", null) // second guard against a concurrent double-consume
    .select("id");

  if (updateErr || !updated || updated.length === 0) {
    return { ok: false, error: "This invite was just used — try requesting a new one." };
  }
  return { ok: true };
}
