import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { db } from "@/server/db";
import { ProductGallery } from "@/components/storefront/ProductGallery";
import { VariantSelector } from "@/components/storefront/VariantSelector";

type Props = {
  params: Promise<{ slug: string }>;
};

async function getProduct(slug: string) {
  return db.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { size: "asc" } },
    },
  });
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  return { title: product?.title ?? "Product" };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product || product.status !== "active") notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} productTitle={product.title} />

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {product.title}
            </h1>
          </div>

          <VariantSelector
            productId={product.id}
            basePriceCents={product.basePriceCents}
            variants={product.variants}
          />

          {product.description && (
            <div className="border-border border-t pt-6">
              <p className="text-muted-foreground text-sm whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
