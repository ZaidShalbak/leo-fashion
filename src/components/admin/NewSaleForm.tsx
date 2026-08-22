"use client";

import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSale } from "@/server/actions/admin/sales";
import { SaleScopePicker, type SaleScopeValue } from "./SaleScopePicker";

export function NewSaleForm({
  collections,
  brands,
}: {
  collections: { id: string; title: string }[];
  brands: { id: string; name: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [scope, setScope] = useState<SaleScopeValue>("SITE_WIDE");
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? "");
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createSale({
        title: String(formData.get("title") ?? ""),
        scope,
        collectionId: scope === "COLLECTION" ? collectionId : undefined,
        brandId: scope === "BRAND" ? brandId : undefined,
        percentOff: parseInt(String(formData.get("percentOff") ?? "0"), 10),
        isActive: true,
        startsAt: String(formData.get("startsAt") ?? "") || undefined,
        endsAt: String(formData.get("endsAt") ?? "") || undefined,
      });
      if (result.success) {
        formRef.current?.reset();
        setScope("SITE_WIDE");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="Winter denim sale" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="percentOff">Percent off</Label>
        <Input
          id="percentOff"
          name="percentOff"
          type="number"
          min={1}
          max={100}
          step={1}
          required
        />
      </div>

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
        <Label htmlFor="startsAt">Starts on (optional)</Label>
        <Input id="startsAt" name="startsAt" type="date" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="endsAt">Ends on (optional)</Label>
        <Input id="endsAt" name="endsAt" type="date" />
      </div>
      <p className="text-muted-foreground text-xs">
        No start/end date means the sale runs as soon as it&apos;s active, with no end.
      </p>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Adding…" : "Add sale"}
      </Button>
    </form>
  );
}
