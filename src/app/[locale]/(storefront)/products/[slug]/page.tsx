import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { ProductDetail } from "@/components/storefront/ProductDetail";

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

async function getProduct(slug: string) {
  return db.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { size: "asc" } },
      brand: true,
    },
  });
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const product = await getProduct(slug);
  const t = await getTranslations({ locale, namespace: "Product" });
  return { title: product?.title ?? t("fallbackTitle") };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product || product.status !== "active") notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductDetail
          productId={product.id}
          productTitle={product.title}
          brand={product.brand}
          description={product.description}
          basePriceCents={product.basePriceCents}
          images={product.images}
          variants={product.variants}
        />
      </div>
    </div>
  );
}
