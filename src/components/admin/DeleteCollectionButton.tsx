"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteCollection } from "@/server/actions/admin/collections";
import { useConfirm } from "@/components/providers/ConfirmDialogProvider";

export function DeleteCollectionButton({
  collectionId,
  collectionTitle,
  productCount,
}: {
  collectionId: string;
  collectionTitle: string;
  productCount: number;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const description =
      productCount > 0
        ? `${productCount} product${
            productCount === 1 ? "" : "s"
          } will lose this category (they won't be deleted).`
        : "This can't be undone.";
    const confirmed = await confirm({
      title: `Delete "${collectionTitle}"?`,
      description,
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteCollection({ id: collectionId });
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {error && (
        <span role="alert" className="text-destructive text-xs">
          {error}
        </span>
      )}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={isPending}
        onClick={handleDelete}
        className="text-destructive hover:text-destructive"
      >
        {isPending ? "Deleting…" : "Delete"}
      </Button>
    </div>
  );
}
