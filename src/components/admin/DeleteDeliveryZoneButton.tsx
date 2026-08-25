"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteDeliveryZone } from "@/server/actions/admin/deliveryZones";
import { useConfirm } from "@/components/providers/ConfirmDialogProvider";

export function DeleteDeliveryZoneButton({
  deliveryZoneId,
  name,
  orderCount,
}: {
  deliveryZoneId: string;
  name: string;
  orderCount: number;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const description =
      orderCount > 0
        ? `${orderCount} past order${
            orderCount === 1 ? "" : "s"
          } used it — their totals are unaffected, they'll just lose the live link to this area.`
        : "This can't be undone.";
    const confirmed = await confirm({
      title: `Delete "${name}"?`,
      description,
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteDeliveryZone({ id: deliveryZoneId });
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
