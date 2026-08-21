/**
 * Picks the Arabic override for a piece of catalog content (a product,
 * category, or brand's title/name/description) when the current UI locale
 * is Arabic and a real override has actually been entered; otherwise falls
 * back to the base value the row was entered in. This is deliberately the
 * only place that decides "which language wins" for catalog content, so
 * every storefront call site agrees — see the *Ar columns' comments in
 * schema.prisma for why these are optional per-row overrides rather than a
 * hard requirement.
 *
 * `locale` is typed as a plain `string` (not `AppLocale`) purely so this
 * composes cleanly with `getLocale()`'s return type without every call
 * site needing a cast — the only comparison that matters is `=== "ar"`.
 *
 * Only ever call this from storefront code. The admin dashboard always
 * shows/edits the base field, never a localized one — it's English/LTR-only
 * by design (see CLAUDE.md's bilingual-storefront phase).
 */
export function localize(base: string, ar: string | null, locale: string): string {
  if (locale === "ar" && ar && ar.trim().length > 0) return ar;
  return base;
}

/** Same as {@link localize}, for fields that may be null entirely (e.g. an
 * optional description) — mirrors the base value's `string | null` shape
 * exactly (Prisma never returns `undefined` for a read column) so this
 * drops straight into a Collection/Brand/Product's `description` field
 * without extra narrowing at the call site. */
export function localizeOptional(
  base: string | null,
  ar: string | null,
  locale: string
): string | null {
  if (locale === "ar" && ar && ar.trim().length > 0) return ar;
  return base;
}
