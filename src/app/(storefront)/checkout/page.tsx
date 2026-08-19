import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { getCurrentCart } from "@/server/actions/cart";
import { CheckoutForm } from "@/components/storefront/CheckoutForm";
import { calculateSubtotalCents, effectivePriceCents } from "@/lib/cart-totals";
import { formatPriceCents } from "@/components/storefront/PriceDisplay";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");

  const [cart, addresses] = await Promise.all([
    getCurrentCart(),
    db.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const items = cart?.items ?? [];
  if (items.length === 0) {
    redirect("/cart");
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
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h1 className="font-serif text-2xl italic sm:text-3xl">Checkout</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
        <CheckoutForm
          addresses={addresses}
          items={items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          }))}
        />

        <div className="border-border bg-card h-fit space-y-4 rounded-sm border p-5">
          <p className="text-xs tracking-widest uppercase">Order summary</p>
          <ul className="space-y-2">
            {items.map((item) => {
              const priceCents = effectivePriceCents(
                item.product.basePriceCents,
                item.variant.priceOverrideCents
              );
              return (
                <li
                  key={item.id}
                  className="text-muted-foreground flex justify-between gap-2 text-sm"
                >
                  <span>
                    {item.product.title} ({item.variant.size}/
                    {item.variant.color}) × {item.quantity}
                  </span>
                  <span className="text-foreground shrink-0">
                    {formatPriceCents(priceCents * item.quantity)}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="border-border flex justify-between border-t pt-3 text-sm">
            <span>Subtotal</span>
            <span className="font-serif italic">{formatPriceCents(subtotalCents)}</span>
          </div>
          <p className="text-muted-foreground text-xs">
            No payment is collected here — this places the order for
            invoice/pay-on-delivery fulfillment.
          </p>
          <Link
            href="/cart"
            className="text-muted-foreground hover:text-foreground block text-xs underline"
          >
            Edit cart
          </Link>
        </div>
      </div>
    </div>
  );
}
