"use client";

import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { CheckIcon, ShirtIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LOW_STOCK_THRESHOLD } from "@/lib/inventory";
import { addToCart } from "@/server/actions/cart";
import { formatPriceCents } from "./PriceDisplay";
import { RollingText } from "./RollingText";

/** Start/end rects (viewport-relative) for one fly-to-cart animation run. */
type FlyRun = { id: number; start: DOMRect; end: DOMRect };

/**
 * Picks whichever cart-icon instance is actually visible at the current
 * viewport width — CartIconLink renders once in the desktop nav and once
 * in the mobile top bar (see its own comment), and exactly one of the two
 * has a real, non-zero layout box at any given time since they're mutually
 * exclusive via Tailwind breakpoints.
 */
function findVisibleCartIcon(): Element | null {
  const candidates = document.querySelectorAll("[data-cart-icon-target]");
  return Array.from(candidates).find((el) => el.getClientRects().length > 0) ?? null;
}

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
  variants,
  selectedColor,
  onColorChange,
}: {
  productId: string;
  basePriceCents: number;
  variants: Variant[];
  // Color selection is lifted to the parent (ProductDetail) so the photo
  // gallery can react to it too — everything else about selection state
  // (size, the fallback-pairing logic below) stays local to this
  // component, since only color affects which photos show.
  selectedColor: string;
  onColorChange: (color: string) => void;
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
  // Tied to the currently selected size+color, not the product as a whole
  // — matches ProductCard's grid-level badge in spirit, but here there's
  // an actual selected variant to be precise about, so no need to fall
  // back to a summed/aggregate count.
  const isLowStock =
    !isOutOfStock && matched.inventoryQuantity <= LOW_STOCK_THRESHOLD;
  const priceCents = matched?.priceOverrideCents ?? basePriceCents;

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
        <p className="text-xl font-medium">{formatPriceCents(priceCents)}</p>
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
            return (
              <button
                key={size}
                type="button"
                disabled={disabled}
                aria-pressed={size === selectedSize}
                onClick={() => handleSelectSize(size)}
                className={cn(
                  "border-input min-w-10 rounded-md border px-3 py-1.5 text-sm transition",
                  size === selectedSize && "border-primary bg-primary/5",
                  disabled &&
                    "text-muted-foreground cursor-not-allowed line-through opacity-50"
                )}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">{t("color")}</p>
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => {
            const disabled = !colorHasAnyStock(color);
            return (
              <button
                key={color}
                type="button"
                disabled={disabled}
                aria-pressed={color === selectedColor}
                onClick={() => handleSelectColor(color)}
                className={cn(
                  "border-input rounded-md border px-3 py-1.5 text-sm transition",
                  color === selectedColor && "border-primary bg-primary/5",
                  disabled &&
                    "text-muted-foreground cursor-not-allowed line-through opacity-50"
                )}
              >
                {color}
              </button>
            );
          })}
        </div>
      </div>

      <Button
        ref={addButtonRef}
        type="button"
        size="lg"
        disabled={isOutOfStock || isPending}
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
          key={isOutOfStock ? "out" : isPending ? "adding" : justAdded ? "added" : "idle"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-1.5"
        >
          {justAdded && !isOutOfStock && !isPending && <CheckIcon className="size-4" />}
          {isOutOfStock ? (
            t("outOfStock")
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

      {/* Fly-to-cart flourish — a small shirt icon (a clothing-store-
          appropriate stand-in for "the item," since actually cloning the
          product photo would need extra prop plumbing this component
          doesn't otherwise need) travels from the button to whichever
          cart icon is currently visible (see findVisibleCartIcon above)
          and shrinks away as it arrives, roughly timed to land alongside
          the badge's own pop-in (see CartIconLink). Portaled to
          document.body (not rendered in place) since it needs to be
          `position: fixed` relative to the viewport and fly across
          unrelated parts of the page — the header it's flying toward
          isn't a descendant of this component. z-[70]: above the header/
          footer's z-50 and the WhatsApp button's z-[60] (see that
          button's comment) so it stays visible the entire flight,
          including over the header itself. */}
      {flyRun &&
        createPortal(
          <motion.div
            key={flyRun.id}
            className="bg-foreground text-background pointer-events-none fixed z-[70] flex size-8 items-center justify-center rounded-full shadow-lg"
            style={{
              left: flyRun.start.left + flyRun.start.width / 2 - 16,
              top: flyRun.start.top + flyRun.start.height / 2 - 16,
            }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
            animate={{
              x:
                flyRun.end.left +
                flyRun.end.width / 2 -
                (flyRun.start.left + flyRun.start.width / 2),
              y:
                flyRun.end.top +
                flyRun.end.height / 2 -
                (flyRun.start.top + flyRun.start.height / 2),
              scale: 0.4,
              opacity: 0,
              rotate: 15,
            }}
            transition={{ duration: 1.7, ease: [0.2, 0.7, 0.2, 1] }}
            onAnimationComplete={() => setFlyRun(null)}
          >
            <ShirtIcon className="size-4" />
          </motion.div>,
          document.body
        )}
    </div>
  );
}
