import { describe, expect, it } from "vitest";
import { cents } from "../money";
import { computeExpectedSettlement } from "../fee-engine";
import { buildClassificationInput } from "./match";

describe("buildClassificationInput", () => {
  it("reduces parsed settlement lines to net matching the fee-engine formula for a clean order", () => {
    const expected = computeExpectedSettlement({
      platform: "shopee", country: "MY", category: "*", orderDate: "2026-06-01",
      priceCents: cents(89.0), shippingCents: cents(4.9), voucherCents: cents(0),
    });

    const input = buildClassificationInput(
      "SH1", "delivered", "2026-06-01",
      [
        { platformOrderId: "SH1", type: "item_price", amountCents: cents(89.0), settlementPeriodId: null, rawDescription: "" },
        { platformOrderId: "SH1", type: "shipping_fee_charged", amountCents: cents(4.9), settlementPeriodId: null, rawDescription: "" },
        { platformOrderId: "SH1", type: "commission_fee", amountCents: (-expected.commissionCents) as ReturnType<typeof cents>, settlementPeriodId: null, rawDescription: "" },
        { platformOrderId: "SH1", type: "transaction_fee", amountCents: (-expected.transactionFeeCents) as ReturnType<typeof cents>, settlementPeriodId: null, rawDescription: "" },
      ],
      expected,
      "2026-06-20",
    );

    expect(input.actualNetCents).toBe(expected.netCents);
    expect(input.actualShippingCents).toBe(cents(4.9));
    expect(input.daysSinceOrder).toBe(19);
  });

  it("reports actualCommissionCents/actualTransactionFeeCents as positive magnitudes, not the parser's signed values (regression: fed a negative gap into the cancelled-order detector)", () => {
    const expected = computeExpectedSettlement({
      platform: "shopee", country: "MY", category: "*", orderDate: "2026-06-01",
      priceCents: cents(120), shippingCents: cents(4.9), voucherCents: cents(0),
    });
    const input = buildClassificationInput(
      "SH3", "cancelled", "2026-06-01",
      [
        { platformOrderId: "SH3", type: "commission_fee", amountCents: cents(-10.2), settlementPeriodId: null, rawDescription: "" },
        { platformOrderId: "SH3", type: "transaction_fee", amountCents: cents(-2.4), settlementPeriodId: null, rawDescription: "" },
      ],
      expected,
      "2026-06-20",
    );
    expect(input.actualCommissionCents).toBeGreaterThan(0);
    expect(input.actualTransactionFeeCents).toBeGreaterThan(0);
  });

  it("counts refund lines so the double-refund detector has something to key off", () => {
    const expected = computeExpectedSettlement({
      platform: "shopee", country: "MY", category: "*", orderDate: "2026-06-01",
      priceCents: cents(50), shippingCents: cents(4.9), voucherCents: cents(0),
    });
    const input = buildClassificationInput(
      "SH2", "delivered", "2026-06-01",
      [
        { platformOrderId: "SH2", type: "refund", amountCents: cents(-50), settlementPeriodId: null, rawDescription: "" },
        { platformOrderId: "SH2", type: "refund", amountCents: cents(-50), settlementPeriodId: null, rawDescription: "" },
      ],
      expected,
      "2026-06-20",
    );
    expect(input.refundLineCount).toBe(2);
  });
});
