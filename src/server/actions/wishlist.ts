"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";

export type WishlistActionResult =
  | { success: true }
  | { success: false; reason: "signInRequired" | "notFound" };

/**
 * Sign-in required (no guest wishlist — see WishlistItem's schema
 * comment). Callers get a typed `reason`, not a translated message, so
 * the client component can decide what to do (redirect to /login) without
 * comparing locale-dependent strings.
 */
export async function addToWishlist(productId: string): Promise<WishlistActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, reason: "signInRequired" };

  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) return { success: false, reason: "notFound" };

  // Upsert on the (userId, productId) unique pair — idempotent, so a
  // double-click or a product that's already on the list is a no-op
  // rather than a unique-constraint error.
  await db.wishlistItem.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    create: { userId: user.id, productId },
    update: {},
  });

  revalidatePath("/account");
  return { success: true };
}

export async function removeFromWishlist(productId: string): Promise<WishlistActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, reason: "signInRequired" };

  await db.wishlistItem.deleteMany({ where: { userId: user.id, productId } });

  revalidatePath("/account");
  return { success: true };
}

/**
 * Every product id the signed-in caller has wishlisted, for bulk-checking
 * a whole grid of ProductCards in one query rather than one per card.
 * Empty set for a signed-out visitor — not an error, just nothing to mark.
 */
export async function getWishlistedProductIds(): Promise<Set<string>> {
  const user = await getCurrentUser();
  if (!user) return new Set();

  const items = await db.wishlistItem.findMany({
    where: { userId: user.id },
    select: { productId: true },
  });
  return new Set(items.map((item) => item.productId));
}
