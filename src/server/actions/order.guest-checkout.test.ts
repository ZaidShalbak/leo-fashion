// @vitest-environment node
//
// Integration test against the real database (DATABASE_URL from .env),
// same approach as order.test.ts/cart.test.ts — kept as its own focused
// file (rather than folded into order.test.ts's existing ~800 lines)
// specifically for guest-checkout coverage: a guest cart (guestToken
// cookie, no signed-in user) placing a real order with no account.
import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockGetCurrentUser = vi.fn();
vi.mock("@/server/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

// getCurrentCart (cart.ts, imported by order.ts) reads the guest cart via
// this cookie when there's no signed-in user — see cart.test.ts for the
// same mock shape.
const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { value: cookieJar.get(name)! } : undefined),
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
  }),
}));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockSendAdminNewOrderEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("@/server/email", () => ({
  sendAdminNewOrderEmail: (...args: unknown[]) => mockSendAdminNewOrderEmail(...args),
}));

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
const { placeOrder } = await import("./order");

let productId: string;
let variantId: string;
let deliveryZoneId: string;

const validNewAddress = { fullName: "Guest Shopper", line1: "1 Guest St", city: "Guest City" };

beforeAll(async () => {
  const product = await db.product.create({
    data: {
      title: "Test Product (order.guest-checkout.test.ts)",
      slug: `test-product-guest-checkout-${Date.now()}`,
      basePriceCents: 2000,
      status: "active",
      variants: {
        create: [{ sku: `TEST-GUEST-${Date.now()}`, size: "M", color: "Black", inventoryQuantity: 5 }],
      },
    },
    include: { variants: true },
  });
  productId = product.id;
  variantId = product.variants[0].id;

  const zone = await db.deliveryZone.create({
    data: { name: "TEST_ZONE_GUEST", feeCents: 1000, position: 0 },
  });
  deliveryZoneId = zone.id;
});

afterAll(async () => {
  await db.order.deleteMany({ where: { deliveryZoneId } }).catch(() => {});
  await db.deliveryZone.delete({ where: { id: deliveryZoneId } }).catch(() => {});
  // Only the one successful test's cart gets cleared by placeOrder itself
  // (it deletes the cart's items on success) — the rejected-before-the-
  // transaction tests leave their guest cart rows behind, so sweep up
  // every cart this file created by its token prefix.
  const staleCarts = await db.cart.findMany({
    where: { guestToken: { startsWith: "test-guest-token-" } },
    select: { id: true },
  });
  await db.cartItem.deleteMany({ where: { cartId: { in: staleCarts.map((c) => c.id) } } }).catch(() => {});
  await db.cart
    .deleteMany({ where: { guestToken: { startsWith: "test-guest-token-" } } })
    .catch(() => {});
  await db.product.delete({ where: { id: productId } }).catch(() => {});
  await db.$disconnect();
});

afterEach(() => {
  mockGetCurrentUser.mockReset();
  mockRedirect.mockReset();
  cookieJar.clear();
});

/** Creates a real guest cart (unique guestToken per call) with one item
 * already in it, and points the mocked cookie jar at it — mirrors what
 * addToCart does for a real signed-out visitor, just built directly so
 * this file doesn't need to also import/exercise cart.ts's own actions. */
async function createGuestCartWithItem(): Promise<void> {
  const token = `test-guest-token-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const cart = await db.cart.create({ data: { guestToken: token } });
  await db.cartItem.create({ data: { cartId: cart.id, productId, variantId, quantity: 1 } });
  cookieJar.set("cart_token", token);
}

describe("placeOrder — guest checkout", () => {
  it("requires a valid email when signed out", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    await createGuestCartWithItem();

    const result = await placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId, quantity: 1 }],
      deliveryZoneId,
    });

    expect(result).toEqual({ success: false, error: expect.stringMatching(/email/i) });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("rejects a saved-address reference from a signed-out caller", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    await createGuestCartWithItem();

    const result = await placeOrder({
      address: { savedAddressId: "cknotarealaddressid00000000" },
      items: [{ variantId, quantity: 1 }],
      deliveryZoneId,
      guestEmail: "guest-checkout-test@example.com",
    });

    expect(result.success).toBe(false);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("places an order with no account when a valid email is given, and never saves an address book entry", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    await createGuestCartWithItem();
    const addressCountBefore = await db.address.count();

    const result = await placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId, quantity: 1 }],
      deliveryZoneId,
      guestEmail: "guest-checkout-test@example.com",
      notes: "Leave at the door.",
    });

    expect(result).toBeUndefined(); // placeOrder redirects on success; nothing to return
    expect(mockRedirect).toHaveBeenCalledTimes(1);
    const [redirectUrl] = mockRedirect.mock.calls[0]!;
    expect(redirectUrl).toMatch(/^\/order-confirmation\//);

    const orderId = redirectUrl.replace("/order-confirmation/", "");
    const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
    expect(order).not.toBeNull();
    expect(order!.userId).toBeNull();
    expect(order!.guestEmail).toBe("guest-checkout-test@example.com");
    expect(order!.shippingName).toBe(validNewAddress.fullName);
    expect(order!.items).toHaveLength(1);

    const addressCountAfter = await db.address.count();
    expect(addressCountAfter).toBe(addressCountBefore);

    const variant = await db.productVariant.findUnique({ where: { id: variantId } });
    expect(variant!.inventoryQuantity).toBe(4); // 5 - 1
  });
});
