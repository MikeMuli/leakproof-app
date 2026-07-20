import { cents } from "../money";
import type { OrderExportResult, Parser, ParsedOrderExportRow } from "./registry";
import { parseXlsxSafely } from "./safe-xlsx";

// Lazada MY order export (PRD A1). Same caveat as the transaction-statement parser:
// best-effort header guess, versioned v1, pending a real sample file.
const HEADER_FINGERPRINT = ["Order No.", "Order Date", "Order Status", "Product Name", "SKU", "Quantity", "Unit Price"];

function normalizeHeaderCell(cell: string): string {
  return cell.trim().replace(/\s+/g, " ");
}

function parseLocaleNumber(raw: string): number {
  const trimmed = raw.trim();
  if (/,\d{1,2}$/.test(trimmed) && trimmed.includes(".")) {
    return Number(trimmed.replace(/\./g, "").replace(",", "."));
  }
  return Number(trimmed.replace(/,/g, ""));
}

export const lazadaMyOrdersV1: Parser = {
  platform: "lazada",
  country: "MY",
  reportType: "order_export",
  formatVersion: "v1",
  kind: "order_export",

  matches(headerFingerprint: string[]) {
    const normalized = headerFingerprint.map(normalizeHeaderCell);
    return HEADER_FINGERPRINT.every((h) => normalized.includes(h));
  },

  parse(fileBuffer: Buffer): Promise<OrderExportResult> {
    return parseLazadaMyOrdersV1(fileBuffer);
  },
};

export async function parseLazadaMyOrdersV1(fileBuffer: Buffer): Promise<OrderExportResult> {
  const rows = await parseXlsxSafely(fileBuffer);
  if (rows.length === 0) throw new Error("empty file");

  const header = rows[0].map(normalizeHeaderCell);
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`expected column "${name}" after header match — parser/file drift`);
    return i;
  };

  const iOrderId = col("Order No.");
  const iDate = col("Order Date");
  const iStatus = col("Order Status");
  const iSku = col("SKU");
  const iQty = col("Quantity");
  const iPrice = col("Unit Price");

  const byOrder = new Map<string, ParsedOrderExportRow>();

  for (const row of rows.slice(1)) {
    const orderId = row[iOrderId]?.trim();
    if (!orderId) continue;

    if (!byOrder.has(orderId)) {
      byOrder.set(orderId, {
        platformOrderId: orderId,
        createdAtPlatform: row[iDate]?.trim() ?? "",
        status: row[iStatus]?.trim().toLowerCase() ?? "delivered",
        lines: [],
      });
    }

    byOrder.get(orderId)!.lines.push({
      sku: row[iSku]?.trim() ?? "",
      qty: Math.max(1, Math.round(parseLocaleNumber(row[iQty] || "1"))),
      unitPriceCents: cents(parseLocaleNumber(row[iPrice] || "0")),
    });
  }

  return { orders: Array.from(byOrder.values()) };
}
