import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { OrderStatus } from "@prisma/client";

import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { OrderStatusBadge } from "@/components/storefront/OrderStatusBadge";
import { formatPriceCents } from "@/components/storefront/PriceDisplay";
import { calculateTotalCents } from "@/lib/cart-totals";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export async function generateMetadata(
  props: PageProps<"/[locale]/account/orders">
): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "AccountOrders" });
  return { title: t("title") };
}

export default async function AccountOrdersPage(
  props: PageProps<"/[locale]/account/orders">
) {
  const { locale } = await props.params;
  const user = await requireUser("/account/orders");
  const t = await getTranslations("AccountOrders");
  const tStatus = await getTranslations({ locale: locale as AppLocale, namespace: "OrderStatus" });
  const statusLabels = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status, tStatus(status)])
  ) as Record<OrderStatus, string>;
  const dateLocale = locale === "ar" ? "ar" : "en-US";

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>

      {orders.length === 0 ? (
        <div className="mt-8 text-center">
          <p className="text-muted-foreground">{t("noOrders")}</p>
          <Link href="/" className="mt-4 inline-block text-sm underline">
            {t("startShopping")}
          </Link>
        </div>
      ) : (
        <ul className="divide-border mt-6 divide-y">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/account/orders/${order.id}`}
                className="flex items-center justify-between gap-4 py-4 hover:opacity-80"
              >
                <div>
                  <p className="text-sm font-medium">
                    {t("orderNumber", { id: order.id.slice(-8).toUpperCase() })}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {t("dateAndItemCount", {
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
                      calculateTotalCents(order.subtotalCents, order.discountCents)
                    )}
                  </span>
                  <OrderStatusBadge status={order.status} labels={statusLabels} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
