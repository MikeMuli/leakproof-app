import { cents } from "../money";
import type { Parser, ParseResult } from "./registry";
import { parseXlsxSafely } from "./safe-xlsx";

// Fingerprint of Shopee MY's "Income Released" export header row, as of the sample the
// spec references. Format changes without notice per platform (PRD A1) — that's exactly
// why this file is versioned (v1) and never mutated in place; a format change ships as v2,
// with v1 kept and still covered by its fixture.
const HEADER_FINGERPRINT = [
  "Order ID", "Order Creation Date", "Order Status", "Product Name", "SKU",
  "Quantity", "Product Price", "Shipping Fee", "Commission Fee", "Transaction Fee",
  "Net Amount",
];

function normalizeHeaderCell(cell: string): string {
  return cell.trim().replace(/\s+/g, " ");
}

function parseLocaleNumber(raw: string): number {
  // Tolerate both "1,234.56" and "1.234,56" (PRD A1: locale number formats vary by export).
  const trimmed = raw.trim();
  if (/,\d{1,2}$/.test(trimmed) && trimmed.includes(".")) {
    return Number(trimmed.replace(/\./g, "").replace(",", "."));
  }
  return Number(trimmed.replace(/,/g, ""));
}

export const shopeeMyIncomeV1: Parser = {
  platform: "shopee",
  country: "MY",
  reportType: "income_released",
  formatVersion: "v1",
  kind: "settlement",

  matches(headerFingerprint: string[]) {
    const normalized = headerFingerprint.map(normalizeHeaderCell);
    return HEADER_FINGERPRINT.every((h) => normalized.includes(h));
  },

  parse(fileBuffer: Buffer): Promise<ParseResult> {
    return parseShopeeMyIncomeV1(fileBuffer);
  },
};

/** Actual entry point: XLSX parsing must go through the sandboxed worker (see safe-xlsx.ts). */
export async function parseShopeeMyIncomeV1(fileBuffer: Buffer): Promise<ParseResult> {
  const rows = await parseXlsxSafely(fileBuffer);
  if (rows.length === 0) throw new Error("empty file");

  const header = rows[0].map(normalizeHeaderCell);
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`expected column "${name}" after header match — parser/file drift`);
    return i;
  };

  const iOrderId = col("Order ID");
  const iDate = col("Order Creation Date");
  const iStatus = col("Order Status");
  const iSku = col("SKU");
  const iQty = col("Quantity");
  const iPrice = col("Product Price");
  const iShipping = col("Shipping Fee");
  const iCommission = col("Commission Fee");
  const iTxnFee = col("Transaction Fee");

  const orders: ParseResult["orders"] = [];
  const settlementLines: ParseResult["settlementLines"] = [];

  for (const row of rows.slice(1)) {
    // Platform-injected disclaimer/footer rows (PRD A1) have no parseable order ID — skip, don't fail the batch.
    if (!row[iOrderId] || !row[iOrderId].trim()) continue;

    const platformOrderId = row[iOrderId].trim();
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
      { platformOrderId, type: "item_price", amountCents: unitPrice, settlementPeriodId: null, rawDescription: "Product Price" },
      { platformOrderId, type: "shipping_fee_charged", amountCents: cents(parseLocaleNumber(row[iShipping] || "0")), settlementPeriodId: null, rawDescription: "Shipping Fee" },
      { platformOrderId, type: "commission_fee", amountCents: cents(-Math.abs(parseLocaleNumber(row[iCommission] || "0"))), settlementPeriodId: null, rawDescription: "Commission Fee" },
      { platformOrderId, type: "transaction_fee", amountCents: cents(-Math.abs(parseLocaleNumber(row[iTxnFee] || "0"))), settlementPeriodId: null, rawDescription: "Transaction Fee" },
    );
  }

  return { orders, settlementLines };
}
