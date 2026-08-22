import Image from "next/image";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { SectionBand } from "./SectionBand";

export type BrandSummary = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  itemCount: number;
  /** The best currently-live Sale's percentOff for this brand's products
   * (src/lib/sales.ts), if any — computed once in page.tsx. */
  salePercentOff: number | null;
};

/**
 * Homepage brand grid — Leo Fashion carries multiple external brands (see
 * CLAUDE.md), so this highlights the vendor/partner lineup rather than a
 * single house logo. A hairline-bordered "wall" of cells, not a carousel:
 * with a handful of brands a grid reads faster than something that
 * auto-scrolls, and it degrades to a single column on mobile without extra
 * work. Logos render as solid black marks (brightness-0, no hover reveal)
 * so a handful of differently-colored brand logos read as one disciplined
 * band instead of a mismatched logo soup.
 */
export function BrandsSection({ brands }: { brands: BrandSummary[] }) {
  const t = useTranslations("BrandsSection");
  if (brands.length === 0) return null;

  return (
    <SectionBand
      tone="paper"
      title={t("shopByBrand")}
      subtitle={
        <Link href="/brands" className="opacity-100 transition hover:opacity-70">
          {t("viewAll")}
        </Link>
      }
    >
      <div className="border-showcase-ink grid grid-cols-1 border-t-2 border-s-2 sm:grid-cols-2">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/brands/${brand.slug}`}
            className="border-showcase-ink group relative flex min-h-[110px] items-center justify-between gap-4 border-b-2 border-e-2 p-7 transition hover:bg-black/[0.03]"
          >
            {brand.salePercentOff != null && (
              // The outer span carries the logical end-3 position (so it
              // mirrors sides correctly with the page direction); dir="ltr"
              // has to live on the inner span instead of this one — CSS
              // logical properties resolve against the element's *own*
              // direction, so putting dir="ltr" directly on an
              // end-3-positioned element would pin it to the physical
              // right always, undoing the mirroring.
              <span className="absolute top-3 end-3">
                <span
                  dir="ltr"
                  className="bg-showcase-rivet text-showcase-paper rounded-sm px-2 py-1 text-[10px] font-semibold tracking-[0.06em] uppercase"
                >
                  {t("onSale", { percent: brand.salePercentOff })}
                </span>
              </span>
            )}
            {brand.logoUrl ? (
              <div className="relative h-8 w-full max-w-[65%]">
                <Image
                  src={brand.logoUrl}
                  alt={brand.name}
                  fill
                  sizes="200px"
                  className="object-contain object-start brightness-0 rtl:object-[right_center]"
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
              // font-bold pins an exactly-loaded weight — Tajawal has no
              // 400, see HomeIntro.tsx for the full explanation.
              <span className="font-showcase-display text-2xl font-bold uppercase rtl:normal-case">
                {brand.name}
              </span>
            )}
            <span className="text-showcase-paper-dim text-xs font-semibold whitespace-nowrap">
              {t("itemCount", { count: brand.itemCount })}
            </span>
          </Link>
        ))}
      </div>
    </SectionBand>
  );
}
