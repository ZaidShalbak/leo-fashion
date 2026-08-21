import { LeoLoadingMark } from "./Logo";

/**
 * Shared full-page loading state for route-level Suspense fallbacks
 * (loading.tsx files) — the same branded LeoLoadingMark used for
 * FilterBar's overlay, sized/centered the same way, instead of a
 * skeleton screen. Callers are Server Components (loading.tsx runs as a
 * Suspense fallback, can be async), so the label is passed in already
 * translated via getTranslations rather than this component reaching
 * for useTranslations itself.
 */
export function PageLoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LeoLoadingMark label={label} className="text-foreground h-16 w-auto sm:h-20" />
    </div>
  );
}
