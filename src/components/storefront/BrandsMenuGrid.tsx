"use client";

import Image from "next/image";
import { motion } from "motion/react";

import { Link } from "@/i18n/navigation";
import { staggerItemVariants } from "./NavMegaMenu";

export type BrandMenuItem = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  // Pre-formatted server-side (getTranslations' ICU plural rules aren't
  // available client-side, and a formatter function can't cross the
  // server/client component boundary as a prop) rather than a raw count.
  itemCountLabel: string;
};

export function BrandsMenuGrid({ brands }: { brands: BrandMenuItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {brands.map((brand) => (
        <motion.div key={brand.id} variants={staggerItemVariants}>
          <Link
            href={`/brands/${brand.slug}`}
            className="border-border hover:bg-muted/60 flex min-h-[64px] flex-col justify-center gap-1 rounded-md border px-4 py-3 transition"
          >
            {brand.logoUrl ? (
              <div className="relative h-6 w-full max-w-[70%]">
                <Image
                  src={brand.logoUrl}
                  alt={brand.name}
                  fill
                  sizes="140px"
                  className="object-contain object-start rtl:object-[right_center]"
                  unoptimized
                />
              </div>
            ) : (
              <span className="font-showcase-display text-sm font-bold uppercase rtl:normal-case">
                {brand.name}
              </span>
            )}
            <span className="text-muted-foreground text-xs">{brand.itemCountLabel}</span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
