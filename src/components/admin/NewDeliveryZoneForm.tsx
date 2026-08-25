"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDeliveryZone } from "@/server/actions/admin/deliveryZones";

export function NewDeliveryZoneForm() {
  const t = useTranslations("AdminDeliveryZones");
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    const feeInput = String(formData.get("fee") ?? "0").trim();
    const feeCents = Math.round(parseFloat(feeInput || "0") * 100);
    const positionInput = String(formData.get("position") ?? "").trim();

    startTransition(async () => {
      const result = await createDeliveryZone({
        name: String(formData.get("name") ?? ""),
        feeCents,
        isActive: true,
        position: positionInput ? parseInt(positionInput, 10) : 0,
      });
      if (result.success) {
        formRef.current?.reset();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input id="name" name="name" dir="rtl" placeholder={t("namePlaceholder")} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fee">{t("feeLabel")}</Label>
        <Input
          id="fee"
          name="fee"
          type="number"
          min={0}
          step="0.01"
          placeholder={t("feePlaceholder")}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="position">{t("positionLabel")}</Label>
        <Input id="position" name="position" type="number" step={1} placeholder={t("positionPlaceholder")} />
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? t("addButtonPending") : t("addButton")}
      </Button>
    </form>
  );
}
