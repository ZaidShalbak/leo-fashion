"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

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
          <SelectValue placeholder="Size" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sizes</SelectItem>
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
          <SelectValue placeholder="Color" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All colors</SelectItem>
          {colors.map((color) => (
            <SelectItem key={color} value={color}>
              {color}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentSort} onValueChange={(v) => setParam("sort", v)}>
        <SelectTrigger size="sm" className="w-44">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
