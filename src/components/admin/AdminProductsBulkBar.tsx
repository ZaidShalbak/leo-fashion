"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { duplicateProduct, deleteProduct } from "@/server/actions/admin/products";
import { useConfirm } from "@/components/providers/ConfirmDialogProvider";

/**
 * Bulk Duplicate/Delete toolbar, shared between AdminProductsTable and
 * AdminProductsGrid — same reasoning as useProductSelection: identical
 * behavior needed in both views, extracted once rather than duplicated.
 * Renders nothing when nothing is selected.
 */
export function AdminProductsBulkBar({
  selectedIds,
  onCleared,
}: {
  selectedIds: Set<string>;
  onCleared: () => void;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (selectedIds.size === 0 && !error) return null;

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
      const results = await Promise.all(ids.map((productId) => duplicateProduct({ productId })));
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        setError(`${failed.length} of ${ids.length} product(s) couldn't be duplicated.`);
      }
      onCleared();
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
      onCleared();
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {selectedIds.size > 0 && (
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
    </div>
  );
}
