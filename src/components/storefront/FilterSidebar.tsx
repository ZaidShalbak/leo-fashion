"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { FilterIcon, XIcon } from "lucide-react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatPriceCents } from "./PriceDisplay";
import { LeoLoadingMark } from "./Logo";

const SORT_OPTIONS = ["newest", "price-asc", "price-desc"] as const;

type FacetOption = { value: string; label: string };

export type FilterSidebarProps = {
  /** Omit entirely on /collections/[handle] — filtering by category there
   * would just duplicate the page's own scope. */
  categories?: FacetOption[];
  /** Omit entirely on /brands/[slug], same reasoning as categories. */
  brands?: FacetOption[];
  sizes: string[];
  colors: string[];
  /** In cents — the actual min/max basePriceCents across this page's
   * unfiltered scope, so the slider's bounds are always real. */
  priceBounds: { min: number; max: number };
};

/**
 * Sidebar filter panel shared by every storefront product-listing page
 * (/collections/[handle], /brands/[slug], /sale). Reads/writes URL search
 * params directly — data fetching and filtering stay server-side in the
 * page, this component only ever changes the URL (same division of labor
 * the old FilterBar used). Rendered as a permanent left column on large
 * screens and behind a "Filters" Sheet trigger on small ones, sharing one
 * FilterControls implementation so the two surfaces can't drift apart.
 */
export function FilterSidebar(props: FilterSidebarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const t = useTranslations("FilterSidebar");
  // Slides in from the leading edge — physical left in LTR, physical
  // right in RTL — since shadcn's Sheet only knows physical sides.
  const isRtl = useLocale() === "ar";

  return (
    <>
      <aside className="hidden lg:block">
        <FilterControls {...props} />
      </aside>

      <div className="lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <FilterIcon className="size-4" />
              {t("filtersButton")}
            </Button>
          </SheetTrigger>
          <SheetContent side={isRtl ? "right" : "left"} className="overflow-y-auto p-4">
            <SheetHeader className="p-0">
              <SheetTitle>{t("filtersButton")}</SheetTitle>
            </SheetHeader>
            <FilterControls {...props} onNavigate={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

function FilterControls({
  categories,
  brands,
  sizes,
  colors,
  priceBounds,
  onNavigate,
}: FilterSidebarProps & { onNavigate?: () => void }) {
  const t = useTranslations("FilterSidebar");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  // Radix's Select doesn't read the ambient CSS `dir` — it defaults to
  // ltr unless told otherwise, which left the sort dropdown's text
  // stuck left-aligned even inside an RTL page. Passed explicitly here
  // rather than fixed globally in src/components/ui/select.tsx, since
  // PhoneInput's Select deliberately wants to stay ltr always (same
  // "island" pattern as prices/postal codes) regardless of locale.
  const isRtl = useLocale() === "ar";

  function getList(key: string): string[] {
    const raw = searchParams.get(key);
    return raw ? raw.split(",").filter(Boolean) : [];
  }

  function toggleValue(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const current = getList(key);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    if (next.length > 0) {
      params.set(key, next.join(","));
    } else {
      params.delete(key);
    }
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
      onNavigate?.();
    });
  }

  function setSort(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  function commitPriceRange(minDollars: number, maxDollars: number) {
    const params = new URLSearchParams(searchParams.toString());
    const boundsMinDollars = priceBounds.min / 100;
    const boundsMaxDollars = priceBounds.max / 100;
    if (minDollars <= boundsMinDollars) {
      params.delete("minPrice");
    } else {
      params.set("minPrice", String(Math.round(minDollars)));
    }
    if (maxDollars >= boundsMaxDollars) {
      params.delete("maxPrice");
    } else {
      params.set("maxPrice", String(Math.round(maxDollars)));
    }
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  const selectedCategories = getList("category");
  const selectedBrands = getList("brand");
  const selectedColors = getList("color");
  const selectedSizes = getList("size");
  const currentSort = searchParams.get("sort") ?? "newest";

  const boundsMinDollars = priceBounds.min / 100;
  const boundsMaxDollars = priceBounds.max / 100;
  const urlMinPrice = searchParams.get("minPrice");
  const urlMaxPrice = searchParams.get("maxPrice");

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedBrands.length > 0 ||
    selectedColors.length > 0 ||
    selectedSizes.length > 0 ||
    urlMinPrice !== null ||
    urlMaxPrice !== null;

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of ["category", "brand", "color", "size", "minPrice", "maxPrice"]) {
      params.delete(key);
    }
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
      onNavigate?.();
    });
  }

  return (
    <div className="space-y-6" data-slot="filter-sidebar">
      <div className="flex items-center justify-between">
        <Select value={currentSort} onValueChange={setSort} dir={isRtl ? "rtl" : "ltr"}>
          <SelectTrigger size="sm" className="w-full">
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

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground -ms-3">
          <XIcon className="size-4" />
          {t("clearFilters")}
        </Button>
      )}

      {categories && categories.length > 0 && (
        <FacetGroup
          heading={t("categoryHeading")}
          options={categories}
          selected={selectedCategories}
          onToggle={(value) => toggleValue("category", value)}
        />
      )}

      {brands && brands.length > 0 && (
        <FacetGroup
          heading={t("brandHeading")}
          options={brands}
          selected={selectedBrands}
          onToggle={(value) => toggleValue("brand", value)}
        />
      )}

      <FacetGroup
        heading={t("colorHeading")}
        options={colors.map((c) => ({ value: c, label: c }))}
        selected={selectedColors}
        onToggle={(value) => toggleValue("color", value)}
      />

      <FacetGroup
        heading={t("sizeHeading")}
        options={sizes.map((s) => ({ value: s, label: s }))}
        selected={selectedSizes}
        onToggle={(value) => toggleValue("size", value)}
      />

      {priceBounds.max > priceBounds.min && (
        <PriceRangeSlider
          // Remounts (resetting local drag state fresh) whenever the URL
          // params or bounds change from outside this control — e.g.
          // "Clear filters", or the bounds narrowing because another
          // facet changed — instead of syncing via an effect.
          key={`${urlMinPrice}-${urlMaxPrice}-${boundsMinDollars}-${boundsMaxDollars}`}
          heading={t("priceHeading")}
          min={boundsMinDollars}
          max={boundsMaxDollars}
          initialMin={urlMinPrice ? Number(urlMinPrice) : boundsMinDollars}
          initialMax={urlMaxPrice ? Number(urlMaxPrice) : boundsMaxDollars}
          onCommit={commitPriceRange}
        />
      )}

      {isPending && (
        <div className="bg-background/90 fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm">
          <LeoLoadingMark label={t("applying")} className="text-foreground h-16 w-auto sm:h-20" />
        </div>
      )}
    </div>
  );
}

