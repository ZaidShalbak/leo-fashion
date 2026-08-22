import Image from "next/image";

import { Link } from "@/i18n/navigation";

export function CategoryTile({
  href,
  title,
  description,
  imageUrl,
  imageAlt,
  tall = false,
  onSale = false,
  onSaleLabel,
}: {
  href: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  imageAlt?: string;
  /** The lead tile in a 3-tile row runs a bit taller than its neighbors —
   * only meaningful when there's more than one tile, so a lone tile isn't
   * stretched for no reason. */
  tall?: boolean;
  /** Whether any currently-live Sale (src/lib/sales.ts) would discount
   * this category's products — computed once in page.tsx, not derived
   * here. */
  onSale?: boolean;
  onSaleLabel?: string;
}) {
  return (
    <Link
      href={href}
      className={`group bg-showcase-line relative block overflow-hidden ${tall ? "min-h-[440px]" : "min-h-[400px]"}`}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={imageAlt ?? title}
          fill
          sizes="(min-width: 640px) 40vw, 100vw"
          className="object-cover object-center opacity-90 grayscale-[35%] contrast-[1.08] transition-transform duration-500 group-hover:scale-105"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
      {onSale && (
        <span className="bg-showcase-rivet text-showcase-paper absolute top-4 start-4 rounded-sm px-2 py-1 text-[11px] font-semibold tracking-[0.06em] uppercase rtl:tracking-normal rtl:normal-case">
          {onSaleLabel}
        </span>
      )}
      <div className="absolute inset-x-4 bottom-4 start-4 end-4">
        {/* font-bold pins an exactly-loaded weight — Tajawal has no 400,
            see HomeIntro.tsx for the full explanation. */}
        <div className="font-showcase-display text-showcase-paper text-[1.9rem] leading-none font-bold uppercase rtl:leading-normal rtl:normal-case">
          {title}
        </div>
        {description && (
          <span className="text-showcase-rivet mt-1 block text-[11px] font-semibold tracking-[0.1em] uppercase rtl:font-medium rtl:tracking-normal rtl:normal-case">
            {description}
          </span>
        )}
      </div>
    </Link>
  );
}
