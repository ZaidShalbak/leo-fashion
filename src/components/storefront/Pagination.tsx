"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Numbered pagination shared by every product-listing page — storefront
 * (/collections/[handle], /brands/[slug], /sale) and the admin products
 * list. One component works for both trees since /admin was moved under
 * [locale] and made fully bilingual (see project_admin_bilingual_redesign
 * memory note) — it already uses the exact same @/i18n/navigation and
 * next-intl primitives as the storefront, and AdminProductsTable already
 * imports straight from components/storefront/ (see PriceDisplay), so
 * this isn't a new precedent.
 *
 * Reads/writes the `page` URL param directly (same division of labor as
 * FilterSidebar.tsx: this component only ever changes the URL, the
 * actual pagination math/slicing happens server-side in each page via
 * productFilters.ts's paginateProducts). Renders nothing when there's
 * only one page.
 */
export function Pagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const t = useTranslations("Pagination");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function hrefForPage(page: number): string {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function goToPage(page: number) {
    router.push(hrefForPage(page));
  }

  // First, last, current ±1, deduped and sorted — with a gap (rendered
  // as an ellipsis) wherever consecutive numbers in that set aren't
  // actually adjacent. Standard "windowed" pagination, no library.
  const pageNumbers = [...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  return (
    <nav
      aria-label={t("navLabel")}
      className="mt-8 flex items-center justify-center gap-1 text-sm"
    >
      <button
        type="button"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label={t("previous")}
        className="flex size-9 items-center justify-center rounded-md transition disabled:opacity-30 hover:bg-accent rtl:rotate-180"
      >
        <ChevronLeftIcon className="size-4" />
      </button>

      {pageNumbers.map((page, index) => {
        const previous = pageNumbers[index - 1];
        const hasGapBefore = previous !== undefined && page - previous > 1;
        return (
          <span key={page} className="flex items-center gap-1">
            {hasGapBefore && <span className="text-muted-foreground px-1">…</span>}
            <button
              type="button"
              onClick={() => goToPage(page)}
              aria-current={page === currentPage ? "page" : undefined}
              aria-label={t("pageLabel", { page })}
              className={cn(
                "flex size-9 items-center justify-center rounded-md tabular-nums transition",
                page === currentPage
                  ? "bg-foreground text-background"
                  : "hover:bg-accent"
              )}
            >
              {page}
            </button>
          </span>
        );
      })}

      <button
        type="button"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label={t("next")}
        className="flex size-9 items-center justify-center rounded-md transition disabled:opacity-30 hover:bg-accent rtl:rotate-180"
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </nav>
  );
}
