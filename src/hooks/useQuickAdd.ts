"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { addToCart } from "@/server/actions/cart";
import {
  colorHasStock,
  colorsForVariants,
  findVariant,
  sizesForColor,
  type QuickAddVariant,
  type SizeOption,
} from "@/lib/quickAdd";
import { findVisibleCartIcon, type FlyRun } from "@/components/storefront/CartFlyAnimation";

export type QuickAddPhase = "idle" | "adding" | "added" | "error";

/**
 * Shared stateful glue behind every product-card quick-add UI (ProductCard,
 * BestSellerItem, NewArrivalsCard — see src/components/storefront/
 * QuickAddPanel.tsx for the presentational half). Hovering a color swatch
 * only sets previewColor (an ephemeral photo swap); clicking one sets the
 * real selectedColor and clears any selectedSize. Clicking a size just
 * selects it — neither click auto-adds to the cart. Only handleAddToCart,
 * wired to an explicit "Add to cart" button, ever calls addToCart.
 * Selections persist once made (they used to reset on pointer-leave) since
 * there's now a real multi-step pick to preserve while the pointer travels
 * to that button; only the ephemeral hover preview clears on leave (see
 * clearPreview).
 */
export function useQuickAdd(
  product: { id: string; variants: QuickAddVariant[] },
  /** Variant id -> quantity already in the cart (see
   * src/server/actions/cart.ts's getCartQuantityByVariant) — used to
   * disable "Add to cart" with a clear reason once the cart already holds
   * all available stock for the selected variant. */
  cartQuantityByVariant: Record<string, number> = {}
) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [phase, setPhase] = useState<QuickAddPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [flyRun, setFlyRun] = useState<FlyRun | null>(null);

  const colors = colorsForVariants(product.variants);
  const sizes: SizeOption[] = selectedColor
    ? sizesForColor(product.variants, selectedColor)
    : [];
  const matched =
    selectedColor && selectedSize
      ? findVariant(product.variants, selectedColor, selectedSize)
      : undefined;
  const inCartQuantity = matched ? (cartQuantityByVariant[matched.id] ?? 0) : 0;
  const remainingStock = matched ? matched.inventoryQuantity - inCartQuantity : 0;
  const canAddToCart = matched != null && remainingStock > 0;
  // Distinct from "no combination picked yet" — a real, in-stock variant
  // is selected, but the cart already holds all of it.
  const maxStockReached = matched != null && remainingStock <= 0;

  function selectColor(color: string) {
    setSelectedColor(color);
    setSelectedSize(null);
    setPhase("idle");
  }

  function selectSize(size: string) {
    setSelectedSize(size);
    setPhase("idle");
  }

  function clearPreview() {
    setPreviewColor(null);
  }

  function resetAfter(delayMs: number) {
    setTimeout(() => setPhase("idle"), delayMs);
  }

  function handleAddToCart(startRect: DOMRect | null) {
    if (!matched) return;
    const endEl = findVisibleCartIcon();
    setPhase("adding");

    startTransition(async () => {
      const result = await addToCart({
        productId: product.id,
        variantId: matched.id,
        quantity: 1,
      });
      if (result.success) {
        // The header's cart count is a server-computed prop — an explicit
        // refresh is needed for the badge to reflect the new count.
        router.refresh();
        setPhase("added");
        resetAfter(1600);
        if (startRect && endEl) {
          setFlyRun({ id: Date.now(), start: startRect, end: endEl.getBoundingClientRect() });
        }
      } else {
        setErrorMessage(result.error);
        setPhase("error");
        resetAfter(2200);
      }
    });
  }

  return {
    colors,
    sizes,
    selectedColor,
    selectedSize,
    previewColor,
    phase: isPending ? ("adding" as const) : phase,
    errorMessage,
    canAddToCart,
    maxStockReached,
    flyRun,
    colorHasStock: (color: string) => colorHasStock(product.variants, color),
    selectColor,
    setPreviewColor,
    selectSize,
    clearPreview,
    handleAddToCart,
    clearFlyRun: () => setFlyRun(null),
  };
}

export type UseQuickAddResult = ReturnType<typeof useQuickAdd>;
