// Pure selection logic shared by every product-card quick-add UI
// (ProductCard, BestSellerItem, NewArrivalsCard) via src/hooks/useQuickAdd.ts
// and src/components/storefront/QuickAddPanel.tsx. Kept framework-free so
// it's trivially unit-testable, same pattern as src/lib/discount.ts /
// src/lib/heroBanners.ts.

export type QuickAddVariant = {
  id: string;
  size: string;
  color: string;
  inventoryQuantity: number;
};

// Same canonical size order VariantSelector's own (separate, deliberately
// un-shared — see its comment) copy uses.
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ai = SIZE_ORDER.indexOf(a);
    const bi = SIZE_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function colorsForVariants(variants: QuickAddVariant[]): string[] {
  return [...new Set(variants.map((v) => v.color))];
}

export function colorHasStock(variants: QuickAddVariant[], color: string): boolean {
  return variants.some((v) => v.color === color && v.inventoryQuantity > 0);
}

export type SizeOption = { size: string; inStock: boolean };

/**
 * Every size that exists anywhere on the product (not just for this
 * color), each flagged whether *this* color has stock at that size —
 * closer to VariantSelector's full picker than a size list scoped only to
 * what this color happens to offer, so a shopper always sees the whole
 * size range rather than a suspiciously short list. Guards against the
 * exact partial-variant-matrix bug documented in CLAUDE.md ("Fixed the
 * size/color picker for partial variant matrices") — see quickAdd.test.ts.
 */
export function sizesForColor(variants: QuickAddVariant[], color: string): SizeOption[] {
  const allSizes = sortSizes([...new Set(variants.map((v) => v.size))]);
  return allSizes.map((size) => ({
    size,
    inStock: variants.some(
      (v) => v.size === size && v.color === color && v.inventoryQuantity > 0
    ),
  }));
}

export function findVariant(
  variants: QuickAddVariant[],
  color: string,
  size: string
): QuickAddVariant | undefined {
  return variants.find((v) => v.color === color && v.size === size);
}
