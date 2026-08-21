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

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// next-intl/server's real (getTranslations-capable) implementation only
// resolves under Next's bundler-only "react-server" export condition, which
// Vitest never sets — see order.test.ts for the full rationale. Mocked here
// off the real messages/en.json via use-intl's createTranslator so it stays
// truthful to what addToCart/updateCartItem/removeCartItem actually return.
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
const { addToCart, updateCartItem, removeCartItem, getCurrentCart } =
  await import("./cart");

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

describe("updateCartItem / removeCartItem", () => {
  it("updates quantity, capped at stock, for an item in the caller's own cart", async () => {
    await addToCart({ productId, variantId: inStockVariantId, quantity: 1 });
    const cart = await getCurrentCart();
    const item = cart!.items.find((i) => i.variantId === inStockVariantId)!;

    const result = await updateCartItem({ cartItemId: item.id, quantity: 2 });
    expect(result.success).toBe(true);

    const updated = await db.cartItem.findUnique({ where: { id: item.id } });
    expect(updated?.quantity).toBe(2); // inStockVariant has 2 in stock

    // Schema allows up to 20, but this variant only has 2 in stock — the
    // action should cap at actual inventory, not just the schema's ceiling.
    const overResult = await updateCartItem({ cartItemId: item.id, quantity: 20 });
    expect(overResult.success).toBe(true);
    const capped = await db.cartItem.findUnique({ where: { id: item.id } });
    expect(capped?.quantity).toBe(2);
  });

  it("rejects updating a cart item that isn't the caller's", async () => {
    // A cartItemId from a different (nonexistent) cart context.
    const result = await updateCartItem({
      cartItemId: "c000000000000000000000099",
      quantity: 1,
    });
    expect(result.success).toBe(false);
  });

  it("removes an item from the caller's own cart", async () => {
    await addToCart({ productId, variantId: inStockVariantId, quantity: 1 });
    const cart = await getCurrentCart();
    const item = cart!.items.find((i) => i.variantId === inStockVariantId)!;

    const result = await removeCartItem({ cartItemId: item.id });
    expect(result.success).toBe(true);

    const remaining = await db.cartItem.findUnique({ where: { id: item.id } });
    expect(remaining).toBeNull();
  });
});
