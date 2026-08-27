// Global setup files run outside Vitest's normal per-test-file module
// loading, so — unlike every integration test file here, which does this
// same import itself — .env isn't loaded into process.env automatically.
// Without this, DATABASE_URL is undefined and the Prisma adapter silently
// falls back to a bogus local connection instead of erroring clearly.
import "dotenv/config";

// Safety net for the integration tests (order.test.ts, cart.test.ts,
// wishlist.test.ts, etc.) that run real queries against DATABASE_URL. Each
// of those files already has its own afterAll cleanup, in the right FK
// order — but every delete in every one of them is wrapped in
// `.catch(() => {})`, which was meant to tolerate "a row this test already
// deleted itself" (a P2025) but also silently swallows a genuine failure
// (a connection timeout, most commonly — see vitest.config.ts's comment on
// why DATABASE_URL sometimes points at a real remote database with real
// network latency, not local Postgres). A swallowed failure means the row
// just stays behind — in a real environment, that's test fixtures ending
// up live on the actual storefront.
//
// Runs once, after the entire suite finishes, regardless of whether any
// individual file's own cleanup succeeded — a global Vitest teardown
// (https://vitest.dev/config/#globalsetup), not a per-file afterAll. Sweeps
// by the exact fixture-naming conventions every integration test already
// follows (see e.g. wishlist.test.ts's "Test Product (wishlist.test.ts)",
// order.test.ts's "TEST_SALES_COLLECTION_...", order.guest-checkout.test.ts's
// "TEST_ZONE_GUEST", discount.test.ts's "TESTCODE...", admin/heroBanners
// .test.ts's "/test-a.svg" image paths) — never a broad heuristic that
// could ever match real data.
//
// Vitest's globalSetup API: the default export runs once before the suite
// starts, and — if it returns a function — that returned function runs
// once after the suite finishes. There's no setup work needed here, only
// teardown, so the setup body just returns the teardown function.
export default function setup() {
  return async function teardown() {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("@prisma/client");

    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    const db = new PrismaClient({ adapter });

    try {
      // Users first — cascades to their Address/Cart(+CartItem)/
      // WishlistItem rows automatically (see prisma/schema.prisma), but
      // Order and AuditLog are onDelete: Restrict against User, so both
      // need an explicit sweep first or the user delete below would fail.
      const testUsers = await db.user.findMany({
        where: { email: { contains: "@example.com" } },
        select: { id: true },
      });
      const testUserIds = testUsers.map((u) => u.id);
      if (testUserIds.length > 0) {
        await db.auditLog.deleteMany({ where: { actorUserId: { in: testUserIds } } });
        await db.order.deleteMany({ where: { userId: { in: testUserIds } } });
        await db.user.deleteMany({ where: { id: { in: testUserIds } } });
      }

      await db.product.deleteMany({ where: { title: { contains: "Test Product" } } });
      await db.brand.deleteMany({ where: { name: { contains: "TEST" } } });
      await db.collection.deleteMany({ where: { title: { contains: "TEST" } } });
      await db.sale.deleteMany({ where: { title: { contains: "TEST" } } });
      await db.deliveryZone.deleteMany({ where: { name: { contains: "TEST" } } });
      await db.discountCode.deleteMany({ where: { code: { contains: "TESTCODE" } } });
      await db.heroBanner.deleteMany({ where: { imageUrl: { contains: "/test-" } } });
    } catch (error) {
      // Deliberately not swallowed silently, unlike the per-file afterAll
      // hooks this exists to back up — a failure here means test fixtures
      // may still be live, and that's worth a loud warning even though it
      // can't fail the (already-finished) test run itself.
      console.warn("[vitest.global-teardown] Failed to sweep leftover test fixtures:", error);
    } finally {
      await db.$disconnect();
    }
  };
}
