import { z } from "zod";

export const addToCartSchema = z.object({
  productId: z.string().cuid(),
  variantId: z.string().cuid(),
  quantity: z.number().int().min(1).max(20).default(1),
});
export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const updateCartItemSchema = z.object({
  cartItemId: z.string().cuid(),
  quantity: z.number().int().min(1).max(20),
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const removeCartItemSchema = z.object({
  cartItemId: z.string().cuid(),
});
export type RemoveCartItemInput = z.infer<typeof removeCartItemSchema>;
