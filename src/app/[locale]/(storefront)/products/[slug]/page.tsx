import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { localize, localizeOptional } from "@/lib/localizedContent";
import { applySaleToProduct } from "@/lib/sales";
import { getCartQuantityByVariant } from "@/server/actions/cart";
import { getWishlistedProductIds } from "@/server/actions/wishlist";
import { ProductDetail } from "@/components/storefront/ProductDetail";
import { ProductCard } from "@/components/storefront/ProductCard";

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
      collections: { select: { collectionId: true } },
    },
  });
}

/**
 * "Similar" is either sharing a collection with this product or sharing
 * its brand — an OR, not an AND, since a product might only have one of
 * the two (e.g. no brand assigned, or not in any collection yet) and
 * still have real same-brand or same-collection neighbors worth
 * surfacing. Returns nothing (rather than falling back to "recent
 * products in general") when neither signal exists, so this section
 * only ever shows genuinely related items, never arbitrary ones.
 */
async function getSimilarProducts(
  productId: string,
  brandId: string | null,
  collectionIds: string[]
) {
  if (collectionIds.length === 0 && !brandId) return [];

  return db.product.findMany({
    where: {
      id: { not: productId },
      status: "active",
      OR: [
        ...(collectionIds.length > 0
          ? [{ collections: { some: { collectionId: { in: collectionIds } } } }]
          : []),
        ...(brandId ? [{ brandId }] : []),
      ],
    },
    include: {
      images: true,
      variants: true,
      brand: true,
      collections: { select: { collectionId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 4,
  });
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const product = await getProduct(slug);
  const t = await getTranslations({ locale, namespace: "Product" });
  return {
    title: product ? localize(product.title, product.titleAr, locale) : t("fallbackTitle"),
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations("Product");
  const product = await getProduct(slug);

  if (!product || product.status !== "active") notFound();

  const [similarProductsRaw, sales, cartQuantityByVariant, wishlistedProductIds] = await Promise.all([
    getSimilarProducts(product.id, product.brandId, product.collections.map((c) => c.collectionId)),
    db.sale.findMany({ where: { isActive: true } }),
    getCartQuantityByVariant(),
    getWishlistedProductIds(),
  ]);
  const now = new Date();
  // Localized the same way the homepage/collection grids do — see
  // src/lib/localizedContent.ts.
  const similarProducts = similarProductsRaw
    .map((p) => ({
      ...p,
      title: localize(p.title, p.titleAr, locale),
      brand: p.brand
        ? { ...p.brand, name: localize(p.brand.name, p.brand.nameAr, locale) }
        : p.brand,
    }))
    .map((p) => applySaleToProduct(p, sales, now));

  const { basePriceCents, compareAtCents } = applySaleToProduct(
    {
      basePriceCents: product.basePriceCents,
      brandId: product.brandId,
      collections: product.collections,
    },
    sales,
    now
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductDetail
          productId={product.id}
          productTitle={localize(product.title, product.titleAr, locale)}
          brand={
            product.brand
              ? { ...product.brand, name: localize(product.brand.name, product.brand.nameAr, locale) }
              : product.brand
          }
          description={localizeOptional(product.description, product.descriptionAr, locale)}
          basePriceCents={basePriceCents}
          compareAtCents={compareAtCents}
          images={product.images}
          variants={product.variants}
          cartQuantityByVariant={cartQuantityByVariant}
          isWishlisted={wishlistedProductIds.has(product.id)}
        />
      </div>

      {similarProducts.length > 0 && (
        <section className="mt-16 space-y-4">
          <h2 className="text-lg font-medium">{t("similarProducts")}</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {similarProducts.map((similarProduct) => (
              <ProductCard
                key={similarProduct.id}
                product={similarProduct}
                cartQuantityByVariant={cartQuantityByVariant}
                isWishlisted={wishlistedProductIds.has(similarProduct.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
