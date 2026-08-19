import { describe, expect, it } from "vitest";

import { productSchema } from "./product";

const baseProduct = {
  title: "Classic Crew Tee",
  slug: "classic-crew-tee",
  basePriceCents: 2800,
  brandId: "c000000000000000000000001",
  variants: [
    { sku: "TEE-CRW-M-BLK", size: "M", color: "Black", inventoryQuantity: 10 },
  ],
};

describe("productSchema", () => {
  it("accepts a well-formed product", () => {
    expect(productSchema.safeParse(baseProduct).success).toBe(true);
  });

  it("rejects a slug with uppercase or spaces", () => {
    const result = productSchema.safeParse({
      ...baseProduct,
      slug: "Classic Crew Tee",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative price", () => {
    const result = productSchema.safeParse({
      ...baseProduct,
      basePriceCents: -100,
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one variant", () => {
    const result = productSchema.safeParse({ ...baseProduct, variants: [] });
    expect(result.success).toBe(false);
  });

  it("requires a brand", () => {
    const { brandId: _brandId, ...withoutBrand } = baseProduct;
    void _brandId;
    const result = productSchema.safeParse(withoutBrand);
    expect(result.success).toBe(false);
  });
});
