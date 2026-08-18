"use client";

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
}: {
  productId: string;
  basePriceCents: number;
  variants: Variant[];
}) {
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
  const [selectedColor, setSelectedColor] = useState(
    firstInStock?.color ?? variants[0]?.color
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
        <p className="mb-2 text-sm font-medium">Size</p>
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => {
            const variant = variantFor(size, selectedColor);
            const disabled = !variant || variant.inventoryQuantity <= 0;
            return (
              <button
                key={size}
                type="button"
                disabled={disabled}
                aria-pressed={size === selectedSize}
                onClick={() => setSelectedSize(size)}
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
        <p className="mb-2 text-sm font-medium">Color</p>
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => {
            const variant = variantFor(selectedSize, color);
            const disabled = !variant || variant.inventoryQuantity <= 0;
            return (
              <button
                key={color}
                type="button"
                disabled={disabled}
                aria-pressed={color === selectedColor}
                onClick={() => setSelectedColor(color)}
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
        {isOutOfStock
          ? "Out of stock"
          : isPending
            ? "Adding…"
            : "Add to cart"}
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
