// @vitest-environment node
//
// Integration tests against the real local dev database (DATABASE_URL from
// .env), same approach as cart.test.ts. getCurrentUser, next/navigation's
// redirect, and next/cache's revalidatePath are mocked because placeOrder
// needs a request-scoped context (and a real redirect throw) that doesn't
// exist in a plain Vitest run — see cart.test.ts for the same rationale.
// next-intl/server is mocked too: its "next-intl/server" entrypoint only
// resolves to the real (getTranslations-capable) implementation under
// Next's bundler-only "react-server" export condition, which Vitest never
// sets — outside of that, importing it throws "not supported in Client
// Components". The mock below drives it off the real messages/en.json via
// use-intl's own createTranslator, so assertions on actual English error
// text (see the /no longer valid/i-style matchers below) still hold.
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
let variantHappyId: string; // stock 5
let variantSavedId: string; // stock 5
let variantInsufficientId: string; // stock 2
let variantConcurrentId: string; // stock 1
let variantDiscountAId: string; // stock 5, for discount tests
let variantDiscountBId: string; // stock 5, for discount tests
let variantDiscountCId: string; // stock 5, for discount tests
let variantDiscountDId: string; // stock 5, for discount tests
let variantDiscountEId: string; // stock 5, for discount tests

let userA: { id: string };
let userB: { id: string };
let savedAddressId: string;
let deliveryZoneId: string;
let inactiveDeliveryZoneId: string;

let discountValidId: string; // 10% off, no limits
let discountExpiredId: string;
let discountInactiveId: string;
let discountLimitReachedId: string; // maxRedemptions 1, already at 1
let discountMinSubtotalId: string; // requires a huge minimum
let discountCodeSuffix: number; // uniqueness suffix shared by all the codes above

// A separate product (own brand + collection, price 1000) so Sale tests
// never risk affecting the shared productId's variants/subtotal
// assertions above — a SITE_WIDE-equivalent scenario is exercised via a
// brand sale that outranks a collection sale, both matching this one
// product, rather than a real site-wide sale that would otherwise have
// to stay active for the whole file and pollute every other test's
// expected subtotal.
let salesProductId: string;
let salesVariantId: string; // stock 5, basePriceCents 1000
let salesBrandId: string;
let salesCollectionId: string;
let saleCollectionId: string; // COLLECTION scope, 20% off
let saleBrandHighId: string; // BRAND scope, 30% off (higher than the collection sale)
let saleExpiredId: string; // COLLECTION scope, 50% off, but endsAt is in the past

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

async function setCartItem(
  userId: string,
  variantId: string,
  quantity: number,
  forProductId: string = productId
) {
  const cart = await ensureCart(userId);
  await db.cartItem.create({
    data: { cartId: cart.id, productId: forProductId, variantId, quantity },
  });
}

