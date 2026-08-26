// @vitest-environment node
//
// Integration test against the real database (DATABASE_URL from .env),
// same approach as order.test.ts/cart.test.ts. Covers applyDiscountCode's
// sign-in gate specifically (added for guest checkout — see order.ts's
// guest-checkout note) — the pure validateDiscountCode logic already has
// full coverage in src/lib/discount.test.ts, so this stays focused on the
// server action itself rather than re-testing that.
import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockGetCurrentUser = vi.fn();
vi.mock("@/server/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("use-intl/core");
  const en = (await import("../../../messages/en.json")).default;
  return {
    getTranslations: async (arg?: string | { namespace?: string }) => {
      const namespace = typeof arg === "string" ? arg : arg?.namespace;
      return createTranslator({
        locale: "en",
        messages: en,
        namespace: namespace as never,
      });
    },
    getLocale: async () => "en",
  };
});

const { db } = await import("@/server/db");
const { applyDiscountCode } = await import("./discount");

let productId: string;
let variantId: string;
let userId: string;
let discountCodeId: string;
const CODE = `TESTCODE${Date.now()}`;

beforeAll(async () => {
  const product = await db.product.create({
    data: {
      title: "Test Product (discount.test.ts)",
      slug: `test-product-discount-${Date.now()}`,
      basePriceCents: 5000,
      status: "active",
      variants: {
        create: [{ sku: `TEST-DISCOUNT-${Date.now()}`, size: "M", color: "Black", inventoryQuantity: 5 }],
      },
    },
    include: { variants: true },
  });
  productId = product.id;
  variantId = product.variants[0].id;

  const user = await db.user.create({
    data: {
      supabaseId: `test-discount-user-${Date.now()}`,
      email: `discount-test-${Date.now()}@example.com`,
      name: "Discount Test User",
    },
  });
  userId = user.id;

  const discount = await db.discountCode.create({
    data: { code: CODE, percentOff: 10, isActive: true },
  });
  discountCodeId = discount.id;
});

afterAll(async () => {
  await db.cart.deleteMany({ where: { userId } }).catch(() => {});
  await db.discountCode.delete({ where: { id: discountCodeId } }).catch(() => {});
  await db.user.delete({ where: { id: userId } }).catch(() => {});
  await db.product.delete({ where: { id: productId } }).catch(() => {});
  await db.$disconnect();
});

afterEach(() => {
  mockGetCurrentUser.mockReset();
});

describe("applyDiscountCode", () => {
  it("requires sign-in — guest checkout has no per-customer redemption guard to enforce", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await applyDiscountCode({ code: CODE });
    expect(result).toEqual({ success: false, error: expect.stringMatching(/sign in/i) });
  });

  it("applies a valid code to a signed-in user's cart", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: userId });
    const cart = await db.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    await db.cartItem.deleteMany({ where: { cartId: cart.id } });
    await db.cartItem.create({
      data: { cartId: cart.id, productId, variantId, quantity: 1 },
    });

    const result = await applyDiscountCode({ code: CODE });
    expect(result).toEqual({ success: true });

    const updatedCart = await db.cart.findUnique({ where: { userId } });
    expect(updatedCart?.appliedDiscountCode).toBe(CODE);
  });
});
