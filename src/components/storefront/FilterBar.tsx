"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { XIcon } from "lucide-react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeoLoadingMark } from "./Logo";

const SORT_OPTIONS = ["newest", "price-asc", "price-desc"] as const;

/**
 * Filter/sort controls for a collection page. Reads and writes the size,
 * color, and sort URL search params directly (via next/navigation), so the
 * actual data fetching and filtering stays server-side in the page — this
 * component only ever changes the URL, per CLAUDE.md's preference for
 * server-rendered filtering over a fully client-rendered filter UI.
 */
export function FilterBar({
  sizes,
  colors,
}: {
  sizes: string[];
  colors: string[];
}) {
  const t = useTranslations("FilterBar");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "newest") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  const currentSize = searchParams.get("size") ?? "all";
  const currentColor = searchParams.get("color") ?? "all";
  const currentSort = searchParams.get("sort") ?? "newest";
  // Only size/color count as "filters" to clear — sort is a display
  // preference, not something narrowing the result set, so leave it as-is.
  const hasActiveFilters = currentSize !== "all" || currentColor !== "all";

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("size");
    params.delete("color");
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3" data-slot="filter-bar">
      <Select value={currentSize} onValueChange={(v) => setParam("size", v)}>
        <SelectTrigger size="sm" className="w-32">
          <SelectValue placeholder={t("size")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allSizes")}</SelectItem>
          {sizes.map((size) => (
            <SelectItem key={size} value={size}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentColor}
        onValueChange={(v) => setParam("color", v)}
      >
        <SelectTrigger size="sm" className="w-36">
          <SelectValue placeholder={t("color")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allColors")}</SelectItem>
          {colors.map((color) => (
            <SelectItem key={color} value={color}>
              {color}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentSort} onValueChange={(v) => setParam("sort", v)}>
        <SelectTrigger size="sm" className="w-44">
          <SelectValue placeholder={t("sort")} />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {t(`sortOptions.${option}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
          <XIcon className="size-4" />
          {t("clearFilters")}
        </Button>
      )}

      {isPending && (
        <div className="bg-background/90 fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm">
          <LeoLoadingMark label={t("applying")} className="text-foreground h-16 w-auto sm:h-20" />
        </div>
      )}
    </div>
  );
}
