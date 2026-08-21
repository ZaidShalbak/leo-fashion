import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/**
 * Locale-aware drop-in replacements for next/navigation's Link/redirect/
 * usePathname/useRouter — every internal storefront link should use these
 * (not next/link) so navigating never drops or mismatches the current
 * locale prefix. Admin links are the one deliberate exception: /admin
 * lives outside the [locale] routing scheme, so admin-bound links
 * (e.g. UserMenu's "Admin" item) still use plain next/link.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
