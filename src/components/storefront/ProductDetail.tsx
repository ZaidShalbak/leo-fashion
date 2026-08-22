"use client";

import { useMemo, useState } from "react";

import { Link } from "@/i18n/navigation";
import { ProductGallery } from "./ProductGallery";
import { VariantSelector } from "./VariantSelector";

type ProductImage = { id: string; url: string; altText: string | null; color: string | null };
type Variant = {
  id: string;
  size: string;
  color: string;
  priceOverrideCents: number | null;
  inventoryQuantity: number;
};

/**
 * Picks which photos to show for a color: exact color matches first, then
 * general (untagged) photos as a fallback, then — for a product that
 * hasn't had any photos tagged at all yet — every photo, so the gallery
 * behaves exactly as it did before this feature existed rather than going
 * blank. See ProductImage.color's comment in schema.prisma.
 */
function imagesForColor(images: ProductImage[], color: string | undefined): ProductImage[] {
  if (color) {
    const matches = images.filter((image) => image.color === color);
    if (matches.length > 0) return matches;
  }
  const general = images.filter((image) => image.color === null);
  return general.length > 0 ? general : images;
}

export function ProductDetail({
  productId,
  productTitle,
  brand,
  description,
  basePriceCents,
  compareAtCents,
  images,
  variants,
}: {
  productId: string;
  productTitle: string;
  brand: { name: string; slug: string } | null;
  description: string | null;
  basePriceCents: number;
  /** Pre-sale price, when a Sale (src/lib/sales.ts) applies — null otherwise. */
  compareAtCents: number | null;
  images: ProductImage[];
  variants: Variant[];
}) {
  // Same initial-selection rule VariantSelector has always used (first
  // in-stock variant, falling back to the first variant at all) — color
  // just lives here now instead, so the gallery can key off it too.
  const firstInStock = variants.find((v) => v.inventoryQuantity > 0);
  const [selectedColor, setSelectedColor] = useState(
    firstInStock?.color ?? variants[0]?.color
  );

  const galleryImages = useMemo(
    () => imagesForColor(images, selectedColor),
    [images, selectedColor]
  );

  return (
    <>
      {/* Keyed by color so the gallery resets to its first photo (rather
          than an out-of-range index) whenever the shopper switches color. */}
      <ProductGallery key={selectedColor} images={galleryImages} productTitle={productTitle} />

      <div className="space-y-6">
        <div>
          {brand && (
            <Link
              href={`/brands/${brand.slug}`}
              className="text-muted-foreground hover:text-foreground text-sm tracking-wide uppercase transition"
            >
              {brand.name}
            </Link>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{productTitle}</h1>
        </div>

        <VariantSelector
          productId={productId}
          basePriceCents={basePriceCents}
          compareAtCents={compareAtCents}
          variants={variants}
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
        />

        {description && (
          <div className="border-border border-t pt-6">
            <p className="text-muted-foreground text-sm whitespace-pre-line">{description}</p>
          </div>
        )}
      </div>
    </>
  );
}
