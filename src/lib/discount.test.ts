import { describe, expect, it } from "vitest";

import { endOfDayUtc, validateDiscountCode, type DiscountCodeRecord } from "./discount";

const now = new Date("2026-06-15T12:00:00.000Z");

function makeDiscount(overrides: Partial<DiscountCodeRecord> = {}): DiscountCodeRecord {
  return {
    code: "SUMMER20",
    percentOff: 20,
    isActive: true,
    expiresAt: null,
    minSubtotalCents: null,
    maxRedemptions: null,
    redemptionCount: 0,
    ...overrides,
  };
}

describe("validateDiscountCode", () => {
  it("rejects a code that doesn't exist", () => {
    const result = validateDiscountCode(null, 10000, now);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("not_found");
  });

  it("rejects an inactive code", () => {
    const result = validateDiscountCode(makeDiscount({ isActive: false }), 10000, now);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("inactive");
  });

  it("rejects an expired code", () => {
    const result = validateDiscountCode(
      makeDiscount({ expiresAt: new Date("2026-06-14T23:59:59.999Z") }),
      10000,
      now
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("expired");
  });

  it("accepts a code that expires later the same day", () => {
    const result = validateDiscountCode(
      makeDiscount({ expiresAt: new Date("2026-06-15T23:59:59.999Z") }),
      10000,
      now
    );
    expect(result.valid).toBe(true);
  });

  it("rejects a code that already hit its redemption limit", () => {
    const result = validateDiscountCode(
      makeDiscount({ maxRedemptions: 5, redemptionCount: 5 }),
      10000,
      now
    );
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("redemption_limit");
  });

  it("accepts a code with room left under its redemption limit", () => {
    const result = validateDiscountCode(
      makeDiscount({ maxRedemptions: 5, redemptionCount: 4 }),
      10000,
      now
    );
    expect(result.valid).toBe(true);
  });

  it("rejects when the subtotal is below the minimum order amount", () => {
    const result = validateDiscountCode(
      makeDiscount({ minSubtotalCents: 5000 }),
      4999,
      now
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe("min_subtotal");
      expect(result.minSubtotalCents).toBe(5000);
    }
  });

  it("accepts when the subtotal meets the minimum order amount exactly", () => {
    const result = validateDiscountCode(
      makeDiscount({ minSubtotalCents: 5000 }),
      5000,
      now
    );
    expect(result.valid).toBe(true);
  });

  it("computes the discount as a percentage of the subtotal, rounded to the nearest cent", () => {
    const result = validateDiscountCode(makeDiscount({ percentOff: 20 }), 9999, now);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.discountCents).toBe(Math.round(9999 * 0.2));
  });

  it("is valid for a fully-open code (no expiry, no minimum, no limit)", () => {
    const result = validateDiscountCode(makeDiscount(), 100, now);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.discountCents).toBe(20);
  });
});

describe("endOfDayUtc", () => {
  it("converts a YYYY-MM-DD string to 23:59:59.999 UTC on that date", () => {
    const date = endOfDayUtc("2026-06-15");
    expect(date.toISOString()).toBe("2026-06-15T23:59:59.999Z");
  });
});
