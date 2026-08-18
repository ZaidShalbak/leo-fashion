import { z } from "zod";

import { addressSchema } from "./address";

export const orderStatusSchema = z.enum([
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// Valid forward transitions, plus cancellation from an early state.
// Enforce this in the server action, not just the UI — see CLAUDE.md.
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const orderItemInputSchema = z.object({
  variantId: z.string().cuid(),
  quantity: z.number().int().min(1).max(20),
});
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;

// Input for placeOrder: a shipping address (either an existing saved
// address or a new one to use for this order) plus which cart line items
// to order. This only carries *intent* — the server action re-reads prices
// and stock from the database inside a transaction rather than trusting
// anything the client sent, per the Data Security guidance in the Next.js
// Server Actions docs. See src/server/actions/order.ts (built in Phase 3).
export const placeOrderSchema = z.object({
  address: z.union([
    z.object({ savedAddressId: z.string().cuid() }),
    z.object({
      newAddress: addressSchema.omit({ isDefault: true, label: true }),
    }),
  ]),
  items: z.array(orderItemInputSchema).min(1, "Cart is empty"),
});
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export const updateOrderStatusSchema = z.object({
  orderId: z.string().cuid(),
  status: orderStatusSchema,
  trackingNumber: z.string().trim().max(100).optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
