import Link from "next/link";
import type { Metadata } from "next";

import { getCurrentCart } from "@/server/actions/cart";
import { CartLineItem } from "@/components/storefront/CartLineItem";
import { Button } from "@/components/ui/button";
import { calculateSubtotalCents, effectivePriceCents } from "@/lib/cart-totals";
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Your cart</h1>

      <div className="divide-border mt-6 divide-y">
        {items.map((item) => (
          <CartLineItem key={item.id} item={item} />
        ))}
      </div>

      <div className="border-border mt-6 space-y-4 border-t pt-6">
        <div className="flex items-center justify-between text-base font-medium">
          <span>Subtotal</span>
          <span>{formatPriceCents(subtotalCents)}</span>
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
