import type { NotificationEvent } from "./types";

const rm = (c: number) => "RM" + (c / 100).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Renders event data into plain subject/body text — deliberately channel-agnostic.
 * Email wraps this in HTML; a WhatsApp channel later would map it onto an approved
 * template's variable slots instead. Neither channel needs its own copy of this logic.
 */
export function renderEvent(event: NotificationEvent): { subject: string; body: string } {
  switch (event.type) {
    case "new_disputable_item":
      return {
        subject: `LeakProof: ${rm(event.gapCents)} flagged on ${event.shopName}`,
        body: `Order ${event.orderId} on ${event.shopName} was flagged as disputable: ${event.detectorType.replace(/_/g, " ")}, worth ${rm(event.gapCents)}.\n\nOpen your dashboard to review and generate a claim pack.`,
      };
    case "weekly_digest":
      return {
        subject: `LeakProof weekly digest: ${event.periodLabel}`,
        body: `This week: ${rm(event.settledCents)} settled, ${rm(event.flaggedCents)} flagged as disputable.\n\nOpen your dashboard for the full breakdown.`,
      };
    case "payout_mismatch":
      return {
        subject: `LeakProof: payout mismatch on ${event.shopName}`,
        body: `${event.shopName}'s payout declared ${rm(event.declaredCents)} but ${rm(event.actualCents)} was recorded. Difference: ${rm(event.declaredCents - event.actualCents)}.`,
      };
    case "funds_on_hold":
      return {
        subject: `LeakProof: ${rm(event.amountCents)} newly on hold`,
        body: `${event.shopName} has ${rm(event.amountCents)} that just moved into a hold state.`,
      };
  }
}
