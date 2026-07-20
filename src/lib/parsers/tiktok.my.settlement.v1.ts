import { cents } from "../money";
import type { Parser, ParseResult } from "./registry";

// TikTok Shop MY settlement CSV header, as described in the PRD (Finances → Statements
// export). No sample file was available when this was written — column names are a
// best-effort guess at TikTok's actual terminology. Treat this as v1 of a parser that
// WILL need correcting against a real export; that's exactly why it's versioned and
// fixture-tested rather than assumed correct. If real files quarantine on this shape,
// that's the signal to ship v2 with the real header, not to loosen this one's matching.
const HEADER_FINGERPRINT = [
  "Order/Adjustment ID", "Settlement Time", "Order Status", "Product Name", "SKU ID",
  "Quantity", "Order Amount", "Shipping Fee", "Platform Commission", "Payment Processing Fee",
  "Settlement Amount",
];

function normalizeHeaderCell(cell: string): string {
  return cell.trim().replace(/\s+/g, " ").replace(/^﻿/, ""); // strip BOM on first cell
}

function parseLocaleNumber(raw: string): number {
  const trimmed = raw.trim().replace(/^"|"$/g, "");
  if (/,\d{1,2}$/.test(trimmed) && trimmed.includes(".")) {
    return Number(trimmed.replace(/\./g, "").replace(",", "."));
  }
  return Number(trimmed.replace(/,/g, ""));
}

/** Minimal CSV line splitter tolerant of quoted fields containing commas. */
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
  // TikTok exports appear in UTF-8, UTF-16, and Windows-1252 depending on locale (PRD A1).
  // BOM sniffing covers UTF-8/UTF-16; anything else falls back to latin1, which is a
  // reasonable default for Windows-1252-ish content and never throws on arbitrary bytes.
  let text: string;
  if (buffer[0] === 0xff && buffer[1] === 0xfe) text = buffer.toString("utf16le", 2);
  else if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) text = buffer.toString("utf8", 3);
  else text = buffer.toString("utf8");

  return text.split(/\r\n|\n/).filter((l) => l.trim().length > 0).map(splitCsvLine);
}

export const tiktokMySettlementV1: Parser = {
  platform: "tiktok",
  country: "MY",
  reportType: "settlement_statement",
  formatVersion: "v1",
  kind: "settlement",

  matches(headerFingerprint: string[]) {
    const normalized = headerFingerprint.map(normalizeHeaderCell);
    return HEADER_FINGERPRINT.every((h) => normalized.includes(h));
  },

  parse(fileBuffer: Buffer): ParseResult {
    const rows = decodeCsv(fileBuffer);
    if (rows.length === 0) throw new Error("empty file");

    const header = rows[0].map(normalizeHeaderCell);
    const col = (name: string) => {
      const i = header.indexOf(name);
      if (i === -1) throw new Error(`expected column "${name}" after header match — parser/file drift`);
      return i;
    };

    const iId = col("Order/Adjustment ID");
    const iTime = col("Settlement Time");
    const iStatus = col("Order Status");
    const iSku = col("SKU ID");
    const iQty = col("Quantity");
    const iAmount = col("Order Amount");
    const iShipping = col("Shipping Fee");
    const iCommission = col("Platform Commission");
    const iTxnFee = col("Payment Processing Fee");

    const orders: ParseResult["orders"] = [];
    const settlementLines: ParseResult["settlementLines"] = [];

    for (const row of rows.slice(1)) {
      const id = row[iId]?.trim();
      // Adjustment lines can omit an order ID and reference a prior period (PRD A1/D1) —
      // skip building an Order for those, but nothing here does adjustment-line linking
      // yet, so they're simply dropped rather than silently misattributed to order 0.
      if (!id) continue;

      const qty = Math.max(1, Math.round(parseLocaleNumber(row[iQty] || "1")));
      const unitPrice = cents(parseLocaleNumber(row[iAmount]) / qty);

      orders.push({
        platformOrderId: id,
        sku: row[iSku]?.trim() ?? "",
        qty,
        unitPriceCents: unitPrice,
        createdAtPlatform: row[iTime]?.trim() ?? "",
        status: row[iStatus]?.trim().toLowerCase() ?? "delivered",
      });

      settlementLines.push(
        { platformOrderId: id, type: "item_price", amountCents: cents(parseLocaleNumber(row[iAmount])), settlementPeriodId: null, rawDescription: "Order Amount" },
        { platformOrderId: id, type: "shipping_fee_charged", amountCents: cents(parseLocaleNumber(row[iShipping] || "0")), settlementPeriodId: null, rawDescription: "Shipping Fee" },
        { platformOrderId: id, type: "commission_fee", amountCents: cents(-Math.abs(parseLocaleNumber(row[iCommission] || "0"))), settlementPeriodId: null, rawDescription: "Platform Commission" },
        { platformOrderId: id, type: "transaction_fee", amountCents: cents(-Math.abs(parseLocaleNumber(row[iTxnFee] || "0"))), settlementPeriodId: null, rawDescription: "Payment Processing Fee" },
      );
    }

    return { orders, settlementLines };
  },
};
