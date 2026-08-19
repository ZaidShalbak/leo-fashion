import { describe, expect, it } from "vitest";

import { brandSchema } from "./brand";

describe("brandSchema", () => {
  it("accepts a well-formed brand", () => {
    const result = brandSchema.safeParse({
      name: "Northline Apparel",
      slug: "northline-apparel",
      logoUrl: "https://example.com/logo.png",
      description: "A partner outerwear brand.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a brand with no logo/description", () => {
    const result = brandSchema.safeParse({
      name: "Northline Apparel",
      slug: "northline-apparel",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a slug with uppercase or spaces", () => {
    const result = brandSchema.safeParse({
      name: "Northline Apparel",
      slug: "Northline Apparel",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid logo URL", () => {
    const result = brandSchema.safeParse({
      name: "Northline Apparel",
      slug: "northline-apparel",
      logoUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});
