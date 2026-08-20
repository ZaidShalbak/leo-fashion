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
 * Total owed after a discount — deliberately not a stored column on
 * Order, just subtotal minus discount computed at display time. See
 * discountCents's comment in prisma/schema.prisma for why.
 */
export function calculateTotalCents(
  subtotalCents: number,
  discountCents: number
): number {
  return subtotalCents - discountCents;
}
