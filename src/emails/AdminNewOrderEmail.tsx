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

import { calculateTotalCents } from "@/lib/cart-totals";
import { formatPriceCents } from "@/components/storefront/PriceDisplay";
import type { OrderWithItems } from "@/server/email";

/**
 * Sent to every admin user when a customer places an order. Always
 * English, matching the admin dashboard's English-only convention — unlike
 * CustomerOrderStatusEmail, there's no locale to render this in.
 */
export function AdminNewOrderEmail({
  order,
  customerName,
  customerEmail,
}: {
  order: OrderWithItems;
  customerName: string;
  customerEmail: string;
}) {
  const orderNumber = order.id.slice(-8).toUpperCase();
  const total = calculateTotalCents(
    order.subtotalCents,
    order.discountCents,
    order.deliveryFeeCents ?? 0
  );

  return (
    <Html>
      <Head />
      <Preview>New order #{orderNumber} from {customerName}</Preview>
      <Body style={{ backgroundColor: "#f4f4f5", fontFamily: "sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", maxWidth: "560px" }}>
          <Heading style={{ fontSize: "20px" }}>New order #{orderNumber}</Heading>
          <Text style={{ color: "#52525b" }}>
            Placed {order.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </Text>

          <Section style={{ marginTop: "16px" }}>
            <Text style={{ margin: 0, fontWeight: 600 }}>Customer</Text>
            <Text style={{ margin: 0, color: "#52525b" }}>
              {customerName} — {customerEmail}
            </Text>
          </Section>

          <Hr style={{ margin: "20px 0" }} />

          <Section>
            <Text style={{ margin: "0 0 8px", fontWeight: 600 }}>Items</Text>
            {order.items.map((item) => (
              <Row key={item.id} style={{ marginBottom: "8px" }}>
                <Column>
                  <Text style={{ margin: 0 }}>{item.titleSnapshot}</Text>
                  <Text style={{ margin: 0, color: "#71717a", fontSize: "13px" }}>
                    {item.size} / {item.color} × {item.quantity}
                  </Text>
                </Column>
                <Column align="right">
                  <Text style={{ margin: 0 }}>{formatPriceCents(item.priceCents * item.quantity)}</Text>
                </Column>
              </Row>
            ))}
          </Section>

          <Hr style={{ margin: "20px 0" }} />

          <Section>
            <Row>
              <Column><Text style={{ margin: "2px 0", color: "#52525b" }}>Subtotal</Text></Column>
              <Column align="right"><Text style={{ margin: "2px 0" }}>{formatPriceCents(order.subtotalCents)}</Text></Column>
            </Row>
            {order.discountCents > 0 && (
              <Row>
                <Column>
                  <Text style={{ margin: "2px 0", color: "#15803d" }}>
                    Discount{order.discountCodeSnapshot ? ` (${order.discountCodeSnapshot})` : ""}
                  </Text>
                </Column>
                <Column align="right">
                  <Text style={{ margin: "2px 0", color: "#15803d" }}>
                    −{formatPriceCents(order.discountCents)}
                  </Text>
                </Column>
              </Row>
            )}
            {order.deliveryFeeCents != null && (
              <Row>
                <Column>
                  <Text style={{ margin: "2px 0", color: "#52525b" }}>
                    Delivery{order.deliveryZoneNameSnapshot ? ` (${order.deliveryZoneNameSnapshot})` : ""}
                  </Text>
                </Column>
                <Column align="right">
                  <Text style={{ margin: "2px 0" }}>{formatPriceCents(order.deliveryFeeCents)}</Text>
                </Column>
              </Row>
            )}
            <Row>
              <Column><Text style={{ margin: "6px 0", fontWeight: 600 }}>Total</Text></Column>
              <Column align="right"><Text style={{ margin: "6px 0", fontWeight: 600 }}>{formatPriceCents(total)}</Text></Column>
            </Row>
          </Section>

          <Hr style={{ margin: "20px 0" }} />

          <Section>
            <Text style={{ margin: "0 0 4px", fontWeight: 600 }}>Shipping address</Text>
            <Text style={{ margin: 0, color: "#52525b" }}>
              {order.shippingName}
              <br />
              {order.shippingLine1}
              {order.shippingLine2 ? `, ${order.shippingLine2}` : ""}
              <br />
              {order.shippingCity}
              {order.shippingState ? `, ${order.shippingState}` : ""} {order.shippingPostalCode}
              <br />
              {order.shippingCountry}
              {order.shippingPhone ? ` · ${order.shippingPhone}` : ""}
            </Text>
          </Section>

          {order.notes && (
            <Section style={{ marginTop: "16px" }}>
              <Text style={{ margin: "0 0 4px", fontWeight: 600 }}>Notes</Text>
              <Text style={{ margin: 0, color: "#52525b", whiteSpace: "pre-wrap" }}>{order.notes}</Text>
            </Section>
          )}
        </Container>
      </Body>
    </Html>
  );
}
