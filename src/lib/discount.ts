// Pure, DB-free discount-code logic — mirrors cart-totals.ts's approach so
// the core money/eligibility math is trivial to unit test without a
// database. Used both as a preview when a code is applied to a cart (no
// side effects, see src/server/actions/discount.ts) and again, unchanged,
// as defense-in-depth inside placeOrder's transaction right before a
// redemption is actually reserved (see src/server/actions/order.ts).

export type DiscountCodeRecord = {
  code: string;
  percentOff: number;
  isActive: boolean;
  expiresAt: Date | null;
  minSubtotalCents: number | null;
  maxRedemptions: number | null;
  redemptionCount: number;
};

export type DiscountValidationResult =
  | { valid: true; discountCents: number }
  | {
      valid: false;
      reason: "not_found" | "inactive" | "expired" | "redemption_limit" | "min_subtotal";
      minSubtotalCents?: number;
    };

/**
 * Checks whether a discount code can apply to a given subtotal right now.
 * Deliberately does NOT check "already used by this user" — that needs a
 * userId, and is enforced separately via a DB-level unique constraint at
 * order-creation time (Order's (discountCodeId, userId) unique index) —
 * see order.ts. This function only knows about the code and the cart.
 */
export function validateDiscountCode(
  discount: DiscountCodeRecord | null,
  subtotalCents: number,
  now: Date
): DiscountValidationResult {
  if (!discount) return { valid: false, reason: "not_found" };
  if (!discount.isActive) return { valid: false, reason: "inactive" };
  if (discount.expiresAt && discount.expiresAt.getTime() < now.getTime()) {
    return { valid: false, reason: "expired" };
  }
  if (
    discount.maxRedemptions != null &&
    discount.redemptionCount >= discount.maxRedemptions
  ) {
    return { valid: false, reason: "redemption_limit" };
  }
  if (
    discount.minSubtotalCents != null &&
    subtotalCents < discount.minSubtotalCents
  ) {
    return {
      valid: false,
      reason: "min_subtotal",
      minSubtotalCents: discount.minSubtotalCents,
    };
  }

  const discountCents = Math.round((subtotalCents * discount.percentOff) / 100);
  return { valid: true, discountCents };
}

/** End-of-day UTC on the given "YYYY-MM-DD" form-input date string. */
export function endOfDayUtc(dateOnly: string): Date {
  return new Date(`${dateOnly}T23:59:59.999Z`);
}
