import createIntlProxy from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { routing } from "@/i18n/routing";

const handleI18nRouting = createIntlProxy(routing);

/**
 * Next.js 16 renamed "Middleware" to "Proxy" (same mechanism, new file
 * name/export — see node_modules/next/dist/docs/01-app/01-getting-started/
 * 16-proxy.md). next-intl's own docs/examples still say "middleware.ts"
 * since that predates the rename; the export itself works identically
 * either way, so this just wraps next-intl's handler under the new name.
 *
 * The `matcher` below excludes /admin (and API/static assets) so the admin
 * dashboard never gets locale-prefixed or redirected — see
 * src/i18n/routing.ts and CLAUDE.md for why admin stays English-only and
 * outside this routing scheme entirely.
 */
export function proxy(request: NextRequest) {
  return handleI18nRouting(request);
}

export const config = {
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
