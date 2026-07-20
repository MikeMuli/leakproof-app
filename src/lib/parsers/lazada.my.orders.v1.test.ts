import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { lazadaMyOrdersV1, parseLazadaMyOrdersV1 } from "./lazada.my.orders.v1";
import { resolveParser, registerParser } from "./registry";

function buildFixtureBuffer(): Buffer {
  const header = ["Order No.", "Order Date", "Order Status", "Product Name", "SKU", "Quantity", "Unit Price"];
  const rows = [
    header,
    ["LZ60000001", "2026-06-01", "Delivered", "Serum Vit-C 30ml", "SV-30", "1", "55.00"],
    ["LZ60000002", "2026-06-02", "Delivered", "Tumbler 500ml", "TM-500", "1", "39.00"],
    ["LZ60000002", "2026-06-02", "Delivered", "Kids Sandal 28", "KS-28", "1", "45.00"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

describe("lazadaMyOrdersV1", () => {
  it("registers as order_export and resolves by header fingerprint", () => {
    registerParser(lazadaMyOrdersV1);
    const resolved = resolveParser(["Order No.", "Order Date", "Order Status", "Product Name", "SKU", "Quantity", "Unit Price"]);
    expect(resolved?.kind).toBe("order_export");
  });

  it("groups multiple rows sharing an Order No. into one multi-line order", async () => {
    const result = await parseLazadaMyOrdersV1(buildFixtureBuffer());
    expect(result.orders).toHaveLength(2);
    const multi = result.orders.find((o) => o.platformOrderId === "LZ60000002");
    expect(multi!.lines).toHaveLength(2);
  });
});
