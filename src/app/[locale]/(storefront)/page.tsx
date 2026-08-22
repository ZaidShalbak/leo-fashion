import { getLocale, getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { isHeroBannerLive } from "@/lib/heroBanners";
import { applySaleToProduct, getBestSaleForProduct } from "@/lib/sales";
import { localize, localizeOptional } from "@/lib/localizedContent";
import { HeroCarousel, type HeroSlide } from "@/components/storefront/HeroCarousel";
import { HomeIntro } from "@/components/storefront/HomeIntro";
import { CategorySection } from "@/components/storefront/CategorySection";
import { BrandsSection } from "@/components/storefront/BrandsSection";
import { BestSellersSection } from "@/components/storefront/BestSellersSection";
import { NewArrivalsSection } from "@/components/storefront/NewArrivalsSection";

// Ranks products by total units sold across every non-cancelled order,
// then re-fetches the top N as full ProductCardData — groupBy only
// returns the aggregated productId/sum, not the product itself. A
// cancelled order never shipped, so it shouldn't count as a "sale" for
// ranking purposes. Products that have since been archived (status !=
// "active") are filtered out after the fact rather than in the groupBy's
// where clause, since OrderItem has no direct product-status column to
// filter on — same "quantity" for a since-archived product still exists
// in order history, it just shouldn't show up here.
async function getBestSellers() {
  const ranked = await db.orderItem.groupBy({
    by: ["productId"],
    where: { productId: { not: null }, order: { status: { not: "cancelled" } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 8,
  });
  const productIds = ranked
    .map((row) => row.productId)
    .filter((id): id is string => id !== null);
  if (productIds.length === 0) return [];

  const products = await db.product.findMany({
    where: { id: { in: productIds }, status: "active" },
    include: {
      images: true,
      variants: true,
      brand: true,
      collections: { select: { collectionId: true } },
    },
  });
  const productById = new Map(products.map((product) => [product.id, product]));
  // groupBy's own ordering (by units sold) is what makes this "best
  // sellers" rather than an arbitrary product list — findMany's `in`
  // filter doesn't preserve it, so re-order by walking productIds.
  return productIds
    .map((id) => productById.get(id))
    .filter((product): product is NonNullable<typeof product> => product !== undefined);
}

export default async function HomePage() {
  const t = await getTranslations("Home");
  const locale = await getLocale();
  const [heroBanners, collectionsWithLeadRaw, productsRaw, bestSellersRaw, brandsRaw, sales] =
    await Promise.all([
    // Admin-managed banners (see /admin/hero-banners) take priority over
    // the collection-derived fallback below. Fetching every *active* row
    // (not narrowing the scheduling window in SQL) and filtering with the
    // same isHeroBannerLive predicate the admin list uses to compute
    // status badges keeps "is this live right now" defined in exactly one
    // place — there are only ever a handful of banners, so filtering in
    // memory instead of a gnarlier date-range WHERE clause isn't a real
    // cost.
    db.heroBanner.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
    // One representative (oldest-added) active product per collection, with
    // its primary image, so the hero carousel and category tiles can show a
    // real photo instead of a plain color block — see HeroCarousel/
    // CategorySection.
    db.collection.findMany({
      orderBy: { title: "asc" },
      include: {
        products: {
          take: 1,
          orderBy: { product: { createdAt: "asc" } },
          where: { product: { status: "active" } },
          include: {
            product: {
              include: { images: { orderBy: { position: "asc" }, take: 1 } },
            },
          },
        },
      },
    }),
    db.product.findMany({
      where: { status: "active" },
      include: {
        images: true,
        variants: true,
        brand: true,
        collections: { select: { collectionId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    getBestSellers(),
    db.brand.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: { where: { status: "active" } } } } },
    }),
    // Every active Sale — scope/scheduling is resolved in memory via
    // getBestSaleForProduct, same "one place decides is-this-live"
    // reasoning as isHeroBannerLive above; there are only ever a handful
    // of sales running at once, so this isn't a real cost.
    db.sale.findMany({ where: { isActive: true } }),
  ]);
  const now = new Date();

  // Catalog content (collection/product/brand names & descriptions) may
  // have an admin-entered Arabic override — localize once here, right
  // after fetching, so everything below (hero fallback slides, category
  // tiles, product grid, brand grid) already sees the right-language
  // strings. See src/lib/localizedContent.ts.
  const collectionsWithLead = collectionsWithLeadRaw.map((collection) => ({
    ...collection,
    title: localize(collection.title, collection.titleAr, locale),
    description: localizeOptional(collection.description, collection.descriptionAr, locale),
    // The best currently-live sale's percentOff for this category, if
    // any — a site-wide sale counts (it touches every category), a sale
    // scoped to this exact collection counts, a brand-scoped sale does
    // not (it wouldn't necessarily cover every product here). Reuses the
    // same product-scope-matching function with an empty brandId rather
    // than a separate category-level helper.
    salePercentOff:
      getBestSaleForProduct(sales, { brandId: null, collectionIds: [collection.id] }, now)
        ?.percentOff ?? null,
  }));
  const products = productsRaw
    .map((product) => ({
      ...product,
      title: localize(product.title, product.titleAr, locale),
      brand: product.brand
        ? { ...product.brand, name: localize(product.brand.name, product.brand.nameAr, locale) }
        : product.brand,
    }))
    .map((product) => applySaleToProduct(product, sales, now));
  const bestSellers = bestSellersRaw
    .map((product) => ({
      ...product,
      title: localize(product.title, product.titleAr, locale),
      brand: product.brand
        ? { ...product.brand, name: localize(product.brand.name, product.brand.nameAr, locale) }
        : product.brand,
    }))
    .map((product) => applySaleToProduct(product, sales, now));
  const brands = brandsRaw.map((brand) => ({
    ...brand,
    name: localize(brand.name, brand.nameAr, locale),
    itemCount: brand._count.products,
    // Same reasoning as collectionsWithLead's salePercentOff above,
    // mirrored for brand scope: a site-wide sale or one scoped to this
    // exact brand.
    salePercentOff:
      getBestSaleForProduct(sales, { brandId: brand.id, collectionIds: [] }, now)?.percentOff ??
      null,
  }));

  const liveBannerSlides: HeroSlide[] = heroBanners
    .filter((banner) => isHeroBannerLive(banner, new Date()))
    .map((banner) => ({
      id: banner.id,
      title: banner.headline,
      description: banner.subtext,
      imageUrl: banner.imageUrl,
      imageAlt: banner.imageAltText ?? banner.headline ?? "Leo Fashion",
      href: banner.ctaUrl,
      ctaLabel: banner.ctaLabel,
    }));

  // Falls back to one slide per collection (today's default before any
  // admin sets up a banner) only when there's nothing live to show —
  // see /admin/hero-banners.
  const collectionSlides: HeroSlide[] = collectionsWithLead
    .map((collection): HeroSlide | null => {
      const leadImage = collection.products[0]?.product.images[0];
      if (!leadImage) return null;
      return {
        id: collection.id,
        title: collection.title,
        description: collection.description,
        imageUrl: leadImage.url,
        imageAlt: leadImage.altText ?? collection.title,
        href: `/collections/${collection.handle}`,
      };
    })
    .filter((slide): slide is HeroSlide => slide !== null);

  const heroSlides = liveBannerSlides.length > 0 ? liveBannerSlides : collectionSlides;

  return (
    <>
      {/* Rendered outside the max-w-6xl/px-4 container below (its direct
          parent, <main>, has no padding or max-width of its own) so it's
          naturally full-bleed and sits flush against the header — no
          breakout margin hack needed, and no vertical gap from the
          container's py-8/py-10. */}
      {heroSlides.length > 0 && <HeroCarousel slides={heroSlides} />}

      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <HomeIntro title={t("title")} tagline={t("tagline")} />
      </div>

      {/* Full-bleed "showcase" bands — outside the max-w-6xl container above,
          same reasoning as HeroCarousel: each section owns its own
          full-width ink/paper background rather than sitting inside a
          padded, width-capped column. */}
      <CategorySection collections={collectionsWithLead} />
      <BrandsSection brands={brands} />
      <BestSellersSection products={bestSellers.slice(0, 6)} />
      <NewArrivalsSection products={products} />
    </>
  );
}
