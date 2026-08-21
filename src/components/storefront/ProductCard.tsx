import Image from "next/image";
import { useTranslations } from "next-intl";

import type { ProductCardData } from "@/types/product";
import { Link } from "@/i18n/navigation";
import { LOW_STOCK_THRESHOLD } from "@/lib/inventory";
import { PriceDisplay } from "./PriceDisplay";

export function ProductCard({ product }: { product: ProductCardData }) {
  const t = useTranslations("ProductCard");
  const primaryImage = [...product.images].sort(
    (a, b) => a.position - b.position
  )[0];
  const colorCount = new Set(product.variants.map((v) => v.color)).size;
  const totalStock = product.variants.reduce(
    (sum, v) => sum + Math.max(v.inventoryQuantity, 0),
    0
  );
  const isOutOfStock = totalStock === 0;
  // Card-level, not a specific size/color — there's no variant picker here
  // (that only exists on the product detail page), so this is "the whole
  // product is running low everywhere," using stock summed across every
  // variant rather than any one combination.
  const isLowStock = !isOutOfStock && totalStock <= LOW_STOCK_THRESHOLD;

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
          <span className="bg-background/90 text-foreground absolute top-2 start-2 rounded-md px-2 py-1 text-xs font-medium">
            {t("outOfStock")}
          </span>
        )}
        {isLowStock && (
          <span className="bg-destructive absolute top-2 start-2 rounded-md px-2 py-1 text-xs font-medium text-white">
            {t("lowStock", { count: totalStock })}
          </span>
        )}
      </div>
      <div className="mt-3 space-y-1">
        {product.brand && (
          <span className="text-muted-foreground text-xs tracking-wide uppercase">
            {product.brand.name}
          </span>
        )}
        <h3 className="text-sm font-medium">{product.title}</h3>
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <PriceDisplay cents={product.basePriceCents} />
          {colorCount > 1 && <span>{t("colorCount", { count: colorCount })}</span>}
        </div>
      </div>
    </Link>
  );
}
