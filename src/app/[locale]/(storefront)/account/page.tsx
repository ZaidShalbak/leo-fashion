import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { OrderStatus } from "@prisma/client";

import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { localize } from "@/lib/localizedContent";
import { applySaleToProduct } from "@/lib/sales";
import { calculateTotalCents } from "@/lib/cart-totals";
import { OrderStatusBadge } from "@/components/storefront/OrderStatusBadge";
import { formatPriceCents } from "@/components/storefront/PriceDisplay";
import { AccountWishlistGrid, type WishlistProductSummary } from "@/components/storefront/AccountWishlistGrid";
import { AccountDetailsForm } from "@/components/storefront/AccountDetailsForm";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export async function generateMetadata(
  props: PageProps<"/[locale]/account">
): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "Account" });
  return { title: t("title") };
}

export default async function AccountPage(props: PageProps<"/[locale]/account">) {
  const { locale } = await props.params;
  const user = await requireUser("/account");
  const t = await getTranslations("Account");
  const tOrders = await getTranslations("AccountOrders");
  const tStatus = await getTranslations({ locale: locale as AppLocale, namespace: "OrderStatus" });
  const statusLabels = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status, tStatus(status)])
  ) as Record<OrderStatus, string>;
  const dateLocale = locale === "ar" ? "ar" : "en-US";

  const [orders, wishlistItemsRaw, sales] = await Promise.all([
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
    db.wishlistItem.findMany({
      where: { userId: user.id, product: { status: "active" } },
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          include: {
            images: { orderBy: { position: "asc" }, take: 1 },
            brand: true,
            collections: { select: { collectionId: true } },
          },
        },
      },
    }),
    db.sale.findMany({ where: { isActive: true } }),
  ]);

  const now = new Date();
  const wishlistProducts: WishlistProductSummary[] = wishlistItemsRaw.map((item) => {
    const product = applySaleToProduct(item.product, sales, now);
    return {
      id: product.id,
      slug: product.slug,
      title: localize(product.title, product.titleAr, locale),
      brandName: product.brand ? localize(product.brand.name, product.brand.nameAr, locale) : null,
      imageUrl: product.images[0]?.url,
      imageAlt: product.images[0]?.altText ?? undefined,
      priceCents: product.basePriceCents,
      compareAtCents: product.compareAtCents,
    };
  });

  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-10">
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">{t("ordersHeading")}</h2>
        {orders.length === 0 ? (
          <div className="text-center">
            <p className="text-muted-foreground text-sm">{tOrders("noOrders")}</p>
            <Link href="/" className="mt-2 inline-block text-sm underline">
              {tOrders("startShopping")}
            </Link>
          </div>
        ) : (
          <ul className="divide-border divide-y">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="flex items-center justify-between gap-4 py-4 hover:opacity-80"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {tOrders("orderNumber", { id: order.id.slice(-8).toUpperCase() })}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {tOrders("dateAndItemCount", {
                        date: order.createdAt.toLocaleDateString(dateLocale, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }),
                        count: order.items.length,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">
                      {formatPriceCents(
                        calculateTotalCents(
                          order.subtotalCents,
                          order.discountCents,
                          order.deliveryFeeCents ?? 0
                        )
                      )}
                    </span>
                    <OrderStatusBadge status={order.status} labels={statusLabels} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">{t("wishlistHeading")}</h2>
        <AccountWishlistGrid products={wishlistProducts} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">{t("detailsHeading")}</h2>
        <AccountDetailsForm email={user.email} defaultName={user.name ?? ""} defaultPhone={user.phone} />
      </section>
    </div>
  );
}
