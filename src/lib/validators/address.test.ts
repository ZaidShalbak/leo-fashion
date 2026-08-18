import { describe, expect, it } from "vitest";

import { addressSchema } from "./address";

describe("addressSchema", () => {
  it("accepts a valid address", () => {
    const result = addressSchema.safeParse({
      fullName: "Jane Doe",
      line1: "123 Main St",
      city: "Ramallah",
      postalCode: "00000",
      country: "Palestine",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an address missing required fields", () => {
    const result = addressSchema.safeParse({
      fullName: "",
      line1: "",
      city: "",
      postalCode: "",
      country: "",
    });
    expect(result.success).toBe(false);
  });

  it("defaults isDefault to false when omitted", () => {
    const result = addressSchema.parse({
      fullName: "Jane Doe",
      line1: "123 Main St",
      city: "Ramallah",
      postalCode: "00000",
      country: "Palestine",
    });
    expect(result.isDefault).toBe(false);
  });
});
