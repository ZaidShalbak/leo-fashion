// Shared filter logic for every storefront product-listing page
// (/collections/[handle], /brands/[slug], /sale) — pure helpers in the
// same spirit as sales.ts/discount.ts/heroBanners.ts, kept in one place
// here (rather than duplicated per page, the way layout.tsx's simpler
// brand/collection picklist queries are) because this logic is
// materially more complex: 5 facets + sort + price, which would drift
// fast if tripled across pages.
import type { Prisma } from "@prisma/client";

export type ProductFilterParams = {
  brands: string[];
  categories: string[];
  colors: string[];
  sizes: string[];
  sort?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
};

/** Splits a comma-separated URL param into a clean array (no empty
 * entries from trailing/leading/double commas). */
function splitParam(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/** minPrice/maxPrice are plain dollars in the URL (e.g. ?minPrice=20) —
 * converted to cents here, the only unit the rest of the app deals in. */
export function parseProductFilterParams(searchParams: {
  brand?: string;
  category?: string;
  color?: string;
  size?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
}): ProductFilterParams {
  const minPriceDollars = searchParams.minPrice ? Number(searchParams.minPrice) : undefined;
  const maxPriceDollars = searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined;
  return {
    brands: splitParam(searchParams.brand),
    categories: splitParam(searchParams.category),
    colors: splitParam(searchParams.color),
    sizes: splitParam(searchParams.size),
    sort: searchParams.sort,
    minPriceCents:
      minPriceDollars !== undefined && Number.isFinite(minPriceDollars)
        ? Math.round(minPriceDollars * 100)
        : undefined,
    maxPriceCents:
      maxPriceDollars !== undefined && Number.isFinite(maxPriceDollars)
        ? Math.round(maxPriceDollars * 100)
        : undefined,
  };
}

/**
 * Combines a caller-supplied base scope (the collection/brand a page is
 * already pinned to, or {} for the unscoped /sale page) with the
 * checkbox facets. Price range is deliberately NOT included here — it's
 * applied in-memory after sale pricing is resolved (see filterByPriceRange)
 * since basePriceCents in the DB is the pre-sale price, not what's shown.
 */
export function buildProductWhereInput(
  scopeWhere: Prisma.ProductWhereInput,
  filters: Pick<ProductFilterParams, "brands" | "categories" | "colors" | "sizes">
): Prisma.ProductWhereInput {
  return {
    ...scopeWhere,
    // brands/categories are brand slugs / collection handles, not ids —
    // human-readable in the URL, filtered through the relation rather
    // than needing a separate slug/handle -> id resolution query.
    ...(filters.brands.length > 0 ? { brand: { slug: { in: filters.brands } } } : {}),
    ...(filters.categories.length > 0
      ? { collections: { some: { collection: { handle: { in: filters.categories } } } } }
      : {}),
    ...(filters.colors.length > 0 || filters.sizes.length > 0
      ? {
          variants: {
            some: {
              ...(filters.sizes.length > 0 ? { size: { in: filters.sizes } } : {}),
              ...(filters.colors.length > 0 ? { color: { in: filters.colors } } : {}),
            },
          },
        }
      : {}),
  };
}

export function productSortOrderBy(sort: string | undefined): Prisma.ProductOrderByWithRelationInput {
  if (sort === "price-asc") return { basePriceCents: "asc" };
  if (sort === "price-desc") return { basePriceCents: "desc" };
  return { createdAt: "desc" };
}

/** Distinct size/color values across an unfiltered product scope, so the
 * checkbox options never shrink as filters are applied — same rule the
 * old FilterBar's sizes/colors picklists already followed. */
export function computeSizeColorFacets(
  variants: { size: string; color: string }[]
): { sizes: string[]; colors: string[] } {
  return {
    sizes: [...new Set(variants.map((v) => v.size))].sort(),
    colors: [...new Set(variants.map((v) => v.color))].sort(),
  };
}

/** Real min/max basePriceCents across an unfiltered, sale-adjusted
 * product scope — the slider's bounds are only ever as wide as what's
 * actually purchasable on this page. */
export function computePriceBounds(products: { basePriceCents: number }[]): {
  min: number;
  max: number;
} {
  if (products.length === 0) return { min: 0, max: 0 };
  let min = products[0].basePriceCents;
  let max = products[0].basePriceCents;
  for (const product of products) {
    if (product.basePriceCents < min) min = product.basePriceCents;
    if (product.basePriceCents > max) max = product.basePriceCents;
  }
  return { min, max };
}

/**
 * In-memory equivalent of buildProductWhereInput's facet conditions —
 * needed only by the /sale page, where "is this product on sale" can't
 * be expressed as a Prisma `where` (it depends on Sale scope-matching
 * resolved in memory via applySaleToProduct), so every other facet has
 * to be applied in memory alongside it rather than mixing a DB-level
 * filter with an in-memory one.
 */
export function matchesFacetFilters(
  product: {
    brand: { slug: string } | null;
    collections: { collection: { handle: string } }[];
    variants: { size: string; color: string }[];
  },
  filters: Pick<ProductFilterParams, "brands" | "categories" | "colors" | "sizes">
): boolean {
  if (filters.brands.length > 0 && (!product.brand || !filters.brands.includes(product.brand.slug))) {
    return false;
  }
  if (
    filters.categories.length > 0 &&
    !product.collections.some((pc) => filters.categories.includes(pc.collection.handle))
  ) {
    return false;
  }
  if (filters.sizes.length > 0 && !product.variants.some((v) => filters.sizes.includes(v.size))) {
    return false;
  }
  if (filters.colors.length > 0 && !product.variants.some((v) => filters.colors.includes(v.color))) {
    return false;
  }
  return true;
}

/** Filters an already sale-adjusted product list (basePriceCents holds
 * the final displayed price, see applySaleToProduct) down to a price
 * range. Bounds are inclusive; either end can be omitted. */
export function filterByPriceRange<T extends { basePriceCents: number }>(
  products: T[],
  minCents: number | undefined,
  maxCents: number | undefined
): T[] {
  if (minCents === undefined && maxCents === undefined) return products;
  return products.filter((product) => {
    if (minCents !== undefined && product.basePriceCents < minCents) return false;
    if (maxCents !== undefined && product.basePriceCents > maxCents) return false;
    return true;
  });
}
