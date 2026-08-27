import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import type { AppLocale } from "@/i18n/routing";
import { localize, localizeOptional } from "@/lib/localizedContent";
import { applySaleToProduct } from "@/lib/sales";
import {
  buildProductWhereInput,
  computeSizeColorFacets,
  filterByPriceRange,
  parseProductFilterParams,
  productSortOrderBy,
} from "@/lib/productFilters";
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

  const brandRaw = await db.brand.findUnique({ where: { slug } });
  if (!brandRaw) notFound();
  const brand = {
    ...brandRaw,
    name: localize(brandRaw.name, brandRaw.nameAr, locale),
    description: localizeOptional(brandRaw.description, brandRaw.descriptionAr, locale),
  };

  const scopeWhere = { status: "active" as const, brandId: brand.id };

  // Same "compute against the unfiltered scope" rule as the collection
  // page — Brand isn't offered as a facet here, since it would just
  // duplicate this page's own scope (see FilterSidebar's brands prop
  // being omitted below).
  const [allVariants, categoriesRaw, priceAgg, productsRaw, sales, cartQuantityByVariant, wishlistedProductIds] =
    await Promise.all([
      db.productVariant.findMany({ where: { product: scopeWhere }, select: { size: true, color: true } }),
      db.collection.findMany({
        where: { products: { some: { product: scopeWhere } } },
        orderBy: { title: "asc" },
      }),
      db.product.aggregate({
        where: scopeWhere,
        _min: { basePriceCents: true },
        _max: { basePriceCents: true },
      }),
      db.product.findMany({
        where: buildProductWhereInput(scopeWhere, filters),
        include: {
          images: true,
          variants: true,
          brand: true,
          collections: { select: { collectionId: true } },
        },
        orderBy: productSortOrderBy(filters.sort),
      }),
      db.sale.findMany({ where: { isActive: true } }),
      getCartQuantityByVariant(),
      getWishlistedProductIds(),
    ]);

  const { sizes, colors } = computeSizeColorFacets(allVariants);
  const categoryOptions = categoriesRaw.map((collection) => ({
    value: collection.handle,
    label: localize(collection.title, collection.titleAr, locale),
  }));
  const priceBounds = {
    min: priceAgg._min.basePriceCents ?? 0,
    max: priceAgg._max.basePriceCents ?? 0,
  };

  const now = new Date();
  const products = filterByPriceRange(
    productsRaw
      .map((product) => ({
        ...product,
        title: localize(product.title, product.titleAr, locale),
        brand: product.brand
          ? { ...product.brand, name: localize(product.brand.name, product.brand.nameAr, locale) }
          : product.brand,
      }))
      .map((product) => applySaleToProduct(product, sales, now)),
    filters.minPriceCents,
    filters.maxPriceCents
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
