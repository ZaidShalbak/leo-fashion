"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { clearCart } from "@/server/actions/cart";
import { useConfirm } from "@/components/providers/ConfirmDialogProvider";

export function ClearCartButton() {
  const t = useTranslations("Cart");
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleClear() {
    const confirmed = await confirm({
      title: t("clearCartConfirm"),
      confirmLabel: t("clearCart"),
      cancelLabel: t("cancel"),
      variant: "destructive",
    });
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await clearCart();
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={handleClear}
        className="text-muted-foreground"
      >
        {isPending ? t("clearingCart") : t("clearCart")}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
