import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { cents } from "../money";
import { classify, totalGap, type OrderForClassification } from "./classify";
import { computeExpectedSettlement } from "../fee-engine";

function baseOrder(overrides: Partial<OrderForClassification>): OrderForClassification {
  const expected = computeExpectedSettlement({
    platform: "shopee", country: "MY", category: "*", orderDate: "2026-06-01",
    priceCents: cents(89.0), shippingCents: cents(4.9), voucherCents: cents(0),
  });
  return {
    orderId: "SH1", status: "delivered", daysSinceOrder: 20, settlementWindowDays: 7,
    expected, actualNetCents: expected.netCents,
    actualCommissionCents: expected.commissionCents, actualTransactionFeeCents: expected.transactionFeeCents,
    actualShippingCents: expected.shippingCents, refundLineCount: 0, hasAnySettlementLine: true,
    ...overrides,
  };
}

describe("classify", () => {
  it("buckets an order still inside its settlement window as TIMING with zero gap", () => {
    const d = classify(baseOrder({ daysSinceOrder: 2, settlementWindowDays: 7 }));
    expect(d.bucket).toBe("TIMING");
    expect(d.gapCents).toBe(0);
  });

  it("buckets a clean match as EXPECTED_FEE", () => {
    const d = classify(baseOrder({}));
    expect(d.bucket).toBe("EXPECTED_FEE");
    expect(d.detectorType).toBeNull();
  });

  it("detects commission charged on a cancelled order", () => {
    const d = classify(baseOrder({ status: "cancelled" }));
    expect(d.bucket).toBe("DISPUTABLE");
    expect(d.detectorType).toBe("commission_on_cancelled");
    expect(d.gapCents).toBeGreaterThan(0);
  });

  it("detects shipping charged above the expected rate", () => {
    const d = classify(baseOrder({ actualShippingCents: cents(4.9 + 3) as ReturnType<typeof cents> }));
    expect(d.bucket).toBe("DISPUTABLE");
    expect(d.detectorType).toBe("shipping_overcharge");
  });

  it("detects a refund deducted twice", () => {
    const d = classify(baseOrder({ refundLineCount: 2, actualNetCents: cents(0) }));
    expect(d.bucket).toBe("DISPUTABLE");
    expect(d.detectorType).toBe("double_refund");
  });

  it("detects a delivered order with no settlement line at all", () => {
    const d = classify(baseOrder({ hasAnySettlementLine: false, actualNetCents: cents(0) }));
    expect(d.bucket).toBe("DISPUTABLE");
    expect(d.detectorType).toBe("missing_settlement");
  });

  it("never labels an unexplained gap as DISPUTABLE — falls to UNKNOWN instead", () => {
    const d = classify(baseOrder({ actualNetCents: cents(70) })); // gap with no matching detector
    expect(d.bucket).toBe("UNKNOWN");
  });

  it("property: total gap always equals the sum of per-discrepancy gaps, for any batch", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            driftCents: fc.integer({ min: -5000, max: 5000 }),
            cancelled: fc.boolean(),
          }),
          { maxLength: 30 },
        ),
        (specs) => {
          const discrepancies = specs.map((s, i) => {
            const expectedNet = baseOrder({}).actualNetCents as number;
            return classify(
              baseOrder({
                orderId: `O${i}`,
                status: s.cancelled ? "cancelled" : "delivered",
                actualNetCents: (expectedNet - s.driftCents) as ReturnType<typeof cents>,
              }),
            );
          });
          const sum = discrepancies.reduce((acc, d) => acc + d.gapCents, 0);
          expect(totalGap(discrepancies)).toBe(sum);
        },
      ),
    );
  });
});