async function applyDiscountToCart(userId: string, code: string | null) {
  const cart = await ensureCart(userId);
  await db.cart.update({ where: { id: cart.id }, data: { appliedDiscountCode: code } });
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
          { sku: `TEST-ORD-DISCA-${Date.now()}`, size: "XS", color: "Red", inventoryQuantity: 5 },
          { sku: `TEST-ORD-DISCB-${Date.now()}`, size: "XS", color: "Green", inventoryQuantity: 5 },
          { sku: `TEST-ORD-DISCC-${Date.now()}`, size: "XS", color: "Blue", inventoryQuantity: 5 },
          { sku: `TEST-ORD-DISCD-${Date.now()}`, size: "XS", color: "White", inventoryQuantity: 5 },
          { sku: `TEST-ORD-DISCE-${Date.now()}`, size: "XS", color: "Grey", inventoryQuantity: 5 },
        ],
      },
    },
    include: { variants: true },
  });
  productId = product.id;
  variantHappyId = product.variants.find((v) => v.color === "Black" && v.size === "M")!.id;
  variantSavedId = product.variants.find((v) => v.color === "Blue" && v.size === "M")!.id;
  variantInsufficientId = product.variants.find((v) => v.size === "L")!.id;
  variantConcurrentId = product.variants.find((v) => v.size === "S")!.id;
  variantDiscountAId = product.variants.find((v) => v.color === "Red")!.id;
  variantDiscountBId = product.variants.find((v) => v.color === "Green")!.id;
  variantDiscountCId = product.variants.find((v) => v.color === "Blue" && v.size === "XS")!.id;
  variantDiscountDId = product.variants.find((v) => v.color === "White")!.id;
  variantDiscountEId = product.variants.find((v) => v.color === "Grey")!.id;

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

  const deliveryZone = await db.deliveryZone.create({
    data: { name: "TEST_ZONE_ORDER", feeCents: 1500, position: 0 },
  });
  deliveryZoneId = deliveryZone.id;
  const inactiveZone = await db.deliveryZone.create({
    data: { name: "TEST_ZONE_INACTIVE", feeCents: 1500, isActive: false, position: 1 },
  });
  inactiveDeliveryZoneId = inactiveZone.id;

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

  const suffix = Date.now();
  discountCodeSuffix = suffix;
  const validCode = await db.discountCode.create({
    data: { code: `TESTVALID${suffix}`, percentOff: 10 },
  });
  discountValidId = validCode.id;

  const expiredCode = await db.discountCode.create({
    data: {
      code: `TESTEXPIRED${suffix}`,
      percentOff: 10,
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
    },
  });
  discountExpiredId = expiredCode.id;

  const inactiveCode = await db.discountCode.create({
    data: { code: `TESTINACTIVE${suffix}`, percentOff: 10, isActive: false },
  });
  discountInactiveId = inactiveCode.id;

  const limitReachedCode = await db.discountCode.create({
    data: {
      code: `TESTLIMIT${suffix}`,
      percentOff: 10,
      maxRedemptions: 1,
      redemptionCount: 1,
    },
  });
  discountLimitReachedId = limitReachedCode.id;

  const minSubtotalCode = await db.discountCode.create({
    data: { code: `TESTMINSUB${suffix}`, percentOff: 10, minSubtotalCents: 1_000_000 },
  });
  discountMinSubtotalId = minSubtotalCode.id;

  const salesBrand = await db.brand.create({
    data: { name: `TEST_SALES_BRAND_${suffix}`, slug: `test-sales-brand-${suffix}` },
  });
  salesBrandId = salesBrand.id;
  const salesCollection = await db.collection.create({
    data: { title: `TEST_SALES_COLLECTION_${suffix}`, handle: `test-sales-collection-${suffix}` },
  });
  salesCollectionId = salesCollection.id;

  const salesProduct = await db.product.create({
    data: {
      title: "Test Product (order.test.ts, sales)",
      slug: `test-product-order-sales-${suffix}`,
      basePriceCents: 1000,
      status: "active",
      brandId: salesBrandId,
      collections: { create: [{ collectionId: salesCollectionId }] },
      variants: { create: [{ sku: `TEST-ORD-SALE-${suffix}`, size: "M", color: "Black", inventoryQuantity: 5 }] },
    },
    include: { variants: true },
  });
  salesProductId = salesProduct.id;
  salesVariantId = salesProduct.variants[0]!.id;

  // All created inactive — each test explicitly sets the isActive states
  // it needs at its own start, rather than relying on residual state left
  // by a previous test.
  const saleCollection = await db.sale.create({
    data: { title: "TEST collection sale", scope: "COLLECTION", collectionId: salesCollectionId, percentOff: 20, isActive: false },
  });
  saleCollectionId = saleCollection.id;
  const saleBrandHigh = await db.sale.create({
    data: { title: "TEST brand sale", scope: "BRAND", brandId: salesBrandId, percentOff: 30, isActive: false },
  });
  saleBrandHighId = saleBrandHigh.id;
  const saleExpired = await db.sale.create({
    data: {
      title: "TEST expired sale",
      scope: "COLLECTION",
      collectionId: salesCollectionId,
      percentOff: 50,
      isActive: true,
      endsAt: new Date("2020-01-01T00:00:00.000Z"),
    },
  });
  saleExpiredId = saleExpired.id;
});

afterEach(async () => {
  const carts = await db.cart.findMany({
    where: { userId: { in: [userA.id, userB.id] } },
  });
  await db.cartItem.deleteMany({ where: { cartId: { in: carts.map((c) => c.id) } } });
  await db.cart.updateMany({
    where: { id: { in: carts.map((c) => c.id) } },
    data: { appliedDiscountCode: null },
  });
  vi.clearAllMocks();
});

