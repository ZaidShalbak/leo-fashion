import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { ProductCard } from "@/components/storefront/ProductCard";
import { FilterBar } from "@/components/storefront/FilterBar";

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ size?: string; color?: string; sort?: string }>;
};

export async function generateMetadata({
  params,
}: Pick<Props, "params">): Promise<Metadata> {
  const { handle } = await params;
  const collection = await db.collection.findUnique({ where: { handle } });
  return { title: collection?.title ?? "Collection" };
}

export default async function CollectionPage({
  params,
  searchParams,
}: Props) {
  const { handle } = await params;
  const { size, color, sort } = await searchParams;

  const collection = await db.collection.findUnique({ where: { handle } });
  if (!collection) notFound();

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

  const products = await db.product.findMany({
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

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:py-14">
      <div className="space-y-2 text-center">
        <h1 className="font-serif text-3xl italic sm:text-4xl">
          {collection.title}
        </h1>
        {collection.description && (
          <p className="text-muted-foreground mx-auto max-w-xl">
            {collection.description}
          </p>
        )}
      </div>

      <FilterBar sizes={sizes} colors={colors} />

      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground py-12 text-center">
          No products match those filters.
        </p>
      )}
    </div>
  );
}
