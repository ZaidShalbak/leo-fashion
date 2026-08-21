import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { getCurrentCart } from "@/server/actions/cart";
import { redirect } from "@/i18n/navigation";
import { CheckoutClient } from "@/components/storefront/CheckoutClient";
import { calculateSubtotalCents, effectivePriceCents } from "@/lib/cart-totals";
import { validateDiscountCode } from "@/lib/discount";
import { localize } from "@/lib/localizedContent";

export async function generateMetadata(
  props: PageProps<"/[locale]/checkout">
): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "Checkout" });
  return { title: t("title") };
}

export default async function CheckoutPage() {
  const t = await getTranslations("Checkout");
  const locale = await getLocale();
  const user = await requireUser("/checkout");

  const [cart, addresses, deliveryZones] = await Promise.all([
    getCurrentCart(),
    db.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
    db.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
    }),
  ]);

  const items = cart?.items ?? [];
  if (items.length === 0) {
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
        <CheckoutClient
          addresses={addresses}
          items={items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          }))}
          zones={deliveryZones.map((zone) => ({
            id: zone.id,
            name: zone.name,
            feeCents: zone.feeCents,
          }))}
          summaryItems={items.map((item) => ({
            id: item.id,
            title: localize(item.product.title, item.product.titleAr, locale),
            size: item.variant.size,
            color: item.variant.color,
            quantity: item.quantity,
            priceCents: effectivePriceCents(
              item.product.basePriceCents,
              item.variant.priceOverrideCents
            ),
          }))}
          subtotalCents={subtotalCents}
          discountCents={discountCents}
          discountCode={cart?.appliedDiscountCode ?? null}
        />
      </div>
    </div>
  );
}
