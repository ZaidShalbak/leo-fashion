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
 * `next` arrives as a full absolute URL here, not a relative path —
 * Supabase's email template embeds it from `{{ .RedirectTo }}` (see the
 * comment on requestPasswordReset in src/server/actions/auth.ts for why
 * that has to be a full, allow-listed URL). Only redirect to it when its
 * origin matches this route's own request origin — this route is reached
 * with nothing but a token_hash+type+next in the query string, so without
 * this check anyone holding a valid token could swap in an arbitrary
 * `next` and get redirected off-site right after a real session gets
 * established via cookies on this domain (a classic open-redirect).
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
  const next = searchParams.get("next");

  if (tokenHash && type && next) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      try {
        if (new URL(next).origin === origin) {
          return NextResponse.redirect(next);
        }
      } catch {
        // Malformed next — fall through to the error redirect below.
      }
    }
  }

  return NextResponse.redirect(`${origin}/forgot-password?error=expired`);
}
