// Pure, DB-free helpers for cart/order money math so they're trivial to
// unit test without spinning up a database. Money is integer cents
// end-to-end per CLAUDE.md.

export type PricedLine = {
  quantity: number;
  priceCents: number;
};

export function calculateSubtotalCents(lines: PricedLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity * line.priceCents, 0);
}

/** A variant's effective price: its override if set, else the product's base price. */
export function effectivePriceCents(
  basePriceCents: number,
  priceOverrideCents: number | null | undefined
): number {
  return priceOverrideCents ?? basePriceCents;
}

/**
 * Total owed after a discount and delivery fee — deliberately not a
 * stored column on Order, just computed at display time from fields that
 * already are. See discountCents's/deliveryFeeCents's comments in
 * prisma/schema.prisma for why. deliveryFeeCents defaults to 0 so every
 * existing call site (cart page, before a delivery zone is even chosen)
 * keeps working unchanged.
 */
export function calculateTotalCents(
  subtotalCents: number,
  discountCents: number,
  deliveryFeeCents: number = 0
): number {
  return subtotalCents - discountCents + deliveryFeeCents;
}
