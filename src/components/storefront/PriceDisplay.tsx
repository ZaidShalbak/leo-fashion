// Money is stored/computed as integer cents everywhere except this — the
// UI edge — per CLAUDE.md.
const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
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
    <span className={className}>
      <span className="font-medium">{formatPriceCents(cents)}</span>
      {hasDiscount && (
        <span className="text-muted-foreground ml-2 line-through">
          {formatPriceCents(compareAtCents)}
        </span>
      )}
    </span>
  );
}
