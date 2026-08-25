"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDiscountCode } from "@/server/actions/admin/discountCodes";

type DiscountCode = {
  id: string;
  code: string;
  percentOff: number;
  isActive: boolean;
  expiresAt: Date | null;
  minSubtotalCents: number | null;
  maxRedemptions: number | null;
  redemptionCount: number;
};

/** Formats a Date as "YYYY-MM-DD" for a date input's defaultValue, in UTC to match endOfDayUtc. */
function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function EditDiscountCodeForm({ discountCode }: { discountCode: DiscountCode }) {
  const t = useTranslations("AdminDiscountCodes");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isActive, setIsActive] = useState(discountCode.isActive);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    const minOrderInput = String(formData.get("minOrderAmount") ?? "").trim();
    const minSubtotalCents = minOrderInput
      ? Math.round(parseFloat(minOrderInput) * 100)
      : undefined;
    const maxRedemptionsInput = String(formData.get("maxRedemptions") ?? "").trim();
    const maxRedemptions = maxRedemptionsInput
      ? parseInt(maxRedemptionsInput, 10)
      : undefined;

    startTransition(async () => {
      const result = await updateDiscountCode({
        id: discountCode.id,
        code: String(formData.get("code") ?? ""),
        percentOff: parseInt(String(formData.get("percentOff") ?? "0"), 10),
        isActive,
        expiresAt: String(formData.get("expiresAt") ?? "") || undefined,
        minSubtotalCents,
        maxRedemptions,
      });
      if (result.success) {
        router.push("/admin/discount-codes");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="code">{t("codeLabel")}</Label>
        <Input id="code" name="code" defaultValue={discountCode.code} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="percentOff">{t("percentOffLabel")}</Label>
        <Input
          id="percentOff"
          name="percentOff"
          type="number"
          min={1}
          max={100}
          step={1}
          defaultValue={discountCode.percentOff}
          required
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        {t("activeLabel")}
      </label>
      <div className="space-y-1.5">
        <Label htmlFor="expiresAt">{t("expiresAtLabel")}</Label>
        <Input
          id="expiresAt"
          name="expiresAt"
          type="date"
          defaultValue={discountCode.expiresAt ? toDateInputValue(discountCode.expiresAt) : ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="minOrderAmount">{t("minOrderAmountLabel")}</Label>
        <Input
          id="minOrderAmount"
          name="minOrderAmount"
          type="number"
          min={0}
          step="0.01"
          placeholder="0.00"
          defaultValue={
            discountCode.minSubtotalCents != null
              ? (discountCode.minSubtotalCents / 100).toFixed(2)
              : ""
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="maxRedemptions">{t("maxRedemptionsLabel")}</Label>
        <Input
          id="maxRedemptions"
          name="maxRedemptions"
          type="number"
          min={1}
          step={1}
          defaultValue={discountCode.maxRedemptions ?? ""}
        />
        <p className="text-muted-foreground text-xs">
          {t("redeemedCount", { count: discountCode.redemptionCount })}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? t("saving") : t("saveChanges")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/discount-codes")}
        >
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
