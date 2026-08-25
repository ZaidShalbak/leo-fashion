import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/server/auth";

/**
 * Consumes the `token_hash` from a Supabase Auth email link (password
 * reset today, any future email/OTP-based flow later) and establishes a
 * real session via cookies, then redirects to `next`. Deliberately
 * outside the [locale] tree (see src/proxy.ts's `auth` exclusion) — this
 * only verifies a token and redirects, there's no UI to localize, and it
 * shouldn't depend on locale-detection before the token's even checked.
 *
 * Requires the Supabase project's "Reset Password" email template to
 * link here with token_hash/type params instead of the default
 * `{{ .ConfirmationURL }}` — see the comment on requestPasswordReset in
 * src/server/actions/auth.ts for the exact template string needed and
 * why the default template doesn't work with this server-action-only app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/forgot-password?error=expired`);
}
