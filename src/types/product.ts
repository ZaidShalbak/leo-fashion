import type { Prisma } from "@prisma/client";

/** Shape used by ProductCard and the collection/homepage grids.
 * `compareAtCents` is optional/nullable — set only when a Sale
 * (src/lib/sales.ts) applies; `basePriceCents` already reflects the
 * sale-adjusted price when it's set (see applySaleToProduct). */
export type ProductCardData = Prisma.ProductGetPayload<{
  include: { images: true; variants: true; brand: true };
}> & { compareAtCents?: number | null };

/** Shape used by the product detail page. */
export type ProductDetailData = Prisma.ProductGetPayload<{
  include: { images: true; variants: true; brand: true };
}>;
