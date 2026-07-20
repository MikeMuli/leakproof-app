import { describe, expect, it } from "vitest";
import { tiktokMySettlementV1 } from "./tiktok.my.settlement.v1";
import { resolveParser, registerParser } from "./registry";

const HEADER = [
  "Order/Adjustment ID", "Settlement Time", "Order Status", "Product Name", "SKU ID",
  "Quantity", "Order Amount", "Shipping Fee", "Platform Commission", "Payment Processing Fee",
  "Settlement Amount",
];

function buildCsv(rows: string[][]): Buffer {
  const lines = [HEADER, ...rows].map((r) => r.map((c) => (c.includes(",") ? `"${c}"` : c)).join(","));
  return Buffer.from("﻿" + lines.join("\r\n"), "utf8"); // BOM, like a real Excel-exported CSV
}

describe("tiktokMySettlementV1", () => {
  it("registers and resolves by header fingerprint", () => {
    registerParser(tiktokMySettlementV1);
    expect(resolveParser(HEADER)?.formatVersion).toBe("v1");
  });

  it("does not resolve for an unrelated header (quarantine path)", () => {
    expect(resolveParser(["a", "b", "c"])).toBeNull();
  });

  it("parses rows into orders + signed settlement lines, tolerating a BOM and quoted commas", () => {
    const buf = buildCsv([
      ["TT1000001", "2026-06-01", "Delivered", "Phone Grip Ring", "PGR-01", "1", "35.00", "4.90", "2.63", "0.70", "26.77"],
    ]);
    const result = tiktokMySettlementV1.parse(buf);
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].unitPriceCents).toBe(3500);

    const commission = result.settlementLines.find((l) => l.type === "commission_fee");
    expect(commission!.amountCents).toBe(-263); // signed negative, matches Shopee parser's convention
  });

  it("tolerates locale-formatted numbers (1.234,56 style)", () => {
    const buf = buildCsv([
      ["TT1000002", "2026-06-02", "Delivered", "Air Fryer Liner x100", "AFL-100", "1", "1.234,56", "4,90", "92,59", "24,69", "1112,38"],
    ]);
    const result = tiktokMySettlementV1.parse(buf);
    expect(result.orders[0].unitPriceCents).toBe(123456);
  });

  it("skips adjustment lines with no order ID rather than misattributing them", () => {
    const buf = buildCsv([
      ["", "2026-06-03", "Adjustment", "", "", "", "", "", "-5.00", "", "-5.00"],
      ["TT1000003", "2026-06-03", "Delivered", "Tumbler 500ml", "TM-500", "1", "39.00", "4.90", "2.93", "0.78", "30.39"],
    ]);
    const result = tiktokMySettlementV1.parse(buf);
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].platformOrderId).toBe("TT1000003");
  });
});
