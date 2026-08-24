export type ColorTaggedImage = { color: string | null };

/**
 * Picks which photos to show for a color: exact color matches first, then
 * general (untagged) photos as a fallback, then — for a product that
 * hasn't had any photos tagged at all yet — every photo, so a gallery
 * behaves exactly as it did before per-color tagging existed rather than
 * going blank. See ProductImage.color's comment in schema.prisma. Shared
 * by ProductDetail's gallery and ProductCard's quick-add hover photo-swap.
 */
export function imagesForColor<T extends ColorTaggedImage>(
  images: T[],
  color: string | undefined
): T[] {
  if (color) {
    const matches = images.filter((image) => image.color === color);
    if (matches.length > 0) return matches;
  }
  const general = images.filter((image) => image.color === null);
  return general.length > 0 ? general : images;
}
