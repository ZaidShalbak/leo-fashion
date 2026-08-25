"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { updateSale } from "@/server/actions/admin/sales";
import { SaleScopePicker, type SaleScopeValue } from "./SaleScopePicker";

type Sale = {
  id: string;
  title: string;
  scope: SaleScopeValue;
  collectionId: string | null;
  brandId: string | null;
  percentOff: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

/** Formats a Date as "YYYY-MM-DD" for a date input's defaultValue, in UTC to match startOfDayUtc/endOfDayUtc. */
function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function EditSaleForm({
  sale,
  collections,
  brands,
}: {
  sale: Sale;
  collections: { id: string; title: string }[];
  brands: { id: string; name: string }[];
}) {
  const t = useTranslations("AdminSales");
  const router = useRouter();
  const [scope, setScope] = useState<SaleScopeValue>(sale.scope);
  const [collectionId, setCollectionId] = useState(
    sale.collectionId ?? collections[0]?.id ?? ""
  );
  const [brandId, setBrandId] = useState(sale.brandId ?? brands[0]?.id ?? "");
  const [isActive, setIsActive] = useState(sale.isActive);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateSale({
        id: sale.id,
        title: String(formData.get("title") ?? ""),
        scope,
        collectionId: scope === "COLLECTION" ? collectionId : undefined,
        brandId: scope === "BRAND" ? brandId : undefined,
        percentOff: parseInt(String(formData.get("percentOff") ?? "0"), 10),
        isActive,
        startsAt: String(formData.get("startsAt") ?? "") || undefined,
        endsAt: String(formData.get("endsAt") ?? "") || undefined,
      });
      if (result.success) {
        router.push("/admin/sales");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">{t("titleLabel")}</Label>
        <Input id="title" name="title" defaultValue={sale.title} required />
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
          defaultValue={sale.percentOff}
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

      <SaleScopePicker
        scope={scope}
        onScopeChange={setScope}
        collectionId={collectionId}
        onCollectionChange={setCollectionId}
        brandId={brandId}
        onBrandChange={setBrandId}
        collections={collections}
        brands={brands}
      />

      <div className="space-y-1.5">
        <Label htmlFor="startsAt">{t("startsOnLabel")}</Label>
        <Input
          id="startsAt"
          name="startsAt"
          type="date"
          defaultValue={sale.startsAt ? toDateInputValue(sale.startsAt) : ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="endsAt">{t("endsOnLabel")}</Label>
        <Input
          id="endsAt"
          name="endsAt"
          type="date"
          defaultValue={sale.endsAt ? toDateInputValue(sale.endsAt) : ""}
        />
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? t("savingButton") : t("saveChangesButton")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/sales")}>
          {t("cancelButton")}
        </Button>
      </div>
    </form>
  );
}
