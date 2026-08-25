"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ImageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatPriceCents } from "@/components/storefront/PriceDisplay";
import { ProductStatusToggle } from "@/components/admin/ProductStatusToggle";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";
import { AdminProductsBulkBar } from "@/components/admin/AdminProductsBulkBar";
import { useProductSelection } from "@/hooks/useProductSelection";
import type { ProductRow } from "@/components/admin/AdminProductsTable";

const STATUS_VARIANT = {
  draft: "outline",
  active: "default",
  archived: "secondary",
} as const;

/**
 * Card-grid alternative to AdminProductsTable — same data, same
 * selection/bulk-action behavior (via useProductSelection/
 * AdminProductsBulkBar), just laid out as photo-forward cards instead of
 * table rows. See AdminProductsViewToggle for how a caller switches
 * between the two.
 */
export function AdminProductsGrid({ products }: { products: ProductRow[] }) {
  const { selectedIds, toggleOne, clear } = useProductSelection(products.map((p) => p.id));

  return (
    <div className="space-y-3">
      <AdminProductsBulkBar selectedIds={selectedIds} onCleared={clear} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => {
          const totalStock = product.variants.reduce((sum, v) => sum + v.inventoryQuantity, 0);
          const thumbnail = product.images[0];
          return (
            <div key={product.id} className="border-border rounded-lg border p-3">
              <div className="mb-3 flex items-start justify-between gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(product.id)}
                  onChange={() => toggleOne(product.id)}
                  aria-label={`Select ${product.title}`}
                />
                <Badge variant={STATUS_VARIANT[product.status]}>{product.status}</Badge>
              </div>
              <div className="bg-muted mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-md">
                {thumbnail ? (
                  <Image
                    src={thumbnail.url}
                    alt={thumbnail.altText ?? product.title}
                    width={200}
                    height={200}
                    className="size-full object-cover"
                  />
                ) : (
                  <ImageIcon className="text-muted-foreground size-8" aria-hidden="true" />
                )}
              </div>
              <Link
                href={`/admin/products/${product.id}/edit`}
                className="line-clamp-1 font-medium hover:underline"
              >
                {product.title}
              </Link>
              <div className="text-muted-foreground mt-1 flex items-center justify-between text-sm">
                <span>{formatPriceCents(product.basePriceCents)}</span>
                <span>
                  {product.variants.length} variant{product.variants.length === 1 ? "" : "s"} ·{" "}
                  {totalStock} in stock
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <ProductStatusToggle productId={product.id} status={product.status} />
                <DeleteProductButton productId={product.id} productTitle={product.title} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
