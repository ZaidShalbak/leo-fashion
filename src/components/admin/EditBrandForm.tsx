"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBrand } from "@/server/actions/admin/brands";

type Brand = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
};

export function EditBrandForm({ brand }: { brand: Brand }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateBrand({
        id: brand.id,
        name: String(formData.get("name") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        logoUrl: (formData.get("logoUrl") as string) || "",
        description: (formData.get("description") as string) || undefined,
      });
      if (result.success) {
        router.push("/admin/brands");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={brand.name} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={brand.slug} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="logoUrl">Logo URL</Label>
        <Input id="logoUrl" name="logoUrl" defaultValue={brand.logoUrl ?? ""} placeholder="https://…" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={brand.description ?? ""}
          className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
        />
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/brands")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
