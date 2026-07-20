/**
 * PRD E3 event catalogue. Two of these (payout_mismatch, funds_on_hold) are defined here
 * for completeness but have no trigger wired yet — the data model doesn't track Payouts
 * or hold-state transitions as discrete events yet, only computed-on-read TIMING buckets.
 * Building the type now means the channel/rendering layer doesn't need to change later.
 */
export type NotificationEvent =
  | {
      type: "new_disputable_item";
      sellerId: string;
      shopName: string;
      orderId: string;
      detectorType: string;
      gapCents: number;
    }
  | {
      type: "weekly_digest";
      sellerId: string;
      settledCents: number;
      flaggedCents: number;
      periodLabel: string;
    }
  | {
      // Not yet triggered anywhere — no Payout ingestion path exists.
      type: "payout_mismatch";
      sellerId: string;
      shopName: string;
      declaredCents: number;
      actualCents: number;
    }
  | {
      // Not yet triggered anywhere — hold-state transitions aren't tracked as events.
      type: "funds_on_hold";
      sellerId: string;
      shopName: string;
      amountCents: number;
    };

export interface NotificationChannel {
  name: string;
  send(to: string, subject: string, body: string): Promise<{ ok: boolean; error?: string }>;
}
