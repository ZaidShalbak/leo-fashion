"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import type { Cart } from "@prisma/client";

import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import {
  addToCartSchema,
  updateCartItemSchema,
  removeCartItemSchema,
  type AddToCartInput,
  type UpdateCartItemInput,
  type RemoveCartItemInput,
} from "@/lib/validators/cart";

const GUEST_CART_COOKIE = "cart_token";
const GUEST_CART_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type AddToCartResult =
  | { success: true; message: string }
  | { success: false; error: string };

export type CartMutationResult =
  | { success: true }
  | { success: false; error: string };

const cartWithItemsInclude = {
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      product: {
        include: {
          images: { orderBy: { position: "asc" as const }, take: 1 },
          collections: { select: { collectionId: true } },
        },
      },
      variant: true,
    },
  },
};

export type CartWithItems = NonNullable<
  Awaited<ReturnType<typeof getCurrentCart>>
>;

/**
 * Reads the current cart (by logged-in user, or guest cookie) WITHOUT
 * creating one — used for display (the cart page) and for ownership checks
 * before mutating an item. Returns null if there's no cart yet, unlike
 * getOrCreateCart which addToCart uses.
 */
export async function getCurrentCart() {
  const user = await getCurrentUser();

  if (user) {
    return db.cart.findUnique({
      where: { userId: user.id },
      include: cartWithItemsInclude,
    });
  }

  const cookieStore = await cookies();
  const guestToken = cookieStore.get(GUEST_CART_COOKIE)?.value;
  if (!guestToken) return null;

  return db.cart.findUnique({
    where: { guestToken },
    include: cartWithItemsInclude,
  });
}

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
  const t = await getTranslations("CartActions");
  const parsed = addToCartSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: t("invalidRequest") };
  }

  const variant = await db.productVariant.findUnique({
    where: { id: parsed.data.variantId },
    include: { product: true },
  });

  if (!variant || variant.product.status !== "active") {
    return { success: false, error: t("itemUnavailable") };
  }

  if (variant.inventoryQuantity <= 0) {
    return { success: false, error: t("outOfStock") };
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
      ? t("addedCapped", { count: cappedQuantity })
      : t("added");

  revalidatePath("/cart");
  return { success: true, message };
}

/**
 * Updates a cart item's quantity, capped at current stock and 20. Verifies
 * the item belongs to the caller's own cart (by id, matched against the
 * resolved current cart) before touching it — a cartItemId is an opaque
 * client-supplied value, never trust it points at "your" row.
 */
export async function updateCartItem(
  input: UpdateCartItemInput
): Promise<CartMutationResult> {
  const t = await getTranslations("CartActions");
  const parsed = updateCartItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: t("invalidRequest") };
  }

  const cart = await getCurrentCart();
  const item = cart?.items.find((i) => i.id === parsed.data.cartItemId);
  if (!cart || !item) {
    return { success: false, error: t("itemNotInCart") };
  }

  const cappedQuantity = Math.min(
    parsed.data.quantity,
    item.variant.inventoryQuantity,
    20
  );

  await db.cartItem.update({
    where: { id: item.id },
    data: { quantity: cappedQuantity },
  });

  revalidatePath("/cart");
  return { success: true };
}

/** Removes an item from the caller's own cart, verified the same way as updateCartItem. */
export async function removeCartItem(
  input: RemoveCartItemInput
): Promise<CartMutationResult> {
  const t = await getTranslations("CartActions");
  const parsed = removeCartItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: t("invalidRequest") };
  }

  const cart = await getCurrentCart();
  const item = cart?.items.find((i) => i.id === parsed.data.cartItemId);
  if (!cart || !item) {
    return { success: false, error: t("itemNotInCart") };
  }

  await db.cartItem.delete({ where: { id: item.id } });

  revalidatePath("/cart");
  return { success: true };
}
