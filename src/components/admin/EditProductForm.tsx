"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProduct } from "@/server/actions/admin/products";
import type { ProductStatus } from "@/lib/validators/product";

type Collection = { id: string; title: string };
type Brand = { id: string; name: string };

export function EditProductForm({
  product,
  collections,
  brands,
}: {
  product: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    titleAr: string | null;
    descriptionAr: string | null;
    basePriceCents: number;
    status: ProductStatus;
    brandId: string | null;
    collectionIds: string[];
  };
  collections: Collection[];
  brands: Brand[];
}) {
  const t = useTranslations("AdminProducts");
  const [status, setStatus] = useState<ProductStatus>(product.status);
  const [brandId, setBrandId] = useState<string>(product.brandId ?? brands[0]?.id ?? "");
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(
    new Set(product.collectionIds)
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggleCollection(id: string) {
    setSelectedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const formData = new FormData(event.currentTarget);
    const priceInput = String(formData.get("basePrice") ?? "0");

    startTransition(async () => {
      const result = await updateProduct({
        id: product.id,
        title: String(formData.get("title") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        description: (formData.get("description") as string) || undefined,
        titleAr: (formData.get("titleAr") as string) || undefined,
        descriptionAr: (formData.get("descriptionAr") as string) || undefined,
        basePriceCents: Math.round(parseFloat(priceInput || "0") * 100),
        status,
        brandId,
        collectionIds: [...selectedCollections],
      });
      if (result.success) setSaved(true);
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="title">{t("titleLabel")}</Label>
        <Input id="title" name="title" defaultValue={product.title} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="slug">{t("slugLabel")}</Label>
        <Input id="slug" name="slug" defaultValue={product.slug} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">{t("descriptionLabel")}</Label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={product.description ?? ""}
          className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
        />
      </div>
      <div className="border-border space-y-4 border-t pt-4">
        <p className="text-muted-foreground text-xs">{t("arabicFieldsNote")}</p>
        <div className="space-y-1.5">
          <Label htmlFor="titleAr">{t("titleArLabel")}</Label>
          <Input id="titleAr" name="titleAr" defaultValue={product.titleAr ?? ""} dir="rtl" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="descriptionAr">{t("descriptionArLabel")}</Label>
          <textarea
            id="descriptionAr"
            name="descriptionAr"
            rows={4}
            dir="rtl"
            defaultValue={product.descriptionAr ?? ""}
            className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="basePrice">{t("basePriceLabel")}</Label>
          <Input
            id="basePrice"
            name="basePrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={(product.basePriceCents / 100).toFixed(2)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("statusLabel")}</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as ProductStatus)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">{t("statusDraft")}</SelectItem>
              <SelectItem value="active">{t("statusActive")}</SelectItem>
              <SelectItem value="archived">{t("statusArchived")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t("brandLabel")}</Label>
        {brands.length > 0 ? (
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("selectBrandPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-muted-foreground text-sm">{t("noBrandsYet")}</p>
        )}
      </div>

      {collections.length > 0 && (
        <div className="space-y-2">
          <Label>{t("collectionsLabel")}</Label>
          <div className="flex flex-wrap gap-3">
            {collections.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedCollections.has(c.id)}
                  onChange={() => toggleCollection(c.id)}
                />
                {c.title}
              </label>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {saved && !error && <p className="text-sm text-green-700">{t("saved")}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? t("saving") : t("saveChanges")}
      </Button>
    </form>
  );
}
