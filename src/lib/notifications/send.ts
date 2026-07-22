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

/** Which /profile toggle gates which event type. Events not listed here always send. */
const PREF_COLUMN: Partial<Record<NotificationEvent["type"], "notify_disputable" | "notify_digest">> = {
  new_disputable_item: "notify_disputable",
  weekly_digest: "notify_digest",
};

export async function sendNotification(
  supabase: SupabaseClient,
  event: NotificationEvent,
): Promise<{ ok: boolean; errors: string[] }> {
  const { data: seller } = await supabase
    .from("sellers").select("email, notify_disputable, notify_digest").eq("id", event.sellerId).maybeSingle();
  if (!seller?.email) return { ok: false, errors: ["seller has no email on file"] };

  const prefCol = PREF_COLUMN[event.type];
  if (prefCol && seller[prefCol] === false) return { ok: true, errors: [] }; // opted out — not an error

  const { subject, body } = renderEvent(event);
  const errors: string[] = [];

  for (const channel of CHANNELS) {
    const result = await channel.send(seller.email, subject, body);
    if (!result.ok) errors.push(`${channel.name}: ${result.error}`);
  }

  return { ok: errors.length === 0, errors };
}
