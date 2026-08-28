import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import type { AppLocale } from "@/i18n/routing";
import { localize } from "@/lib/localizedContent";
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
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<{
    brand?: string;
    category?: string;
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
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SalePage" });
  return { title: t("title") };
}

export default async function SalePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const rawParams = await searchParams;
  const filters = parseProductFilterParams(rawParams);
  const t = await getTranslations("SalePage");

  // "Is this product on sale" can't be expressed as a Prisma `where`
  // clause — it depends on Sale scope-matching (site-wide/brand/
  // collection) resolved in memory by applySaleToProduct (see
  // src/lib/sales.ts). So every facet/filter here runs in memory via
  // matchesFacetFilters, against the same shared, cached (60s)
  // full-catalog array every other listing page now uses too — see
  // src/server/queries.ts.
  const [allActiveProducts, sales, cartQuantityByVariant, wishlistedProductIds] = await Promise.all([
    getActiveProductsCached(),
    db.sale.findMany({ where: { isActive: true } }),
    getCartQuantityByVariant(),
    getWishlistedProductIds(),
  ]);

  const now = new Date();
  const onSaleProducts = allActiveProducts
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
    })
    .filter((product) => product.compareAtCents !== null);

  const { sizes, colors } = computeSizeColorFacets(onSaleProducts.flatMap((p) => p.variants));
  const brandOptions = uniqueOptions(
    onSaleProducts
      .filter((p) => p.brand !== null)
      .map((p) => ({ value: p.brand!.slug, label: p.brand!.name }))
  );
  const categoryOptions = uniqueOptions(
    onSaleProducts.flatMap((p) =>
      p.collections.map((pc) => ({
        value: pc.collection.handle,
        label: localize(pc.collection.title, pc.collection.titleAr, locale),
      }))
    )
  );
  const priceBounds = computePriceBounds(onSaleProducts);

  const filteredProducts = sortProducts(
    filterByPriceRange(
      onSaleProducts.filter((p) => matchesFacetFilters(p, filters)),
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
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground max-w-xl">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <FilterSidebar
          categories={categoryOptions}
          brands={brandOptions}
          sizes={sizes}
          colors={colors}
          priceBounds={priceBounds}
        />

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
              {onSaleProducts.length === 0 ? t("noActiveSales") : t("noMatches")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
