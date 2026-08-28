"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Switch } from "@/components/ui/switch";
import { updateStoreSettings } from "@/server/actions/admin/settings";

export function SalesPageVisibilityToggle({ initialVisible }: { initialVisible: boolean }) {
  const t = useTranslations("AdminSales");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [visible, setVisible] = useState(initialVisible);
  const [error, setError] = useState<string | null>(null);

  function handleChange(next: boolean) {
    setVisible(next);
    setError(null);
    startTransition(async () => {
      const result = await updateStoreSettings({ salesPageVisible: next });
      if (result.success) {
        router.refresh();
      } else {
        // Revert the optimistic flip — the switch shouldn't silently
        // disagree with what's actually saved.
        setVisible(!next);
        setError(result.error);
      }
    });
  }

  return (
    <div className="border-border bg-muted/30 flex items-center justify-between gap-4 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">{t("visibilityToggleLabel")}</p>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {visible ? t("visibilityToggleOnHint") : t("visibilityToggleOffHint")}
        </p>
        {error && (
          <p role="alert" className="text-destructive mt-1 text-xs">
            {error}
          </p>
        )}
      </div>
      <Switch
        checked={visible}
        disabled={isPending}
        onCheckedChange={handleChange}
        aria-label={t("visibilityToggleLabel")}
      />
    </div>
  );
}
