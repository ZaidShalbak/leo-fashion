"use client";

import Image from "next/image";
import { motion } from "motion/react";

import type { ProductCardData } from "@/types/product";
import { Link } from "@/i18n/navigation";
import { PriceDisplay } from "./PriceDisplay";

export function BestSellerItem({
  product,
  rank,
}: {
  product: ProductCardData;
  rank: number;
}) {
  const primaryImage = [...product.images].sort((a, b) => a.position - b.position)[0];
  const rankLabel = String(rank).padStart(2, "0");

  return (
    <motion.div
      // Same scroll-reveal convention as ProductCard — no index stagger,
      // scrolling itself already staggers when each item crosses the
      // viewport threshold.
      initial={{ opacity: 0, y: 32, scale: 0.94, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col"
    >
      <Link href={`/products/${product.slug}`} className="group flex flex-1 flex-col">
        <div className="bg-showcase-line relative aspect-[5/4] overflow-hidden">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.altText ?? product.title}
              fill
              sizes="(min-width: 640px) 33vw, 100vw"
              className="object-cover opacity-90 grayscale-[40%] contrast-[1.05] brightness-90 transition-transform duration-500 group-hover:scale-105"
            />
          ) : null}
        </div>
        <div className="px-4 pt-4 pb-5">
          <div className="text-showcase-rivet font-showcase-display text-sm font-bold tracking-[0.04em]" dir="ltr">
            {rankLabel}
          </div>
          <h3 className="text-showcase-paper mt-2.5 mb-1 text-sm font-semibold">{product.title}</h3>
          <PriceDisplay
            cents={product.basePriceCents}
            compareAtCents={product.compareAtCents ?? undefined}
            className="text-showcase-paper-dim text-[13px]"
          />
        </div>
      </Link>
    </motion.div>
  );
}
