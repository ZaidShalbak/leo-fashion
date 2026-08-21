// Money is stored/computed as integer cents (here, agorot) everywhere
// except this — the UI edge — per CLAUDE.md.
const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ILS",
});

export function formatPriceCents(cents: number): string {
  return formatter.format(cents / 100);
}

export function PriceDisplay({
  cents,
  compareAtCents,
  className,
}: {
  cents: number;
  /** Optional original price to show struck through (e.g. a sale). */
  compareAtCents?: number;
  className?: string;
}) {
  const hasDiscount =
    typeof compareAtCents === "number" && compareAtCents > cents;

  return (
    // dir="ltr" pins the numerals/currency symbol to a consistent
    // left-to-right order regardless of page direction — prices deliberately
    // stay in Western-numeral ILS formatting even on the Arabic storefront
    // (see formatter above), which is the same convention most Arabic
    // e-commerce sites use, so this is a plain LTR "island" inside an RTL
    // page rather than something that should mirror.
    <span className={className} dir="ltr">
      <span className="font-medium">{formatPriceCents(cents)}</span>
      {hasDiscount && (
        <span className="text-muted-foreground ms-2 line-through">
          {formatPriceCents(compareAtCents)}
        </span>
      )}
    </span>
  );
}