function PriceRangeSlider({
  heading,
  min,
  max,
  initialMin,
  initialMax,
  onCommit,
}: {
  heading: string;
  min: number;
  max: number;
  initialMin: number;
  initialMax: number;
  onCommit: (min: number, max: number) => void;
}) {
  const [range, setRange] = useState<[number, number]>([initialMin, initialMax]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{heading}</h3>
      <div dir="ltr">
        <Slider
          min={min}
          max={max}
          step={1}
          value={range}
          onValueChange={(value) => setRange(value as [number, number])}
          onValueCommit={(value) => onCommit(value[0], value[1])}
        />
      </div>
      <div className="text-muted-foreground flex items-center justify-between text-sm" dir="ltr">
        <span>{formatPriceCents(Math.round(range[0] * 100))}</span>
        <span>{formatPriceCents(Math.round(range[1] * 100))}</span>
      </div>
    </div>
  );
}

function FacetGroup({
  heading,
  options,
  selected,
  onToggle,
}: {
  heading: string;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{heading}</h3>
      <ul className="space-y-2">
        {options.map((option) => {
          const id = `filter-${heading}-${option.value}`;
          const checked = selected.includes(option.value);
          return (
            <li key={option.value} className="flex items-center gap-2">
              <Checkbox id={id} checked={checked} onCheckedChange={() => onToggle(option.value)} />
              <label htmlFor={id} className="text-sm leading-none">
                {option.label}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
