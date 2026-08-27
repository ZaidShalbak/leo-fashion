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
  parseProductFilterParams,
  sortProducts,
  uniqueOptions,
} from "@/lib/productFilters";
import { getActiveProductsCached } from "@/server/queries";
import { getCartQuantityByVariant } from "@/server/actions/cart";
import { getWishlistedProductIds } from "@/server/actions/wishlist";
import { ProductCard } from "@/components/storefront/ProductCard";
import { FilterSidebar } from "@/components/storefront/FilterSidebar";

type Props = {
  params: Promise<{ slug: string; locale: AppLocale }>;
  searchParams: Promise<{
    category?: string;
    color?: string;
    size?: string;
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
};

export async function generateMetadata({
  params,
}: Pick<Props, "params">): Promise<Metadata> {
  const { slug, locale } = await params;
  const t = await getTranslations({ locale, namespace: "BrandDetailPage" });
  const brand = await db.brand.findUnique({ where: { slug } });
  return { title: brand ? localize(brand.name, brand.nameAr, locale) : t("fallbackTitle") };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug, locale } = await params;
  const rawParams = await searchParams;
  const filters = parseProductFilterParams(rawParams);
  const t = await getTranslations("BrandDetailPage");

  // Not cached — same reasoning as the collection page's own lookup.
  const brandRaw = await db.brand.findUnique({ where: { slug } });
  if (!brandRaw) notFound();
  const brand = {
    ...brandRaw,
    name: localize(brandRaw.name, brandRaw.nameAr, locale),
    description: localizeOptional(brandRaw.description, brandRaw.descriptionAr, locale),
  };

  const [allActiveProducts, sales, cartQuantityByVariant, wishlistedProductIds] = await Promise.all([
    // Shared, cached (60s) full-catalog fetch — see src/server/queries.ts.
    getActiveProductsCached(),
    db.sale.findMany({ where: { isActive: true } }),
    getCartQuantityByVariant(),
    getWishlistedProductIds(),
  ]);

  const now = new Date();
  const inScope = allActiveProducts.filter((product) => product.brandId === brand.id);
  // Same "localize + sale-adjust once, up front" pattern as the
  // collection page — see its comment for why the adjusted price is
  // merged back onto the full object instead of used directly.
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

  // Brand isn't offered as a facet here — it would just duplicate this
  // page's own scope (see FilterSidebar's brands prop being omitted
  // below).
  const { sizes, colors } = computeSizeColorFacets(productsWithPricing.flatMap((p) => p.variants));
  const categoryOptions = uniqueOptions(
    productsWithPricing.flatMap((p) =>
      p.collections.map((pc) => ({
        value: pc.collection.handle,
        label: localize(pc.collection.title, pc.collection.titleAr, locale),
      }))
    )
  );
  const priceBounds = computePriceBounds(productsWithPricing);

  const products = sortProducts(
    filterByPriceRange(
      productsWithPricing.filter((p) => matchesFacetFilters(p, filters)),
      filters.minPriceCents,
      filters.maxPriceCents
    ),
    filters.sort
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{brand.name}</h1>
        {brand.description && (
          <p className="text-muted-foreground max-w-xl">{brand.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <FilterSidebar categories={categoryOptions} sizes={sizes} colors={colors} priceBounds={priceBounds} />

        <div>
          {products.length > 0 ? (
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
