import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { User } from "@prisma/client";

import { db } from "./db";

/**
 * Supabase client for Server Components, Server Actions, and Route
 * Handlers. Reads/writes the session cookie on the current request.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render, where cookies can't be
            // written. Safe to ignore as long as a proxy/middleware step
            // refreshes the session on navigation.
          }
        },
      },
    }
  );
}

/**
 * Admin-privileged Supabase client using the service role key — bypasses
 * RLS and can manage auth users directly (e.g. `admin.createUser`). Never
 * expose this client or the service role key to the browser; it's only
 * ever constructed here, server-side, inside src/server/actions.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** The Supabase Auth user for the current request, or null if signed out. */
export async function getSupabaseUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * The app's own User row (with role, etc) for the current session, or null
 * if signed out. Looked up by supabaseId — the stable link between
 * Supabase Auth's auth.users and our own User table — never by email.
 *
 * Wrapped in React's `cache()` — this is Next.js's own documented pattern
 * for a per-request "who's signed in" lookup (see the App Router
 * authentication guide's `getUser`/`verifySession` example). Without it,
 * every independent call site within the same request (StorefrontLayout,
 * getCartQuantityByVariant, getWishlistedProductIds, requireUser, etc.)
 * was each paying its own full Supabase Auth + database round trip for
 * what's always the same answer within one request. `cache()` scopes the
 * memoization to the current request only — it never leaks across
 * requests or between different signed-in users.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const authUser = await getSupabaseUser();
  if (!authUser) return null;

  return db.user.findUnique({ where: { supabaseId: authUser.id } });
});

/**
 * Requires a signed-in user, redirecting to /login otherwise. Use in
 * Server Components/Actions that need "some logged-in user," not
 * specifically an admin. Pass the current path as `callbackPath` so the
 * login page can send the user back where they came from (e.g. checkout)
 * after signing in.
 */
export async function requireUser(callbackPath?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    const query = callbackPath
      ? `?next=${encodeURIComponent(callbackPath)}`
      : "";
    redirect(`/login${query}`);
  }
  return user;
}

/**
 * Requires a signed-in admin, redirecting otherwise. Call this explicitly
 * in every admin layout/page/action — a route living under /admin is not
 * itself a security boundary. See CLAUDE.md.
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") {
    redirect("/");
  }
  return user;
}
