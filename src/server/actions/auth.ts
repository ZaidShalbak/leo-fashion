"use server";

import { cookies, headers } from "next/headers";
import { redirect as redirectPlain } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { redirect } from "@/i18n/navigation";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
  getCurrentUser,
} from "@/server/auth";
import {
  signUpSchema,
  signInSchema,
  requestPasswordResetSchema,
  newPasswordSchema,
  type SignUpInput,
  type SignInInput,
  type RequestPasswordResetInput,
  type NewPasswordInput,
} from "@/lib/validators/auth";

const GUEST_CART_COOKIE = "cart_token";

export type AuthActionResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Translates a signUp/signIn Zod failure by field, not by forwarding the
 * schema's hardcoded English message. Each field in signUpSchema/
 * signInSchema has exactly one validation rule, so mapping by
 * `issues[0].path[0]` alone (no need to inspect the Zod error code/message)
 * is enough to pick the right translated string — same scoped-bypass policy
 * as applyDiscountCode in discount.ts, just applied per-field instead of
 * for the whole schema since there's more than one realistic failure mode
 * here.
 */
function authIssueMessage(
  t: Awaited<ReturnType<typeof getTranslations>>,
  issues: { path: PropertyKey[] }[],
  passwordKey: "passwordRequired" | "passwordTooShort"
): string {
  switch (issues[0]?.path[0]) {
    case "name":
      return t("nameRequired");
    case "email":
      return t("emailInvalid");
    case "password":
      return t(passwordKey);
    default:
      return t("invalidInput");
  }
}

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
 * Reassigns a just-placed guest order to a newly created account — the
 * "save this order to an account" prompt on the order-confirmation page
 * (see CLAUDE.md's guest-checkout note). Only claims it when the order is
 * still a real, unclaimed guest order (userId null) whose guestEmail
 * matches the address just signed up with — the order id alone isn't
 * proof of ownership (it's only unguessable, not secret to whoever placed
 * it), so this stops someone from claiming a stranger's guest order by
 * guessing its id and signing up with a different email. Never throws —
 * failing to claim shouldn't block the sign-up itself from succeeding.
 */
async function claimGuestOrder(orderId: string, userId: string, email: string): Promise<void> {
  try {
    await db.order.updateMany({
      where: { id: orderId, userId: null, guestEmail: { equals: email, mode: "insensitive" } },
      data: { userId, guestEmail: null },
    });
  } catch (error) {
    console.error("[auth] Failed to claim guest order on sign-up:", error);
  }
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
  redirectTo: string = "/",
  claimOrderId?: string
): Promise<AuthActionResult> {
  const t = await getTranslations("AuthActions");
  const locale = await getLocale();

  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: authIssueMessage(t, parsed.error.issues, "passwordTooShort"),
    };
  }
  const { name, email, password, phone } = parsed.data;

  const admin = createSupabaseAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (createError || !created.user) {
    // Supabase's own error message (the fallback below) is an external,
    // untranslated string — out of scope to localize. The one common case
    // we can recognize (duplicate email) gets a translated message instead.
    return {
      success: false,
      error:
        createError?.message && /already/i.test(createError.message)
          ? t("emailAlreadyExists")
          : (createError?.message ?? t("couldNotCreateAccount")),
    };
  }

  const appUser = await db.user.create({
    data: { supabaseId: created.user.id, email, name, phone: phone ?? null },
  });

  if (claimOrderId) {
    await claimGuestOrder(claimOrderId, appUser.id, email);
  }

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    // Account exists but the session couldn't be established — send them
    // to log in manually rather than silently failing.
    redirect({ href: "/login", locale });
  }

  await mergeGuestCartIntoUser(appUser.id);
  return redirect({ href: redirectTo, locale });
}

