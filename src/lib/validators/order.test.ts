import { describe, expect, it } from "vitest";

import {
  ORDER_STATUS_TRANSITIONS,
  placeOrderSchema,
} from "./order";

describe("ORDER_STATUS_TRANSITIONS", () => {
  it("only allows forward transitions or cancellation from pending/processing", () => {
    expect(ORDER_STATUS_TRANSITIONS.pending).toEqual(["processing", "cancelled"]);
    expect(ORDER_STATUS_TRANSITIONS.processing).toEqual(["shipped", "cancelled"]);
    expect(ORDER_STATUS_TRANSITIONS.shipped).toEqual(["delivered"]);
  });

  it("has no valid transitions out of terminal statuses", () => {
    expect(ORDER_STATUS_TRANSITIONS.delivered).toEqual([]);
    expect(ORDER_STATUS_TRANSITIONS.cancelled).toEqual([]);
  });
});

describe("placeOrderSchema", () => {
  const items = [{ variantId: "c000000000000000000000001", quantity: 2 }];
  const deliveryZoneId = "c000000000000000000000003";

  it("accepts a saved address reference", () => {
    const result = placeOrderSchema.safeParse({
      address: { savedAddressId: "c000000000000000000000002" },
      items,
      deliveryZoneId,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a new inline address", () => {
    const result = placeOrderSchema.safeParse({
      address: {
        newAddress: {
          fullName: "Jane Doe",
          line1: "123 Main St",
          city: "Ramallah",
          postalCode: "00000",
          country: "Palestine",
        },
      },
      items,
      deliveryZoneId,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty cart", () => {
    const result = placeOrderSchema.safeParse({
      address: { savedAddressId: "c000000000000000000000002" },
      items: [],
      deliveryZoneId,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing delivery zone", () => {
    const result = placeOrderSchema.safeParse({
      address: { savedAddressId: "c000000000000000000000002" },
      items,
    });
    expect(result.success).toBe(false);
  });
});
