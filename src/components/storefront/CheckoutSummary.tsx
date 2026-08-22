"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { calculateTotalCents } from "@/lib/cart-totals";
import { formatPriceCents, PriceDisplay } from "./PriceDisplay";
import type { DeliveryZoneOption } from "./CheckoutForm";

type SummaryLine = {
  id: string;
  title: string;
  size: string;
  color: string;
  quantity: number;
  priceCents: number;
  compareAtCents: number | null;
};

/**
 * The order summary sidebar on /checkout — split out of the page itself
 * (a Server Component) because it needs to react to the delivery zone
 * picked in CheckoutForm to show the right fee/total, same reason
 * ProductDetail lifts color selection out to a shared parent instead of
 * leaving it inside VariantSelector. See CheckoutClient for the shared
 * `selectedZoneId` state both this and CheckoutForm read from.
 */
export function CheckoutSummary({
  items,
  subtotalCents,
  discountCents,
  discountCode,
  zones,
  selectedZoneId,
}: {
  items: SummaryLine[];
  subtotalCents: number;
  discountCents: number;
  discountCode: string | null;
  zones: DeliveryZoneOption[];
  selectedZoneId: string;
}) {
  const t = useTranslations("Checkout");
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? null;
  const deliveryFeeCents = selectedZone?.feeCents ?? 0;
  const totalCents = calculateTotalCents(subtotalCents, discountCents, deliveryFeeCents);

  return (
    <div className="border-border h-fit space-y-4 rounded-lg border p-4">
      <p className="text-sm font-medium">{t("orderSummary")}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="text-muted-foreground flex justify-between gap-2 text-sm"
          >
            <span>
              {t("lineItem", {
                title: item.title,
                size: item.size,
                color: item.color,
                quantity: item.quantity,
              })}
            </span>
            <PriceDisplay
              cents={item.priceCents * item.quantity}
              compareAtCents={
                item.compareAtCents != null ? item.compareAtCents * item.quantity : undefined
              }
              className="text-foreground shrink-0"
            />
          </li>
        ))}
      </ul>
      <div className="border-border space-y-1 border-t pt-3">
        <div className="text-muted-foreground flex justify-between text-sm">
          <span>{t("subtotal")}</span>
          <span>{formatPriceCents(subtotalCents)}</span>
        </div>
        {discountCents > 0 && (
          <div className="flex justify-between text-sm text-green-700 dark:text-green-500">
            <span>
              {discountCode ? t("discountWithCode", { code: discountCode }) : t("discount")}
            </span>
            <span>−{formatPriceCents(discountCents)}</span>
          </div>
        )}
        <div className="text-muted-foreground flex justify-between text-sm">
          <span>
            {t("delivery")}
            {selectedZone && (
              <>
                {" "}
                <span dir="rtl">({selectedZone.name})</span>
              </>
            )}
          </span>
          <span>
            {selectedZone ? formatPriceCents(deliveryFeeCents) : t("selectDeliveryArea")}
          </span>
        </div>
        <div className="flex justify-between text-sm font-medium">
          <span>{t("total")}</span>
          <span>{formatPriceCents(totalCents)}</span>
        </div>
      </div>
      <p className="text-muted-foreground text-xs">{t("noPaymentNote")}</p>
      <Link href="/cart" className="text-muted-foreground block text-xs underline">
        {t("editCart")}
      </Link>
    </div>
  );
}