/** Signs an existing user in and merges any guest cart into their account. */
export async function signIn(
  input: SignInInput,
  redirectTo: string = "/"
): Promise<AuthActionResult> {
  const t = await getTranslations("AuthActions");
  const locale = await getLocale();

  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: authIssueMessage(t, parsed.error.issues, "passwordRequired"),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { success: false, error: t("incorrectCredentials") };
  }

  const appUser = await db.user.findUnique({
    where: { supabaseId: data.user.id },
  });
  if (appUser) {
    await mergeGuestCartIntoUser(appUser.id);
  }
  return redirect({ href: redirectTo, locale });
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  // Stays on plain next/navigation's redirect, not the locale-aware one —
  // shared with the admin layout's sign-out button, which is now inside
  // [locale] too (see the bilingual admin redesign), but this unprefixed
  // "/" already resolves correctly via the existing NEXT_LOCALE-cookie
  // bounce, so switching isn't required. Left as-is to keep this diff
  // small and focused on what actually needed to change.
  redirectPlain("/");
}

/**
 * Sends a password-reset email. Always returns a generic success signal
 * regardless of whether the email exists — no account enumeration; the
 * calling form shows its own "check your inbox" message locally rather
 * than relying on a server-supplied string.
 *
 * `redirectTo` here is *not* the confirm link's own domain — Supabase's
 * "Reset Password" email template always builds that link from the
 * project's fixed Site URL setting (`{{ .SiteURL }}/auth/confirm?...`),
 * regardless of what's passed here. What `redirectTo` actually controls
 * is the `{{ .RedirectTo }}` template variable, which the template embeds
 * as the `next` query param — i.e. where the browser lands *after*
 * src/app/auth/confirm/route.ts verifies the token. So this is the final
 * destination, not (as an earlier version of this comment assumed) the
 * confirm link's base — confirmed against Supabase's own docs after that
 * assumption produced a real bug (verified live: the emailed link always
 * used Site URL and dropped the locale, no matter where the request came
 * from, because the redirectTo value was being smuggled into a `next`
 * fragment on a link whose actual base the template never referenced).
 *
 * Still needs to be an absolute, allow-listed URL — Supabase validates
 * `redirectTo` against Authentication > URL Configuration > Redirect URLs
 * before it'll use it at all (silently falling back to Site URL if it
 * doesn't match), so deriving it from the live request's Origin header is
 * still correct here, just for a different reason than originally
 * documented: it's what lets a local-dev test land back on localhost
 * afterward instead of always ending up on production.
 *
 * Requires two one-time dashboard steps in the real Supabase project —
 * code alone can't do this, same class of setup as the original hardcoded-
 * Site-URL bug:
 *  1. Authentication > URL Configuration > Redirect URLs must include
 *     `${origin}/**` (or the exact final-destination path) for every
 *     environment this runs in.
 *  2. Authentication > Email Templates > "Reset Password"'s action link
 *     must be changed from the default `{{ .ConfirmationURL }}` to
 *     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next={{ .RedirectTo }}`.
 *     The default template points at Supabase's own hosted verify
 *     endpoint, which returns the session via a URL hash fragment for a
 *     browser-side Supabase client to read — this app is server-action-
 *     only and has no such client. The token_hash form is what
 *     src/app/auth/confirm/route.ts below actually expects.
 */
export async function requestPasswordReset(
  input: RequestPasswordResetInput
): Promise<AuthActionResult> {
  const t = await getTranslations("AuthActions");
  const locale = await getLocale();

  const parsed = requestPasswordResetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: t("invalidInput") };
  }

  const headerList = await headers();
  const origin = headerList.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/${locale}/reset-password`,
  });

  return { success: true };
}

/**
 * Sets a new password for the currently-active recovery session — see
 * src/app/auth/confirm/route.ts, which establishes that session from the
 * emailed link's token before redirecting here. Redirects home on
 * success, same convention as signIn/signUp.
 */
export async function confirmPasswordReset(
  input: NewPasswordInput
): Promise<AuthActionResult> {
  const t = await getTranslations("AuthActions");
  const locale = await getLocale();

  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.code === "too_small"
          ? t("passwordTooShort")
          : t("invalidInput"),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { success: false, error: t("couldNotResetPassword") };
  }

  return redirect({ href: "/", locale });
}

export async function getCurrentUserSummary() {
  const user = await getCurrentUser();
  return user ? { name: user.name, email: user.email } : null;
}
