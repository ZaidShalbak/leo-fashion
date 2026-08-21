import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import type { AppLocale } from "@/i18n/routing";
import { localize, localizeOptional } from "@/lib/localizedContent";
import { ProductCard } from "@/components/storefront/ProductCard";
import { FilterBar } from "@/components/storefront/FilterBar";

type Props = {
  params: Promise<{ handle: string; locale: AppLocale }>;
  searchParams: Promise<{ size?: string; color?: string; sort?: string }>;
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
  const { size, color, sort } = await searchParams;
  const t = await getTranslations("CollectionPage");

  const collectionRaw = await db.collection.findUnique({ where: { handle } });
  if (!collectionRaw) notFound();
  const collection = {
    ...collectionRaw,
    title: localize(collectionRaw.title, collectionRaw.titleAr, locale),
    description: localizeOptional(collectionRaw.description, collectionRaw.descriptionAr, locale),
  };

  // All variant size/color values across the *unfiltered* collection, so
  // the filter controls don't shrink as filters are applied.
  const allVariants = await db.productVariant.findMany({
    where: {
      product: {
        status: "active",
        collections: { some: { collectionId: collection.id } },
      },
    },
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

  const productsRaw = await db.product.findMany({
    where: {
      status: "active",
      collections: { some: { collectionId: collection.id } },
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
    include: { images: true, variants: true, brand: true },
    orderBy,
  });
  const products = productsRaw.map((product) => ({
    ...product,
    title: localize(product.title, product.titleAr, locale),
    brand: product.brand
      ? { ...product.brand, name: localize(product.brand.name, product.brand.nameAr, locale) }
      : product.brand,
  }));

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

      <FilterBar sizes={sizes} colors={colors} />

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
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
