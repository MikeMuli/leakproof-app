import { cents } from "../money";
import type { OrderExportResult, Parser, ParsedOrderExportRow } from "./registry";

// TikTok Shop MY order export (PRD A1). Same caveat as tiktok.my.settlement.v1: no sample
// file was available, header names are a best-effort guess pending a real export.
const HEADER_FINGERPRINT = [
  "Order ID", "Order Creation Time", "Order Status", "Product Name", "SKU ID", "Quantity", "Unit Price",
];

function normalizeHeaderCell(cell: string): string {
  return cell.trim().replace(/\s+/g, " ").replace(/^﻿/, "");
}

function parseLocaleNumber(raw: string): number {
  const trimmed = raw.trim().replace(/^"|"$/g, "");
  if (/,\d{1,2}$/.test(trimmed) && trimmed.includes(".")) {
    return Number(trimmed.replace(/\./g, "").replace(",", "."));
  }
  return Number(trimmed.replace(/,/g, ""));
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function decodeCsv(buffer: Buffer): string[][] {
  let text: string;
  if (buffer[0] === 0xff && buffer[1] === 0xfe) text = buffer.toString("utf16le", 2);
  else if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) text = buffer.toString("utf8", 3);
  else text = buffer.toString("utf8");
  return text.split(/\r\n|\n/).filter((l) => l.trim().length > 0).map(splitCsvLine);
}

export const tiktokMyOrdersV1: Parser = {
  platform: "tiktok",
  country: "MY",
  reportType: "order_export",
  formatVersion: "v1",
  kind: "order_export",

  matches(headerFingerprint: string[]) {
    const normalized = headerFingerprint.map(normalizeHeaderCell);
    return HEADER_FINGERPRINT.every((h) => normalized.includes(h));
  },

  parse(fileBuffer: Buffer): OrderExportResult {
    const rows = decodeCsv(fileBuffer);
    if (rows.length === 0) throw new Error("empty file");

    const header = rows[0].map(normalizeHeaderCell);
    const col = (name: string) => {
      const i = header.indexOf(name);
      if (i === -1) throw new Error(`expected column "${name}" after header match — parser/file drift`);
      return i;
    };

    const iOrderId = col("Order ID");
    const iTime = col("Order Creation Time");
    const iStatus = col("Order Status");
    const iSku = col("SKU ID");
    const iQty = col("Quantity");
    const iPrice = col("Unit Price");

    const byOrder = new Map<string, ParsedOrderExportRow>();

    for (const row of rows.slice(1)) {
      const orderId = row[iOrderId]?.trim();
      if (!orderId) continue;

      if (!byOrder.has(orderId)) {
        byOrder.set(orderId, {
          platformOrderId: orderId,
          createdAtPlatform: row[iTime]?.trim() ?? "",
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
  },
};
