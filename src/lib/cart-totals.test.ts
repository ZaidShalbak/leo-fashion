import { describe, expect, it } from "vitest";

import { calculateSubtotalCents, effectivePriceCents } from "./cart-totals";

describe("calculateSubtotalCents", () => {
  it("sums quantity * price across lines", () => {
    const subtotal = calculateSubtotalCents([
      { quantity: 2, priceCents: 1500 },
      { quantity: 1, priceCents: 4000 },
      { quantity: 3, priceCents: 999 },
    ]);
    expect(subtotal).toBe(2 * 1500 + 1 * 4000 + 3 * 999);
  });

  it("returns 0 for an empty cart", () => {
    expect(calculateSubtotalCents([])).toBe(0);
  });
});

describe("effectivePriceCents", () => {
  it("uses the base price when there's no override", () => {
    expect(effectivePriceCents(3000, null)).toBe(3000);
    expect(effectivePriceCents(3000, undefined)).toBe(3000);
  });

  it("uses the variant override when set, even if 0", () => {
    expect(effectivePriceCents(3000, 3500)).toBe(3500);
    expect(effectivePriceCents(3000, 0)).toBe(0);
  });
});
