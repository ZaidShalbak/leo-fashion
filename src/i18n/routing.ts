import { defineRouting } from "next-intl/routing";

/**
 * Storefront-only locale config — the admin dashboard deliberately lives
 * outside this routing scheme entirely (see proxy.ts and CLAUDE.md): it's
 * an internal tool used by one person, not worth translating, so it never
 * gets an /en or /ar prefix at all.
 *
 * `localePrefix: "always"` (the default) means even the default locale
 * (`en`) gets a `/en` prefix rather than living unprefixed at `/` — this
 * keeps the two locales symmetric (no "special" locale that skips the
 * prefix) and avoids a whole class of "which one is the canonical URL for
 * search engines" ambiguity that an "as-needed" prefix scheme invites.
 */
export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
});

export type AppLocale = (typeof routing.locales)[number];
