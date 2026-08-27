import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { localize, localizeOptional } from "@/lib/localizedContent";
import { applySaleToProduct } from "@/lib/sales";
import { getActiveProductsCached } from "@/server/queries";
import { getCartQuantityByVariant } from "@/server/actions/cart";
import { getWishlistedProductIds } from "@/server/actions/wishlist";
import { ProductDetail } from "@/components/storefront/ProductDetail";
import { ProductCard } from "@/components/storefront/ProductCard";

type Props = {
  params: Promise<{ slug: string; locale: string }>;
};

/**
 * Looks the product up in the same shared, cached (60s) active-product
 * array every listing page uses — see src/server/queries.ts — instead of
 * its own per-slug query. This matters more here than almost anywhere
 * else: Next.js prefetches every <Link>'d product card the moment it
 * scrolls into view, so a listing page with a dozen visible cards used
 * to fire a dozen concurrent, uncached `db.product.findUnique` calls in
 * the background — real, measured contention (some individual prefetch
 * requests took 2.5-4s) that made even an already-fast page feel
 * sluggish. A product no longer active (draft/archived) simply won't be
 * in the cached array, so the not-found check below still behaves
 * identically to the old direct-query version.
 *
 * Re-sorts images/variants after the lookup since the shared cache's own
 * include has no explicit ordering (it's built for filtering, not
 * display) — matches this page's previous `orderBy` exactly.
 */
async function getProduct(slug: string) {
  const allActiveProducts = await getActiveProductsCached();
  const product = allActiveProducts.find((p) => p.slug === slug);
  if (!product) return null;
  return {
    ...product,
    images: [...product.images].sort((a, b) => a.position - b.position),
    variants: [...product.variants].sort((a, b) => a.size.localeCompare(b.size)),
  };
}

/**
 * "Similar" is either sharing a collection with this product or sharing
 * its brand — an OR, not an AND, since a product might only have one of
 * the two (e.g. no brand assigned, or not in any collection yet) and
 * still have real same-brand or same-collection neighbors worth
 * surfacing. Returns nothing (rather than falling back to "recent
 * products in general") when neither signal exists, so this section
 * only ever shows genuinely related items, never arbitrary ones.
 *
 * Also sourced from the shared cached array (see getProduct above) —
 * filtered/sliced in memory instead of its own DB query. take(4) after
 * filtering preserves the cached array's own newest-first order, same
 * "no real sort needed" reasoning as productFilters.ts's sortProducts.
 */
async function getSimilarProducts(
  productId: string,
  brandId: string | null,
  collectionIds: string[]
) {
  if (collectionIds.length === 0 && !brandId) return [];

  const allActiveProducts = await getActiveProductsCached();
  return allActiveProducts
    .filter(
      (product) =>
        product.id !== productId &&
        (product.collections.some((pc) => collectionIds.includes(pc.collection.id)) ||
          (brandId !== null && product.brandId === brandId))
    )
    .slice(0, 4);
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
    getSimilarProducts(
      product.id,
      product.brandId,
      product.collections.map((pc) => pc.collection.id)
    ),
    db.sale.findMany({ where: { isActive: true } }),
    getCartQuantityByVariant(),
    getWishlistedProductIds(),
  ]);
  const now = new Date();
  // Localized the same way the homepage/collection grids do — see
  // src/lib/localizedContent.ts. applySaleToProduct wants `collections`
  // as {collectionId}[]; the shared cache's richer {collection}[] shape
  // (see getProduct above) is re-shaped here, same as every other
  // listing page that sources from getActiveProductsCached.
  const similarProducts = similarProductsRaw
    .map((p) => ({
      ...p,
      title: localize(p.title, p.titleAr, locale),
      brand: p.brand
        ? { ...p.brand, name: localize(p.brand.name, p.brand.nameAr, locale) }
        : p.brand,
    }))
    .map((p) =>
      applySaleToProduct(
        { ...p, collections: p.collections.map((pc) => ({ collectionId: pc.collection.id })) },
        sales,
        now
      )
    );

  const { basePriceCents, compareAtCents } = applySaleToProduct(
    {
      basePriceCents: product.basePriceCents,
      brandId: product.brandId,
      collections: product.collections.map((pc) => ({ collectionId: pc.collection.id })),
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
