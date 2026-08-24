import {
  Body,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type { OrderStatus } from "@prisma/client";

import { calculateTotalCents } from "@/lib/cart-totals";
import { formatPriceCents } from "@/components/storefront/PriceDisplay";
import { getTranslator } from "@/i18n/getTranslator";
import type { AppLocale } from "@/i18n/routing";
import type { OrderWithItems } from "@/server/email";

type NotifiableStatus = Extract<OrderStatus, "shipped" | "delivered" | "cancelled">;

function subjectKey(status: NotifiableStatus) {
  return status === "shipped"
    ? "subjectShipped"
    : status === "delivered"
      ? "subjectDelivered"
      : "subjectCancelled";
}

function headingKey(status: NotifiableStatus) {
  return status === "shipped"
    ? "headingShipped"
    : status === "delivered"
      ? "headingDelivered"
      : "headingCancelled";
}

function bodyKey(status: NotifiableStatus) {
  return status === "shipped" ? "bodyShipped" : status === "delivered" ? "bodyDelivered" : "bodyCancelled";
}

/**
 * Sent to the customer when their order moves to shipped/delivered/
 * cancelled — never for pending/processing. Renders in the locale the
 * customer actually checked out in (order.localeSnapshot), same "snapshot,
 * never re-derive" philosophy as the rest of Order's snapshot fields; falls
 * back to "en" for orders placed before localeSnapshot existed.
 */
export function CustomerOrderStatusEmail({
  order,
  customerName,
  locale,
}: {
  order: OrderWithItems;
  customerName: string;
  locale: AppLocale;
}) {
  const status = order.status as NotifiableStatus;
  const t = getTranslator(locale, "CustomerOrderStatusEmail");
  const tDetail = getTranslator(locale, "OrderDetail");
  const orderNumber = order.id.slice(-8).toUpperCase();
  const total = calculateTotalCents(
    order.subtotalCents,
    order.discountCents,
    order.deliveryFeeCents ?? 0
  );
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <Html dir={dir} lang={locale}>
      <Head />
      <Preview>{t(subjectKey(status), { id: orderNumber })}</Preview>
      <Body style={{ backgroundColor: "#f4f4f5", fontFamily: "sans-serif", direction: dir }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", maxWidth: "560px" }}>
          <Heading style={{ fontSize: "20px" }}>{t(headingKey(status))}</Heading>
          <Text style={{ color: "#52525b" }}>{t("greeting", { name: customerName })}</Text>
          <Text style={{ color: "#52525b" }}>
            {t(bodyKey(status))}
          </Text>

          <Text style={{ color: "#71717a", fontSize: "13px" }}>
            {tDetail("orderNumber", { id: orderNumber })}
          </Text>

          {order.trackingNumber && status === "shipped" && (
            <Text style={{ fontWeight: 600 }}>
              {t("trackingNumber", { number: order.trackingNumber })}
            </Text>
          )}

          <Hr style={{ margin: "20px 0" }} />

          <Section>
            <Text style={{ margin: "0 0 8px", fontWeight: 600 }}>{tDetail("items")}</Text>
            {order.items.map((item) => (
              <Row key={item.id} style={{ marginBottom: "8px" }}>
                <Column>
                  <Text style={{ margin: 0 }}>{item.titleSnapshot}</Text>
                  <Text style={{ margin: 0, color: "#71717a", fontSize: "13px" }}>
                    {item.size} / {item.color} × {item.quantity}
                  </Text>
                </Column>
                <Column align={dir === "rtl" ? "left" : "right"}>
                  <Text style={{ margin: 0 }}>{formatPriceCents(item.priceCents * item.quantity)}</Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={{ margin: "20px 0" }} />

          <Section>
            <Row>
              <Column><Text style={{ margin: "6px 0", fontWeight: 600 }}>{tDetail("total")}</Text></Column>
              <Column align={dir === "rtl" ? "left" : "right"}>
                <Text style={{ margin: "6px 0", fontWeight: 600 }}>{formatPriceCents(total)}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={{ margin: "20px 0" }} />

          <Text style={{ color: "#52525b" }}>{t("thanks")}</Text>
        </Container>
      </Body>
    </Html>
  );
}

CustomerOrderStatusEmail.subjectFor = (order: OrderWithItems, locale: AppLocale): string => {
  const t = getTranslator(locale, "CustomerOrderStatusEmail");
  const orderNumber = order.id.slice(-8).toUpperCase();
  return t(subjectKey(order.status as NotifiableStatus), { id: orderNumber });
};
