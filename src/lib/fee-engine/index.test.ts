import { describe, expect, it } from "vitest";
import { cents } from "../money";
import { computeExpectedSettlement, findFeeRule, FEE_TABLE_V2026_3 } from "./index";

describe("fee engine", () => {
  it("finds the rule in effect for a given platform/country/date", () => {
    const rule = findFeeRule(FEE_TABLE_V2026_3, "shopee", "MY", "electronics", "2026-06-01");
    expect(rule.commissionRate).toBe(0.085);
  });

  it("throws rather than silently guessing when no rule matches", () => {
    expect(() => findFeeRule(FEE_TABLE_V2026_3, "shopee", "SG", "*", "2026-06-01")).toThrow();
  });

  it("computes expected net and an explanation for every deduction (PRD: two-click explainability)", () => {
    const result = computeExpectedSettlement({
      platform: "shopee",
      country: "MY",
      category: "*",
      orderDate: "2026-06-01",
      priceCents: cents(89.0),
      shippingCents: cents(4.9),
      voucherCents: cents(0),
    });

    expect(result.commissionCents).toBe(757); // 8.5% of 8900
    expect(result.transactionFeeCents).toBe(178); // 2% of 8900
    expect(result.netCents).toBe(8900 - 757 - 178 - 490);
    expect(result.explanation.length).toBeGreaterThan(3);
    expect(result.explanation.join(" ")).toContain("v2026.3");
  });

  it("omits the voucher line from the explanation when there is no voucher", () => {
    const result = computeExpectedSettlement({
      platform: "tiktok", country: "MY", category: "*", orderDate: "2026-06-01",
      priceCents: cents(50), shippingCents: cents(4.9), voucherCents: cents(0),
    });
    expect(result.explanation.some((l) => l.includes("voucher"))).toBe(false);
  });
});
