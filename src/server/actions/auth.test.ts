// @vitest-environment node
//
// Integration-ish: real local dev database for User/Cart rows (same as
// cart.test.ts / order.test.ts), but the actual Supabase Auth calls are
// faked — this sandbox has no network path to a real Supabase project
// anyway (see CLAUDE.md), and we don't want tests depending on one.
import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  adminCreateUser: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/server/auth", async () => {
  const actual = await vi.importActual<typeof import("@/server/auth")>("@/server/auth");
  return {
    ...actual,
    createSupabaseAdminClient: () => ({
      auth: { admin: { createUser: mocks.adminCreateUser } },
    }),
    createSupabaseServerClient: async () => ({
      auth: {
        signInWithPassword: mocks.signInWithPassword,
        signOut: mocks.signOut,
      },
    }),
  };
});

const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.has(name) ? { value: cookieJar.get(name)! } : undefined,
    set: (name: string, value: string) => cookieJar.set(name, value),
    delete: (name: string) => cookieJar.delete(name),
  }),
}));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({ redirect: (url: string) => mockRedirect(url) }));

const { db } = await import("@/server/db");
const { signUp, signIn, signOut } = await import("./auth");

let productId: string;
let variantId: string;
const createdUserIds: string[] = [];

beforeAll(async () => {
  const product = await db.product.create({
    data: {
      title: "Test Product (auth.test.ts)",
      slug: `test-product-auth-${Date.now()}`,
      basePriceCents: 1500,
      status: "active",
      variants: {
        create: [{ sku: `TEST-AUTH-${Date.now()}`, size: "M", color: "Black", inventoryQuantity: 10 }],
      },
    },
    include: { variants: true },
  });
  productId = product.id;
  variantId = product.variants[0]!.id;
});

afterEach(() => {
  cookieJar.clear();
  vi.clearAllMocks();
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await db.product.delete({ where: { id: productId } }).catch(() => {});
  await db.$disconnect();
});

describe("signUp", () => {
  it("rejects invalid input before calling Supabase", async () => {
    const result = await signUp({ name: "A", email: "not-an-email", password: "short" });
    expect(result.success).toBe(false);
    expect(mocks.adminCreateUser).not.toHaveBeenCalled();
  });

  it("maps a duplicate-email error to a friendly message", async () => {
    mocks.adminCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered" },
    });

    const result = await signUp({
      name: "Dup User",
      email: "dup@example.com",
      password: "password123",
    });

    expect(result).toEqual({
      success: false,
      error: "An account with this email already exists.",
    });
  });

  it("creates the app User row, signs in, merges the guest cart, and redirects", async () => {
    const supabaseId = `test-auth-signup-${Date.now()}`;
    mocks.adminCreateUser.mockResolvedValue({
      data: { user: { id: supabaseId } },
      error: null,
    });
    mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: supabaseId } }, error: null });

    // Simulate a guest who added something to their cart before signing up.
    const guestToken = `guest-${Date.now()}`;
    const guestCart = await db.cart.create({ data: { guestToken } });
    await db.cartItem.create({
      data: { cartId: guestCart.id, productId, variantId, quantity: 3 },
    });
    cookieJar.set("cart_token", guestToken);

    const result = await signUp({
      name: "New User",
      email: `new-${supabaseId}@example.com`,
      password: "password123",
    });

    expect(result).toBeUndefined(); // signUp redirects on success
    expect(mockRedirect).toHaveBeenCalledWith("/");

    const appUser = await db.user.findUnique({ where: { supabaseId } });
    expect(appUser).not.toBeNull();
    createdUserIds.push(appUser!.id);

    const userCart = await db.cart.findUnique({
      where: { userId: appUser!.id },
      include: { items: true },
    });
    expect(userCart?.items).toHaveLength(1);
    expect(userCart?.items[0]?.quantity).toBe(3);

    // Guest cart is gone and the cookie cleared.
    expect(await db.cart.findUnique({ where: { guestToken } })).toBeNull();
    expect(cookieJar.has("cart_token")).toBe(false);
  });
});

describe("signIn", () => {
  it("rejects invalid input before calling Supabase", async () => {
    const result = await signIn({ email: "not-an-email", password: "" });
    expect(result.success).toBe(false);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("returns a friendly error on bad credentials", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    const result = await signIn({ email: "someone@example.com", password: "wrongpass" });
    expect(result).toEqual({ success: false, error: "Incorrect email or password." });
  });

  it("redirects to a custom redirectTo on success", async () => {
    const supabaseId = `test-auth-signin-${Date.now()}`;
    const user = await db.user.create({
      data: { supabaseId, email: `signin-${supabaseId}@example.com`, name: "Signin User" },
    });
    createdUserIds.push(user.id);

    mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: supabaseId } }, error: null });

    const result = await signIn(
      { email: user.email, password: "password123" },
      "/checkout"
    );

    expect(result).toBeUndefined();
    expect(mockRedirect).toHaveBeenCalledWith("/checkout");
  });
});

describe("signOut", () => {
  it("signs out of Supabase and redirects home", async () => {
    mocks.signOut.mockResolvedValue({ error: null });
    await signOut();
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });
});
