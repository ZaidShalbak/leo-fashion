"use client";

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
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Applies to</Label>
        <Select value={scope} onValueChange={(v) => onScopeChange(v as SaleScopeValue)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SITE_WIDE">Entire site</SelectItem>
            <SelectItem value="COLLECTION">A category</SelectItem>
            <SelectItem value="BRAND">A brand</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {scope === "COLLECTION" && (
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={collectionId} onValueChange={onCollectionChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a category" />
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
          <Label>Brand</Label>
          <Select value={brandId} onValueChange={onBrandChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a brand" />
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
