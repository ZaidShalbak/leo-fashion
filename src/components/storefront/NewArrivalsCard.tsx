"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";

import type { ProductCardData } from "@/types/product";
import { Link } from "@/i18n/navigation";
import { PriceDisplay } from "./PriceDisplay";

export function NewArrivalsCard({ product }: { product: ProductCardData }) {
  const t = useTranslations("NewArrivalsSection");
  const primaryImage = [...product.images].sort((a, b) => a.position - b.position)[0];
  const isOnSale = product.compareAtCents != null;
  // Display-only, derived from the two prices — see ProductCard's
  // identical comment for why this is never re-derived into the actual
  // charged amount.
  const salePercentOff = isOnSale
    ? Math.round((1 - product.basePriceCents / product.compareAtCents!) * 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.94, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="bg-showcase-paper"
    >
      <Link href={`/products/${product.slug}`} className="group block">
        <div className="bg-showcase-line-paper relative aspect-[4/5] overflow-hidden">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.altText ?? product.title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover grayscale-[30%] transition-transform duration-500 group-hover:scale-105"
            />
          ) : null}
          {isOnSale && (
            // Same two-layer positioning pattern as ProductCard's badge —
            // see its comment for why dir="ltr" can't live on the
            // logically-positioned (start-2) outer span.
            <span className="absolute top-2 start-2">
              <span
                dir="ltr"
                className="bg-showcase-rivet text-showcase-paper rounded-sm px-2 py-1 text-[10px] font-semibold tracking-[0.06em] uppercase"
              >
                {t("onSale", { percent: salePercentOff! })}
              </span>
            </span>
          )}
        </div>
        <div className="pt-3.5">
          {product.brand && (
            <span className="text-showcase-rivet block text-[10px] font-bold tracking-[0.08em] uppercase rtl:tracking-normal rtl:normal-case" dir="ltr">
              {product.brand.name}
            </span>
          )}
          <h3 className="mt-1 mb-1 text-[13px] font-semibold">{product.title}</h3>
          <PriceDisplay
            cents={product.basePriceCents}
            compareAtCents={product.compareAtCents ?? undefined}
            className="text-showcase-ink/70 text-[13px]"
          />
        </div>
      </Link>
    </motion.div>
  );
}
