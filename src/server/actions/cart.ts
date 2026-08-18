"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { Cart } from "@prisma/client";

import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { addToCartSchema, type AddToCartInput } from "@/lib/validators/cart";

const GUEST_CART_COOKIE = "cart_token";
const GUEST_CART_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type AddToCartResult =
  | { success: true; message: string }
  | { success: false; error: string };

/**
 * Finds the current cart (by logged-in user, or by a guest cookie token),
 * creating one if neither exists. Guest carts get a fresh httpOnly cookie
 * so the cart survives a page reload without an account. Merging a guest
 * cart into a user's cart on login is Phase 3 work — see CLAUDE.md.
 */
async function getOrCreateCart(): Promise<Cart> {
  const user = await getCurrentUser();

  if (user) {
    const existing = await db.cart.findUnique({ where: { userId: user.id } });
    if (existing) return existing;
    return db.cart.create({ data: { userId: user.id } });
  }

  const cookieStore = await cookies();
  const guestToken = cookieStore.get(GUEST_CART_COOKIE)?.value;

  if (guestToken) {
    const existing = await db.cart.findUnique({ where: { guestToken } });
    if (existing) return existing;
  }

  const newToken = randomUUID();
  const cart = await db.cart.create({ data: { guestToken: newToken } });
  cookieStore.set(GUEST_CART_COOKIE, newToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_CART_MAX_AGE_SECONDS,
  });
  return cart;
}

/**
 * Adds a quantity of a product variant to the current cart. Re-reads the
 * variant (status, stock) from the database rather than trusting anything
 * about it from the client beyond which variant was picked — the request
 * is a POST reachable directly, not just through this form. See the
 * Server Actions security guidance linked from CLAUDE.md.
 */
export async function addToCart(
  input: AddToCartInput
): Promise<AddToCartResult> {
  const parsed = addToCartSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const variant = await db.productVariant.findUnique({
    where: { id: parsed.data.variantId },
    include: { product: true },
  });

  if (!variant || variant.product.status !== "active") {
    return { success: false, error: "This item is no longer available." };
  }

  if (variant.inventoryQuantity <= 0) {
    return { success: false, error: "This size/color is out of stock." };
  }

  const cart = await getOrCreateCart();

  const existingItem = await db.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
  });

  const requestedTotal =
    (existingItem?.quantity ?? 0) + parsed.data.quantity;
  const cappedQuantity = Math.min(
    requestedTotal,
    variant.inventoryQuantity,
    20
  );

  if (existingItem) {
    await db.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: cappedQuantity },
    });
  } else {
    await db.cartItem.create({
      data: {
        cartId: cart.id,
        productId: variant.productId,
        variantId: variant.id,
        quantity: cappedQuantity,
      },
    });
  }

  const message =
    cappedQuantity < requestedTotal
      ? `Added — only ${cappedQuantity} in stock, so that's the most we could add.`
      : "Added to cart.";

  return { success: true, message };
}
