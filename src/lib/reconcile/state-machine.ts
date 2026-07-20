/**
 * PRD D4: detected → (auto_resolved | seller_dismissed | claim_generated → claim_filed →
 * recovered | rejected). All transitions here are seller-marked or system-marked; nothing
 * skips a step. Discrepancy rows are append-only (PRD Module B) — a transition inserts a
 * new row rather than mutating the old one; every reader already picks the most recent row
 * per order (dashboard, reports), so this falls out for free.
 */
export type DiscrepancyState =
  | "detected" | "auto_resolved" | "seller_dismissed" | "claim_generated"
  | "claim_filed" | "recovered" | "rejected";

const ALLOWED_TRANSITIONS: Record<DiscrepancyState, DiscrepancyState[]> = {
  detected: ["claim_generated", "seller_dismissed", "auto_resolved"],
  claim_generated: ["claim_filed", "seller_dismissed"],
  claim_filed: ["recovered", "rejected"],
  recovered: [],
  rejected: [],
  auto_resolved: [],
  seller_dismissed: [],
};

/** States where the money is still an open ask — counted in "worth disputing". */
export const OPEN_DISPUTE_STATES: DiscrepancyState[] = ["detected", "claim_generated", "claim_filed"];

export function canTransition(from: DiscrepancyState, to: DiscrepancyState): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
