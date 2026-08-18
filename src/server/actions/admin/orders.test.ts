// @vitest-environment node
//
// Integration tests against the real local dev database. This file
// deliberately does NOT mock "@/server/auth" (unlike cart.test.ts/
// order.test.ts/auth.test.ts) — the whole point here is to exercise the
// REAL requireUser/requireAdmin logic end-to-end, since that's the actual
// security boundary for every admin action. Instead it mocks one layer
// lower: next/headers' cookies() (harmless empty jar) and @supabase/ssr's
// createServerClient (so auth.getUser() resolves to whichever fake
// Supabase Auth id a given test wants, without a real Supabase project).
// getCurrentUser's real implementation then does a REAL db lookup by that
// id, same as production.
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], get: () => undefined, set: () => {} }),
}));

const authState = vi.hoisted(() => ({ supabaseId: null as string | null }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({
        data: { user: authState.supabaseId ? { id: authState.supabaseId } : null },
        error: null,
      }),
    },
  }),
}));

// Unlike the non-throwing redirect mock in cart.test.ts/order.test.ts/
// auth.test.ts (safe there because redirect() is always the last statement
// in those actions), requireUser/requireAdmin run code *after* calling
// redirect() when a real browser wouldn't ever get there (redirect() always
// throws in Next.js — it aborts the render). So this mock throws too, to
// match that and stop execution at the same point production would.
class RedirectSignal extends Error {
  constructor(public url: string) {
    super(`REDIRECT:${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { db } = await import("@/server/db");
const { updateOrderStatus } = await import("./orders");
const { adjustInventory } = await import("./inventory");

function actAs(user: { supabaseId: string } | null) {
  authState.supabaseId = user?.supabaseId ?? null;
}

let adminUser: { id: string; supabaseId: string };
let customerUser: { id: string; supabaseId: string };
let productId: string;
let variantId: string;
let pendingOrderId: string;

const shippingFields = {
  shippingName: "Jane Doe",
  shippingLine1: "123 Main St",
  shippingCity: "Ramallah",
  shippingPostalCode: "00000",
  shippingCountry: "Palestine",
};

beforeAll(async () => {
  adminUser = await db.user.create({
    data: {
      supabaseId: `test-admin-orders-${Date.now()}`,
      email: `admin-orders-test-${Date.now()}@example.com`,
      role: "admin",
    },
  });
  customerUser = await db.user.create({
    data: {
      supabaseId: `test-customer-orders-${Date.now()}`,
      email: `customer-orders-test-${Date.now()}@example.com`,
      role: "customer",
    },
  });

  const product = await db.product.create({
    data: {
      title: "Test Product (admin/orders.test.ts)",
      slug: `test-product-admin-orders-${Date.now()}`,
      basePriceCents: 1000,
      status: "active",
      variants: {
        create: [{ sku: `TEST-ADMIN-ORD-${Date.now()}`, size: "M", color: "Black", inventoryQuantity: 5 }],
      },
    },
    include: { variants: true },
  });
  productId = product.id;
  variantId = product.variants[0]!.id;

  const order = await db.order.create({
    data: {
      userId: customerUser.id,
      status: "pending",
      subtotalCents: 1000,
      ...shippingFields,
      items: {
        create: [
          {
            productId,
            variantId,
            titleSnapshot: "Test Product",
            size: "M",
            color: "Black",
            priceCents: 1000,
            quantity: 1,
          },
        ],
      },
    },
  });
  pendingOrderId = order.id;
});

afterAll(async () => {
  await db.order.deleteMany({ where: { userId: { in: [adminUser.id, customerUser.id] } } });
  await db.user.delete({ where: { id: adminUser.id } }).catch(() => {});
  await db.user.delete({ where: { id: customerUser.id } }).catch(() => {});
  await db.product.delete({ where: { id: productId } }).catch(() => {});
  await db.$disconnect();
});

describe("requireAdmin gating on admin server actions", () => {
  it("redirects a signed-out caller to /login", async () => {
    actAs(null);
    await expect(
      updateOrderStatus({ orderId: pendingOrderId, status: "processing" })
    ).rejects.toMatchObject({ url: "/login" });
  });

  it("redirects a signed-in non-admin (customer) away", async () => {
    actAs(customerUser);
    await expect(
      updateOrderStatus({ orderId: pendingOrderId, status: "processing" })
    ).rejects.toMatchObject({ url: "/" });
  });

  it("also gates adjustInventory the same way", async () => {
    actAs(customerUser);
    await expect(
      adjustInventory({ variantId, delta: 1, reason: "test" })
    ).rejects.toMatchObject({ url: "/" });
  });

  it("lets an admin through", async () => {
    actAs(adminUser);
    const result = await updateOrderStatus({ orderId: pendingOrderId, status: "processing" });
    expect(result.success).toBe(true);
  });
});

describe("order status transitions", () => {
  it("rejects an invalid transition (pending -> delivered) even called directly", async () => {
    actAs(adminUser);

    // Reset to pending first (previous describe block already advanced it).
    await db.order.update({ where: { id: pendingOrderId }, data: { status: "pending" } });

    const result = await updateOrderStatus({ orderId: pendingOrderId, status: "delivered" });
    expect(result.success).toBe(false);

    const order = await db.order.findUnique({ where: { id: pendingOrderId } });
    expect(order!.status).toBe("pending"); // unchanged
  });

  it("allows a valid forward transition and logs it", async () => {
    actAs(adminUser);
    await db.order.update({ where: { id: pendingOrderId }, data: { status: "pending" } });

    const result = await updateOrderStatus({ orderId: pendingOrderId, status: "processing" });
    expect(result.success).toBe(true);

    const order = await db.order.findUnique({ where: { id: pendingOrderId } });
    expect(order!.status).toBe("processing");

    const logs = await db.auditLog.findMany({
      where: { targetType: "Order", targetId: pendingOrderId, action: "order.status_update" },
    });
    expect(logs.length).toBeGreaterThan(0);
  });

  it("rejects skipping straight from processing to delivered (must go through shipped)", async () => {
    actAs(adminUser);
    await db.order.update({ where: { id: pendingOrderId }, data: { status: "processing" } });

    const result = await updateOrderStatus({ orderId: pendingOrderId, status: "delivered" });
    expect(result.success).toBe(false);
  });

  it("allows setting the same status again (e.g. to attach a tracking number)", async () => {
    actAs(adminUser);
    await db.order.update({ where: { id: pendingOrderId }, data: { status: "shipped" } });

    const result = await updateOrderStatus({
      orderId: pendingOrderId,
      status: "shipped",
      trackingNumber: "1Z999AA10123456784",
    });
    expect(result.success).toBe(true);

    const order = await db.order.findUnique({ where: { id: pendingOrderId } });
    expect(order!.trackingNumber).toBe("1Z999AA10123456784");
  });
});
