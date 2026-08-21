"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCollection } from "@/server/actions/admin/collections";

type Collection = {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  titleAr: string | null;
  descriptionAr: string | null;
};

export function EditCollectionForm({ collection }: { collection: Collection }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateCollection({
        id: collection.id,
        title: String(formData.get("title") ?? ""),
        handle: String(formData.get("handle") ?? ""),
        description: (formData.get("description") as string) || undefined,
        titleAr: (formData.get("titleAr") as string) || undefined,
        descriptionAr: (formData.get("descriptionAr") as string) || undefined,
      });
      if (result.success) {
        router.push("/admin/collections");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Name</Label>
        <Input id="title" name="title" defaultValue={collection.title} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="handle">Handle</Label>
        <Input id="handle" name="handle" defaultValue={collection.handle} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={collection.description ?? ""}
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
          <Input id="titleAr" name="titleAr" defaultValue={collection.titleAr ?? ""} dir="rtl" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="descriptionAr">Description (Arabic)</Label>
          <textarea
            id="descriptionAr"
            name="descriptionAr"
            rows={3}
            dir="rtl"
            defaultValue={collection.descriptionAr ?? ""}
            className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
          />
        </div>
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
        <Button type="button" variant="outline" onClick={() => router.push("/admin/collections")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
