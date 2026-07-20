import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { shopeeMyIncomeV1, parseShopeeMyIncomeV1 } from "./shopee.my.income.v1";
import { resolveParser, registerParser } from "./registry";

function buildFixtureBuffer(): Buffer {
  const header = [
    "Order ID", "Order Creation Date", "Order Status", "Product Name", "SKU",
    "Quantity", "Product Price", "Shipping Fee", "Commission Fee", "Transaction Fee", "Net Amount",
  ];
  const rows = [
    header,
    ["SH26100001", "2026-06-01", "Delivered", "Hijab Satin Premium", "HSP-01", "1", "89.00", "4.90", "7.57", "1.78", "74.75"],
    // locale variant: 1.234,56 style
    ["SH26100002", "2026-06-02", "Delivered", "Air Fryer Liner x100", "AFL-100", "2", "1.234,56", "4,90", "104,94", "24,69", "1100,03"],
    ["", "", "Shopee disclaimer: figures subject to adjustment", "", "", "", "", "", "", "", ""], // injected footer row
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Income Released");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

describe("shopeeMyIncomeV1", () => {
  it("registers and resolves by header fingerprint", () => {
    registerParser(shopeeMyIncomeV1);
    const resolved = resolveParser([
      "Order ID", "Order Creation Date", "Order Status", "Product Name", "SKU",
      "Quantity", "Product Price", "Shipping Fee", "Commission Fee", "Transaction Fee", "Net Amount",
    ]);
    expect(resolved?.formatVersion).toBe("v1");
  });

  it("does not resolve for an unrelated header shape (quarantine path)", () => {
    expect(resolveParser(["foo", "bar", "baz"])).toBeNull();
  });

  it("parses standard rows into orders + settlement lines with signed fee amounts", async () => {
    const result = await parseShopeeMyIncomeV1(buildFixtureBuffer());
    const order1 = result.orders.find((o) => o.platformOrderId === "SH26100001");
    expect(order1).toBeDefined();
    expect(order1!.unitPriceCents).toBe(8900);

    const commission1 = result.settlementLines.find(
      (l) => l.platformOrderId === "SH26100001" && l.type === "commission_fee",
    );
    expect(commission1!.amountCents).toBe(-757); // fees are signed negative
  });

  it("tolerates locale-formatted numbers (1.234,56 style)", async () => {
    const result = await parseShopeeMyIncomeV1(buildFixtureBuffer());
    const order2 = result.orders.find((o) => o.platformOrderId === "SH26100002");
    expect(order2!.unitPriceCents).toBe(123456);
  });

  it("skips platform-injected disclaimer rows without failing the batch", async () => {
    const result = await parseShopeeMyIncomeV1(buildFixtureBuffer());
    expect(result.orders).toHaveLength(2); // not 3 — the footer row is dropped, not misparsed
  });
});
