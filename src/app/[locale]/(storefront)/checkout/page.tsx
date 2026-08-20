import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { getCurrentCart } from "@/server/actions/cart";
import { Link, redirect } from "@/i18n/navigation";
import { CheckoutForm } from "@/components/storefront/CheckoutForm";
import {
  calculateSubtotalCents,
  calculateTotalCents,
  effectivePriceCents,
} from "@/lib/cart-totals";
import { validateDiscountCode } from "@/lib/discount";
import { formatPriceCents } from "@/components/storefront/PriceDisplay";

export async function generateMetadata(
  props: PageProps<"/[locale]/checkout">
): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "Checkout" });
  return { title: t("title") };
}

export default async function CheckoutPage() {
  const t = await getTranslations("Checkout");
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
    const locale = await getLocale();
    redirect({ href: "/cart", locale });
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

  // Read-only preview here too — no input on this page, since the code is
  // applied/removed from the cart page only. placeOrder re-validates and
  // actually redeems it inside its own transaction regardless of what's
  // shown here.
  let discountCents = 0;
  if (cart?.appliedDiscountCode) {
    const discount = await db.discountCode.findUnique({
      where: { code: cart.appliedDiscountCode },
    });
    const result = validateDiscountCode(discount, subtotalCents, new Date());
    if (result.valid) discountCents = result.discountCents;
  }
  const totalCents = calculateTotalCents(subtotalCents, discountCents);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
        <CheckoutForm
          addresses={addresses}
          items={items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          }))}
        />

        <div className="border-border h-fit space-y-4 rounded-lg border p-4">
          <p className="text-sm font-medium">{t("orderSummary")}</p>
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
                    {t("lineItem", {
                      title: item.product.title,
                      size: item.variant.size,
                      color: item.variant.color,
                      quantity: item.quantity,
                    })}
                  </span>
                  <span className="text-foreground shrink-0">
                    {formatPriceCents(priceCents * item.quantity)}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="border-border space-y-1 border-t pt-3">
            <div className="text-muted-foreground flex justify-between text-sm">
              <span>{t("subtotal")}</span>
              <span>{formatPriceCents(subtotalCents)}</span>
            </div>
            {discountCents > 0 && (
              <div className="flex justify-between text-sm text-green-700 dark:text-green-500">
                <span>
                  {cart?.appliedDiscountCode
                    ? t("discountWithCode", { code: cart.appliedDiscountCode })
                    : t("discount")}
                </span>
                <span>−{formatPriceCents(discountCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-medium">
              <span>{t("total")}</span>
              <span>{formatPriceCents(totalCents)}</span>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">{t("noPaymentNote")}</p>
          <Link
            href="/cart"
            className="text-muted-foreground block text-xs underline"
          >
            {t("editCart")}
          </Link>
        </div>
      </div>
    </div>
  );
}
