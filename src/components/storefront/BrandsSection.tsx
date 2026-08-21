import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

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
  const t = useTranslations("BrandsSection");
  if (brands.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{t("shopByBrand")}</h2>
        <Link
          href="/brands"
          className="text-muted-foreground hover:text-foreground text-sm transition"
        >
          {t("viewAll")}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/brands/${brand.slug}`}
            className="border-border bg-card group flex aspect-[3/2] flex-col items-center justify-center gap-2 rounded-lg border p-4 transition hover:shadow-sm"
          >
            {brand.logoUrl ? (
              <div className="relative h-10 w-full">
                <Image
                  src={brand.logoUrl}
                  alt={brand.name}
                  fill
                  sizes="200px"
                  className="object-contain grayscale transition group-hover:grayscale-0"
                  // Brand logos can be any URL an admin pastes into the
                  // brand form (src/lib/validators/brand.ts just requires
                  // a well-formed URL) — unlike product photos, which only
                  // ever come from our own Supabase Storage bucket, these
                  // aren't from a domain we control or can allowlist ahead
                  // of time in next.config.ts. `unoptimized` skips Next's
                  // image-optimization pipeline (and its host allowlist)
                  // for this one image; fine for small logo assets.
                  unoptimized
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
