// @vitest-environment node
//
// Integration test against the real database (DATABASE_URL from .env) —
// same approach as cart.test.ts/order.test.ts. Everything this test
// creates (one product, one user, any WishlistItem rows) is cleaned up in
// afterAll. getCurrentUser is mocked since these actions need a
// request-scoped session that only exists inside a real Next.js render.
import "dotenv/config";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockGetCurrentUser = vi.fn();
vi.mock("@/server/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { db } = await import("@/server/db");
const { addToWishlist, removeFromWishlist, getWishlistedProductIds } = await import("./wishlist");

let productId: string;
let userId: string;

beforeAll(async () => {
  const product = await db.product.create({
    data: {
      title: "Test Product (wishlist.test.ts)",
      slug: `test-product-wishlist-${Date.now()}`,
      basePriceCents: 1000,
      status: "active",
    },
  });
  productId = product.id;

  const user = await db.user.create({
    data: {
      supabaseId: `test-wishlist-user-${Date.now()}`,
      email: `wishlist-test-${Date.now()}@example.com`,
      name: "Wishlist Test User",
    },
  });
  userId = user.id;
});

afterAll(async () => {
  await db.wishlistItem.deleteMany({ where: { userId } }).catch(() => {});
  await db.user.delete({ where: { id: userId } }).catch(() => {});
  await db.product.delete({ where: { id: productId } }).catch(() => {});
});

beforeEach(() => {
  mockGetCurrentUser.mockReset();
});

describe("addToWishlist / removeFromWishlist / getWishlistedProductIds", () => {
  it("requires sign-in", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await addToWishlist(productId);
    expect(result).toEqual({ success: false, reason: "signInRequired" });
  });

  it("rejects a product id that doesn't exist", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: userId });
    const result = await addToWishlist("not-a-real-product-id");
    expect(result).toEqual({ success: false, reason: "notFound" });
  });

  it("adds a product, then reports it via getWishlistedProductIds", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: userId });

    const addResult = await addToWishlist(productId);
    expect(addResult).toEqual({ success: true });

    const ids = await getWishlistedProductIds();
    expect(ids.has(productId)).toBe(true);
  });

  it("is idempotent — adding an already-wishlisted product doesn't error", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: userId });

    await addToWishlist(productId);
    const secondAdd = await addToWishlist(productId);
    expect(secondAdd).toEqual({ success: true });

    const count = await db.wishlistItem.count({ where: { userId, productId } });
    expect(count).toBe(1);
  });

  it("removes a product, then getWishlistedProductIds no longer reports it", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: userId });

    await addToWishlist(productId);
    const removeResult = await removeFromWishlist(productId);
    expect(removeResult).toEqual({ success: true });

    const ids = await getWishlistedProductIds();
    expect(ids.has(productId)).toBe(false);
  });

  it("getWishlistedProductIds returns an empty set when signed out", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const ids = await getWishlistedProductIds();
    expect(ids.size).toBe(0);
  });
});