afterAll(async () => {
  await db.order.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
  await db.discountCode
    .deleteMany({
      where: {
        id: {
          in: [
            discountValidId,
            discountExpiredId,
            discountInactiveId,
            discountLimitReachedId,
            discountMinSubtotalId,
          ],
        },
      },
    })
    .catch(() => {});
  await db.sale
    .deleteMany({ where: { id: { in: [saleCollectionId, saleBrandHighId, saleExpiredId] } } })
    .catch(() => {});
  await db.user.delete({ where: { id: userA.id } }).catch(() => {});
  await db.user.delete({ where: { id: userB.id } }).catch(() => {});
  await db.product.delete({ where: { id: productId } }).catch(() => {});
  await db.product.delete({ where: { id: salesProductId } }).catch(() => {});
  await db.collection.delete({ where: { id: salesCollectionId } }).catch(() => {});
  await db.brand.delete({ where: { id: salesBrandId } }).catch(() => {});
  await db.deliveryZone
    .deleteMany({ where: { id: { in: [deliveryZoneId, inactiveDeliveryZoneId] } } })
    .catch(() => {});
  await db.$disconnect();
});

describe("placeOrder", () => {
  it("rejects when no user is signed in", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId: variantHappyId, quantity: 1 }],
      deliveryZoneId,
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
      deliveryZoneId,
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
      deliveryZoneId,
      notes: "Please ring the doorbell twice.",
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
    expect(order!.notes).toBe("Please ring the doorbell twice.");

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
      deliveryZoneId,
    });

    const [redirectUrl] = mockRedirect.mock.calls[0]!;
    const orderId = redirectUrl.replace("/order-confirmation/", "");
    const order = await db.order.findUnique({ where: { id: orderId } });
    expect(order!.shippingLine1).toBe("456 Saved Ave");
    expect(order!.shippingCity).toBe("Bethlehem");
    expect(order!.notes).toBeNull(); // omitted entirely — should default to null, not error
  });

  it("rejects a savedAddressId belonging to another user", async () => {
    mockGetCurrentUser.mockResolvedValue(userB);
    await setCartItem(userB.id, variantSavedId, 1);

    const result = await placeOrder({
      address: { savedAddressId }, // belongs to userA
      items: [{ variantId: variantSavedId, quantity: 1 }],
      deliveryZoneId,
    });
    expect(result.success).toBe(false);
  });

  it("rejects and rolls back when requested quantity exceeds stock", async () => {
    mockGetCurrentUser.mockResolvedValue(userA);
    await setCartItem(userA.id, variantInsufficientId, 5); // only 2 in stock

    const result = await placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId: variantInsufficientId, quantity: 5 }],
      deliveryZoneId,
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
      deliveryZoneId,
    });
    const resultB = placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId: variantConcurrentId, quantity: 1 }],
      deliveryZoneId,
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

  it("applies a valid discount code, reduces the effective total, and increments redemptionCount", async () => {
    mockGetCurrentUser.mockResolvedValue(userA);
    await setCartItem(userA.id, variantDiscountAId, 1); // priced 2000
    await applyDiscountToCart(userA.id, `TESTVALID${discountCodeSuffix}`);

    const result = await placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId: variantDiscountAId, quantity: 1 }],
      deliveryZoneId,
    });

    expect(result).toBeUndefined();
    const [redirectUrl] = mockRedirect.mock.calls[0]!;
    const orderId = redirectUrl.replace("/order-confirmation/", "");
    const order = await db.order.findUnique({ where: { id: orderId } });

    expect(order!.subtotalCents).toBe(2000);
    expect(order!.discountCents).toBe(200); // 10% of 2000
    expect(order!.discountCodeSnapshot).toBe(`TESTVALID${discountCodeSuffix}`);
    expect(order!.discountPercentSnapshot).toBe(10);
    expect(order!.discountCodeId).toBe(discountValidId);

    const discountCode = await db.discountCode.findUnique({ where: { id: discountValidId } });
    expect(discountCode!.redemptionCount).toBe(1);

    // The cart's applied code is cleared alongside the cart items.
    const cart = await db.cart.findUnique({ where: { userId: userA.id } });
    expect(cart!.appliedDiscountCode).toBeNull();
  });

  it("rejects a duplicate use of the same discount code by the same customer", async () => {
    // userA already redeemed discountValidId in the previous test — the
    // (discountCodeId, userId) unique constraint on Order is what actually
    // enforces this.
    mockGetCurrentUser.mockResolvedValue(userA);
    await setCartItem(userA.id, variantDiscountBId, 1);
    await applyDiscountToCart(userA.id, `TESTVALID${discountCodeSuffix}`);

    const result = await placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId: variantDiscountBId, quantity: 1 }],
      deliveryZoneId,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/already used/i);

    // No partial order, stock untouched, and no extra redemption counted.
    const items = await db.orderItem.findMany({ where: { variantId: variantDiscountBId } });
    expect(items).toHaveLength(0);
    const variant = await db.productVariant.findUnique({ where: { id: variantDiscountBId } });
    expect(variant!.inventoryQuantity).toBe(5);
  });

  it("rejects placing an order when the applied discount code has expired", async () => {
    mockGetCurrentUser.mockResolvedValue(userB);
    await setCartItem(userB.id, variantDiscountCId, 1);
    await applyDiscountToCart(userB.id, `TESTEXPIRED${discountCodeSuffix}`);

    const result = await placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId: variantDiscountCId, quantity: 1 }],
      deliveryZoneId,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/no longer valid/i);
    const items = await db.orderItem.findMany({ where: { variantId: variantDiscountCId } });
    expect(items).toHaveLength(0);
  });

  it("rejects placing an order when the applied discount code is inactive", async () => {
    mockGetCurrentUser.mockResolvedValue(userB);
    await setCartItem(userB.id, variantDiscountCId, 1);
    await applyDiscountToCart(userB.id, `TESTINACTIVE${discountCodeSuffix}`);

    const result = await placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId: variantDiscountCId, quantity: 1 }],
      deliveryZoneId,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/no longer valid/i);
  });

  it("rejects placing an order when the applied discount code already hit its redemption limit", async () => {
    mockGetCurrentUser.mockResolvedValue(userB);
    await setCartItem(userB.id, variantDiscountDId, 1);
    await applyDiscountToCart(userB.id, `TESTLIMIT${discountCodeSuffix}`);

    const result = await placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId: variantDiscountDId, quantity: 1 }],
      deliveryZoneId,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/no longer valid/i);

    const discountCode = await db.discountCode.findUnique({ where: { id: discountLimitReachedId } });
    expect(discountCode!.redemptionCount).toBe(1); // unchanged, still at its limit
  });

  it("rejects placing an order when the cart subtotal is below the code's minimum order amount", async () => {
    mockGetCurrentUser.mockResolvedValue(userB);
    await setCartItem(userB.id, variantDiscountEId, 1); // subtotal 2000, far below the 1,000,000 minimum
    await applyDiscountToCart(userB.id, `TESTMINSUB${discountCodeSuffix}`);

    const result = await placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId: variantDiscountEId, quantity: 1 }],
      deliveryZoneId,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/no longer valid/i);
  });

  it("rejects placing an order against an inactive delivery zone, even if the client still sends its id", async () => {
    mockGetCurrentUser.mockResolvedValue(userB);
    await setCartItem(userB.id, variantDiscountEId, 1);

    const result = await placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId: variantDiscountEId, quantity: 1 }],
      deliveryZoneId: inactiveDeliveryZoneId,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/delivery area/i);

    const items = await db.orderItem.findMany({ where: { variantId: variantDiscountEId } });
    expect(items).toHaveLength(0); // no partial order committed
  });

  it("snapshots the delivery zone's name and fee onto the order", async () => {
    mockGetCurrentUser.mockResolvedValue(userA);
    await setCartItem(userA.id, variantSavedId, 1);

    await placeOrder({
      address: { savedAddressId },
      items: [{ variantId: variantSavedId, quantity: 1 }],
      deliveryZoneId,
    });

    const [redirectUrl] = mockRedirect.mock.calls.at(-1)!;
    const orderId = redirectUrl.replace("/order-confirmation/", "");
    const order = await db.order.findUnique({ where: { id: orderId } });
    expect(order!.deliveryZoneId).toBe(deliveryZoneId);
    expect(order!.deliveryZoneNameSnapshot).toBe("TEST_ZONE_ORDER");
    expect(order!.deliveryFeeCents).toBe(1500);
  });

  it("applies a collection-scoped sale to a matching product, leaving a non-matching product unaffected", async () => {
    await db.sale.update({ where: { id: saleCollectionId }, data: { isActive: true } });
    await db.sale.update({ where: { id: saleBrandHighId }, data: { isActive: false } });

    mockGetCurrentUser.mockResolvedValue(userA);
    await setCartItem(userA.id, salesVariantId, 1, salesProductId); // 1000, in the sale's collection
    await setCartItem(userA.id, variantHappyId, 1); // 2000, no brand/collection — never matches

    await placeOrder({
      address: { newAddress: validNewAddress },
      items: [
        { variantId: salesVariantId, quantity: 1 },
        { variantId: variantHappyId, quantity: 1 },
      ],
      deliveryZoneId,
    });

    const [redirectUrl] = mockRedirect.mock.calls.at(-1)!;
    const orderId = redirectUrl.replace("/order-confirmation/", "");
    const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
    const saleItem = order!.items.find((i) => i.variantId === salesVariantId)!;
    const otherItem = order!.items.find((i) => i.variantId === variantHappyId)!;

    expect(saleItem.priceCents).toBe(800); // 1000 - 20%
    expect(saleItem.compareAtPriceCentsSnapshot).toBe(1000);
    expect(otherItem.priceCents).toBe(2000);
    expect(otherItem.compareAtPriceCentsSnapshot).toBeNull();
    expect(order!.subtotalCents).toBe(800 + 2000);
  });

  it("when a collection sale and a higher brand sale both match, the highest percentOff wins", async () => {
    await db.sale.update({ where: { id: saleCollectionId }, data: { isActive: true } }); // 20%
    await db.sale.update({ where: { id: saleBrandHighId }, data: { isActive: true } }); // 30%

    mockGetCurrentUser.mockResolvedValue(userA);
    await setCartItem(userA.id, salesVariantId, 1, salesProductId);

    await placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId: salesVariantId, quantity: 1 }],
      deliveryZoneId,
    });

    const [redirectUrl] = mockRedirect.mock.calls.at(-1)!;
    const orderId = redirectUrl.replace("/order-confirmation/", "");
    const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });

    expect(order!.items[0]!.priceCents).toBe(700); // 1000 - 30% (brand beats collection)
    expect(order!.items[0]!.compareAtPriceCentsSnapshot).toBe(1000);
  });

  it("ignores an inactive sale and an expired sale, even though the expired one is flagged isActive", async () => {
    await db.sale.update({ where: { id: saleCollectionId }, data: { isActive: false } });
    await db.sale.update({ where: { id: saleBrandHighId }, data: { isActive: false } });
    // saleExpiredId stays isActive: true with endsAt in the past — it
    // should still be ignored, confirming isSaleLive's date check runs
    // even when the flag alone would say "active".

    mockGetCurrentUser.mockResolvedValue(userA);
    await setCartItem(userA.id, salesVariantId, 1, salesProductId);

    await placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId: salesVariantId, quantity: 1 }],
      deliveryZoneId,
    });

    const [redirectUrl] = mockRedirect.mock.calls.at(-1)!;
    const orderId = redirectUrl.replace("/order-confirmation/", "");
    const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });

    expect(order!.items[0]!.priceCents).toBe(1000);
    expect(order!.items[0]!.compareAtPriceCentsSnapshot).toBeNull();
  });

  it("stacks a discount code on top of an already sale-reduced subtotal", async () => {
    await db.sale.update({ where: { id: saleCollectionId }, data: { isActive: true } }); // 20%
    await db.sale.update({ where: { id: saleBrandHighId }, data: { isActive: false } });

    // userB, not userA — TESTVALID is only usable once per customer and
    // userA already redeemed it in an earlier test.
    mockGetCurrentUser.mockResolvedValue(userB);
    await setCartItem(userB.id, salesVariantId, 1, salesProductId);
    await applyDiscountToCart(userB.id, `TESTVALID${discountCodeSuffix}`);

    await placeOrder({
      address: { newAddress: validNewAddress },
      items: [{ variantId: salesVariantId, quantity: 1 }],
      deliveryZoneId,
    });

    const [redirectUrl] = mockRedirect.mock.calls.at(-1)!;
    const orderId = redirectUrl.replace("/order-confirmation/", "");
    const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });

    expect(order!.items[0]!.priceCents).toBe(800); // 1000 - 20% sale
    expect(order!.subtotalCents).toBe(800);
    expect(order!.discountCents).toBe(80); // 10% of the *sale-reduced* 800, not of 1000
  });
});
