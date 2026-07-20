import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { lazadaMyTransactionsV1, parseLazadaMyTransactionsV1 } from "./lazada.my.transactions.v1";
import { resolveParser, registerParser } from "./registry";

function buildFixtureBuffer(): Buffer {
  const header = ["Order No.", "Transaction Date", "Order Status", "Product Name", "SKU", "Quantity", "Item Price", "Shipping Fee", "Commission", "Payment Fee", "Net Amount"];
  const rows = [
    header,
    ["LZ50000001", "2026-06-01", "Delivered", "Air Fryer Liner x100", "AFL-100", "1", "120.00", "4.90", "10.80", "2.40", "101.90"],
    ["", "", "Lazada disclaimer row", "", "", "", "", "", "", "", ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

describe("lazadaMyTransactionsV1", () => {
  it("registers as a settlement kind and resolves by header fingerprint", () => {
    registerParser(lazadaMyTransactionsV1);
    const resolved = resolveParser([
      "Order No.", "Transaction Date", "Order Status", "Product Name", "SKU",
      "Quantity", "Item Price", "Shipping Fee", "Commission", "Payment Fee", "Net Amount",
    ]);
    expect(resolved?.kind).toBe("settlement");
    expect(resolved?.platform).toBe("lazada");
  });

  it("does not resolve for an unrelated header (quarantine path)", () => {
    expect(resolveParser(["x", "y", "z"])).toBeNull();
  });

  it("parses rows into orders + signed settlement lines", async () => {
    const result = await parseLazadaMyTransactionsV1(buildFixtureBuffer());
    expect(result.orders).toHaveLength(1); // disclaimer row dropped
    const commission = result.settlementLines.find((l) => l.type === "commission_fee");
    expect(commission!.amountCents).toBe(-1080);
  });
});
