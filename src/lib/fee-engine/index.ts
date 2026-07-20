import { subCents, type Cents } from "../money";

/**
 * Fee rule tables, versioned by (platform, country, category, effective-date range).
 * PRD §Module C: operationally maintained content — this in-code table is the seed;
 * a later admin UI writes rows like these to a `fee_rules` table instead of a file.
 */
export interface FeeRule {
  platform: "shopee" | "tiktok" | "lazada";
  country: string;
  category: string; // "*" = default for any category
  commissionRate: number; // e.g. 0.085
  transactionFeeRate: number; // e.g. 0.02
  effectiveFrom: string; // ISO date
  effectiveTo: string | null;
  version: string;
}

export const FEE_TABLE_V2026_3: FeeRule[] = [
  { platform: "shopee", country: "MY", category: "*", commissionRate: 0.085, transactionFeeRate: 0.02, effectiveFrom: "2026-01-01", effectiveTo: null, version: "v2026.3" },
  { platform: "tiktok", country: "MY", category: "*", commissionRate: 0.075, transactionFeeRate: 0.02, effectiveFrom: "2026-01-01", effectiveTo: null, version: "v2026.3" },
  { platform: "lazada", country: "MY", category: "*", commissionRate: 0.09, transactionFeeRate: 0.02, effectiveFrom: "2026-01-01", effectiveTo: null, version: "v2026.3" },
];

export function findFeeRule(
  table: FeeRule[],
  platform: FeeRule["platform"],
  country: string,
  category: string,
  onDate: string,
): FeeRule {
  const rule = table.find(
    (r) =>
      r.platform === platform &&
      r.country === country &&
      (r.category === category || r.category === "*") &&
      r.effectiveFrom <= onDate &&
      (r.effectiveTo === null || onDate <= r.effectiveTo),
  );
  if (!rule) throw new Error(`no fee rule for ${platform}/${country}/${category} on ${onDate}`);
  return rule;
}

export interface ExpectedSettlementInput {
  platform: FeeRule["platform"];
  country: string;
  category: string;
  orderDate: string;
  priceCents: Cents;
  shippingCents: Cents; // seller-borne shipping delta, platform-quoted
  voucherCents: Cents; // seller-funded voucher share
}

export interface ExpectedSettlement {
  commissionCents: Cents;
  transactionFeeCents: Cents;
  shippingCents: Cents;
  voucherCents: Cents;
  netCents: Cents;
  feeTableVersion: string;
  /** Every number the seller sees must be explainable on click (PRD Module C). */
  explanation: string[];
}

export function computeExpectedSettlement(
  input: ExpectedSettlementInput,
  table: FeeRule[] = FEE_TABLE_V2026_3,
): ExpectedSettlement {
  const rule = findFeeRule(table, input.platform, input.country, input.category, input.orderDate);
  const commissionCents = Math.round(input.priceCents * rule.commissionRate) as Cents;
  const transactionFeeCents = Math.round(input.priceCents * rule.transactionFeeRate) as Cents;

  const net = subCents(
    subCents(
      subCents(subCents(input.priceCents, commissionCents), transactionFeeCents),
      input.shippingCents,
    ),
    input.voucherCents,
  );

  return {
    commissionCents,
    transactionFeeCents,
    shippingCents: input.shippingCents,
    voucherCents: input.voucherCents,
    netCents: net,
    feeTableVersion: rule.version,
    explanation: [
      `price ${input.priceCents}`,
      `− commission ${(rule.commissionRate * 100).toFixed(1)}% (table ${rule.version}) = ${commissionCents}`,
      `− transaction fee ${(rule.transactionFeeRate * 100).toFixed(1)}% = ${transactionFeeCents}`,
      `− shipping (seller-borne delta) = ${input.shippingCents}`,
      input.voucherCents !== 0 ? `− seller-funded voucher = ${input.voucherCents}` : "",
      `= expected net ${net}`,
    ].filter(Boolean),
  };
}
