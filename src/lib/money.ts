// Integer cents everywhere. No floats in the money path, ever (PRD non-negotiable #4).
// A Cents value is always a whole number of the currency's minor unit.

export type Cents = number & { readonly __brand: "Cents" };

export function cents(wholeAndFraction: number): Cents {
  const c = Math.round(wholeAndFraction * 100);
  if (!Number.isSafeInteger(c)) throw new Error(`unsafe money value: ${wholeAndFraction}`);
  return c as Cents;
}

export function fromCents(c: Cents): number {
  return c / 100;
}

export function addCents(...values: Cents[]): Cents {
  return values.reduce((sum, v) => (sum + v) as Cents, 0 as Cents);
}

export function subCents(a: Cents, b: Cents): Cents {
  return (a - b) as Cents;
}

const MYR_FORMATTER = new Intl.NumberFormat("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMYR(c: Cents): string {
  const sign = c < 0 ? "−" : "";
  return `${sign}RM${MYR_FORMATTER.format(Math.abs(c) / 100)}`;
}

export function percentOf(part: Cents, whole: Cents): string {
  if (whole === 0) return "0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

/** Property-test helper: the reconciliation invariant that must always hold (PRD §4 Testing). */
export function assertBucketsSumToGap(bucketSums: Cents[], totalGap: Cents): void {
  const sum = addCents(...bucketSums);
  if (sum !== totalGap) {
    throw new Error(`reconciliation invariant broken: buckets sum to ${sum}, total gap is ${totalGap}`);
  }
}
