"use client";

import { useTranslations } from "next-intl";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SaleScopeValue = "SITE_WIDE" | "COLLECTION" | "BRAND";

/**
 * The 3-way scope choice shared by New/EditSaleForm — a <Select> for
 * scope itself, mirroring NewProductForm's brand-picker <Select> pattern,
 * conditionally revealing a second <Select> (Collection or Brand, same
 * pattern again) only when the scope isn't site-wide. A dedicated
 * component since both forms need identical behavior here.
 */
export function SaleScopePicker({
  scope,
  onScopeChange,
  collectionId,
  onCollectionChange,
  brandId,
  onBrandChange,
  collections,
  brands,
}: {
  scope: SaleScopeValue;
  onScopeChange: (scope: SaleScopeValue) => void;
  collectionId: string;
  onCollectionChange: (id: string) => void;
  brandId: string;
  onBrandChange: (id: string) => void;
  collections: { id: string; title: string }[];
  brands: { id: string; name: string }[];
}) {
  const t = useTranslations("AdminSales");
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>{t("appliesToLabel")}</Label>
        <Select value={scope} onValueChange={(v) => onScopeChange(v as SaleScopeValue)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SITE_WIDE">{t("scopeSiteWide")}</SelectItem>
            <SelectItem value="COLLECTION">{t("scopeCategoryOption")}</SelectItem>
            <SelectItem value="BRAND">{t("scopeBrandOption")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {scope === "COLLECTION" && (
        <div className="space-y-1.5">
          <Label>{t("scopeCategory")}</Label>
          <Select value={collectionId} onValueChange={onCollectionChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("selectCategoryPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {collections.map((collection) => (
                <SelectItem key={collection.id} value={collection.id}>
                  {collection.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {scope === "BRAND" && (
        <div className="space-y-1.5">
          <Label>{t("scopeBrand")}</Label>
          <Select value={brandId} onValueChange={onBrandChange}>
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
        </div>
      )}
    </div>
  );
}
