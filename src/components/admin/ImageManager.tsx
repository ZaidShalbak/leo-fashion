"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { uploadProductImage, removeProductImage } from "@/server/actions/admin/images";

type ProductImage = { id: string; url: string; altText: string | null };

export function ImageManager({
  productId,
  images,
}: {
  productId: string;
  images: ProductImage[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setError(null);

    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadProductImage(formData);
      if (!result.success) {
        setError(result.error);
      } else if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  }

  function handleRemove(imageId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeProductImage({ imageId });
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {images.map((image) => (
          <div key={image.id} className="group relative size-24 overflow-hidden rounded-md border">
            <Image
              src={image.url}
              alt={image.altText ?? ""}
              fill
              sizes="96px"
              className="object-cover"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleRemove(image.id)}
              className="bg-background/90 text-foreground absolute top-1 right-1 rounded px-1.5 py-0.5 text-xs opacity-0 transition group-hover:opacity-100"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="text-sm"
        />
        <Button type="button" size="sm" disabled={isPending} onClick={handleUpload}>
          {isPending ? "Uploading…" : "Upload image"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
