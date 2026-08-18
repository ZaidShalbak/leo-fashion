import { db } from "@/server/db";
import { CollectionCard } from "@/components/storefront/CollectionCard";
import { ProductCard } from "@/components/storefront/ProductCard";

export default async function HomePage() {
  const [collections, products] = await Promise.all([
    db.collection.findMany({ orderBy: { title: "asc" } }),
    db.product.findMany({
      where: { status: "active" },
      include: { images: true, variants: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-16 px-4 py-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Leo Fashion
        </h1>
        <p className="text-muted-foreground max-w-xl">
          Wardrobe staples, outerwear, and easy weekend pieces — order
          online, pay on delivery or by invoice.
        </p>
      </section>

      {collections.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Shop by collection</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-medium">New arrivals</h2>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
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
