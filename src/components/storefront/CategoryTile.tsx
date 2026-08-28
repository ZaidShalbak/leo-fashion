import Image from "next/image";

import { Link } from "@/i18n/navigation";

export function CategoryTile({
  href,
  title,
  imageUrl,
  imageAlt,
  onSaleLabel,
}: {
  href: string;
  title: string;
  imageUrl?: string | null;
  imageAlt?: string;
  /** Pre-formatted "Sale −N%" label (see CategorySection), already
   * localized — undefined when no currently-live Sale (src/lib/sales.ts)
   * discounts this category's products. */
  onSaleLabel?: string;
}) {
  return (
    <Link href={href} className="border-showcase-ink group relative flex flex-col border-b-2 border-e-2">
      <div className="bg-showcase-line relative aspect-square w-full overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt ?? title}
            fill
            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 25vw, 50vw"
            className="object-cover object-center opacity-90 grayscale-[35%] contrast-[1.08] transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
        {onSaleLabel && (
          // See BrandsSection's identical badge for why dir="ltr" lives on
          // the inner span, not this logically-positioned outer one.
          <span className="absolute top-2 start-2">
            <span
              dir="ltr"
              className="bg-showcase-rivet text-showcase-paper rounded-sm px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.06em] uppercase"
            >
              {onSaleLabel}
            </span>
          </span>
        )}
      </div>
      <div className="flex items-center justify-center px-2 py-3 text-center">
        <span className="text-xs font-semibold tracking-[0.04em] uppercase sm:text-sm">{title}</span>
      </div>
    </Link>
  );
}
