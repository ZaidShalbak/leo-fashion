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
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:py-14">
      <div className="space-y-2 text-center">
        <h1 className="font-serif text-3xl italic sm:text-4xl">Brands</h1>
        <p className="text-muted-foreground mx-auto max-w-xl">
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
              className="border-border bg-card group flex flex-col items-center gap-3 rounded-sm border p-6 text-center transition hover:border-brand-accent/50"
            >
              {brand.logoUrl ? (
                <div className="relative h-12 w-full">
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    fill
                    sizes="200px"
                    className="object-contain opacity-80 grayscale transition group-hover:opacity-100 group-hover:grayscale-0"
                  />
                </div>
              ) : (
                <span className="text-sm font-semibold">{brand.name}</span>
              )}
              <div>
                <h2 className="text-sm">{brand.name}</h2>
                <p className="text-muted-foreground mt-0.5 text-xs tracking-wide uppercase">
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
