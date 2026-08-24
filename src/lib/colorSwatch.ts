// Maps a free-text ProductVariant.color string (e.g. "Black", "Heather
// Grey") to a CSS color for ProductCard's quick-add swatch dot. Curated
// aliases first for apparel terms that aren't valid CSS color keywords,
// then a static set of standard CSS named colors (covers "Navy", "Red",
// "Olive", etc. for free), then a hex/rgb/hsl literal check, then null —
// the caller falls back to an outlined circle with the color name as its
// label, never a broken or invisible swatch.
//
// Deliberately a static list rather than probing the DOM (e.g. setting
// `div.style.color` and reading it back) — this runs during SSR too (a
// "use client" component still renders server-side for the initial HTML),
// and `document` doesn't exist there. A DOM probe would silently resolve
// to "invalid" on the server and "valid" once hydrated on the client for
// every color not in ALIASES, producing a real hydration mismatch (server
// renders the outlined fallback, client repaints it as a colored dot).
const ALIASES: Record<string, string> = {
  "heather grey": "#9CA3AF",
  "heather gray": "#9CA3AF",
  charcoal: "#36454F",
  cream: "#FFFDD0",
  ivory: "#FFFFF0",
  khaki: "#C3B091",
  denim: "#1560BD",
  stone: "#928E85",
  sand: "#C2B280",
  rust: "#B7410E",
  burgundy: "#800020",
  camel: "#C19A6B",
  taupe: "#8B8589",
  multicolor: "#8B5CF6",
  multi: "#8B5CF6",
};

// The CSS Color Module Level 3/4 named colors that a real apparel color
// name is realistically ever going to collide with — not the full ~148-
// keyword list, just the ones plausible as a literal ProductVariant.color
// value.
const CSS_NAMED_COLORS = new Set([
  "black", "white", "red", "green", "blue", "yellow", "orange", "purple",
  "pink", "brown", "grey", "gray", "navy", "teal", "olive", "maroon",
  "beige", "gold", "silver", "coral", "salmon", "khaki", "lavender",
  "turquoise", "indigo", "violet", "crimson", "plum", "orchid", "tan",
  "chocolate", "sienna", "peru", "wheat", "ivory", "azure", "mint",
  "lime", "magenta", "cyan", "aqua", "fuchsia", "chartreuse",
]);

const HEX_OR_FUNCTIONAL_COLOR = /^#[0-9a-f]{3,8}$|^(rgb|hsl)a?\(.+\)$/i;

export function colorSwatchValue(colorName: string): string | null {
  const trimmed = colorName.trim();
  const normalized = trimmed.toLowerCase();
  if (ALIASES[normalized]) return ALIASES[normalized];
  if (CSS_NAMED_COLORS.has(normalized)) return normalized;
  if (HEX_OR_FUNCTIONAL_COLOR.test(trimmed)) return trimmed;
  return null;
}
