import { cents } from "../money";
import type { Parser, ParseResult } from "./registry";
import { parseXlsxSafely } from "./safe-xlsx";

// Lazada MY transaction/finance statement (PRD A1: "Lazada: transaction/finance statements
// and order exports from Seller Center"). No sample file was available — header names are
// a best-effort guess, same caveat as the TikTok parsers: versioned v1, expect a v2 once
// tested against a real export rather than trusting this shape.
const HEADER_FINGERPRINT = [
  "Order No.", "Transaction Date", "Order Status", "Product Name", "SKU",
  "Quantity", "Item Price", "Shipping Fee", "Commission", "Payment Fee", "Net Amount",
];

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

export const lazadaMyTransactionsV1: Parser = {
  platform: "lazada",
  country: "MY",
  reportType: "transaction_statement",
  formatVersion: "v1",
  kind: "settlement",

  matches(headerFingerprint: string[]) {
    const normalized = headerFingerprint.map(normalizeHeaderCell);
    return HEADER_FINGERPRINT.every((h) => normalized.includes(h));
  },

  parse(fileBuffer: Buffer): Promise<ParseResult> {
    return parseLazadaMyTransactionsV1(fileBuffer);
  },
};

export async function parseLazadaMyTransactionsV1(fileBuffer: Buffer): Promise<ParseResult> {
  const rows = await parseXlsxSafely(fileBuffer);
  if (rows.length === 0) throw new Error("empty file");

  const header = rows[0].map(normalizeHeaderCell);
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`expected column "${name}" after header match — parser/file drift`);
    return i;
  };

  const iOrderId = col("Order No.");
  const iDate = col("Transaction Date");
  const iStatus = col("Order Status");
  const iSku = col("SKU");
  const iQty = col("Quantity");
  const iPrice = col("Item Price");
  const iShipping = col("Shipping Fee");
  const iCommission = col("Commission");
  const iPaymentFee = col("Payment Fee");

  const orders: ParseResult["orders"] = [];
  const settlementLines: ParseResult["settlementLines"] = [];

  for (const row of rows.slice(1)) {
    const platformOrderId = row[iOrderId]?.trim();
    if (!platformOrderId) continue; // disclaimer/footer rows

    const unitPrice = cents(parseLocaleNumber(row[iPrice]));
    const qty = Math.max(1, Math.round(parseLocaleNumber(row[iQty] || "1")));

    orders.push({
      platformOrderId,
      sku: row[iSku]?.trim() ?? "",
      qty,
      unitPriceCents: unitPrice,
      createdAtPlatform: row[iDate]?.trim() ?? "",
      status: row[iStatus]?.trim().toLowerCase() ?? "delivered",
    });

    settlementLines.push(
      { platformOrderId, type: "item_price", amountCents: unitPrice, settlementPeriodId: null, rawDescription: "Item Price" },
      { platformOrderId, type: "shipping_fee_charged", amountCents: cents(parseLocaleNumber(row[iShipping] || "0")), settlementPeriodId: null, rawDescription: "Shipping Fee" },
      { platformOrderId, type: "commission_fee", amountCents: cents(-Math.abs(parseLocaleNumber(row[iCommission] || "0"))), settlementPeriodId: null, rawDescription: "Commission" },
      { platformOrderId, type: "transaction_fee", amountCents: cents(-Math.abs(parseLocaleNumber(row[iPaymentFee] || "0"))), settlementPeriodId: null, rawDescription: "Payment Fee" },
    );
  }

  return { orders, settlementLines };
}
