import Image from "next/image";
import Link from "next/link";

export type BrandSummary = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
};

/**
 * Homepage brand grid — Leo Fashion carries multiple external brands (see
 * CLAUDE.md), so this highlights the vendor/partner lineup rather than a
 * single house logo. Plain responsive grid, not a carousel: with ~5 brands
 * a grid reads faster than something that auto-scrolls, and it degrades to
 * a simple 2-column layout on mobile without extra work.
 */
export function BrandsSection({ brands }: { brands: BrandSummary[] }) {
  if (brands.length === 0) return null;

  return (
    <section className="space-y-6">
      <div className="border-border flex items-end justify-between border-b pb-4">
        <h2 className="font-serif text-xl italic sm:text-2xl">Shop by brand</h2>
        <Link
          href="/brands"
          className="text-brand-accent hover:text-foreground text-xs tracking-[0.2em] uppercase transition"
        >
          View all
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/brands/${brand.slug}`}
            className="border-border bg-card group flex aspect-[3/2] flex-col items-center justify-center gap-2 rounded-sm border p-4 transition hover:border-brand-accent/50"
          >
            {brand.logoUrl ? (
              <div className="relative h-10 w-full">
                <Image
                  src={brand.logoUrl}
                  alt={brand.name}
                  fill
                  sizes="200px"
                  // Brand logos can be any URL an admin pastes into the
                  // brand form (src/lib/validators/brand.ts just requires
                  // a well-formed URL) — unlike product photos, which only
                  // ever come from our own Supabase Storage bucket, these
                  // aren't from a domain we control or can allowlist ahead
                  // of time in next.config.ts. `unoptimized` skips Next's
                  // image-optimization pipeline (and its host allowlist)
                  // for this one image; fine for small logo assets.
                  unoptimized
                  className="object-contain opacity-80 grayscale transition group-hover:opacity-100 group-hover:grayscale-0"
                />
              </div>
            ) : (
              <span className="text-sm font-medium">{brand.name}</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
