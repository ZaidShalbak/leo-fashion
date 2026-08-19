import { db } from "@/server/db";
import { CollectionCard } from "@/components/storefront/CollectionCard";
import { ProductCard } from "@/components/storefront/ProductCard";
import { HeroCarousel, type HeroSlide } from "@/components/storefront/HeroCarousel";
import { BrandsSection } from "@/components/storefront/BrandsSection";

export default async function HomePage() {
  const [collectionsWithLead, products, brands] = await Promise.all([
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

  const heroSlides: HeroSlide[] = collectionsWithLead
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

  return (
    <div className="space-y-16 pb-16 sm:space-y-24 sm:pb-24">
      {heroSlides.length > 0 && (
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:pt-6">
          <HeroCarousel slides={heroSlides} />
        </div>
      )}

      <section className="mx-auto max-w-2xl space-y-3 px-4 text-center">
        <p className="text-brand-accent text-xs tracking-[0.25em] uppercase">
          Leo Fashion
        </p>
        <h1 className="font-serif text-2xl italic sm:text-3xl">
          Wardrobe staples, outerwear, and easy weekend pieces
        </h1>
        <p className="text-muted-foreground text-sm">
          Order online, pay on delivery or by invoice — no card required.
        </p>
      </section>

      {collectionsWithLead.length > 0 && (
        <section className="mx-auto max-w-6xl space-y-6 px-4">
          <div className="flex items-end justify-between border-b border-border pb-4">
            <h2 className="font-serif text-xl italic sm:text-2xl">Shop by category</h2>
          </div>
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

      <div className="mx-auto max-w-6xl px-4">
        <BrandsSection brands={brands} />
      </div>

      <section className="mx-auto max-w-6xl space-y-6 px-4">
        <div className="flex items-end justify-between border-b border-border pb-4">
          <h2 className="font-serif text-xl italic sm:text-2xl">New arrivals</h2>
        </div>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            No products are available yet — check back soon.
          </p>
        )}
      </section>
    </div>
  );
}
