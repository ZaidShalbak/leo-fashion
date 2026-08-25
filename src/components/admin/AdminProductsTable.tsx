"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ImageIcon } from "lucide-react";
import type { Product, ProductImage, ProductVariant } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPriceCents } from "@/components/storefront/PriceDisplay";
import { ProductStatusToggle } from "@/components/admin/ProductStatusToggle";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";
import { AdminProductsBulkBar } from "@/components/admin/AdminProductsBulkBar";
import { useProductSelection } from "@/hooks/useProductSelection";

const STATUS_VARIANT = {
  draft: "outline",
  active: "default",
  archived: "secondary",
} as const;

export type ProductRow = Product & { variants: ProductVariant[]; images: ProductImage[] };

/**
 * Client component so it can own checkbox-selection state on top of the
 * existing per-row actions — moved out of the Server Component page for
 * that reason, but the actual product data is still fetched server-side
 * there. Selection state and the bulk-action toolbar are shared with
 * AdminProductsGrid via useProductSelection/AdminProductsBulkBar so the
 * two views behave identically.
 */
export function AdminProductsTable({ products }: { products: ProductRow[] }) {
  const t = useTranslations("AdminProducts");
  const { selectedIds, allSelected, toggleAll, toggleOne, clear } = useProductSelection(
    products.map((p) => p.id)
  );
  const statusLabel: Record<Product["status"], string> = {
    draft: t("statusDraft"),
    active: t("statusActive"),
    archived: t("statusArchived"),
  };

  return (
    <div className="space-y-3">
      <AdminProductsBulkBar selectedIds={selectedIds} onCleared={clear} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label={t("selectAllProducts")}
              />
            </TableHead>
            <TableHead className="w-14" />
            <TableHead>{t("titleColumn")}</TableHead>
            <TableHead>{t("statusColumn")}</TableHead>
            <TableHead>{t("priceColumn")}</TableHead>
            <TableHead>{t("variantsColumn")}</TableHead>
            <TableHead>{t("totalStockColumn")}</TableHead>
            <TableHead />
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const totalStock = product.variants.reduce(
              (sum, v) => sum + v.inventoryQuantity,
              0
            );
            const thumbnail = product.images[0];
            return (
              <TableRow key={product.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={() => toggleOne(product.id)}
                    aria-label={t("selectProduct", { title: product.title })}
                  />
                </TableCell>
                <TableCell>
                  <div className="bg-muted flex size-10 items-center justify-center overflow-hidden rounded-md">
                    {thumbnail ? (
                      <Image
                        src={thumbnail.url}
                        alt={thumbnail.altText ?? product.title}
                        width={40}
                        height={40}
                        className="size-10 object-cover"
                      />
                    ) : (
                      <ImageIcon className="text-muted-foreground size-4" aria-hidden="true" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Link href={`/admin/products/${product.id}/edit`} className="hover:underline">
                    {product.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[product.status]}>{statusLabel[product.status]}</Badge>
                </TableCell>
                <TableCell>{formatPriceCents(product.basePriceCents)}</TableCell>
                <TableCell>{product.variants.length}</TableCell>
                <TableCell>{totalStock}</TableCell>
                <TableCell>
                  <ProductStatusToggle productId={product.id} status={product.status} />
                </TableCell>
                <TableCell>
                  <DeleteProductButton productId={product.id} productTitle={product.title} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
