"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/server/db";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
  getCurrentUser,
} from "@/server/auth";
import {
  signUpSchema,
  signInSchema,
  type SignUpInput,
  type SignInInput,
} from "@/lib/validators/auth";

const GUEST_CART_COOKIE = "cart_token";

export type AuthActionResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Merges a guest cart (identified by the cart_token cookie) into the given
 * user's cart, then deletes the guest cart and clears the cookie. Uses the
 * same "sum quantities, cap at stock and 20" logic as addToCart so a login
 * mid-shopping-session never silently drops or oversells items. No-op if
 * there's no guest cart cookie, or it doesn't resolve to a real cart.
 */
async function mergeGuestCartIntoUser(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const guestToken = cookieStore.get(GUEST_CART_COOKIE)?.value;
  if (!guestToken) return;

  const guestCart = await db.cart.findUnique({
    where: { guestToken },
    include: { items: true },
  });
  if (!guestCart || guestCart.items.length === 0) {
    if (guestCart) await db.cart.delete({ where: { id: guestCart.id } });
    cookieStore.delete(GUEST_CART_COOKIE);
    return;
  }

  const userCart =
    (await db.cart.findUnique({ where: { userId } })) ??
    (await db.cart.create({ data: { userId } }));

  for (const guestItem of guestCart.items) {
    const variant = await db.productVariant.findUnique({
      where: { id: guestItem.variantId },
    });
    if (!variant || variant.inventoryQuantity <= 0) continue;

    const existing = await db.cartItem.findUnique({
      where: {
        cartId_variantId: { cartId: userCart.id, variantId: variant.id },
      },
    });
    const cappedQuantity = Math.min(
      (existing?.quantity ?? 0) + guestItem.quantity,
      variant.inventoryQuantity,
      20
    );

    if (existing) {
      await db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: cappedQuantity },
      });
    } else {
      await db.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: variant.productId,
          variantId: variant.id,
          quantity: cappedQuantity,
        },
      });
    }
  }

  await db.cart.delete({ where: { id: guestCart.id } });
  cookieStore.delete(GUEST_CART_COOKIE);
}

/**
 * Creates a new account and signs the user in immediately. Signup emails
 * aren't wired up yet, so this auto-confirms the address via the admin API
 * (service role key) rather than leaving the account stuck waiting on a
 * confirmation link nobody can click — see CLAUDE.md. Tightening this to a
 * real confirmation flow later doesn't need a schema change.
 */
export async function signUp(
  input: SignUpInput,
  redirectTo: string = "/"
): Promise<AuthActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { name, email, password } = parsed.data;

  const admin = createSupabaseAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (createError || !created.user) {
    const message = createError?.message ?? "Could not create account.";
    return {
      success: false,
      error: /already/i.test(message)
        ? "An account with this email already exists."
        : message,
    };
  }

  const appUser = await db.user.create({
    data: { supabaseId: created.user.id, email, name },
  });

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    // Account exists but the session couldn't be established — send them
    // to log in manually rather than silently failing.
    redirect("/login");
  }

  await mergeGuestCartIntoUser(appUser.id);
  redirect(redirectTo);
}

/** Signs an existing user in and merges any guest cart into their account. */
export async function signIn(
  input: SignInInput,
  redirectTo: string = "/"
): Promise<AuthActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { success: false, error: "Incorrect email or password." };
  }

  const appUser = await db.user.findUnique({
    where: { supabaseId: data.user.id },
  });
  if (appUser) {
    await mergeGuestCartIntoUser(appUser.id);
  }
  redirect(redirectTo);
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function getCurrentUserSummary() {
  const user = await getCurrentUser();
  return user ? { name: user.name, email: user.email } : null;
}
