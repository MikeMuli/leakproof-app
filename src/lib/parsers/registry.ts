import type { Cents } from "../money";

export type Platform = "shopee" | "tiktok" | "lazada";

/** One row of normalized output. Provenance travels with every row (PRD A3). */
export interface ParsedOrderRow {
  platformOrderId: string;
  sku: string;
  qty: number;
  unitPriceCents: Cents;
  createdAtPlatform: string; // ISO date
  status: string;
}

export interface ParsedSettlementRow {
  platformOrderId: string | null; // null when the platform's own line omits it (adjustment lines)
  type:
    | "item_price" | "commission_fee" | "transaction_fee" | "shipping_fee_charged" | "shipping_subsidy"
    | "voucher_seller_funded" | "voucher_platform_funded" | "affiliate_commission" | "refund"
    | "refund_reversal" | "adjustment" | "reserve_hold" | "reserve_release" | "chargeback"
    | "chargeback_fee" | "other";
  amountCents: Cents; // signed
  settlementPeriodId: string | null;
  rawDescription: string;
}

export interface ParseResult {
  orders: ParsedOrderRow[];
  settlementLines: ParsedSettlementRow[];
}

/**
 * An order export (PRD A1: "order exports from Seller Centre") is a distinct file type
 * from a settlement/income report — it carries no fee data, but does carry multiple
 * line items per order, which settlement reports collapse to one row per order.
 */
export interface ParsedOrderExportLine {
  sku: string;
  qty: number;
  unitPriceCents: Cents;
}

export interface ParsedOrderExportRow {
  platformOrderId: string;
  createdAtPlatform: string;
  status: string;
  lines: ParsedOrderExportLine[];
}

export interface OrderExportResult {
  orders: ParsedOrderExportRow[];
}

/** A parser owns exactly one (platform, country, reportType, formatVersion) signature. */
export interface Parser {
  platform: Platform;
  country: string;
  reportType: string;
  formatVersion: string;
  /** Distinguishes a fee-bearing settlement report from a fee-less order export — the
   *  upload route branches on this rather than guessing from reportType strings. */
  kind: "settlement" | "order_export";
  /** Cheap structural check on the raw header row — must not require parsing the whole file. */
  matches(headerFingerprint: string[]): boolean;
  parse(fileBuffer: Buffer): ParseResult | OrderExportResult | Promise<ParseResult | OrderExportResult>;
}

export interface ParserKey {
  platform: Platform;
  country: string;
  reportType: string;
}

const registry: Parser[] = [];

export function registerParser(parser: Parser): void {
  registry.push(parser);
}

/**
 * Resolve a parser by header fingerprint. Returns null on no match — callers must route
 * to quarantine rather than guess. A wrong number is worse than a hard failure (PRD §8.5).
 */
export function resolveParser(headerFingerprint: string[]): Parser | null {
  return registry.find((p) => p.matches(headerFingerprint)) ?? null;
}

export function listParsers(): readonly Parser[] {
  return registry;
}
