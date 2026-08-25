"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adjustInventory } from "@/server/actions/admin/inventory";

export function InventoryAdjustControl({ variantId }: { variantId: string }) {
  const t = useTranslations("AdminInventory");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsedDelta = parseInt(delta, 10);
    if (!delta || Number.isNaN(parsedDelta) || parsedDelta === 0) {
      setError(t("errorNonZero"));
      return;
    }
    if (!reason.trim()) {
      setError(t("errorReasonRequired"));
      return;
    }

    startTransition(async () => {
      const result = await adjustInventory({ variantId, delta: parsedDelta, reason });
      if (result.success) {
        setDelta("");
        setReason("");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
      <Input
        type="number"
        placeholder={t("deltaPlaceholder")}
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
        className="h-8 w-20"
      />
      <Input
        type="text"
        placeholder={t("reasonPlaceholder")}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="h-8 w-36"
      />
      <Button type="submit" size="sm" disabled={isPending}>
        {t("apply")}
      </Button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </form>
  );
}
