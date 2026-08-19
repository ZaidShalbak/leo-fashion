import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { db } from "@/server/db";

export const metadata: Metadata = { title: "Brands" };

export default async function BrandsPage() {
  const brands = await db.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { status: "active" } } } } },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Brands</h1>
        <p className="text-muted-foreground max-w-xl">
          The vendors and partner labels we carry alongside our own
          in-house line.
        </p>
      </div>

      {brands.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.slug}`}
              className="border-border bg-card group flex flex-col items-center gap-3 rounded-lg border p-6 text-center transition hover:shadow-sm"
            >
              {brand.logoUrl ? (
                <div className="relative h-12 w-full">
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    fill
                    sizes="200px"
                    // See BrandsSection.tsx — brand logos are admin-entered
                    // arbitrary URLs, not a domain we can allowlist ahead
                    // of time, so this skips Next's image optimizer.
                    unoptimized
                    className="object-contain grayscale transition group-hover:grayscale-0"
                  />
                </div>
              ) : (
                <span className="text-sm font-semibold">{brand.name}</span>
              )}
              <div>
                <h2 className="text-sm font-medium">{brand.name}</h2>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {brand._count.products} item{brand._count.products === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No brands yet — check back soon.</p>
      )}
    </div>
  );
}
