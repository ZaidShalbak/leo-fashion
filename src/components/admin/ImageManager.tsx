"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  uploadProductImage,
  removeProductImage,
  updateProductImageColor,
} from "@/server/actions/admin/images";

type ProductImage = { id: string; url: string; altText: string | null; color: string | null };

const GENERAL_VALUE = "";

export function ImageManager({
  productId,
  images,
  colors,
}: {
  productId: string;
  images: ProductImage[];
  /** The product's actual variant colors — the only values a photo can be tagged with. */
  colors: string[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadColor, setUploadColor] = useState(GENERAL_VALUE);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setError(null);

    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("file", file);
    formData.set("color", uploadColor);

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

  function handleRecolor(imageId: string, color: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateProductImageColor({ imageId, color });
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      {colors.length > 0 && (
        <p className="text-muted-foreground text-xs">
          Tag each photo with a color so shoppers see the right picture when they pick a color
          on the product page. Untagged photos show for every color.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {images.map((image) => (
          <div key={image.id} className="space-y-1">
            <div className="group relative size-24 overflow-hidden rounded-md border">
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
            {colors.length > 0 && (
              <select
                value={image.color ?? GENERAL_VALUE}
                disabled={isPending}
                onChange={(e) => handleRecolor(image.id, e.target.value)}
                className="border-input w-24 rounded-md border bg-transparent px-1 py-0.5 text-xs"
                aria-label={`Color for this photo of ${image.altText ?? "product"}`}
              >
                <option value={GENERAL_VALUE}>General</option>
                {colors.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="text-sm"
        />
        {colors.length > 0 && (
          <select
            value={uploadColor}
            onChange={(e) => setUploadColor(e.target.value)}
            className="border-input rounded-md border bg-transparent px-2 py-1 text-sm"
            aria-label="Color this new photo shows"
          >
            <option value={GENERAL_VALUE}>General (all colors)</option>
            {colors.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        )}
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
