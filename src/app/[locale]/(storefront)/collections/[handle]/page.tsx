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
  params: Promise<{ handle: string; locale: AppLocale }>;
  searchParams: Promise<{
    brand?: string;
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

  const collectionRaw = await db.collection.findUnique({ where: { handle } });
  if (!collectionRaw) notFound();
  const collection = {
    ...collectionRaw,
    title: localize(collectionRaw.title, collectionRaw.titleAr, locale),
    description: localizeOptional(collectionRaw.description, collectionRaw.descriptionAr, locale),
  };

  const scopeWhere = {
    status: "active" as const,
    collections: { some: { collectionId: collection.id } },
  };

  // Sizes/colors/brands/price bounds are all computed against the
  // *unfiltered* scope (this collection, no facet filters applied yet)
  // so the sidebar's own options never shrink as filters are applied —
  // same rule the old FilterBar's picklists already followed. Category
  // isn't offered as a facet here — it would just duplicate the page's
  // own scope (see FilterSidebar's categories prop being omitted below).
  const [allVariants, brandsRaw, priceAgg, productsRaw, sales, cartQuantityByVariant, wishlistedProductIds] =
    await Promise.all([
      db.productVariant.findMany({ where: { product: scopeWhere }, select: { size: true, color: true } }),
      db.brand.findMany({
        where: { products: { some: scopeWhere } },
        orderBy: { name: "asc" },
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
  const brandOptions = brandsRaw.map((brand) => ({
    value: brand.slug,
    label: localize(brand.name, brand.nameAr, locale),
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
