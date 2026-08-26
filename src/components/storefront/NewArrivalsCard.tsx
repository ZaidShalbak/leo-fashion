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

export function NewArrivalsCard({
  product,
  cartQuantityByVariant,
  isWishlisted = false,
}: {
  product: ProductCardData;
  /** Variant id -> quantity already in the cart — see useQuickAdd. */
  cartQuantityByVariant?: Record<string, number>;
  isWishlisted?: boolean;
}) {
  const t = useTranslations("NewArrivalsSection");
  const quickAdd = useQuickAdd(product, cartQuantityByVariant);

  const primaryImage = [...product.images].sort((a, b) => a.position - b.position)[0];
  const activeColor = quickAdd.previewColor ?? quickAdd.selectedColor;
  const previewImage = activeColor
    ? (imagesForColor(product.images, activeColor)[0] ?? primaryImage)
    : primaryImage;

  const totalStock = product.variants.reduce((sum, v) => sum + Math.max(v.inventoryQuantity, 0), 0);
  const isOutOfStock = totalStock === 0;
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
      <div className="group relative" onMouseLeave={quickAdd.clearPreview}>
        <Link href={`/products/${product.slug}`} className="block">
          <div className="bg-showcase-line-paper relative aspect-[4/5] overflow-hidden">
            {previewImage ? (
              <Image
                src={previewImage.url}
                alt={previewImage.altText ?? product.title}
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
          <div className="px-1 pt-3.5">
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

        {/* Sibling of the Link, same reasoning as the quick-add overlay
            just below — see ProductCard's identical comment. */}
        <WishlistButton
          productId={product.id}
          initiallyWishlisted={isWishlisted}
          className="absolute top-2 end-2"
        />

        {/* Same sibling-overlay quick-add pattern as ProductCard. */}
        {!isOutOfStock && quickAdd.colors.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[4/5]">
            <QuickAddPanel
              quickAdd={quickAdd}
              className="absolute inset-x-2 bottom-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            />
          </div>
        )}
      </div>

      <CartFlyAnimation flyRun={quickAdd.flyRun} onComplete={quickAdd.clearFlyRun} />
    </motion.div>
  );
}
