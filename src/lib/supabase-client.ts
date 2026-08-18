import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components (login/signup forms, etc). Server
 * Components and Server Actions should use createSupabaseServerClient from
 * src/server/auth.ts instead, so the session cookie is read/written on the
 * request rather than kept in browser storage.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
