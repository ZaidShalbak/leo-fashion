// @vitest-environment node
//
// Integration test against the real local dev database. reorderHeroBanners
// is the one action here with real logic beyond validate-then-Prisma-call
// (turning a dragged-into order into position writes); updateHeroBanner's
// coverage below is a regression test for a real clear-doesn't-persist bug,
// not general CRUD coverage — create/delete's admin gating and CRUD shape
// still mirror brands/collections/discount codes, none of which have
// dedicated tests in this codebase — see CLAUDE.md.
import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockRequireAdmin = vi.fn();
vi.mock("@/server/auth", () => ({
  requireAdmin: mockRequireAdmin,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { db } = await import("@/server/db");
const { reorderHeroBanners, updateHeroBanner } = await import("./heroBanners");

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
  // The hero-banner actions under test each write an AuditLog row
  // (actorUserId: admin.id) — AuditLog.actorUserId has no onDelete (see
  // schema.prisma), so it defaults to Restrict. Without deleting these
  // first, db.user.delete below always throws P2003, gets silently
  // swallowed by .catch(() => {}), and admin is never actually removed —
  // the same bug CLAUDE.md documents fixing in prisma/seed.ts, just
  // recurring here on every test run instead of once.
  await db.auditLog.deleteMany({ where: { actorUserId: admin.id } });
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

describe("updateHeroBanner", () => {
  it("clears headline/subtext/ctaLabel when the form submits them blank, instead of silently keeping the old value", async () => {
    // Regression test: heroBannerFieldsSchema transforms a blank
    // headline/subtext/ctaLabel to `undefined` (not ""), and Prisma's
    // update() treats an undefined field as "don't touch this column"
    // rather than "set it to null" — so clearing any of these fields in
    // the edit form previously had no effect at all, which is exactly the
    // "edit, save, reopen, changes aren't there" bug this covers. headline
    // became nullable/optional later (a banner can rely on baked-in image
    // text with no HTML overlay), so it gets the same clear-to-null
    // treatment as subtext/ctaLabel always had.
    const before = await db.heroBanner.update({
      where: { id: bannerAId },
      data: { headline: "Original headline", subtext: "Original subtext", ctaLabel: "Original CTA" },
    });
    expect(before.headline).toBe("Original headline");
    expect(before.subtext).toBe("Original subtext");
    expect(before.ctaLabel).toBe("Original CTA");

    const formData = new FormData();
    formData.set("id", bannerAId);
    formData.set("headline", "");
    formData.set("subtext", "");
    formData.set("ctaLabel", "");
    formData.set("ctaUrl", before.ctaUrl);
    formData.set("isActive", String(before.isActive));
    formData.set("startsAt", "");
    formData.set("endsAt", "");

    const result = await updateHeroBanner(formData);
    expect(result.success).toBe(true);

    const after = await db.heroBanner.findUnique({ where: { id: bannerAId } });
    expect(after?.headline).toBeNull();
    expect(after?.subtext).toBeNull();
    expect(after?.ctaLabel).toBeNull();
  });
});
