import "server-only";
import type { NotificationChannel } from "./types";

/**
 * Resend-backed email channel. In Resend's sandbox mode (no verified custom domain),
 * mail can only be delivered to the email address on the Resend account itself — that's
 * a Resend platform restriction, not a bug here. Verifying a domain in the Resend
 * dashboard lifts it for real seller addresses.
 */
export const emailChannel: NotificationChannel = {
  name: "email",
  async send(to: string, subject: string, body: string) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { ok: false, error: "RESEND_API_KEY not set" };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "LeakProof <onboarding@resend.dev>",
        to: [to],
        subject,
        text: body,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      return { ok: false, error: `Resend ${res.status}: ${errText}` };
    }
    return { ok: true };
  },
};
