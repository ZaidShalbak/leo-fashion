// Pure, DB-free sale logic — mirrors discount.ts/heroBanners.ts's approach
// so the scheduling/scope/price math is trivial to unit test. Used
// wherever a product's price is shown or charged: storefront cards, the
// PDP, cart/checkout previews, and placeOrder's transaction.
import { isHeroBannerLive } from "./heroBanners";

// startOfDayUtc/endOfDayUtc (for converting a Sale's admin date-only
// inputs to UTC boundaries) are imported directly from "./heroBanners" by
// callers that need them (e.g. src/server/actions/admin/sales.ts) rather
// than redefined or re-exported here — heroBanners.ts is the canonical
// source for both directions.

export type SaleScope = "SITE_WIDE" | "COLLECTION" | "BRAND";

export type SaleRecord = {
  id: string;
  scope: SaleScope;
  percentOff: number;
  isActive: boolean;
  collectionId: string | null;
  brandId: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
};

/** Same predicate as isHeroBannerLive — a sale is live when active and,
 * if a scheduling window is set, "now" falls inside it. */
export function isSaleLive(
  sale: { isActive: boolean; startsAt: Date | null; endsAt: Date | null },
  now: Date
): boolean {
  return isHeroBannerLive(sale, now);
}

/** Whether a sale's scope matches this product, regardless of whether the
 * sale is currently live — see getBestSaleForProduct for the live check. */
export function saleMatchesProduct(
  sale: Pick<SaleRecord, "scope" | "collectionId" | "brandId">,
  product: { brandId: string | null; collectionIds: string[] }
): boolean {
  switch (sale.scope) {
    case "SITE_WIDE":
      return true;
    case "BRAND":
      return sale.brandId !== null && sale.brandId === product.brandId;
    case "COLLECTION":
      return sale.collectionId !== null && product.collectionIds.includes(sale.collectionId);
  }
}

/**
 * Picks the best currently-live sale for a product — "best" = highest
 * percentOff among every live sale whose scope matches (site-wide, the
 * product's brand, or any collection it belongs to). A product can only
 * ever show one struck-through price, so ties (e.g. a site-wide sale and
 * a brand sale both live at once) resolve to whichever gives the deeper
 * discount — the simplest rule to reason about and explain.
 */
export function getBestSaleForProduct(
  sales: SaleRecord[],
  product: { brandId: string | null; collectionIds: string[] },
  now: Date
): SaleRecord | null {
  let best: SaleRecord | null = null;
  for (const sale of sales) {
    if (!isSaleLive(sale, now)) continue;
    if (!saleMatchesProduct(sale, product)) continue;
    if (!best || sale.percentOff > best.percentOff) best = sale;
  }
  return best;
}

/** Rounds identically to validateDiscountCode's discountCents formula, for
 * consistency between the two discount mechanisms. */
export function applySalePercent(priceCents: number, percentOff: number): number {
  const discountCents = Math.round((priceCents * percentOff) / 100);
  return priceCents - discountCents;
}

/**
 * Composes a price with an optional best-matching sale into the exact
 * shape PriceDisplay wants — the single place every call site (storefront
 * cards, cart, checkout, placeOrder) goes through, so "how a sale changes
 * a price" is defined once. compareAtCents is null (not the unadjusted
 * price) when no sale applies, matching PriceDisplay's own hasDiscount
 * check.
 */
export function getSaleAdjustedPriceCents(
  priceCents: number,
  sale: SaleRecord | null
): { priceCents: number; compareAtCents: number | null } {
  if (!sale) return { priceCents, compareAtCents: null };
  return { priceCents: applySalePercent(priceCents, sale.percentOff), compareAtCents: priceCents };
}

/**
 * The card/list/search/PDP display helper: replaces basePriceCents with
 * its sale-adjusted value (so every existing `product.basePriceCents`
 * read downstream — ProductCard, BestSellerItem, etc — needs no other
 * change) and attaches compareAtCents for PriceDisplay's strike-through.
 * Takes a `collections` field only to compute scope matching — it's not
 * part of the returned shape, so callers don't need to add it to their
 * own product types.
 */
export function applySaleToProduct<T extends { basePriceCents: number; brandId: string | null }>(
  product: T & { collections?: { collectionId: string }[] },
  sales: SaleRecord[],
  now: Date
): Omit<T, "collections"> & { compareAtCents: number | null } {
  const { collections, ...rest } = product;
  const collectionIds = (collections ?? []).map((c) => c.collectionId);
  const bestSale = getBestSaleForProduct(sales, { brandId: product.brandId, collectionIds }, now);
  const { priceCents, compareAtCents } = getSaleAdjustedPriceCents(product.basePriceCents, bestSale);
  return { ...rest, basePriceCents: priceCents, compareAtCents };
}
