// Cached, shared storefront read queries — distinct from
// src/lib/productFilters.ts's pure/DB-free helpers, and from
// src/server/actions (mutations). Every function here is safe to cache
// because it returns only shared, public catalog data — NEVER wrap a
// query that touches getCurrentUser(), a cart, or a wishlist here, since
// unstable_cache's result is shared across every visitor's request.
//
// Also deliberately excludes Sale and HeroBanner rows: both carry
// startsAt/endsAt fields that isHeroBannerLive/isSaleLive compare with
// `.getTime()` (see src/lib/heroBanners.ts). unstable_cache round-trips
// its return value through serialization, which isn't guaranteed to
// preserve real Date instances on a cache hit — so anything whose
// consumers do date arithmetic stays uncached rather than risking a
// runtime crash. Sale/HeroBanner queries are already cheap (no joins,
// only ever a handful of rows), so there's no real cost to leaving them
// live.
import { unstable_cache } from "next/cache";

import { db } from "@/server/db";

// Catalog data (products, collections, brands) changes only when an
// admin edits something — a shopper seeing it up to a minute stale is
// an easy trade for cutting every page load and every filter-sidebar
// click down from a real database round trip to an in-memory lookup.
const CATALOG_REVALIDATE_SECONDS = 60;

/**
 * Every active product, fully loaded (images/variants/brand/collections).
 * The single shared source for /collections/[handle], /brands/[slug],
 * /sale, and the homepage's "new arrivals" section — each page filters
 * and sorts this same array in memory (see productFilters.ts) instead of
 * running its own DB query per page load or per filter change.
 */
export const getActiveProductsCached = unstable_cache(
  async () =>
    db.product.findMany({
      where: { status: "active" },
      include: {
        images: true,
        variants: true,
        brand: true,
        collections: { include: { collection: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ["active-products-full"],
  { revalidate: CATALOG_REVALIDATE_SECONDS }
);

/** One representative active product's lead image per collection —
 * shared by the homepage's hero-carousel fallback/category tiles and
 * the header's Categories mega menu, which used to run this identical
 * query independently on every single page load. */
export const getCollectionsWithLeadImageCached = unstable_cache(
  async () =>
    db.collection.findMany({
      orderBy: { title: "asc" },
      include: {
        products: {
          take: 1,
          orderBy: { product: { createdAt: "asc" } },
          where: { product: { status: "active" } },
          include: {
            product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } },
          },
        },
      },
    }),
  ["collections-with-lead-image"],
  { revalidate: CATALOG_REVALIDATE_SECONDS }
);

/** Every brand with its active product count — shared by the homepage's
 * brand section and the header's Brands mega menu (same dedup as
 * above). */
export const getBrandsWithActiveCountCached = unstable_cache(
  async () =>
    db.brand.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: { where: { status: "active" } } } } },
    }),
  ["brands-with-active-count"],
  { revalidate: CATALOG_REVALIDATE_SECONDS }
);

/** Top 8 products by units sold across non-cancelled orders. Ranking is
 * cheap (one groupBy), but re-fetching the winning products' full detail
 * is the same shape/cost as getActiveProductsCached, so it's cached the
 * same way. */
export const getBestSellersCached = unstable_cache(
  async () => {
    const ranked = await db.orderItem.groupBy({
      by: ["productId"],
      where: { productId: { not: null }, order: { status: { not: "cancelled" } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 8,
    });
    const productIds = ranked.map((row) => row.productId).filter((id): id is string => id !== null);
    if (productIds.length === 0) return [];

    const products = await db.product.findMany({
      where: { id: { in: productIds }, status: "active" },
      include: {
        images: true,
        variants: true,
        brand: true,
        collections: { select: { collectionId: true } },
      },
    });
    const productById = new Map(products.map((product) => [product.id, product]));
    // groupBy's own ordering (by units sold) is what makes this "best
    // sellers" rather than an arbitrary product list — findMany's `in`
    // filter doesn't preserve it, so re-order by walking productIds.
    return productIds
      .map((id) => productById.get(id))
      .filter((product): product is NonNullable<typeof product> => product !== undefined);
  },
  ["best-sellers"],
  { revalidate: CATALOG_REVALIDATE_SECONDS }
);
