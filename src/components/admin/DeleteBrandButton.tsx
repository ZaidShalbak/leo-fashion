"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { deleteBrand } from "@/server/actions/admin/brands";
import { useConfirm } from "@/components/providers/ConfirmDialogProvider";

export function DeleteBrandButton({
  brandId,
  brandName,
  productCount,
}: {
  brandId: string;
  brandName: string;
  productCount: number;
}) {
  const t = useTranslations("AdminBrands");
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const description =
      productCount > 0
        ? t("deleteWarningWithProducts", { count: productCount })
        : t("deleteWarningNoProducts");
    const confirmed = await confirm({
      title: t("deleteConfirmTitle", { brandName }),
      description,
      confirmLabel: t("delete"),
      cancelLabel: t("cancel"),
      variant: "destructive",
    });
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteBrand({ id: brandId });
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
        {isPending ? t("deleting") : t("delete")}
      </Button>
    </div>
  );
}
