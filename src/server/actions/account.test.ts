// @vitest-environment node
//
// Integration test against the real database (DATABASE_URL from .env).
// Deliberately does NOT mock "@/server/auth" (same reasoning as
// admin/orders.test.ts) — updateAccountDetails' actual security boundary
// is the real requireUser, so this exercises it end-to-end rather than
// stubbing it out. Mocks one layer lower instead: next/headers' cookies()
// and @supabase/ssr's createServerClient, so auth.getUser() resolves to
// whichever fake Supabase Auth id a test wants without a real Supabase
// project. getCurrentUser's real implementation then does a real DB
// lookup by that id, same as production.
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

// requireUser's redirect() always throws in real Next.js (aborts the
// render) — this mock matches that, same as admin/orders.test.ts.
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
const { updateAccountDetails } = await import("./account");

function actAs(user: { supabaseId: string } | null) {
  authState.supabaseId = user?.supabaseId ?? null;
}

let user: { id: string; supabaseId: string };

beforeAll(async () => {
  user = await db.user.create({
    data: {
      supabaseId: `test-account-user-${Date.now()}`,
      email: `account-test-${Date.now()}@example.com`,
      name: "Original Name",
    },
  });
});

afterAll(async () => {
  await db.user.delete({ where: { id: user.id } }).catch(() => {});
  await db.$disconnect();
});

describe("updateAccountDetails", () => {
  it("redirects a signed-out caller to /login", async () => {
    actAs(null);
    await expect(
      updateAccountDetails({ name: "Someone", phone: undefined })
    ).rejects.toMatchObject({ url: "/login" });
  });

  it("rejects a blank name", async () => {
    actAs(user);
    const result = await updateAccountDetails({ name: "  ", phone: undefined });
    expect(result).toEqual({ success: false, error: expect.any(String) });

    const row = await db.user.findUnique({ where: { id: user.id } });
    expect(row?.name).toBe("Original Name");
  });

  it("updates name and phone", async () => {
    actAs(user);
    const result = await updateAccountDetails({ name: "Updated Name", phone: "+970591234567" });
    expect(result).toEqual({ success: true });

    const row = await db.user.findUnique({ where: { id: user.id } });
    expect(row?.name).toBe("Updated Name");
    expect(row?.phone).toBe("+970591234567");
  });

  it("clears phone when omitted", async () => {
    actAs(user);
    await updateAccountDetails({ name: "Updated Name", phone: "+970591234567" });
    const result = await updateAccountDetails({ name: "Updated Name", phone: undefined });
    expect(result).toEqual({ success: true });

    const row = await db.user.findUnique({ where: { id: user.id } });
    expect(row?.phone).toBeNull();
  });
});
