import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { getCurrentCart } from "@/server/actions/cart";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/localizedContent";
import { CartItemList } from "@/components/storefront/CartItemList";
import { ProceedToCheckoutButton } from "@/components/storefront/ProceedToCheckoutButton";
import { PromoCodeForm } from "@/components/storefront/PromoCodeForm";
import { ClearCartButton } from "@/components/storefront/ClearCartButton";
import { Button } from "@/components/ui/button";
import {
  calculateSubtotalCents,
  calculateTotalCents,
  effectivePriceCents,
} from "@/lib/cart-totals";
import { getBestSaleForProduct, getSaleAdjustedPriceCents } from "@/lib/sales";
import { validateDiscountCode } from "@/lib/discount";
import { formatPriceCents } from "@/components/storefront/PriceDisplay";

export async function generateMetadata(
  props: PageProps<"/[locale]/cart">
): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "Cart" });
  return { title: t("title") };
}

export default async function CartPage() {
  const t = await getTranslations("Cart");
  const locale = await getLocale();
  const [cart, user] = await Promise.all([getCurrentCart(), getCurrentUser()]);
  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-xl font-semibold">{t("emptyTitle")}</h1>
        <p className="text-muted-foreground mt-2">{t("emptySubtitle")}</p>
        <Button asChild className="mt-6">
          <Link href="/">{t("continueShopping")}</Link>
        </Button>
      </div>
    );
  }

  const sales = await db.sale.findMany({ where: { isActive: true } });
  const now = new Date();
  // Only the display copy (product.title) needs a localized version. The
  // per-line price is computed once here — base-or-override
  // (effectivePriceCents), then sale-adjusted if a live Sale matches —
  // and reused for both the subtotal below and what CartLineItem
  // displays, so the two can never disagree.
  const localizedItems = items.map((item) => {
    const { priceCents, compareAtCents } = getSaleAdjustedPriceCents(
      effectivePriceCents(item.product.basePriceCents, item.variant.priceOverrideCents),
      getBestSaleForProduct(
        sales,
        {
          brandId: item.product.brandId,
          collectionIds: item.product.collections.map((c) => c.collectionId),
        },
        now
      )
    );
    return {
      ...item,
      priceCents,
      compareAtCents,
      product: { ...item.product, title: localize(item.product.title, item.product.titleAr, locale) },
    };
  });

  const subtotalCents = calculateSubtotalCents(localizedItems);

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
      discountInvalidNotice = t("discountInvalidNotice");
    }
  }
  const totalCents = calculateTotalCents(subtotalCents, discountCents);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
        <ClearCartButton />
      </div>

      <div className="mt-6">
        <CartItemList items={localizedItems} />
      </div>

      <div className="border-border mt-6 space-y-4 border-t pt-6">
        <div>
          <PromoCodeForm appliedCode={cart?.appliedDiscountCode ?? null} isSignedIn={Boolean(user)} />
          {discountInvalidNotice && (
            <p className="text-destructive mt-1 text-xs">{discountInvalidNotice}</p>
          )}
        </div>

        <div className="space-y-1">
          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <span>{t("subtotal")}</span>
            <span>{formatPriceCents(subtotalCents)}</span>
          </div>
          {discountCents > 0 && (
            <div className="flex items-center justify-between text-sm text-green-700 dark:text-green-500">
              <span>{t("discount")}</span>
              <span>−{formatPriceCents(discountCents)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-base font-medium">
            <span>{t("total")}</span>
            <span>{formatPriceCents(totalCents)}</span>
          </div>
        </div>

        <p className="text-muted-foreground text-sm">{t("shippingNote")}</p>
        <ProceedToCheckoutButton label={t("proceedToCheckout")} />
      </div>
    </div>
  );
}
