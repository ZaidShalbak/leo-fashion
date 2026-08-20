"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { getCurrentCart } from "./cart";
import { calculateSubtotalCents, effectivePriceCents } from "@/lib/cart-totals";
import { validateDiscountCode, type DiscountValidationResult } from "@/lib/discount";
import { applyDiscountCodeSchema } from "@/lib/validators/discount";
import { formatPriceCents } from "@/components/storefront/PriceDisplay";

export type ApplyDiscountResult = { success: true } | { success: false; error: string };

function reasonToMessage(
  result: Extract<DiscountValidationResult, { valid: false }>
): string {
  switch (result.reason) {
    case "not_found":
      return "That code doesn't exist.";
    case "inactive":
      return "That code is no longer active.";
    case "expired":
      return "That code has expired.";
    case "redemption_limit":
      return "That code has reached its redemption limit.";
    case "min_subtotal":
      return `Add ${formatPriceCents(result.minSubtotalCents ?? 0)} more to your cart to use this code.`;
  }
}

/**
 * Validates a code against the live cart and, if it checks out, stores it
 * on the cart for checkout to pick up. This is a preview only — it never
 * touches DiscountCode.redemptionCount or the one-per-customer guard;
 * both are only enforced for real inside placeOrder's transaction (see
 * order.ts), so someone can try a code on the cart page without spending
 * a limited redemption or getting falsely flagged as having "used" it.
 */
export async function applyDiscountCode(
  input: { code: string }
): Promise<ApplyDiscountResult> {
  const parsed = applyDiscountCodeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Enter a code." };
  }
  const code = parsed.data.code.toUpperCase();

  const cart = await getCurrentCart();
  if (!cart || cart.items.length === 0) {
    return { success: false, error: "Your cart is empty." };
  }

  const discount = await db.discountCode.findUnique({ where: { code } });
  const subtotalCents = calculateSubtotalCents(
    cart.items.map((item) => ({
      quantity: item.quantity,
      priceCents: effectivePriceCents(
        item.product.basePriceCents,
        item.variant.priceOverrideCents
      ),
    }))
  );

  const result = validateDiscountCode(discount, subtotalCents, new Date());
  if (!result.valid) {
    return { success: false, error: reasonToMessage(result) };
  }

  // Early, best-effort "already used" check for a signed-in shopper — the
  // real guard is the DB-level unique constraint at order time (see
  // order.ts), which still applies regardless of this. This just avoids
  // letting someone apply a code on the cart page that placeOrder is
  // certain to reject a moment later, when we can already tell.
  const user = await getCurrentUser();
  if (user) {
    const alreadyUsed = await db.order.findFirst({
      where: { userId: user.id, discountCodeId: discount!.id },
      select: { id: true },
    });
    if (alreadyUsed) {
      return { success: false, error: "You've already used this code." };
    }
  }

  await db.cart.update({
    where: { id: cart.id },
    data: { appliedDiscountCode: code },
  });

  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { success: true };
}

export async function removeDiscountCode(): Promise<ApplyDiscountResult> {
  const cart = await getCurrentCart();
  if (!cart) return { success: false, error: "No cart found." };

  await db.cart.update({
    where: { id: cart.id },
    data: { appliedDiscountCode: null },
  });

  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { success: true };
}
