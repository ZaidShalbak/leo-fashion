"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

import type { ProductCardData } from "@/types/product";
import { Link } from "@/i18n/navigation";
import { LOW_STOCK_THRESHOLD } from "@/lib/inventory";
import { imagesForColor } from "@/lib/images";
import { colorSwatchValue } from "@/lib/colorSwatch";
import { cn } from "@/lib/utils";
import { addToCart } from "@/server/actions/cart";
import { PriceDisplay } from "./PriceDisplay";
import { CartFlyAnimation, findVisibleCartIcon, type FlyRun } from "./CartFlyAnimation";

// Same canonical size order VariantSelector uses — small enough to
// duplicate rather than couple two unrelated components through a shared
// file (same call this codebase already made for the date-helper
// duplication between src/lib/discount.ts and src/lib/heroBanners.ts).
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];
function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a);
    const bi = SIZE_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

type QuickAddStage =
  | { stage: "idle" }
  | { stage: "sizes"; color: string; sizes: string[] }
  | { stage: "adding" }
  | { stage: "added" }
  | { stage: "error"; message: string };

export function ProductCard({ product }: { product: ProductCardData }) {
  const t = useTranslations("ProductCard");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [quickAdd, setQuickAdd] = useState<QuickAddStage>({ stage: "idle" });
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [flyRun, setFlyRun] = useState<FlyRun | null>(null);

  const primaryImage = [...product.images].sort(
    (a, b) => a.position - b.position
  )[0];
  const previewImage = previewColor
    ? (imagesForColor(product.images, previewColor)[0] ?? primaryImage)
    : primaryImage;

  const colors = useMemo(
    () => [...new Set(product.variants.map((v) => v.color))],
    [product.variants]
  );
  const colorCount = colors.length;
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

  function colorHasAnyStock(color: string) {
    return product.variants.some((v) => v.color === color && v.inventoryQuantity > 0);
  }

  function resetAfter(delayMs: number) {
    setTimeout(() => setQuickAdd({ stage: "idle" }), delayMs);
  }

  function handleQuickAdd(variantId: string, startRect: DOMRect | null) {
    setQuickAdd({ stage: "adding" });
    const endEl = findVisibleCartIcon();

    startTransition(async () => {
      const result = await addToCart({ productId: product.id, variantId, quantity: 1 });
      if (result.success) {
        // Same reasoning as VariantSelector's handleAddToCart: the
        // header's cart count is a server-computed prop, so an explicit
        // refresh is needed for the badge to reflect the new count.
        router.refresh();
        setQuickAdd({ stage: "added" });
        resetAfter(1600);
        if (startRect && endEl) {
          setFlyRun({ id: Date.now(), start: startRect, end: endEl.getBoundingClientRect() });
        }
      } else {
        setQuickAdd({ stage: "error", message: result.error });
        resetAfter(2200);
      }
    });
  }

  function handleSelectColor(color: string, startRect: DOMRect) {
    const inStockSizes = sortSizes(
      product.variants
        .filter((v) => v.color === color && v.inventoryQuantity > 0)
        .map((v) => v.size)
    );
    if (inStockSizes.length === 1) {
      const variant = product.variants.find(
        (v) => v.color === color && v.size === inStockSizes[0]
      )!;
      handleQuickAdd(variant.id, startRect);
    } else if (inStockSizes.length > 1) {
      setQuickAdd({ stage: "sizes", color, sizes: inStockSizes });
    }
  }

  function handleSelectSize(color: string, size: string, startRect: DOMRect) {
    const variant = product.variants.find((v) => v.color === color && v.size === size);
    if (!variant) return;
    handleQuickAdd(variant.id, startRect);
  }

  function handlePointerLeaveCard() {
    setPreviewColor(null);
    // Only the swatch->size micro-flow resets on leave — adding/added/
    // error already self-time-out, and resetting mid-flight there would
    // cut the feedback (or the fly animation's start rect) short.
    if (quickAdd.stage === "sizes") setQuickAdd({ stage: "idle" });
  }

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
      <div
        className="group relative"
        data-slot="product-card"
        onMouseLeave={handlePointerLeaveCard}
      >
        <Link href={`/products/${product.slug}`} className="block">
          <div className="bg-muted relative aspect-[4/5] overflow-hidden rounded-lg">
            {previewImage ? (
              <Image
                src={previewImage.url}
                alt={previewImage.altText ?? product.title}
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

        {/* Quick-add overlay — a sibling of the Link above, not nested
            inside it, so its buttons never end up inside an <a> (invalid
            HTML) and never compete with the Link for clicks. Sized/
            positioned to exactly cover the image box via the same
            aspect-[4/5]/inset-x-0/top-0 combination, so it visually sits
            over the photo without touching the title/price text below.
            pointer-events-none on this sizing wrapper lets clicks on the
            photo itself fall through to the Link underneath; the inner
            row re-enables pointer-events for its own buttons. Visible
            without hovering below `sm` (no hover on touch), fades in on
            hover at `sm` and up — same opacity-0/group-hover idiom
            HeroCarousel's arrow buttons already use, just breakpoint-
            gated. */}
        {!isOutOfStock && colorCount > 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[4/5]">
            <div
              className={cn(
                "pointer-events-auto absolute inset-x-2 bottom-2 rounded-md bg-white/95 p-2 opacity-100 shadow-md backdrop-blur-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 dark:bg-black/85"
              )}
            >
              {quickAdd.stage === "added" ? (
                <p className="text-center text-xs font-medium">{t("added")}</p>
              ) : quickAdd.stage === "adding" || isPending ? (
                <p className="text-muted-foreground text-center text-xs">{t("adding")}</p>
              ) : quickAdd.stage === "error" ? (
                <p className="text-destructive text-center text-xs">{quickAdd.message}</p>
              ) : quickAdd.stage === "sizes" ? (
                <div className="flex flex-wrap justify-center gap-1">
                  {quickAdd.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      aria-label={t("sizeAria", { size })}
                      onClick={(e) => handleSelectSize(quickAdd.color, size, e.currentTarget.getBoundingClientRect())}
                      className="border-input hover:border-primary min-w-8 rounded border bg-white px-2 py-1 text-xs transition dark:bg-black"
                    >
                      {size}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {colors.map((color) => {
                    const disabled = !colorHasAnyStock(color);
                    const swatch = colorSwatchValue(color);
                    return (
                      <button
                        key={color}
                        type="button"
                        disabled={disabled}
                        aria-label={t("colorAria", { color })}
                        onMouseEnter={() => setPreviewColor(color)}
                        onClick={(e) => handleSelectColor(color, e.currentTarget.getBoundingClientRect())}
                        className={cn(
                          "size-6 rounded-full border shadow-sm transition",
                          disabled
                            ? "cursor-not-allowed opacity-30"
                            : "hover:scale-110 hover:ring-2 hover:ring-primary/50"
                        )}
                        style={swatch ? { backgroundColor: swatch } : undefined}
                        title={color}
                      >
                        {!swatch && (
                          <span className="sr-only">{color}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <CartFlyAnimation flyRun={flyRun} onComplete={() => setFlyRun(null)} />
    </motion.div>
  );
}
