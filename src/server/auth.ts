import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
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
 */
export async function getCurrentUser(): Promise<User | null> {
  const authUser = await getSupabaseUser();
  if (!authUser) return null;

  return db.user.findUnique({ where: { supabaseId: authUser.id } });
}

/**
 * Requires a signed-in user, redirecting to /login otherwise. Use in
 * Server Components/Actions that need "some logged-in user," not
 * specifically an admin.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
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
