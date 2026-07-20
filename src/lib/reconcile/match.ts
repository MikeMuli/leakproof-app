import type { Cents } from "../money";
import type { ParsedSettlementRow } from "../parsers/registry";
import type { OrderForClassification } from "./classify";
import type { ExpectedSettlement } from "../fee-engine";

const SETTLEMENT_WINDOW_DAYS = 7; // flat assumption for the demo path; PRD calls for per-platform rules

/**
 * Reduces one order's settlement lines to the actuals the classifier needs (PRD D1/D2:
 * link lines to the order, then compute expected-vs-actual). Sign convention: fee/cost
 * lines are negative, credit lines positive — net is a plain sum once lines are signed
 * correctly, which the parser is responsible for getting right at ingestion time.
 */
export function buildClassificationInput(
  orderId: string,
  status: "delivered" | "cancelled",
  orderDateIso: string,
  lines: ParsedSettlementRow[],
  expected: ExpectedSettlement,
  asOfIso: string = new Date().toISOString(),
): OrderForClassification {
  let netCents = 0 as Cents;
  let actualCommissionCents = 0 as Cents;
  let actualTransactionFeeCents = 0 as Cents;
  let actualShippingCents = 0 as Cents;
  let refundLineCount = 0;

  for (const line of lines) {
    switch (line.type) {
      case "item_price":
      case "shipping_subsidy":
      case "refund_reversal":
      case "voucher_platform_funded":
        netCents = (netCents + line.amountCents) as Cents;
        break;
      case "shipping_fee_charged":
        actualShippingCents = (actualShippingCents + Math.abs(line.amountCents)) as Cents;
        netCents = (netCents - Math.abs(line.amountCents)) as Cents;
        break;
      case "commission_fee":
        // actualCommissionCents/actualTransactionFeeCents are magnitudes (always >= 0),
        // matching the fee-engine's convention — classify.ts sums them as "amount charged",
        // not as signed deltas. netCents is the only signed running total here.
        actualCommissionCents = (actualCommissionCents + Math.abs(line.amountCents)) as Cents;
        netCents = (netCents + line.amountCents) as Cents;
        break;
      case "transaction_fee":
        actualTransactionFeeCents = (actualTransactionFeeCents + Math.abs(line.amountCents)) as Cents;
        netCents = (netCents + line.amountCents) as Cents;
        break;
      case "refund":
        refundLineCount += 1;
        netCents = (netCents + line.amountCents) as Cents;
        break;
      default:
        netCents = (netCents + line.amountCents) as Cents;
    }
  }

  const daysSinceOrder = Math.max(
    0,
    Math.floor((Date.parse(asOfIso) - Date.parse(orderDateIso || asOfIso)) / 86_400_000),
  );

  return {
    orderId,
    status,
    daysSinceOrder,
    settlementWindowDays: SETTLEMENT_WINDOW_DAYS,
    expected,
    actualNetCents: netCents,
    actualCommissionCents,
    actualTransactionFeeCents,
    actualShippingCents,
    refundLineCount,
    hasAnySettlementLine: lines.length > 0,
  };
}
