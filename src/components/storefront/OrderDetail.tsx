import type { Order, OrderItem, OrderStatus } from "@prisma/client";

import { calculateTotalCents } from "@/lib/cart-totals";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { getTranslator } from "@/i18n/getTranslator";
import type { AppLocale } from "@/i18n/routing";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { WhatsAppIcon } from "./WhatsAppButton";
import { formatPriceCents, PriceDisplay } from "./PriceDisplay";

type OrderWithItems = Order & { items: OrderItem[] };

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

/**
 * Shared between the storefront (order confirmation, account order detail
 * — locale-aware) and the admin order detail page, both inside the
 * [locale] tree now (see the bilingual admin redesign). See
 * src/i18n/getTranslator.ts for why this uses a context-free translator
 * keyed off an explicit `locale` prop instead of useTranslations()/
 * getTranslations() — this keeps the component renderable from either
 * tree without depending on which one actually wraps it in a
 * NextIntlClientProvider.
 *
 * `showWhatsAppButton` is admin-only (defaults to false) — a customer
 * viewing their own order has no reason to message themselves.
 */
export function OrderDetail({
  order,
  locale = "en",
  showWhatsAppButton = false,
}: {
  order: OrderWithItems;
  locale?: AppLocale;
  showWhatsAppButton?: boolean;
}) {
  const t = getTranslator(locale, "OrderDetail");
  const tStatus = getTranslator(locale, "OrderStatus");
  const statusLabels = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status, tStatus(status)])
  ) as Record<OrderStatus, string>;
  const dateLocale = locale === "ar" ? "ar" : "en-US";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">
            {t("orderNumber", { id: order.id.slice(-8).toUpperCase() })}
          </p>
          <p className="text-muted-foreground text-sm">
            {t("placed", {
              date: order.createdAt.toLocaleDateString(dateLocale, {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
            })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} labels={statusLabels} />
      </div>

      <div>
        <p className="mb-3 text-sm font-medium">{t("items")}</p>
        <ul className="divide-border divide-y">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-3 text-sm">
              <span>
                <span className="block">{item.titleSnapshot}</span>
                <span className="text-muted-foreground">
                  {item.size} / {item.color} × {item.quantity}
                </span>
              </span>
              <PriceDisplay
                cents={item.priceCents * item.quantity}
                compareAtCents={
                  item.compareAtPriceCentsSnapshot != null
                    ? item.compareAtPriceCentsSnapshot * item.quantity
                    : undefined
                }
                className="shrink-0"
              />
            </li>
          ))}
        </ul>
        <div className="border-border mt-2 space-y-1 border-t pt-3">
          <div className="text-muted-foreground flex justify-between text-sm">
            <span>{t("subtotal")}</span>
            <span>{formatPriceCents(order.subtotalCents)}</span>
          </div>
          {order.discountCents > 0 && (
            <div className="flex justify-between text-sm text-green-700 dark:text-green-500">
              <span>
                {order.discountCodeSnapshot
                  ? t("discountWithCode", { code: order.discountCodeSnapshot })
                  : t("discount")}
              </span>
              <span>−{formatPriceCents(order.discountCents)}</span>
            </div>
          )}
          {order.deliveryFeeCents != null && (
            <div className="text-muted-foreground flex justify-between text-sm">
              <span>
                {t("delivery")}
                {order.deliveryZoneNameSnapshot && (
                  <>
                    {" "}
                    <span dir="rtl">({order.deliveryZoneNameSnapshot})</span>
                  </>
                )}
              </span>
              <span>{formatPriceCents(order.deliveryFeeCents)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-medium">
            <span>{t("total")}</span>
            <span>
              {formatPriceCents(
                calculateTotalCents(
                  order.subtotalCents,
                  order.discountCents,
                  order.deliveryFeeCents ?? 0
                )
              )}
            </span>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">{t("shippingAddress")}</p>
        <p className="text-muted-foreground text-sm">
          {order.shippingName}
          <br />
          {order.shippingLine1}
          {order.shippingLine2 ? `, ${order.shippingLine2}` : ""}
          <br />
          {order.shippingCity}
          {order.shippingState ? `, ${order.shippingState}` : ""}
          {order.shippingPostalCode ? ` ${order.shippingPostalCode}` : ""}
          {order.shippingCountry && (
            <>
              <br />
              {order.shippingCountry}
            </>
          )}
          {order.shippingPhone ? ` · ${order.shippingPhone}` : ""}
        </p>
        {showWhatsAppButton && order.shippingPhone && (
          <a
            href={buildWhatsAppUrl(order.shippingPhone)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground mt-2 inline-flex items-center gap-1.5 text-sm"
          >
            <WhatsAppIcon className="size-4 text-[#25D366]" />
            {t("contactOnWhatsApp")}
          </a>
        )}
      </div>

      {order.trackingNumber && (
        <div>
          <p className="mb-1 text-sm font-medium">{t("tracking")}</p>
          <p className="text-muted-foreground text-sm">{order.trackingNumber}</p>
        </div>
      )}

      {order.notes && (
        <div>
          <p className="mb-1 text-sm font-medium">{t("notes")}</p>
          <p className="text-muted-foreground text-sm whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}
    </div>
  );
}
