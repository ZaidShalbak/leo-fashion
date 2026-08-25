"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { setProductStatus } from "@/server/actions/admin/products";
import type { ProductStatus } from "@/lib/validators/product";

export function ProductStatusToggle({
  productId,
  status,
}: {
  productId: string;
  status: ProductStatus;
}) {
  const t = useTranslations("AdminProducts");
  const [isPending, startTransition] = useTransition();

  function setStatus(next: ProductStatus) {
    startTransition(async () => {
      await setProductStatus({ productId, status: next });
    });
  }

  if (status === "archived") {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => setStatus("draft")}
      >
        {t("restoreToDraft")}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={isPending}
      onClick={() => setStatus("archived")}
    >
      {t("archive")}
    </Button>
  );
}
