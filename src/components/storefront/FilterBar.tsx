"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { usePathname, useRouter } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "newest") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const currentSize = searchParams.get("size") ?? "all";
  const currentColor = searchParams.get("color") ?? "all";
  const currentSort = searchParams.get("sort") ?? "newest";

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
    </div>
  );
}
