// Shared filter logic for every storefront product-listing page
// (/collections/[handle], /brands/[slug], /sale) — pure helpers in the
// same spirit as sales.ts/discount.ts/heroBanners.ts, kept in one place
// here (rather than duplicated per page, the way layout.tsx's simpler
// brand/collection picklist queries are) because this logic is
// materially more complex: 5 facets + sort + price, which would drift
// fast if tripled across pages.
//
// All three pages now filter/sort one shared, cached, in-memory product
// array (src/server/queries.ts's getActiveProductsCached) instead of
// building a per-page Prisma `where`/`orderBy` — this used to be a mix
// of DB-level filtering (collection/brand pages) and in-memory filtering
// (the /sale page, since "is this on sale" only resolves in memory).
// Unifying on one approach means a filter click never has to hit the
// database at all within the cache's revalidate window.

export type ProductFilterParams = {
  brands: string[];
  categories: string[];
  colors: string[];
  sizes: string[];
  sort?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  page: number;
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
  page?: string;
}): ProductFilterParams {
  const minPriceDollars = searchParams.minPrice ? Number(searchParams.minPrice) : undefined;
  const maxPriceDollars = searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined;
  const parsedPage = searchParams.page ? Number(searchParams.page) : 1;
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
    page: Number.isFinite(parsedPage) ? Math.max(1, Math.floor(parsedPage)) : 1,
  };
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

/** In-memory check for whether a product matches the checkbox facets
 * (brand/category/color/size) — the one shared filtering mechanism for
 * every listing page, run against the cached full product array. */
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

/**
 * In-memory sort over an already sale-adjusted product array. "newest"
 * is a no-op — the shared cached fetch (getActiveProductsCached) is
 * already ordered newest-first at the database level, and Array.filter
 * preserves that relative order, so re-sorting here would just repeat
 * the same comparison for free. Deliberately does NOT compare by
 * createdAt: unstable_cache round-trips its return value through
 * serialization, so Date fields aren't guaranteed to still be real Date
 * instances on a cache hit — comparing basePriceCents (a plain number)
 * sidesteps that entirely rather than risking a `.getTime()` crash.
 */
export function sortProducts<T extends { basePriceCents: number }>(
  products: T[],
  sort: string | undefined
): T[] {
  if (sort === "price-asc") return [...products].sort((a, b) => a.basePriceCents - b.basePriceCents);
  if (sort === "price-desc") return [...products].sort((a, b) => b.basePriceCents - a.basePriceCents);
  return products;
}

/**
 * Slices an already filtered-and-sorted product array to one page.
 * Clamps `page` into `[1, totalPages]` internally rather than trusting
 * the caller — a bookmarked/shared URL with a stale `?page=` (the
 * catalog shrank since) lands on the last real page instead of an empty
 * grid. `totalPages` is always at least 1, even for zero products, so
 * callers never have to special-case "no results" separately here.
 */
export function paginateProducts<T>(
  products: T[],
  page: number,
  pageSize: number
): { items: T[]; currentPage: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return { items: products.slice(start, start + pageSize), currentPage, totalPages };
}

/** Dedupes a list of {value,label} facet options by value, preserving
 * first-seen order. Shared by every page building a Brand or Category
 * checkbox list from the product array (values repeat once per product
 * that carries them). */
export function uniqueOptions(options: { value: string; label: string }[]): { value: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const option of options) {
    if (!seen.has(option.value)) seen.set(option.value, option.label);
  }
  return [...seen.entries()].map(([value, label]) => ({ value, label }));
}
