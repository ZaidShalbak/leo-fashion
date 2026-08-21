"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { getCurrentCart } from "./cart";
import { calculateSubtotalCents, effectivePriceCents } from "@/lib/cart-totals";
import { validateDiscountCode, type DiscountValidationResult } from "@/lib/discount";
import { applyDiscountCodeSchema } from "@/lib/validators/discount";
import { formatPriceCents } from "@/components/storefront/PriceDisplay";

export type ApplyDiscountResult = { success: true } | { success: false; error: string };

function reasonToMessage(
  result: Extract<DiscountValidationResult, { valid: false }>,
  t: Awaited<ReturnType<typeof getTranslations>>
): string {
  switch (result.reason) {
    case "not_found":
      return t("notFound");
    case "inactive":
      return t("inactive");
    case "expired":
      return t("expired");
    case "redemption_limit":
      return t("redemptionLimit");
    case "min_subtotal":
      return t("minSubtotal", { amount: formatPriceCents(result.minSubtotalCents ?? 0) });
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
  const t = await getTranslations("DiscountActions");
  const parsed = applyDiscountCodeSchema.safeParse(input);
  if (!parsed.success) {
    // Bypassing the raw Zod issue message on purpose — this schema only
    // ever fails one realistic way (empty/too-long code), so a single
    // translated string covers it without needing a full Zod locale/error
    // map for what's otherwise a one-field form.
    return { success: false, error: t("enterCode") };
  }
  const code = parsed.data.code.toUpperCase();

  const cart = await getCurrentCart();
  if (!cart || cart.items.length === 0) {
    return { success: false, error: t("cartEmpty") };
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
    return { success: false, error: reasonToMessage(result, t) };
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
      return { success: false, error: t("alreadyUsed") };
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
  const t = await getTranslations("DiscountActions");
  const cart = await getCurrentCart();
  if (!cart) return { success: false, error: t("noCart") };

  await db.cart.update({
    where: { id: cart.id },
    data: { appliedDiscountCode: null },
  });

  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { success: true };
}
