import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { shopeeMyOrdersV1, parseShopeeMyOrdersV1 } from "./shopee.my.orders.v1";
import { resolveParser, registerParser } from "./registry";

function buildFixtureBuffer(): Buffer {
  const header = ["Order ID", "Order Creation Date", "Order Status", "Product Name", "SKU", "Quantity", "Unit Price"];
  const rows = [
    header,
    ["SH70000001", "2026-06-01", "Delivered", "Hijab Satin Premium", "HSP-01", "1", "89.00"],
    // multi-item order: two rows share one Order ID — the reason this parser exists
    ["SH70000002", "2026-06-02", "Delivered", "Tumbler 500ml", "TM-500", "2", "39.00"],
    ["SH70000002", "2026-06-02", "Delivered", "Phone Grip Ring", "PGR-01", "1", "15.00"],
    ["", "", "Shopee disclaimer row", "", "", "", ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Order Export");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

describe("shopeeMyOrdersV1", () => {
  it("registers as an order_export kind and resolves by header fingerprint", () => {
    registerParser(shopeeMyOrdersV1);
    const resolved = resolveParser(["Order ID", "Order Creation Date", "Order Status", "Product Name", "SKU", "Quantity", "Unit Price"]);
    expect(resolved?.kind).toBe("order_export");
  });

  it("groups multiple rows sharing an Order ID into one order with multiple lines", async () => {
    const result = await parseShopeeMyOrdersV1(buildFixtureBuffer());
    expect(result.orders).toHaveLength(2); // 2 distinct orders, not 3 rows
    const multiItem = result.orders.find((o) => o.platformOrderId === "SH70000002");
    expect(multiItem!.lines).toHaveLength(2);
    expect(multiItem!.lines.map((l) => l.sku)).toEqual(["TM-500", "PGR-01"]);
  });

  it("keeps single-item orders as one line", async () => {
    const result = await parseShopeeMyOrdersV1(buildFixtureBuffer());
    const single = result.orders.find((o) => o.platformOrderId === "SH70000001");
    expect(single!.lines).toHaveLength(1);
  });

  it("skips disclaimer rows with no order ID", async () => {
    const result = await parseShopeeMyOrdersV1(buildFixtureBuffer());
    expect(result.orders.every((o) => o.platformOrderId)).toBe(true);
  });
});
