import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { addCents, assertBucketsSumToGap, cents, formatMYR, percentOf, subCents } from "./money";

describe("money", () => {
  it("round-trips whole ringgit to cents", () => {
    expect(cents(89.0)).toBe(8900);
    expect(cents(1.5)).toBe(150);
  });

  it("formats negative amounts with a minus sign, not a floating point artifact", () => {
    expect(formatMYR(subCents(cents(10), cents(15)))).toBe("−RM5.00");
  });

  it("percentOf handles a zero base without dividing by zero", () => {
    expect(percentOf(cents(5), cents(0))).toBe("0%");
  });

  it("property: bucket sums always equal the total gap, for any partition of cents", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: -100000, max: 100000 }), { minLength: 0, maxLength: 50 }), (parts) => {
        const buckets = parts as unknown as ReturnType<typeof cents>[];
        const total = addCents(...buckets);
        assertBucketsSumToGap(buckets, total); // must not throw
      }),
    );
  });

  it("property: assertBucketsSumToGap throws when the invariant is violated", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100000 }), (drift) => {
        const buckets = [cents(10), cents(20)];
        const wrongTotal = addCents(...buckets, drift as unknown as ReturnType<typeof cents>);
        expect(() => assertBucketsSumToGap(buckets, wrongTotal)).toThrow();
      }),
    );
  });
});
