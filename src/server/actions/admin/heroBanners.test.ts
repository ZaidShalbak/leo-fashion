// @vitest-environment node
//
// Integration test against the real local dev database, focused on
// reorderHeroBanners — the one action here with actual logic (turning a
// dragged-into order into position writes) rather than a straight
// validate-then-Prisma-call wrapper. create/update/delete/reorder's admin
// gating and general CRUD shape mirror brands/collections/discount codes,
// none of which have dedicated tests in this codebase — see CLAUDE.md.
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockRequireAdmin = vi.fn();
vi.mock("@/server/auth", () => ({
  requireAdmin: mockRequireAdmin,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { db } = await import("@/server/db");
const { reorderHeroBanners } = await import("./heroBanners");

let admin: { id: string };
let bannerAId: string;
let bannerBId: string;
let bannerCId: string;

beforeAll(async () => {
  admin = await db.user.create({
    data: {
      supabaseId: `test-hero-banner-admin-${Date.now()}`,
      email: `hero-banner-admin-${Date.now()}@example.com`,
      name: "Test Admin",
      role: "admin",
    },
  });
  mockRequireAdmin.mockResolvedValue(admin);

  const suffix = Date.now();
  const [a, b, c] = await Promise.all([
    db.heroBanner.create({
      data: { imageUrl: "/test-a.svg", headline: `A-${suffix}`, ctaUrl: "/", position: 0 },
    }),
    db.heroBanner.create({
      data: { imageUrl: "/test-b.svg", headline: `B-${suffix}`, ctaUrl: "/", position: 1 },
    }),
    db.heroBanner.create({
      data: { imageUrl: "/test-c.svg", headline: `C-${suffix}`, ctaUrl: "/", position: 2 },
    }),
  ]);
  bannerAId = a.id;
  bannerBId = b.id;
  bannerCId = c.id;
});

afterAll(async () => {
  await db.heroBanner.deleteMany({ where: { id: { in: [bannerAId, bannerBId, bannerCId] } } });
  await db.user.delete({ where: { id: admin.id } }).catch(() => {});
  await db.$disconnect();
});

describe("reorderHeroBanners", () => {
  it("rewrites each banner's position to match the given order", async () => {
    const result = await reorderHeroBanners({
      orderedIds: [bannerCId, bannerAId, bannerBId],
    });
    expect(result.success).toBe(true);

    const banners = await db.heroBanner.findMany({
      where: { id: { in: [bannerAId, bannerBId, bannerCId] } },
    });
    const positionOf = Object.fromEntries(banners.map((b) => [b.id, b.position]));
    expect(positionOf[bannerCId]).toBe(0);
    expect(positionOf[bannerAId]).toBe(1);
    expect(positionOf[bannerBId]).toBe(2);
  });

  it("rejects an empty list rather than wiping every position", async () => {
    const result = await reorderHeroBanners({ orderedIds: [] });
    expect(result.success).toBe(false);
  });
});
