import { getLocale, getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { isHeroBannerLive } from "@/lib/heroBanners";
import { applySaleToProduct, getBestSaleForProduct } from "@/lib/sales";
import { localize, localizeOptional } from "@/lib/localizedContent";
import {
  getActiveProductsCached,
  getBestSellersCached,
  getBrandsWithActiveCountCached,
  getCollectionsWithLeadImageCached,
} from "@/server/queries";
import { getCartQuantityByVariant } from "@/server/actions/cart";
import { getWishlistedProductIds } from "@/server/actions/wishlist";
import { HeroCarousel, type HeroSlide } from "@/components/storefront/HeroCarousel";
import { HomeIntro } from "@/components/storefront/HomeIntro";
import { CategorySection } from "@/components/storefront/CategorySection";
import { BrandsSection } from "@/components/storefront/BrandsSection";
import { BestSellersSection } from "@/components/storefront/BestSellersSection";
import { NewArrivalsSection } from "@/components/storefront/NewArrivalsSection";

export default async function HomePage() {
  const t = await getTranslations("Home");
  const locale = await getLocale();
  const [
    heroBanners,
    collectionsWithLeadRaw,
    productsRaw,
    bestSellersRaw,
    brandsRaw,
    sales,
    cartQuantityByVariant,
    wishlistedProductIds,
  ] = await Promise.all([
    // Admin-managed banners (see /admin/hero-banners) take priority over
    // the collection-derived fallback below. Fetching every *active* row
    // (not narrowing the scheduling window in SQL) and filtering with the
    // same isHeroBannerLive predicate the admin list uses to compute
    // status badges keeps "is this live right now" defined in exactly one
    // place — there are only ever a handful of banners, so filtering in
    // memory instead of a gnarlier date-range WHERE clause isn't a real
    // cost.
    db.heroBanner.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
    // Cached (60s) and shared with the header's Categories mega menu —
    // see src/server/queries.ts. Its primary image lets the hero carousel
    // fallback and category tiles show a real photo instead of a plain
    // color block — see HeroCarousel/CategorySection.
    getCollectionsWithLeadImageCached(),
    // Cached (60s), shared with /collections/[handle], /brands/[slug],
    // and /sale — see src/server/queries.ts. Sliced to 8 below since this
    // is the full active catalog, newest-first.
    getActiveProductsCached(),
    getBestSellersCached(),
    // Cached (60s) and shared with the header's Brands mega menu.
    getBrandsWithActiveCountCached(),
    // Every active Sale — scope/scheduling is resolved in memory via
    // getBestSaleForProduct, same "one place decides is-this-live"
    // reasoning as isHeroBannerLive above; there are only ever a handful
    // of sales running at once, so this isn't a real cost.
    db.sale.findMany({ where: { isActive: true } }),
    getCartQuantityByVariant(),
    getWishlistedProductIds(),
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
  // getActiveProductsCached() is the full active catalog (newest-first);
  // "new arrivals" is just its first 8. Its `collections` include the
  // full Collection row (needed by /collections, /brands, /sale for
  // their category facet) — applySaleToProduct only wants the bare
  // collectionId, so it's re-shaped here rather than changing the shared
  // query's include shape for this one caller.
  const products = productsRaw
    .slice(0, 8)
    .map((product) => ({
      ...product,
      title: localize(product.title, product.titleAr, locale),
      brand: product.brand
        ? { ...product.brand, name: localize(product.brand.name, product.brand.nameAr, locale) }
        : product.brand,
    }))
    .map((product) =>
      applySaleToProduct(
        { ...product, collections: product.collections.map((pc) => ({ collectionId: pc.collection.id })) },
        sales,
        now
      )
    );
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
      <BestSellersSection
        products={bestSellers.slice(0, 6)}
        cartQuantityByVariant={cartQuantityByVariant}
        wishlistedProductIds={wishlistedProductIds}
      />
      <NewArrivalsSection
        products={products}
        cartQuantityByVariant={cartQuantityByVariant}
        wishlistedProductIds={wishlistedProductIds}
      />
    </>
  );
}
