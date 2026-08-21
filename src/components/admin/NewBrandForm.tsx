"use client";

import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrand } from "@/server/actions/admin/brands";

export function NewBrandForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createBrand({
        name: String(formData.get("name") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        logoUrl: (formData.get("logoUrl") as string) || "",
        description: (formData.get("description") as string) || undefined,
        nameAr: (formData.get("nameAr") as string) || undefined,
        descriptionAr: (formData.get("descriptionAr") as string) || undefined,
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
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" placeholder="northline-apparel" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="logoUrl">Logo URL</Label>
        <Input id="logoUrl" name="logoUrl" placeholder="https://…" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
        />
      </div>
      <div className="border-border space-y-4 border-t pt-4">
        <p className="text-muted-foreground text-xs">
          Optional — shown on the storefront when a shopper is browsing in
          Arabic. Leave blank to keep showing the name/description above.
          The brand&apos;s wordmark/logo is unaffected either way.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="nameAr">Name (Arabic)</Label>
          <Input id="nameAr" name="nameAr" dir="rtl" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="descriptionAr">Description (Arabic)</Label>
          <textarea
            id="descriptionAr"
            name="descriptionAr"
            rows={3}
            dir="rtl"
            className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Adding…" : "Add brand"}
      </Button>
    </form>
  );
}
