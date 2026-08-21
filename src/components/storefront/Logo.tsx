/**
 * Hand-recreated as SVG rather than using the store's original raster
 * asset — crisp at any size, trivially recolorable via `currentColor`
 * (the header needs white, the favicon needs a fixed color baked in),
 * and tiny. Shape/coordinates are shared with the generated app icons
 * (icon.svg, apple-icon.tsx) so the mark reads identically everywhere;
 * keep them in sync if the design ever changes.
 *
 * `variant="mark"` is just the LEO wordmark (no "FASHION" line) — the
 * header is a single row, too short for the full two-line lockup to sit
 * at a legible size. `variant="full"` (LEO + FASHION stacked) is for
 * contexts with room to spare, e.g. a footer or an about page, should
 * either need the fuller lockup later.
 */
export function LeoFashionLogo({
  variant = "mark",
  className,
}: {
  variant?: "mark" | "full";
  className?: string;
}) {
  return (
    <svg
      viewBox={variant === "full" ? "0 0 300 170" : "0 0 300 130"}
      className={className}
      fill="currentColor"
      role="img"
      aria-label="Leo Fashion"
    >
      <rect x="20" y="20" width="20" height="90" />
      <rect x="20" y="92" width="62" height="18" />
      <rect x="98" y="20" width="60" height="18" />
      <rect x="98" y="56" width="60" height="18" />
      <rect x="98" y="92" width="60" height="18" />
      <circle cx="225" cy="65" r="46" fill="none" stroke="currentColor" strokeWidth="20" />
      {variant === "full" && (
        <text
          x="150"
          y="152"
          textAnchor="middle"
          fontFamily="var(--font-sans), sans-serif"
          fontSize="22"
          letterSpacing="8"
        >
          FASHION
        </text>
      )}
    </svg>
  );
}

/**
 * A loading indicator built from the actual LEO mark rather than a
 * generic spinner — the letter groups (L, the three-bar E, the O ring)
 * pulse in sequence via the `leo-pulse` keyframe (globals.css), 150ms
 * apart, so the effect reads as a wave sweeping left-to-right across the
 * logo and repeating. The letterforms themselves are never reshaped or
 * cropped, just faded — confirmed with the store owner via a rendered
 * preview before wiring this into any real loading state.
 */
export function LeoLoadingMark({
  className,
  label = "Loading",
}: {
  className?: string;
  /** Translated "Loading…"-type label — role="status" so screen readers
   * announce it when the indicator appears, same as any other live
   * loading region. Defaults to English for callers outside the
   * bilingual storefront tree; pass a real translation when available. */
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 300 130"
      className={className}
      fill="currentColor"
      role="status"
      aria-label={label}
    >
      <g className="animate-leo-pulse">
        <rect x="20" y="20" width="20" height="90" />
        <rect x="20" y="92" width="62" height="18" />
      </g>
      <g className="animate-leo-pulse [animation-delay:150ms]">
        <rect x="98" y="20" width="60" height="18" />
        <rect x="98" y="56" width="60" height="18" />
        <rect x="98" y="92" width="60" height="18" />
      </g>
      <g className="animate-leo-pulse [animation-delay:300ms]">
        <circle cx="225" cy="65" r="46" fill="none" stroke="currentColor" strokeWidth="20" />
      </g>
    </svg>
  );
}
