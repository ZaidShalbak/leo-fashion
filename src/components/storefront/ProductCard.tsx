"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";

import type { ProductCardData } from "@/types/product";
import { Link } from "@/i18n/navigation";
import { LOW_STOCK_THRESHOLD } from "@/lib/inventory";
import { PriceDisplay } from "./PriceDisplay";

export function ProductCard({ product }: { product: ProductCardData }) {
  const t = useTranslations("ProductCard");
  const primaryImage = [...product.images].sort(
    (a, b) => a.position - b.position
  )[0];
  const colorCount = new Set(product.variants.map((v) => v.color)).size;
  const totalStock = product.variants.reduce(
    (sum, v) => sum + Math.max(v.inventoryQuantity, 0),
    0
  );
  const isOutOfStock = totalStock === 0;
  // Card-level, not a specific size/color — there's no variant picker here
  // (that only exists on the product detail page), so this is "the whole
  // product is running low everywhere," using stock summed across every
  // variant rather than any one combination.
  const isLowStock = !isOutOfStock && totalStock <= LOW_STOCK_THRESHOLD;
  const isOnSale = product.compareAtCents != null;
  // Derived from the two prices for display purposes only — the actual
  // charged amount always comes straight from basePriceCents/
  // compareAtCents, never re-derived from this rounded percentage.
  const salePercentOff = isOnSale
    ? Math.round((1 - product.basePriceCents / product.compareAtCents!) * 100)
    : null;

  return (
    <motion.div
      // Scroll-reveal — deliberately no index-based stagger delay (which
      // would need every call site of ProductCard, across the homepage,
      // collection/brand listings, and "similar products," to start
      // passing an index prop just for this). Scrolling itself already
      // staggers *when* each card crosses the viewport threshold, so
      // cards further down a grid naturally reveal a beat after the ones
      // above them with zero prop drilling. `once: true` so this plays on
      // first scroll into view and never replays when scrolling back up;
      // `margin` starts the reveal a little before the card is fully in
      // view so it doesn't feel like it's racing the scroll.
      initial={{ opacity: 0, y: 32, scale: 0.94, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/products/${product.slug}`}
        className="group block"
        data-slot="product-card"
      >
        <div className="bg-muted relative aspect-[4/5] overflow-hidden rounded-lg">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.altText ?? product.title}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : null}
          {/* Only one badge shows at a time — out of stock (can't buy it)
              takes priority over a sale, which in turn takes priority over
              a low-stock count. */}
          {isOutOfStock ? (
            <span className="bg-background/90 text-foreground absolute top-2 start-2 rounded-md px-2 py-1 text-xs font-medium">
              {t("outOfStock")}
            </span>
          ) : isOnSale ? (
            // See BrandsSection's identical badge for why dir="ltr" lives
            // on the inner span, not a logically-positioned (start-2)
            // outer one — putting it on the same element would pin the
            // badge to the physical left always, undoing the mirroring
            // the other two badges here already get for free.
            <span className="absolute top-2 start-2">
              <span
                dir="ltr"
                className="bg-primary text-primary-foreground rounded-md px-2 py-1 text-xs font-medium"
              >
                {t("onSale", { percent: salePercentOff! })}
              </span>
            </span>
          ) : (
            isLowStock && (
              <span className="bg-destructive absolute top-2 start-2 rounded-md px-2 py-1 text-xs font-medium text-white">
                {t("lowStock", { count: totalStock })}
              </span>
            )
          )}
        </div>
        <div className="mt-3 space-y-1">
          {product.brand && (
            <span className="text-muted-foreground text-xs tracking-wide uppercase">
              {product.brand.name}
            </span>
          )}
          <h3 className="text-sm font-medium">{product.title}</h3>
          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <PriceDisplay
              cents={product.basePriceCents}
              compareAtCents={product.compareAtCents ?? undefined}
            />
            {colorCount > 1 && <span>{t("colorCount", { count: colorCount })}</span>}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
