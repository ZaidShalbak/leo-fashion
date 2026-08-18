import Image from "next/image";
import Link from "next/link";

import type { ProductCardData } from "@/types/product";
import { PriceDisplay } from "./PriceDisplay";

export function ProductCard({ product }: { product: ProductCardData }) {
  const primaryImage = [...product.images].sort(
    (a, b) => a.position - b.position
  )[0];
  const colorCount = new Set(product.variants.map((v) => v.color)).size;
  const isOutOfStock = product.variants.every(
    (v) => v.inventoryQuantity <= 0
  );

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block"
      data-slot="product-card"
    >
      <div className="bg-muted relative aspect-[4/5] overflow-hidden rounded-lg">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.altText ?? product.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
        {isOutOfStock && (
          <span className="bg-background/90 text-foreground absolute top-2 left-2 rounded-md px-2 py-1 text-xs font-medium">
            Out of stock
          </span>
        )}
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="text-sm font-medium">{product.title}</h3>
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <PriceDisplay cents={product.basePriceCents} />
          {colorCount > 1 && <span>{colorCount} colors</span>}
        </div>
      </div>
    </Link>
  );
}
