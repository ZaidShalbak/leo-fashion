"use client";

import { useState, useTransition } from "react";

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
    basePriceCents: number;
    status: ProductStatus;
    brandId: string | null;
    collectionIds: string[];
  };
  collections: Collection[];
  brands: Brand[];
}) {
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
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={product.title} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={product.slug} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={product.description ?? ""}
          className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="basePrice">Base price (USD)</Label>
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
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as ProductStatus)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Brand</Label>
        {brands.length > 0 ? (
          <Select value={brandId} onValueChange={setBrandId}>
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
        ) : (
          <p className="text-muted-foreground text-sm">
            No brands yet — add one on the Brands page first.
          </p>
        )}
      </div>

      {collections.length > 0 && (
        <div className="space-y-2">
          <Label>Collections</Label>
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
      {saved && !error && <p className="text-sm text-green-700">Saved.</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
