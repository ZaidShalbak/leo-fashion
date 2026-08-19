"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/server/actions/admin/products";

export function DeleteProductButton({
  productId,
  productTitle,
}: {
  productId: string;
  productTitle: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!window.confirm(`Delete "${productTitle}"? This can't be undone.`)) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteProduct({ productId });
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
