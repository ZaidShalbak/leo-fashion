"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";

import type { ProductCardData } from "@/types/product";
import { Link } from "@/i18n/navigation";
import { imagesForColor } from "@/lib/images";
import { useQuickAdd } from "@/hooks/useQuickAdd";
import { CartFlyAnimation } from "./CartFlyAnimation";
import { PriceDisplay } from "./PriceDisplay";
import { QuickAddPanel } from "./QuickAddPanel";
import { WishlistButton } from "./WishlistButton";

export function BestSellerItem({
  product,
  rank,
  cartQuantityByVariant,
  isWishlisted = false,
}: {
  product: ProductCardData;
  rank: number;
  /** Variant id -> quantity already in the cart — see useQuickAdd. */
  cartQuantityByVariant?: Record<string, number>;
  isWishlisted?: boolean;
}) {
  const t = useTranslations("BestSellersSection");
  const quickAdd = useQuickAdd(product, cartQuantityByVariant);

  const primaryImage = [...product.images].sort((a, b) => a.position - b.position)[0];
  const activeColor = quickAdd.previewColor ?? quickAdd.selectedColor;
  const previewImage = activeColor
    ? (imagesForColor(product.images, activeColor)[0] ?? primaryImage)
    : primaryImage;

  const rankLabel = String(rank).padStart(2, "0");
  const totalStock = product.variants.reduce((sum, v) => sum + Math.max(v.inventoryQuantity, 0), 0);
  const isOutOfStock = totalStock === 0;
  const isOnSale = product.compareAtCents != null;
  // Display-only, derived from the two prices — never re-derived into the
  // actual charged amount, which always comes straight from
  // basePriceCents/compareAtCents (see ProductCard's identical comment).
  const salePercentOff = isOnSale
    ? Math.round((1 - product.basePriceCents / product.compareAtCents!) * 100)
    : null;

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
      <div className="group relative flex flex-1 flex-col" onMouseLeave={quickAdd.clearPreview}>
        <Link href={`/products/${product.slug}`} className="flex flex-1 flex-col">
          <div className="bg-showcase-line relative aspect-[5/4] overflow-hidden">
            {previewImage ? (
              <Image
                src={previewImage.url}
                alt={previewImage.altText ?? product.title}
                fill
                sizes="(min-width: 640px) 33vw, 100vw"
                className="object-cover opacity-90 grayscale-[40%] contrast-[1.05] brightness-90 transition-transform duration-500 group-hover:scale-105"
              />
            ) : null}
            {isOnSale && (
              // Outer span carries the logical start-3 position so it mirrors
              // with the page direction; dir="ltr" lives on the inner span
              // only — see ProductCard's identical badge for why putting it
              // on the positioned element itself would break the mirroring.
              <span className="absolute top-3 start-3">
                <span
                  dir="ltr"
                  className="bg-showcase-rivet text-showcase-paper rounded-sm px-2 py-1 text-[10px] font-semibold tracking-[0.06em] uppercase"
                >
                  {t("onSale", { percent: salePercentOff! })}
                </span>
              </span>
            )}
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

        {/* Sibling of the Link, same reasoning as the quick-add overlay
            just below — see ProductCard's identical comment. */}
        <WishlistButton
          productId={product.id}
          initiallyWishlisted={isWishlisted}
          className="absolute top-3 end-3"
        />

        {/* Same sibling-overlay quick-add pattern as ProductCard — see its
            comment for why this sits outside the Link. Sized to the
            aspect-[5/4] image box above the text block. */}
        {!isOutOfStock && quickAdd.colors.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[5/4]">
            <QuickAddPanel
              quickAdd={quickAdd}
              tone="showcase"
              className="absolute inset-x-2 bottom-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            />
          </div>
        )}
      </div>

      <CartFlyAnimation flyRun={quickAdd.flyRun} onComplete={quickAdd.clearFlyRun} />
    </motion.div>
  );
}
