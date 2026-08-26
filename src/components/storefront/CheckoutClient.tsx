"use client";

import { useState } from "react";

import { CheckoutForm, type DeliveryZoneOption } from "./CheckoutForm";
import { CheckoutSummary } from "./CheckoutSummary";
import type { PlaceOrderInput } from "@/lib/validators/order";

type SavedAddress = React.ComponentProps<typeof CheckoutForm>["addresses"][number];
type SummaryLine = React.ComponentProps<typeof CheckoutSummary>["items"][number];

/**
 * Owns the delivery-zone selection shared between CheckoutForm (the radio
 * list, part of what's actually submitted) and CheckoutSummary (needs the
 * same selection to show the right fee/total) — same lifted-state pattern
 * ProductDetail uses for color, rendered here as fragment siblings so they
 * land as the two direct children of the checkout page's existing
 * `grid lg:grid-cols-[1fr_320px]` unchanged.
 */
export function CheckoutClient({
  isSignedIn,
  addresses,
  items,
  zones,
  summaryItems,
  subtotalCents,
  discountCents,
  discountCode,
}: {
  isSignedIn: boolean;
  addresses: SavedAddress[];
  items: PlaceOrderInput["items"];
  zones: DeliveryZoneOption[];
  summaryItems: SummaryLine[];
  subtotalCents: number;
  discountCents: number;
  discountCode: string | null;
}) {
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.id ?? "");

  return (
    <>
      <CheckoutForm
        isSignedIn={isSignedIn}
        addresses={addresses}
        items={items}
        zones={zones}
        selectedZoneId={selectedZoneId}
        onZoneChange={setSelectedZoneId}
      />
      <CheckoutSummary
        items={summaryItems}
        subtotalCents={subtotalCents}
        discountCents={discountCents}
        discountCode={discountCode}
        zones={zones}
        selectedZoneId={selectedZoneId}
      />
    </>
  );
}
