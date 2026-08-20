import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { isHeroBannerLive } from "@/lib/heroBanners";
import { CollectionCard } from "@/components/storefront/CollectionCard";
import { ProductCard } from "@/components/storefront/ProductCard";
import { HeroCarousel, type HeroSlide } from "@/components/storefront/HeroCarousel";
import { BrandsSection } from "@/components/storefront/BrandsSection";

export default async function HomePage() {
  const t = await getTranslations("Home");
  const [heroBanners, collectionsWithLead, products, brands] = await Promise.all([
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
    // CollectionCard.
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
      include: { images: true, variants: true, brand: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
  ]);

  const liveBannerSlides: HeroSlide[] = heroBanners
    .filter((banner) => isHeroBannerLive(banner, new Date()))
    .map((banner) => ({
      id: banner.id,
      title: banner.headline,
      description: banner.subtext,
      imageUrl: banner.imageUrl,
      imageAlt: banner.imageAltText ?? banner.headline,
      href: banner.ctaUrl,
      ctaLabel: banner.ctaLabel,
    }));

  // Falls back to one slide per collection (today's default before any
  // admin sets up a banner) only when there's nothing live to show —
  // see /admin/hero-banners.
  const collectionSlides: HeroSlide[] = collectionsWithLead
    .map((collection) => {
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
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:space-y-16 sm:py-10">
      {heroSlides.length > 0 && <HeroCarousel slides={heroSlides} />}

      <section className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground max-w-xl">{t("tagline")}</p>
      </section>

      {collectionsWithLead.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">{t("shopByCategory")}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {collectionsWithLead.map((collection) => {
              const leadImage = collection.products[0]?.product.images[0];
              return (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  imageUrl={leadImage?.url}
                  imageAlt={leadImage?.altText ?? collection.title}
                />
              );
            })}
          </div>
        </section>
      )}

      <BrandsSection brands={brands} />

      <section className="space-y-4">
        <h2 className="text-lg font-medium">{t("newArrivals")}</h2>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">{t("noProducts")}</p>
        )}
      </section>
    </div>
  );
}
