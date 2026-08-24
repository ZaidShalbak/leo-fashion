import { describe, expect, it } from "vitest";

import {
  colorHasStock,
  colorsForVariants,
  findVariant,
  sizesForColor,
  sortSizes,
  type QuickAddVariant,
} from "./quickAdd";

function v(size: string, color: string, inventoryQuantity: number): QuickAddVariant {
  return { id: `${size}-${color}`, size, color, inventoryQuantity };
}

describe("sortSizes", () => {
  it("orders canonical sizes correctly", () => {
    expect(sortSizes(["L", "XS", "M", "S", "XL"])).toEqual(["XS", "S", "M", "L", "XL"]);
  });

  it("falls back to alphabetical order for unknown sizes", () => {
    expect(sortSizes(["42", "40", "41"])).toEqual(["40", "41", "42"]);
  });

  it("puts unknown sizes after canonical ones", () => {
    expect(sortSizes(["One Size", "M", "S"])).toEqual(["S", "M", "One Size"]);
  });
});

describe("colorsForVariants", () => {
  it("returns the unique set of colors", () => {
    const variants = [v("M", "Black", 5), v("L", "Black", 3), v("M", "Navy", 2)];
    expect(colorsForVariants(variants)).toEqual(["Black", "Navy"]);
  });
});

describe("colorHasStock", () => {
  it("is true when any size of that color has stock", () => {
    const variants = [v("M", "Black", 0), v("L", "Black", 4)];
    expect(colorHasStock(variants, "Black")).toBe(true);
  });

  it("is false when every size of that color is out of stock", () => {
    const variants = [v("M", "Black", 0), v("L", "Black", 0)];
    expect(colorHasStock(variants, "Black")).toBe(false);
  });
});

describe("sizesForColor", () => {
  it("returns every size on the product, not just the ones this color offers", () => {
    // Partial matrix, same shape as the real M/Black + L/Navy bug fixed
    // previously (CLAUDE.md: "Fixed the size/color picker for partial
    // variant matrices") — only two variants exist total, on the diagonal.
    const variants = [v("M", "Black", 10), v("L", "Navy", 10)];

    const forBlack = sizesForColor(variants, "Black");
    expect(forBlack).toEqual([
      { size: "M", inStock: true },
      { size: "L", inStock: false },
    ]);

    const forNavy = sizesForColor(variants, "Navy");
    expect(forNavy).toEqual([
      { size: "M", inStock: false },
      { size: "L", inStock: true },
    ]);
  });

  it("flags a size out of stock for this color even if another color has it", () => {
    const variants = [v("M", "Black", 0), v("M", "Navy", 5)];
    expect(sizesForColor(variants, "Black")).toEqual([{ size: "M", inStock: false }]);
  });
});

describe("findVariant", () => {
  it("finds the matching variant", () => {
    const variants = [v("M", "Black", 5), v("L", "Navy", 3)];
    expect(findVariant(variants, "Black", "M")?.id).toBe("M-Black");
  });

  it("returns undefined for a nonexistent combination", () => {
    const variants = [v("M", "Black", 5)];
    expect(findVariant(variants, "Black", "L")).toBeUndefined();
  });
});
