"use server";

import { getLocale } from "next-intl/server";

import { db } from "@/server/db";
import { localize } from "@/lib/localizedContent";
import { getBestSaleForProduct, getSaleAdjustedPriceCents } from "@/lib/sales";
import { searchQuerySchema } from "@/lib/validators/search";

export type SearchResults = {
  products: {
    id: string;
    slug: string;
    title: string;
    imageUrl: string | null;
    brandName: string | null;
    priceCents: number;
    compareAtCents: number | null;
  }[];
  brands: { id: string; slug: string; name: string }[];
  collections: { id: string; handle: string; title: string }[];
};

const EMPTY_RESULTS: SearchResults = { products: [], brands: [], collections: [] };

const PRODUCT_LIMIT = 6;
const BRAND_LIMIT = 4;
const COLLECTION_LIMIT = 4;

/**
 * Backs the header's live search dropdown (SearchBox). A product matches on
 * its own title/description *or* its brand's name *or* any collection it
 * belongs to — so searching "Wrangler" or "Jeans" surfaces that brand's/
 * category's products directly, not just the brand/category link below
 * (which come from the separate brand/collection queries). Every text field
 * is checked in both the base and Arabic-override columns regardless of the
 * current UI locale, so search works no matter which language someone
 * types in — only the *display* strings are localized via `localize()`.
 *
 * Small, fixed result caps per group (not pagination) — this is a live
 * dropdown, not a full results page; see the "why no /search page" note in
 * the PR this shipped in if that scope ever needs to grow.
 */
export async function searchSite(rawQuery: string): Promise<SearchResults> {
  const parsed = searchQuerySchema.safeParse(rawQuery);
  if (!parsed.success) return EMPTY_RESULTS;
  const q = parsed.data;
  const locale = await getLocale();

  const textMatch = (field: string) => ({ [field]: { contains: q, mode: "insensitive" as const } });

  const [productsRaw, brandsRaw, collectionsRaw, sales] = await Promise.all([
    db.product.findMany({
      where: {
        status: "active",
        OR: [
          textMatch("title"),
          textMatch("titleAr"),
          textMatch("description"),
          textMatch("descriptionAr"),
          { brand: { OR: [textMatch("name"), textMatch("nameAr")] } },
          { collections: { some: { collection: { OR: [textMatch("title"), textMatch("titleAr")] } } } },
        ],
      },
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        brand: true,
        collections: { select: { collectionId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PRODUCT_LIMIT,
    }),
    db.brand.findMany({
      where: { OR: [textMatch("name"), textMatch("nameAr")] },
      take: BRAND_LIMIT,
    }),
    db.collection.findMany({
      where: { OR: [textMatch("title"), textMatch("titleAr")] },
      take: COLLECTION_LIMIT,
    }),
    db.sale.findMany({ where: { isActive: true } }),
  ]);
  const now = new Date();

  return {
    products: productsRaw.map((product) => {
      const bestSale = getBestSaleForProduct(
        sales,
        { brandId: product.brandId, collectionIds: product.collections.map((c) => c.collectionId) },
        now
      );
      const { priceCents, compareAtCents } = getSaleAdjustedPriceCents(
        product.basePriceCents,
        bestSale
      );
      return {
        id: product.id,
        slug: product.slug,
        title: localize(product.title, product.titleAr, locale),
        imageUrl: product.images[0]?.url ?? null,
        brandName: product.brand ? localize(product.brand.name, product.brand.nameAr, locale) : null,
        priceCents,
        compareAtCents,
      };
    }),
    brands: brandsRaw.map((brand) => ({
      id: brand.id,
      slug: brand.slug,
      name: localize(brand.name, brand.nameAr, locale),
    })),
    collections: collectionsRaw.map((collection) => ({
      id: collection.id,
      handle: collection.handle,
      title: localize(collection.title, collection.titleAr, locale),
    })),
  };
}
