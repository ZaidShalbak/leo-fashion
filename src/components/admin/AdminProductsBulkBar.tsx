"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("AdminProducts");
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (selectedIds.size === 0 && !error) return null;

  async function handleBulkDuplicate() {
    const ids = [...selectedIds];
    const confirmed = await confirm({
      title: t("duplicateConfirmTitle", { count: ids.length }),
      description: t("duplicateConfirmDescription"),
      confirmLabel: t("duplicate"),
      cancelLabel: t("cancel"),
    });
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const results = await Promise.all(ids.map((productId) => duplicateProduct({ productId })));
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        setError(t("duplicateFailedError", { failed: failed.length, total: ids.length }));
      }
      onCleared();
      router.refresh();
    });
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    const confirmed = await confirm({
      title: t("deleteConfirmTitle", { count: ids.length }),
      description: t("cannotBeUndone"),
      confirmLabel: t("delete"),
      cancelLabel: t("cancel"),
      variant: "destructive",
    });
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const results = await Promise.all(ids.map((productId) => deleteProduct({ productId })));
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        setError(t("deleteFailedError", { failed: failed.length, total: ids.length }));
      }
      onCleared();
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {selectedIds.size > 0 && (
        <div className="bg-muted flex items-center justify-between rounded-md px-3 py-2">
          <span className="text-sm">{t("selectedCount", { count: selectedIds.size })}</span>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={handleBulkDuplicate}>
              {isPending ? t("working") : t("duplicateSelected")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={handleBulkDelete}
              className="text-destructive hover:text-destructive"
            >
              {isPending ? t("working") : t("deleteSelected")}
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
