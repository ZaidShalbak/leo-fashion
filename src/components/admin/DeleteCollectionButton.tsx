"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteCollection } from "@/server/actions/admin/collections";

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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    const warning =
      productCount > 0
        ? `Delete "${collectionTitle}"? ${productCount} product${
            productCount === 1 ? "" : "s"
          } will lose this category (they won't be deleted).`
        : `Delete "${collectionTitle}"? This can't be undone.`;
    if (!window.confirm(warning)) return;

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
