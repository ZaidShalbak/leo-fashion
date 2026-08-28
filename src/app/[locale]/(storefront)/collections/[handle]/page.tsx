import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import type { AppLocale } from "@/i18n/routing";
import { localize, localizeOptional } from "@/lib/localizedContent";
import { applySaleToProduct } from "@/lib/sales";
import {
  computePriceBounds,
  computeSizeColorFacets,
  filterByPriceRange,
  matchesFacetFilters,
  paginateProducts,
  parseProductFilterParams,
  sortProducts,
  uniqueOptions,
} from "@/lib/productFilters";
import { getActiveProductsCached } from "@/server/queries";
import { getCartQuantityByVariant } from "@/server/actions/cart";
import { getWishlistedProductIds } from "@/server/actions/wishlist";
import { ProductCard } from "@/components/storefront/ProductCard";
import { FilterSidebar } from "@/components/storefront/FilterSidebar";
import { Pagination } from "@/components/storefront/Pagination";

const PAGE_SIZE = 24;

type Props = {
  params: Promise<{ handle: string; locale: AppLocale }>;
  searchParams: Promise<{
    brand?: string;
    color?: string;
    size?: string;
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
    page?: string;
  }>;
};

export async function generateMetadata({
  params,
}: Pick<Props, "params">): Promise<Metadata> {
  const { handle, locale } = await params;
  const t = await getTranslations({ locale, namespace: "CollectionPage" });
  const collection = await db.collection.findUnique({ where: { handle } });
  return {
    title: collection ? localize(collection.title, collection.titleAr, locale) : t("fallbackTitle"),
  };
}

export default async function CollectionPage({
  params,
  searchParams,
}: Props) {
  const { handle, locale } = await params;
  const rawParams = await searchParams;
  const filters = parseProductFilterParams(rawParams);
  const t = await getTranslations("CollectionPage");

  // Not cached — a single-row lookup by unique index is already cheap,
  // and this is exactly the field (title/description) an admin most
  // wants to see reflected instantly after an edit.
  const collectionRaw = await db.collection.findUnique({ where: { handle } });
  if (!collectionRaw) notFound();
  const collection = {
    ...collectionRaw,
    title: localize(collectionRaw.title, collectionRaw.titleAr, locale),
    description: localizeOptional(collectionRaw.description, collectionRaw.descriptionAr, locale),
  };

  const [allActiveProducts, sales, cartQuantityByVariant, wishlistedProductIds] = await Promise.all([
    // Shared, cached (60s) full-catalog fetch — see src/server/queries.ts.
    // Filtering down to this collection, and every facet/sort/price
    // operation below, all happen in memory against this one array, so a
    // sidebar filter click never has to hit the database.
    getActiveProductsCached(),
    db.sale.findMany({ where: { isActive: true } }),
    getCartQuantityByVariant(),
    getWishlistedProductIds(),
  ]);

  const now = new Date();
  const inScope = allActiveProducts.filter((product) =>
    product.collections.some((pc) => pc.collection.id === collection.id)
  );
  // Localized and sale-adjusted once, up front — every facet (brand/
  // color/size/price) and the final product grid all read from this same
  // array afterward. Merges the sale-adjusted price back onto the full
  // original object (rather than using applySaleToProduct's own return
  // value directly) since that helper strips `collections`, which the
  // Brand facet still needs downstream.
  const productsWithPricing = inScope
    .map((product) => ({
      ...product,
      title: localize(product.title, product.titleAr, locale),
      brand: product.brand
        ? { ...product.brand, name: localize(product.brand.name, product.brand.nameAr, locale) }
        : product.brand,
    }))
    .map((product) => {
      const adjusted = applySaleToProduct(
        { ...product, collections: product.collections.map((pc) => ({ collectionId: pc.collection.id })) },
        sales,
        now
      );
      return { ...product, basePriceCents: adjusted.basePriceCents, compareAtCents: adjusted.compareAtCents };
    });

  // Category isn't offered as a facet here — it would just duplicate
  // this page's own scope (see FilterSidebar's categories prop being
  // omitted below).
  const { sizes, colors } = computeSizeColorFacets(productsWithPricing.flatMap((p) => p.variants));
  const brandOptions = uniqueOptions(
    productsWithPricing.filter((p) => p.brand !== null).map((p) => ({ value: p.brand!.slug, label: p.brand!.name }))
  );
  const priceBounds = computePriceBounds(productsWithPricing);

  const filteredProducts = sortProducts(
    filterByPriceRange(
      productsWithPricing.filter((p) => matchesFacetFilters(p, filters)),
      filters.minPriceCents,
      filters.maxPriceCents
    ),
    filters.sort
  );
  const { items: products, currentPage, totalPages } = paginateProducts(
    filteredProducts,
    filters.page,
    PAGE_SIZE
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {collection.title}
        </h1>
        {collection.description && (
          <p className="text-muted-foreground max-w-xl">
            {collection.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <FilterSidebar brands={brandOptions} sizes={sizes} colors={colors} priceBounds={priceBounds} />

        <div>
          {products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    cartQuantityByVariant={cartQuantityByVariant}
                    isWishlisted={wishlistedProductIds.has(product.id)}
                  />
                ))}
              </div>
              <Pagination currentPage={currentPage} totalPages={totalPages} />
            </>
          ) : (
            <p className="text-muted-foreground py-12 text-center">
              {t("noMatches")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
