import { createAdminClient } from "@/lib/supabase/admin";
import { consumeInvite } from "@/lib/invites";

/**
 * Invite-gated signup: an account is only created if a valid, unused, unexpired invite
 * matches the email. Still creates a pre-confirmed user via the admin API rather than
 * Supabase's free-tier SMTP (which rate-limits confirmation emails hard) — that part of
 * the original shortcut stands; the invite gate is what changed.
 */
export async function POST(request: Request) {
  const { email, password, inviteCode } = await request.json();
  if (!email || !password) return Response.json({ error: "email and password required" }, { status: 400 });
  if (!inviteCode) return Response.json({ error: "An invite code is required to sign up." }, { status: 400 });

  const admin = createAdminClient();

  const consumed = await consumeInvite(admin, email, inviteCode);
  if (!consumed.ok) return Response.json({ error: consumed.error }, { status: 403 });

  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    // Don't burn the invite on a failed attempt (duplicate email, weak password, etc.) —
    // the seller should be able to retry with the same link.
    await admin.from("invites").update({ used_at: null }).eq("code", inviteCode);
    return Response.json({ error: error.message }, { status: 400 });
  }

  return Response.json({ ok: true });
}
