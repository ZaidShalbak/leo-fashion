"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { SearchIcon, XIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { searchSite, type SearchResults } from "@/server/actions/search";
import { PriceDisplay } from "./PriceDisplay";

const EMPTY_RESULTS: SearchResults = { products: [], brands: [], collections: [] };
const DEBOUNCE_MS = 300;

/**
 * Header search — a magnifying-glass icon that expands into an inline
 * input (same "icon or absolute dropdown panel, never pushes sibling
 * layout" approach as UserMenu) with live results grouped into
 * brands/categories/products as you type. Shared between the desktop nav
 * and the mobile top bar, same as CartIconLink.
 *
 * A brand/category match also pulls in that brand's/category's products
 * into the product list (see searchSite), so the brand/category links
 * here are an addition on top of the product results, not a replacement
 * for them.
 */
export function SearchBox() {
  const t = useTranslations("SearchBox");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [isPending, startTransition] = useTransition();
  const [hasSearched, setHasSearched] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) close();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const timer = setTimeout(() => {
      startTransition(async () => {
        const found = await searchSite(trimmed);
        setResults(found);
        setHasSearched(true);
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults(EMPTY_RESULTS);
      setHasSearched(false);
    }
  }

  function close() {
    setOpen(false);
    setQuery("");
    setResults(EMPTY_RESULTS);
    setHasSearched(false);
  }

  const showPanel = open && query.trim().length > 0;
  const noResults =
    hasSearched &&
    !isPending &&
    results.products.length === 0 &&
    results.brands.length === 0 &&
    results.collections.length === 0;

  return (
    <div ref={containerRef} className="relative">
      {open ? (
        <div className="flex h-9 items-center gap-1.5 rounded-md border border-white/20 px-2">
          <SearchIcon className="size-4 shrink-0 text-white/70" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            className="w-32 bg-transparent text-sm text-white outline-none placeholder:text-white/50 sm:w-48"
          />
          <button
            type="button"
            onClick={close}
            aria-label={t("close")}
            className="shrink-0 text-white/70 transition hover:text-white"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("open")}
          className="flex size-9 items-center justify-center text-white/70 transition hover:text-white"
        >
          <SearchIcon className="size-5" />
        </button>
      )}

      {showPanel && (
        <div
          role="listbox"
          // Below `sm`, a 320px panel anchored to the search icon (which
          // sits well left-of-center among the mobile top bar's icons) can
          // run past the screen edge — `end-0` extends the panel *toward*
          // the icon's start side, and there isn't 320px of room there on
          // a narrow phone. `fixed inset-x-4` sidesteps that entirely by
          // positioning relative to the viewport instead of the icon.
          // `sm:` and up reverts to the icon-anchored dropdown, where a
          // 320px panel always has room.
          className="border-border bg-background fixed inset-x-4 top-16 z-20 max-h-96 overflow-auto rounded-md border py-1 text-sm shadow-md sm:absolute sm:inset-x-auto sm:top-full sm:end-0 sm:mt-1 sm:w-80 sm:max-w-[calc(100vw-2rem)]"
        >
          {isPending && !hasSearched && (
            <p className="text-muted-foreground px-3 py-3">{t("searching")}</p>
          )}

          {noResults && (
            <p className="text-muted-foreground px-3 py-3">{t("noResults", { query: query.trim() })}</p>
          )}

          {results.brands.length > 0 && (
            <div className="border-border border-b py-1 last:border-b-0">
              <p className="text-muted-foreground px-3 pt-1 pb-1 text-xs font-medium tracking-wide uppercase">
                {t("brands")}
              </p>
              {results.brands.map((brand) => (
                <Link
                  key={brand.id}
                  href={`/brands/${brand.slug}`}
                  onClick={close}
                  className="hover:bg-muted block px-3 py-2 transition"
                >
                  {brand.name}
                </Link>
              ))}
            </div>
          )}

          {results.collections.length > 0 && (
            <div className="border-border border-b py-1 last:border-b-0">
              <p className="text-muted-foreground px-3 pt-1 pb-1 text-xs font-medium tracking-wide uppercase">
                {t("categories")}
              </p>
              {results.collections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.handle}`}
                  onClick={close}
                  className="hover:bg-muted block px-3 py-2 transition"
                >
                  {collection.title}
                </Link>
              ))}
            </div>
          )}

          {results.products.length > 0 && (
            <div className="py-1">
              <p className="text-muted-foreground px-3 pt-1 pb-1 text-xs font-medium tracking-wide uppercase">
                {t("products")}
              </p>
              {results.products.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  onClick={close}
                  className="hover:bg-muted flex items-center gap-3 px-3 py-2 transition"
                >
                  <span className="bg-muted relative size-10 shrink-0 overflow-hidden rounded">
                    {product.imageUrl && (
                      <Image src={product.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    {product.brandName && (
                      <span className="text-muted-foreground block text-xs">{product.brandName}</span>
                    )}
                    <span className="block truncate">{product.title}</span>
                  </span>
                  <PriceDisplay cents={product.priceCents} className="shrink-0 text-xs" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
