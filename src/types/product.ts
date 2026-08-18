import type { Prisma } from "@prisma/client";

/** Shape used by ProductCard and the collection/homepage grids. */
export type ProductCardData = Prisma.ProductGetPayload<{
  include: { images: true; variants: true };
}>;

/** Shape used by the product detail page. */
export type ProductDetailData = Prisma.ProductGetPayload<{
  include: { images: true; variants: true };
}>;
