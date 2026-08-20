"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addToCart } from "@/server/actions/cart";
import { formatPriceCents } from "./PriceDisplay";

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

  const matched = variants.find(
    (v) => v.size === selectedSize && v.color === selectedColor
  );
  const isOutOfStock = !matched || matched.inventoryQuantity <= 0;
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
    });
  }

  return (
    <div className="space-y-5" data-slot="variant-selector">
      <p className="text-xl font-medium">{formatPriceCents(priceCents)}</p>

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
        type="button"
        size="lg"
        disabled={isOutOfStock || isPending}
        onClick={handleAddToCart}
        className="w-full sm:w-auto"
      >
        {isOutOfStock ? t("outOfStock") : isPending ? t("adding") : t("addToCart")}
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
    </div>
  );
}
