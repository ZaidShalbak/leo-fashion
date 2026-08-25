"use client";

import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { CheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LOW_STOCK_THRESHOLD } from "@/lib/inventory";
import { colorSwatchValue } from "@/lib/colorSwatch";
import { addToCart } from "@/server/actions/cart";
import { PriceDisplay } from "./PriceDisplay";
import { RollingText } from "./RollingText";
import { CartFlyAnimation, findVisibleCartIcon, type FlyRun } from "./CartFlyAnimation";

type Variant = {
  id: string;
  size: string;
  color: string;
  priceOverrideCents: number | null;
  inventoryQuantity: number;
};

// Canonical size order when present; anything else falls back to the
// order it appears in the data.
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

export function VariantSelector({
  productId,
  basePriceCents,
  compareAtCents,
  variants,
  selectedColor,
  onColorChange,
  cartQuantityByVariant = {},
}: {
  productId: string;
  basePriceCents: number;
  /** Pre-sale price, when a Sale applies to the product's base price —
   * only shown when the selected variant has no priceOverrideCents of its
   * own (see priceCents below): a variant override opts that variant out
   * of the visible sale strike-through rather than producing a
   * wrong-looking discount against a price the sale never touched. */
  compareAtCents: number | null;
  variants: Variant[];
  // Color selection is lifted to the parent (ProductDetail) so the photo
  // gallery can react to it too — everything else about selection state
  // (size, the fallback-pairing logic below) stays local to this
  // component, since only color affects which photos show.
  selectedColor: string;
  onColorChange: (color: string) => void;
  /** Variant id -> quantity already in the cart (src/server/actions/cart.ts's
   * getCartQuantityByVariant) — lets the Add to cart button disable itself
   * with a clear reason once the cart already holds all available stock
   * for the selected variant, instead of letting another click silently
   * no-op. */
  cartQuantityByVariant?: Record<string, number>;
}) {
  const t = useTranslations("VariantSelector");
  const sizes = useMemo(
    () => sortSizes([...new Set(variants.map((v) => v.size))]),
    [variants]
  );
  const colors = useMemo(
    () => [...new Set(variants.map((v) => v.color))],
    [variants]
  );

  const firstInStock = variants.find((v) => v.inventoryQuantity > 0);
  const [selectedSize, setSelectedSize] = useState(
    firstInStock?.size ?? variants[0]?.size
  );
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);
  const [justAdded, setJustAdded] = useState(false);
  const [flyRun, setFlyRun] = useState<FlyRun | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const matched = variants.find(
    (v) => v.size === selectedSize && v.color === selectedColor
  );
  const isOutOfStock = !matched || matched.inventoryQuantity <= 0;
  // Distinct from isOutOfStock: real stock exists, but the cart already
  // holds all of it — a further click would either no-op or (once the
  // cart page's own cap kicks in) silently add nothing.
  const inCartQuantity = matched ? (cartQuantityByVariant[matched.id] ?? 0) : 0;
  const isMaxInCart =
    !isOutOfStock && !!matched && matched.inventoryQuantity - inCartQuantity <= 0;
  // Tied to the currently selected size+color, not the product as a whole
  // — matches ProductCard's grid-level badge in spirit, but here there's
  // an actual selected variant to be precise about, so no need to fall
  // back to a summed/aggregate count.
  const isLowStock =
    !isOutOfStock && matched.inventoryQuantity <= LOW_STOCK_THRESHOLD;
  const priceCents = matched?.priceOverrideCents ?? basePriceCents;
  const hasVariantOverride = matched?.priceOverrideCents != null;

  function variantFor(size: string, color: string) {
    return variants.find((v) => v.size === size && v.color === color);
  }

  // Whether *any* variant of this size (in any color) has stock — used to
  // decide if the size button itself is selectable at all. This is
  // deliberately not "does size+selectedColor have stock": a product
  // doesn't have to sell every size in every color (e.g. M only comes in
  // Black, L only in Navy), and treating that as "M is unavailable" just
  // because Navy happens to be selected would make half a real catalog
  // look permanently out of stock.
  function sizeHasAnyStock(size: string) {
    return variants.some((v) => v.size === size && v.inventoryQuantity > 0);
  }
  function colorHasAnyStock(color: string) {
    return variants.some((v) => v.color === color && v.inventoryQuantity > 0);
  }

  function handleSelectSize(size: string) {
    setSelectedSize(size);
    const current = variantFor(size, selectedColor);
    if (!current || current.inventoryQuantity <= 0) {
      // The current color doesn't exist for this size — jump to whichever
      // color *does* have stock in this size instead of landing on a dead
      // combination the shopper would have to guess their way out of.
      const fallbackColor = colors.find(
        (c) => (variantFor(size, c)?.inventoryQuantity ?? 0) > 0
      );
      if (fallbackColor) onColorChange(fallbackColor);
    }
  }

  function handleSelectColor(color: string) {
    onColorChange(color);
    const current = variantFor(selectedSize, color);
    if (!current || current.inventoryQuantity <= 0) {
      const fallbackSize = sizes.find(
        (s) => (variantFor(s, color)?.inventoryQuantity ?? 0) > 0
      );
      if (fallbackSize) setSelectedSize(fallbackSize);
    }
  }

  function handleAddToCart() {
    if (!matched) return;
    setFeedback(null);

    // Captured before the transition starts, not after — the button's own
    // rect doesn't move once clicked, but grabbing it up front keeps this
    // independent of whatever the button renders while pending.
    const startEl = addButtonRef.current;
    const endEl = findVisibleCartIcon();

    startTransition(async () => {
      const result = await addToCart({
        productId,
        variantId: matched.id,
        quantity: 1,
      });
      setFeedback(
        result.success
          ? { type: "success", message: result.message }
          : { type: "error", message: result.error }
      );
      if (result.success) {
        // The header's cart count is a server-computed prop (see
        // StorefrontLayout) — addToCart's own revalidatePath only covers
        // /cart, a different route segment, so without an explicit
        // refresh the badge would silently stay stale until the next
        // full navigation. router.refresh() re-runs this route's server
        // reads (the layout included) so the badge's pop-in below
        // actually reflects the new count, not the old one animating in
        // place.
        router.refresh();
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1900);
        if (startEl && endEl) {
          setFlyRun({
            id: Date.now(),
            start: startEl.getBoundingClientRect(),
            end: endEl.getBoundingClientRect(),
          });
        }
      }
    });
  }

  return (
    <div className="space-y-5" data-slot="variant-selector">
      <div className="flex items-center gap-2">
        <PriceDisplay
          cents={priceCents}
          compareAtCents={hasVariantOverride ? undefined : (compareAtCents ?? undefined)}
          className="text-xl font-medium"
        />
        {isLowStock && (
          <span className="bg-destructive rounded-md px-2 py-1 text-xs font-medium text-white">
            {t("lowStock", { count: matched?.inventoryQuantity ?? 0 })}
          </span>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">{t("size")}</p>
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => {
            const disabled = !sizeHasAnyStock(size);
            const isSelected = size === selectedSize;
            return (
              <button
                key={size}
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                onClick={() => handleSelectSize(size)}
                className={cn(
                  "border-input relative min-w-10 rounded-md border px-3 py-1.5 text-sm transition",
                  disabled &&
                    "text-muted-foreground cursor-not-allowed line-through opacity-50"
                )}
              >
                {/* Shared layoutId — Motion animates this pill sliding from
                    whichever size was previously selected to this one,
                    rather than the border/tint just popping in place. */}
                {isSelected && (
                  <motion.span
                    layoutId="size-selected-pill"
                    className="border-primary bg-primary/5 absolute inset-0 rounded-md border-2"
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  />
                )}
                <span className="relative">{size}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">{t("color")}</p>
        <div className="flex flex-wrap gap-3">
          {colors.map((color) => {
            const disabled = !colorHasAnyStock(color);
            const isSelected = color === selectedColor;
            const swatch = colorSwatchValue(color);
            return (
              <button
                key={color}
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                aria-label={color}
                onClick={() => handleSelectColor(color)}
                className={cn(
                  "group flex flex-col items-center gap-1.5",
                  disabled && "cursor-not-allowed"
                )}
              >
                <span className="relative flex size-11 items-center justify-center">
                  {isSelected && (
                    <motion.span
                      layoutId="color-selected-ring"
                      className="ring-foreground absolute inset-0 rounded-full ring-2 ring-offset-2"
                      transition={{ type: "spring", stiffness: 500, damping: 32 }}
                    />
                  )}
                  <span
                    className={cn(
                      "border-border relative flex size-9 items-center justify-center overflow-hidden rounded-full border shadow-sm transition",
                      !disabled && "group-hover:scale-110",
                      disabled && "opacity-30"
                    )}
                    style={swatch ? { backgroundColor: swatch } : undefined}
                  >
                    {!swatch && (
                      <span className="text-foreground/70 text-[9px] font-medium uppercase">
                        {color.slice(0, 2)}
                      </span>
                    )}
                    {disabled && (
                      <span className="bg-border absolute inset-x-[-2px] top-1/2 h-px -rotate-45" />
                    )}
                    {isSelected && !disabled && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        // A light swatch needs a dark check to stay visible;
                        // a dark one needs a light check — there's no
                        // reliable way to know a free-text color's luminance
                        // up front. mix-blend-difference inverts against
                        // whatever's underneath, so a single white icon
                        // reads correctly against any swatch color.
                        className="absolute inset-0 flex items-center justify-center text-white mix-blend-difference"
                      >
                        <CheckIcon className="size-4" />
                      </motion.span>
                    )}
                  </span>
                </span>
                <span
                  className={cn(
                    "text-xs transition",
                    isSelected ? "text-foreground font-medium" : "text-muted-foreground",
                    disabled && "line-through opacity-50"
                  )}
                >
                  {color}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Button
        ref={addButtonRef}
        type="button"
        size="lg"
        disabled={isOutOfStock || isMaxInCart || isPending}
        onClick={handleAddToCart}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="w-full overflow-hidden sm:w-auto"
      >
        <motion.span
          // Keyed, not wrapped in AnimatePresence — a plain keyed span
          // still replays its `initial` -> `animate` pop on every key
          // change, without needing AnimatePresence's coordinated exit-
          // then-enter sequencing (mode="wait"), which is unnecessary
          // complexity for a single-line label swap like this one.
          key={
            isOutOfStock
              ? "out"
              : isMaxInCart
                ? "max"
                : isPending
                  ? "adding"
                  : justAdded
                    ? "added"
                    : "idle"
          }
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-1.5"
        >
          {justAdded && !isOutOfStock && !isPending && <CheckIcon className="size-4" />}
          {isOutOfStock ? (
            t("outOfStock")
          ) : isMaxInCart ? (
            t("maxInCart")
          ) : isPending ? (
            t("adding")
          ) : justAdded ? (
            t("added")
          ) : (
            // Rolling-hover treatment only in the plain idle state — once
            // pending/out-of-stock/just-added, the label itself is
            // already communicating a state change via the crossfade
            // above, and layering a second hover animation on top of that
            // would compete with it rather than add anything.
            <RollingText active={isHovering}>{t("addToCart")}</RollingText>
          )}
        </motion.span>
      </Button>

      {feedback && (
        <p
          role="status"
          className={cn(
            "text-sm",
            feedback.type === "error" ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {feedback.message}
        </p>
      )}

      <CartFlyAnimation flyRun={flyRun} onComplete={() => setFlyRun(null)} />
    </div>
  );
}
