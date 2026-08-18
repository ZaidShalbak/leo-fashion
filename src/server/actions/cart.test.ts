// @vitest-environment node
//
// Integration test against the real local dev database (DATABASE_URL from
// .env) — there's no separate test database wired up yet. Everything this
// test creates is cleaned up in afterAll. next/headers' cookies() and
// getCurrentUser() are mocked because addToCart needs a request-scoped
// context that only exists inside an actual Next.js render/action, not a
// plain Vitest run.
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const cookieJar = new Map<string, string>();

// db.ts and auth.ts both `import "server-only"`, which unconditionally
// throws unless resolved through Next's bundler-only "react-server" export
// condition — Vitest doesn't set that, so stub it out here.
vi.mock("server-only", () => ({}));

vi.mock("@/server/auth", () => ({
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.has(name) ? { value: cookieJar.get(name)! } : undefined,
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
  }),
}));

const { db } = await import("@/server/db");
const { addToCart } = await import("./cart");

let productId: string;
let inStockVariantId: string;
let outOfStockVariantId: string;

beforeAll(async () => {
  const product = await db.product.create({
    data: {
      title: "Test Product (cart.test.ts)",
      slug: `test-product-cart-${Date.now()}`,
      basePriceCents: 1000,
      status: "active",
      variants: {
        create: [
          { sku: `TEST-INSTOCK-${Date.now()}`, size: "M", color: "Black", inventoryQuantity: 2 },
          { sku: `TEST-OOS-${Date.now()}`, size: "L", color: "Black", inventoryQuantity: 0 },
        ],
      },
    },
    include: { variants: true },
  });
  productId = product.id;
  inStockVariantId = product.variants.find((v) => v.size === "M")!.id;
  outOfStockVariantId = product.variants.find((v) => v.size === "L")!.id;
});

afterAll(async () => {
  // Cascades to variants, cart items, images.
  await db.product.delete({ where: { id: productId } }).catch(() => {});
  const cookieToken = cookieJar.get("cart_token");
  if (cookieToken) {
    await db.cart.deleteMany({ where: { guestToken: cookieToken } });
  }
  await db.$disconnect();
});

describe("addToCart", () => {
  it("creates a guest cart and cart item on first add", async () => {
    const result = await addToCart({
      productId,
      variantId: inStockVariantId,
      quantity: 1,
    });
    expect(result.success).toBe(true);

    const cookieToken = cookieJar.get("cart_token");
    expect(cookieToken).toBeTruthy();

    const cart = await db.cart.findUnique({
      where: { guestToken: cookieToken },
      include: { items: true },
    });
    expect(cart?.items).toHaveLength(1);
    expect(cart?.items[0]?.quantity).toBe(1);
  });

  it("increments quantity when the same variant is added again", async () => {
    await addToCart({ productId, variantId: inStockVariantId, quantity: 1 });

    const cookieToken = cookieJar.get("cart_token")!;
    const cart = await db.cart.findUnique({
      where: { guestToken: cookieToken },
      include: { items: true },
    });
    expect(cart?.items).toHaveLength(1);
    expect(cart?.items[0]?.quantity).toBe(2);
  });

  it("caps quantity at available inventory instead of overselling", async () => {
    const result = await addToCart({
      productId,
      variantId: inStockVariantId,
      quantity: 5,
    });
    expect(result.success).toBe(true);

    const cookieToken = cookieJar.get("cart_token")!;
    const cart = await db.cart.findUnique({
      where: { guestToken: cookieToken },
      include: { items: true },
    });
    // inventoryQuantity is 2 for this variant — never more than that.
    expect(cart?.items[0]?.quantity).toBe(2);
  });

  it("rejects adding an out-of-stock variant", async () => {
    const result = await addToCart({
      productId,
      variantId: outOfStockVariantId,
      quantity: 1,
    });
    expect(result.success).toBe(false);
  });
});
