"use client";

import { useMemo, useState } from "react";

import { Link } from "@/i18n/navigation";
import { imagesForColor } from "@/lib/images";
import { ProductGallery } from "./ProductGallery";
import { VariantSelector } from "./VariantSelector";
import { WishlistButton } from "./WishlistButton";

type ProductImage = { id: string; url: string; altText: string | null; color: string | null };
type Variant = {
  id: string;
  size: string;
  color: string;
  priceOverrideCents: number | null;
  inventoryQuantity: number;
};

export function ProductDetail({
  productId,
  productTitle,
  brand,
  description,
  basePriceCents,
  compareAtCents,
  images,
  variants,
  cartQuantityByVariant,
  isWishlisted = false,
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
  /** Variant id -> quantity already in the cart — see VariantSelector. */
  cartQuantityByVariant?: Record<string, number>;
  isWishlisted?: boolean;
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
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{productTitle}</h1>
            <WishlistButton
              productId={productId}
              initiallyWishlisted={isWishlisted}
              className="mt-0.5 shrink-0 border border-border"
            />
          </div>
        </div>

        <VariantSelector
          productId={productId}
          basePriceCents={basePriceCents}
          compareAtCents={compareAtCents}
          variants={variants}
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
          cartQuantityByVariant={cartQuantityByVariant}
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
