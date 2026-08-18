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
import { createProduct } from "@/server/actions/admin/products";
import type { ProductStatus } from "@/lib/validators/product";

type Collection = { id: string; title: string };

type VariantRow = {
  key: string;
  sku: string;
  size: string;
  color: string;
  priceOverrideCents: string;
  inventoryQuantity: string;
};

function emptyVariant(): VariantRow {
  return {
    key: crypto.randomUUID(),
    sku: "",
    size: "",
    color: "",
    priceOverrideCents: "",
    inventoryQuantity: "0",
  };
}

export function NewProductForm({ collections }: { collections: Collection[] }) {
  const [status, setStatus] = useState<ProductStatus>("draft");
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [variants, setVariants] = useState<VariantRow[]>([emptyVariant()]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateVariant(key: string, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

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
    const formData = new FormData(event.currentTarget);

    const priceInput = String(formData.get("basePrice") ?? "0");
    const basePriceCents = Math.round(parseFloat(priceInput || "0") * 100);

    const parsedVariants = variants.map((v) => ({
      sku: v.sku.trim(),
      size: v.size.trim(),
      color: v.color.trim(),
      priceOverrideCents: v.priceOverrideCents.trim()
        ? Math.round(parseFloat(v.priceOverrideCents) * 100)
        : undefined,
      inventoryQuantity: parseInt(v.inventoryQuantity || "0", 10),
    }));

    startTransition(async () => {
      const result = await createProduct({
        title: String(formData.get("title") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        description: (formData.get("description") as string) || undefined,
        basePriceCents,
        status,
        collectionIds: [...selectedCollections],
        variants: parsedVariants,
      });
      // On success the action redirects and never resolves here.
      if (!result.success) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" placeholder="classic-crew-tee" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="basePrice">Base price (USD)</Label>
          <Input id="basePrice" name="basePrice" type="number" step="0.01" min="0" required />
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

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Variants</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVariants((rows) => [...rows, emptyVariant()])}
          >
            Add variant
          </Button>
        </div>

        <div className="space-y-3">
          {variants.map((v) => (
            <div
              key={v.key}
              className="border-border grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] items-end gap-2 rounded-md border p-3"
            >
              <div className="space-y-1">
                <Label className="text-xs">SKU</Label>
                <Input
                  value={v.sku}
                  onChange={(e) => updateVariant(v.key, { sku: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Size</Label>
                <Input
                  value={v.size}
                  onChange={(e) => updateVariant(v.key, { size: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Color</Label>
                <Input
                  value={v.color}
                  onChange={(e) => updateVariant(v.key, { color: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Price override</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="—"
                  value={v.priceOverrideCents}
                  onChange={(e) => updateVariant(v.key, { priceOverrideCents: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Initial stock</Label>
                <Input
                  type="number"
                  min="0"
                  value={v.inventoryQuantity}
                  onChange={(e) => updateVariant(v.key, { inventoryQuantity: e.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={variants.length <= 1}
                onClick={() => setVariants((rows) => rows.filter((r) => r.key !== v.key))}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create product"}
      </Button>
    </form>
  );
}
