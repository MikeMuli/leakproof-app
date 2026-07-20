import { addCents, subCents, type Cents } from "../money";
import type { ExpectedSettlement } from "../fee-engine";

export type Bucket = "TIMING" | "EXPECTED_FEE" | "DISPUTABLE" | "UNKNOWN";

export type DetectorType =
  | "commission_on_cancelled" | "shipping_overcharge" | "double_refund" | "missing_settlement";

export interface OrderForClassification {
  orderId: string;
  status: "delivered" | "cancelled";
  daysSinceOrder: number;
  settlementWindowDays: number; // platform-specific; order not yet past this = TIMING
  expected: ExpectedSettlement;
  actualNetCents: Cents;
  actualCommissionCents: Cents;
  actualTransactionFeeCents: Cents;
  actualShippingCents: Cents;
  refundLineCount: number; // count of refund-type settlement lines for this order
  hasAnySettlementLine: boolean;
}

export interface Discrepancy {
  orderId: string;
  bucket: Bucket;
  detectorType: DetectorType | null;
  gapCents: Cents;
}

/**
 * Every gap gets exactly one bucket (PRD D3). Detector order matters: TIMING is checked
 * first (nothing to explain yet), then each DISPUTABLE detector in turn — precision over
 * recall, so a detector only fires on its own narrow, named condition. Anything left over
 * with a nonzero gap is UNKNOWN, never DISPUTABLE — that distinction is load-bearing.
 */
export function classify(order: OrderForClassification): Discrepancy {
  if (order.daysSinceOrder < order.settlementWindowDays) {
    return { orderId: order.orderId, bucket: "TIMING", detectorType: null, gapCents: 0 as Cents };
  }

  const gap = subCents(order.expected.netCents, order.actualNetCents);

  if (order.status === "cancelled" && (order.actualCommissionCents !== 0 || order.actualTransactionFeeCents !== 0)) {
    const drift = addCents(order.actualCommissionCents, order.actualTransactionFeeCents);
    return { orderId: order.orderId, bucket: "DISPUTABLE", detectorType: "commission_on_cancelled", gapCents: drift };
  }

  if (order.actualShippingCents > order.expected.shippingCents) {
    const drift = subCents(order.actualShippingCents, order.expected.shippingCents);
    return { orderId: order.orderId, bucket: "DISPUTABLE", detectorType: "shipping_overcharge", gapCents: drift };
  }

  if (order.refundLineCount >= 2) {
    return { orderId: order.orderId, bucket: "DISPUTABLE", detectorType: "double_refund", gapCents: gap };
  }

  if (order.status === "delivered" && !order.hasAnySettlementLine) {
    return { orderId: order.orderId, bucket: "DISPUTABLE", detectorType: "missing_settlement", gapCents: order.expected.netCents };
  }

  if (gap === 0) {
    return { orderId: order.orderId, bucket: "EXPECTED_FEE", detectorType: null, gapCents: 0 as Cents };
  }

  // Never shown as disputable — feeds the internal triage queue (PRD D3.4).
  return { orderId: order.orderId, bucket: "UNKNOWN", detectorType: null, gapCents: gap };
}

/** The reconciliation invariant: sum of per-order gaps across all buckets equals the total gap. */
export function totalGap(discrepancies: Discrepancy[]): Cents {
  return addCents(...discrepancies.map((d) => d.gapCents));
}
