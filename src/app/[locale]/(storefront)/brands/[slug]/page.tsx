import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import type { AppLocale } from "@/i18n/routing";
import { localize, localizeOptional } from "@/lib/localizedContent";
import { applySaleToProduct } from "@/lib/sales";
import { getCartQuantityByVariant } from "@/server/actions/cart";
import { getWishlistedProductIds } from "@/server/actions/wishlist";
import { ProductCard } from "@/components/storefront/ProductCard";
import { FilterBar } from "@/components/storefront/FilterBar";

type Props = {
  params: Promise<{ slug: string; locale: AppLocale }>;
  searchParams: Promise<{ size?: string; color?: string; sort?: string }>;
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
  const { size, color, sort } = await searchParams;
  const t = await getTranslations("BrandDetailPage");

  const brandRaw = await db.brand.findUnique({ where: { slug } });
  if (!brandRaw) notFound();
  const brand = {
    ...brandRaw,
    name: localize(brandRaw.name, brandRaw.nameAr, locale),
    description: localizeOptional(brandRaw.description, brandRaw.descriptionAr, locale),
  };

  // All variant size/color values across the *unfiltered* brand catalog, so
  // the filter controls don't shrink as filters are applied — same pattern
  // as the collection page.
  const allVariants = await db.productVariant.findMany({
    where: { product: { status: "active", brandId: brand.id } },
    select: { size: true, color: true },
  });
  const sizes = [...new Set(allVariants.map((v) => v.size))].sort();
  const colors = [...new Set(allVariants.map((v) => v.color))].sort();

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price-asc"
      ? { basePriceCents: "asc" }
      : sort === "price-desc"
        ? { basePriceCents: "desc" }
        : { createdAt: "desc" };

  const [productsRaw, sales, cartQuantityByVariant, wishlistedProductIds] = await Promise.all([
    db.product.findMany({
      where: {
        status: "active",
        brandId: brand.id,
        ...(size || color
          ? {
              variants: {
                some: {
                  ...(size ? { size } : {}),
                  ...(color ? { color } : {}),
                },
              },
            }
          : {}),
      },
      include: {
        images: true,
        variants: true,
        brand: true,
        collections: { select: { collectionId: true } },
      },
      orderBy,
    }),
    db.sale.findMany({ where: { isActive: true } }),
    getCartQuantityByVariant(),
    getWishlistedProductIds(),
  ]);
  const now = new Date();
  const products = productsRaw
    .map((product) => ({
      ...product,
      title: localize(product.title, product.titleAr, locale),
      brand: product.brand
        ? { ...product.brand, name: localize(product.brand.name, product.brand.nameAr, locale) }
        : product.brand,
    }))
    .map((product) => applySaleToProduct(product, sales, now));

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{brand.name}</h1>
        {brand.description && (
          <p className="text-muted-foreground max-w-xl">{brand.description}</p>
        )}
      </div>

      <FilterBar sizes={sizes} colors={colors} />

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
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
  );
}
