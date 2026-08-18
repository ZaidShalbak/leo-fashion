// @vitest-environment node
//
// Integration tests against the real local dev database (DATABASE_URL from
// .env), same approach as cart.test.ts. getCurrentUser, next/navigation's
// redirect, and next/cache's revalidatePath are mocked because placeOrder
// needs a request-scoped context (and a real redirect throw) that doesn't
// exist in a plain Vitest run — see cart.test.ts for the same rationale.
import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockGetCurrentUser = vi.fn();
vi.mock("@/server/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { db } = await import("@/server/db");
const { placeOrder } = await import("./order");

let productId: string;
let variantHappyId: string; // stock 5
let variantSavedId: string; // stock 5
let variantInsufficientId: string; // stock 2
let variantConcurrentId: string; // stock 1

let userA: { id: string };
let userB: { id: string };
let savedAddressId: string;

const validNewAddress = {
  fullName: "Jane Doe",
  line1: "123 Main St",
  city: "Ramallah",
  postalCode: "00000",
  country: "Palestine",
};

async function ensureCart(userId: string) {
  return (
    (await db.cart.findUnique({ where: { userId } })) ??
    (await db.cart.create({ data: { userId } }))
  );
}

async function setCartItem(userId: string, variantId: string, quantity: number) {
  const cart = await ensureCart(userId);
  await db.cartItem.create({
    data: { cartId: cart.id, productId, variantId, quantity },
  });
}

beforeAll(async () => {
  const product = await db.product.create({
    data: {
      title: "Test Product (order.test.ts)",
      slug: `test-product-order-${Date.now()}`,
      basePriceCents: 2000,
      status: "active",
      variants: {
        create: [
          { sku: `TEST-ORD-HAPPY-${Date.now()}`, size: "M", color: "Black", inventoryQuantity: 5 },
          { sku: `TEST-ORD-SAVED-${Date.now()}`, size: "M", color: "Blue", inventoryQuantity: 5 },
          { sku: `TEST-ORD-INSUFF-${Date.now()}`, size: "L", color: "Black", inventoryQuantity: 2 },
          { sku: `TEST-ORD-CONC-${Date.now()}`, size: "S", color: "Black", inventoryQuantity: 1 },
        ],
      },
    },
    include: { variants: true },
  });
  productId = product.id;
  variantHappyId = product.variants.find((v) => v.color === "Black" && v.size === "M")!.id;
  variantSavedId = product.variants.find((v) => v.color === "Blue")!.id;
  variantInsufficientId = product.variants.find((v) => v.size === "L")!.id;
  variantConcurrentId = product.variants.find((v) => v.size === "S")!.id;

  userA = await db.user.create({
    data: {
      supabaseId: `test-order-user-a-${Date.now()}`,
      email: `order-test-a-${Date.now()}@example.com`,
      name: "User A",
    },
  });
  userB = await db.user.create({
    data: {
      supabaseId: `test-order-user-b-${Date.now()}`,
      email: `order-test-b-${Date.now()}@example.com`,
      name: "User B",
    },
  });

  const address = await db.address.create({
    data: {
      userId: userA.id,
      fullName: "Saved Address Person",
      line1: "456 Saved Ave",
      city: "Bethlehem",
      postalCode: "11111",
      country: "Palestine",
      isDefault: true,
    },
  });
  savedAddressId = address.id;
});

afterEach(async () => {
  const carts = await db.cart.findMany({
    where: { userId: { in: [userA.id, userB.id] } },
  });
  await db.cartItem.deleteMany({ where: { cartId: { in: carts.map((c) => c.id) } } });
  vi.clearAllMocks();
});

afterAll(async () => {
  await db.order.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
  await db.user.delete({ where: { id: userA.id } }).catch(() => {});
  await db.user.delete({ where: { id: userB.id } }).catch(() => {});
  await db.product.delete({ where: { id: productId } }).catch(() => {});
  await db.$disconnect();
});

describe("placeOrder", () => {
  it("rejects when no user is signed in", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId: variantHappyId, quantity: 1 }],
    });
    expect(result.success).toBe(false);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("rejects an empty cart without touching inventory", async () => {
    mockGetCurrentUser.mockResolvedValue(userA);
    // No cart item set for userA in this test.
    const result = await placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId: variantHappyId, quantity: 1 }],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/empty/i);
  });

  it("places an order for the live cart, decrements stock, clears the cart, and saves the new address", async () => {
    mockGetCurrentUser.mockResolvedValue(userA);
    await setCartItem(userA.id, variantHappyId, 2);

    const result = await placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId: variantHappyId, quantity: 2 }],
    });

    expect(result).toBeUndefined(); // placeOrder redirects on success; nothing to return
    expect(mockRedirect).toHaveBeenCalledTimes(1);
    const [redirectUrl] = mockRedirect.mock.calls[0]!;
    expect(redirectUrl).toMatch(/^\/order-confirmation\//);

    const orderId = redirectUrl.replace("/order-confirmation/", "");
    const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
    expect(order).not.toBeNull();
    expect(order!.userId).toBe(userA.id);
    expect(order!.status).toBe("pending");
    expect(order!.subtotalCents).toBe(2000 * 2);
    expect(order!.items).toHaveLength(1);
    expect(order!.items[0]!.quantity).toBe(2);
    expect(order!.shippingName).toBe(validNewAddress.fullName);

    const variant = await db.productVariant.findUnique({ where: { id: variantHappyId } });
    expect(variant!.inventoryQuantity).toBe(3); // 5 - 2

    const cart = await db.cart.findUnique({ where: { userId: userA.id }, include: { items: true } });
    expect(cart!.items).toHaveLength(0);

    const addresses = await db.address.findMany({ where: { userId: userA.id } });
    expect(addresses.some((a) => a.line1 === validNewAddress.line1)).toBe(true);
  });

  it("uses a saved address's fields when savedAddressId is given", async () => {
    mockGetCurrentUser.mockResolvedValue(userA);
    await setCartItem(userA.id, variantSavedId, 1);

    await placeOrder({
      address: { savedAddressId },
      items: [{ variantId: variantSavedId, quantity: 1 }],
    });

    const [redirectUrl] = mockRedirect.mock.calls[0]!;
    const orderId = redirectUrl.replace("/order-confirmation/", "");
    const order = await db.order.findUnique({ where: { id: orderId } });
    expect(order!.shippingLine1).toBe("456 Saved Ave");
    expect(order!.shippingCity).toBe("Bethlehem");
  });

  it("rejects a savedAddressId belonging to another user", async () => {
    mockGetCurrentUser.mockResolvedValue(userB);
    await setCartItem(userB.id, variantSavedId, 1);

    const result = await placeOrder({
      address: { savedAddressId }, // belongs to userA
      items: [{ variantId: variantSavedId, quantity: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects and rolls back when requested quantity exceeds stock", async () => {
    mockGetCurrentUser.mockResolvedValue(userA);
    await setCartItem(userA.id, variantInsufficientId, 5); // only 2 in stock

    const result = await placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId: variantInsufficientId, quantity: 5 }],
    });

    expect(result.success).toBe(false);
    expect(mockRedirect).not.toHaveBeenCalled();

    const variant = await db.productVariant.findUnique({ where: { id: variantInsufficientId } });
    expect(variant!.inventoryQuantity).toBe(2); // unchanged — no partial order

    const items = await db.orderItem.findMany({ where: { variantId: variantInsufficientId } });
    expect(items).toHaveLength(0); // nothing committed for this variant
  });

  it("does not oversell when two users check out the last unit of the same variant concurrently", async () => {
    await setCartItem(userA.id, variantConcurrentId, 1);
    await setCartItem(userB.id, variantConcurrentId, 1);

    // See file header: mockGetCurrentUser is consumed synchronously (call
    // order, not resolution order) by each placeOrder invocation before its
    // first await, so queuing two mockResolvedValueOnce values and firing
    // both calls back-to-back (without awaiting in between) reliably pairs
    // userA with the first call and userB with the second — after that,
    // both proceed concurrently against the real database, which is the
    // actual thing this test is verifying.
    mockGetCurrentUser.mockResolvedValueOnce(userA).mockResolvedValueOnce(userB);

    const resultA = placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId: variantConcurrentId, quantity: 1 }],
    });
    const resultB = placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId: variantConcurrentId, quantity: 1 }],
    });

    const [outcomeA, outcomeB] = await Promise.all([resultA, resultB]);
    const outcomes = [outcomeA, outcomeB];
    const failures = outcomes.filter((o) => o && o.success === false);
    const successes = outcomes.filter((o) => o === undefined); // redirect => undefined return

    expect(failures).toHaveLength(1);
    expect(successes).toHaveLength(1);

    const variant = await db.productVariant.findUnique({ where: { id: variantConcurrentId } });
    expect(variant!.inventoryQuantity).toBe(0); // never goes negative, exactly one sold

    const orderItems = await db.orderItem.findMany({ where: { variantId: variantConcurrentId } });
    expect(orderItems).toHaveLength(1);
    expect(orderItems[0]!.quantity).toBe(1);
  });
});
