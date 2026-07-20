import { describe, expect, it } from "vitest";
import { tiktokMyOrdersV1 } from "./tiktok.my.orders.v1";
import { resolveParser, registerParser } from "./registry";

const HEADER = ["Order ID", "Order Creation Time", "Order Status", "Product Name", "SKU ID", "Quantity", "Unit Price"];

function buildCsv(rows: string[][]): Buffer {
  const lines = [HEADER, ...rows].map((r) => r.join(","));
  return Buffer.from("﻿" + lines.join("\r\n"), "utf8");
}

describe("tiktokMyOrdersV1", () => {
  it("registers as order_export and resolves by header fingerprint", () => {
    registerParser(tiktokMyOrdersV1);
    expect(resolveParser(HEADER)?.kind).toBe("order_export");
  });

  it("groups multiple rows sharing an Order ID into one multi-line order", async () => {
    const buf = buildCsv([
      ["TT80000001", "2026-06-01", "Delivered", "Serum Vit-C 30ml", "SV-30", "1", "55.00"],
      ["TT80000002", "2026-06-02", "Delivered", "Kids Sandal 28", "KS-28", "1", "45.00"],
      ["TT80000002", "2026-06-02", "Delivered", "Air Fryer Liner x100", "AFL-100", "1", "120.00"],
    ]);
    const result = await tiktokMyOrdersV1.parse(buf);
    expect(result.orders).toHaveLength(2);
    const multi = result.orders.find((o) => o.platformOrderId === "TT80000002");
    expect(multi!.lines).toHaveLength(2);
  });
});
