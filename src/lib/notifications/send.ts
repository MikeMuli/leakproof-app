import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationEvent, NotificationChannel } from "./types";
import { renderEvent } from "./render";
import { emailChannel } from "./email";

/**
 * The channel list PRD E3 asks for ("build the notification service channel-agnostic").
 * Today this is just email; adding a WhatsApp channel later means implementing
 * NotificationChannel and pushing it onto this array — nothing else here changes.
 */
const CHANNELS: NotificationChannel[] = [emailChannel];

export async function sendNotification(
  supabase: SupabaseClient,
  event: NotificationEvent,
): Promise<{ ok: boolean; errors: string[] }> {
  const { data: seller } = await supabase.from("sellers").select("email").eq("id", event.sellerId).maybeSingle();
  if (!seller?.email) return { ok: false, errors: ["seller has no email on file"] };

  const { subject, body } = renderEvent(event);
  const errors: string[] = [];

  for (const channel of CHANNELS) {
    const result = await channel.send(seller.email, subject, body);
    if (!result.ok) errors.push(`${channel.name}: ${result.error}`);
  }

  return { ok: errors.length === 0, errors };
}
