"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Product, ProductVariant } from "@prisma/client";

import { Button } from "@/components/ui/button";
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
import { duplicateProduct, deleteProduct } from "@/server/actions/admin/products";
import { useConfirm } from "@/components/providers/ConfirmDialogProvider";

const STATUS_VARIANT = {
  draft: "outline",
  active: "default",
  archived: "secondary",
} as const;

type ProductRow = Product & { variants: ProductVariant[] };

/**
 * Client component so it can own checkbox-selection state and a bulk
 * action toolbar (Duplicate / Delete selected) on top of the existing
 * per-row actions — moved out of the Server Component page for that
 * reason, but the actual product data is still fetched server-side there.
 */
export function AdminProductsTable({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allSelected = products.length > 0 && selectedIds.size === products.length;
  const someSelected = selectedIds.size > 0;

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkDuplicate() {
    const ids = [...selectedIds];
    const confirmed = await confirm({
      title: `Duplicate ${ids.length} product${ids.length === 1 ? "" : "s"}?`,
      description: "Each copy starts as a draft with 0 stock — restock and publish them once ready.",
      confirmLabel: "Duplicate",
    });
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const results = await Promise.all(
        ids.map((productId) => duplicateProduct({ productId }))
      );
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        setError(`${failed.length} of ${ids.length} product(s) couldn't be duplicated.`);
      }
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    const confirmed = await confirm({
      title: `Delete ${ids.length} product${ids.length === 1 ? "" : "s"}?`,
      description: "This can't be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const results = await Promise.all(ids.map((productId) => deleteProduct({ productId })));
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        setError(`${failed.length} of ${ids.length} product(s) couldn't be deleted — likely still in a cart.`);
      }
      setSelectedIds(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {someSelected && (
        <div className="bg-muted flex items-center justify-between rounded-md px-3 py-2">
          <span className="text-sm">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={handleBulkDuplicate}>
              {isPending ? "Working…" : "Duplicate selected"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={handleBulkDelete}
              className="text-destructive hover:text-destructive"
            >
              {isPending ? "Working…" : "Delete selected"}
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                aria-label="Select all products"
              />
            </TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Variants</TableHead>
            <TableHead>Total stock</TableHead>
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
            return (
              <TableRow key={product.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={() => toggleOne(product.id)}
                    aria-label={`Select ${product.title}`}
                  />
                </TableCell>
                <TableCell>
                  <Link href={`/admin/products/${product.id}/edit`} className="hover:underline">
                    {product.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[product.status]}>{product.status}</Badge>
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
