import Link from "next/link";
import type { Metadata } from "next";

import { db } from "@/server/db";
import { getCurrentCart } from "@/server/actions/cart";
import { CartLineItem } from "@/components/storefront/CartLineItem";
import { PromoCodeForm } from "@/components/storefront/PromoCodeForm";
import { Button } from "@/components/ui/button";
import {
  calculateSubtotalCents,
  calculateTotalCents,
  effectivePriceCents,
} from "@/lib/cart-totals";
import { validateDiscountCode } from "@/lib/discount";
import { formatPriceCents } from "@/components/storefront/PriceDisplay";

export const metadata: Metadata = { title: "Your cart" };

export default async function CartPage() {
  const cart = await getCurrentCart();
  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-xl font-semibold">Your cart is empty</h1>
        <p className="text-muted-foreground mt-2">
          Browse the catalog and add something you like.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  const subtotalCents = calculateSubtotalCents(
    items.map((item) => ({
      quantity: item.quantity,
      priceCents: effectivePriceCents(
        item.product.basePriceCents,
        item.variant.priceOverrideCents
      ),
    }))
  );

  // Preview only, same as applyDiscountCode's own re-check — the code
  // stored on the cart can go stale between visits (expired, deactivated,
  // or hit its redemption limit by someone else), so it's re-validated
  // against the live subtotal on every render rather than trusted as-is.
  // placeOrder repeats this validation for real at checkout time.
  let discountCents = 0;
  let discountInvalidNotice: string | null = null;
  if (cart?.appliedDiscountCode) {
    const discount = await db.discountCode.findUnique({
      where: { code: cart.appliedDiscountCode },
    });
    const result = validateDiscountCode(discount, subtotalCents, new Date());
    if (result.valid) {
      discountCents = result.discountCents;
    } else {
      discountInvalidNotice =
        "This promo code is no longer valid and won't be applied at checkout.";
    }
  }
  const totalCents = calculateTotalCents(subtotalCents, discountCents);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Your cart</h1>

      <div className="divide-border mt-6 divide-y">
        {items.map((item) => (
          <CartLineItem key={item.id} item={item} />
        ))}
      </div>

      <div className="border-border mt-6 space-y-4 border-t pt-6">
        <div>
          <PromoCodeForm appliedCode={cart?.appliedDiscountCode ?? null} />
          {discountInvalidNotice && (
            <p className="text-destructive mt-1 text-xs">{discountInvalidNotice}</p>
          )}
        </div>

        <div className="space-y-1">
          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatPriceCents(subtotalCents)}</span>
          </div>
          {discountCents > 0 && (
            <div className="flex items-center justify-between text-sm text-green-700 dark:text-green-500">
              <span>Discount</span>
              <span>−{formatPriceCents(discountCents)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-base font-medium">
            <span>Total</span>
            <span>{formatPriceCents(totalCents)}</span>
          </div>
        </div>

        <p className="text-muted-foreground text-sm">
          Shipping and totals are calculated at checkout. No payment
          required — orders are placed on account and fulfilled directly.
        </p>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/checkout">Proceed to checkout</Link>
        </Button>
      </div>
    </div>
  );
}
