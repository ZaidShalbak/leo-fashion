"use client";

import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCollection } from "@/server/actions/admin/collections";

export function NewCollectionForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createCollection({
        title: String(formData.get("title") ?? ""),
        handle: String(formData.get("handle") ?? ""),
        description: (formData.get("description") as string) || undefined,
        titleAr: (formData.get("titleAr") as string) || undefined,
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
        <Label htmlFor="title">Name</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="handle">Handle</Label>
        <Input id="handle" name="handle" placeholder="denim" required />
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
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="titleAr">Name (Arabic)</Label>
          <Input id="titleAr" name="titleAr" dir="rtl" />
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
        {isPending ? "Adding…" : "Add category"}
      </Button>
    </form>
  );
}
