"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";

import {
  uploadProductImage,
  removeProductImage,
  updateProductImageColor,
} from "@/server/actions/admin/images";
import { ProductImageDropzone } from "./ProductImageDropzone";

type ProductImage = { id: string; url: string; altText: string | null; color: string | null };

const GENERAL_VALUE = "";
const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/gif";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

type QueueItem = {
  key: string;
  name: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

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
  const t = useTranslations("AdminProducts");
  const router = useRouter();
  const [uploadColor, setUploadColor] = useState(GENERAL_VALUE);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isPending, startTransition] = useTransition();

  const isUploading = queue.some((item) => item.status === "pending" || item.status === "uploading");

  function handleFilesSelected(files: File[]) {
    const items: QueueItem[] = files.map((file, index) => ({
      key: `${Date.now()}-${index}-${file.name}`,
      name: file.name,
      status: "pending",
    }));
    setQueue(items);

    // Sequential, not Promise.all — uploadProductImage computes each new
    // image's `position` from the product's current image count read
    // fresh inside the action, so concurrent calls would race and could
    // hand out the same position to more than one photo. One at a time
    // keeps that count accurate for every file in the batch.
    startTransition(async () => {
      let anyError = false;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const key = items[i].key;
        setQueue((prev) => prev.map((q) => (q.key === key ? { ...q, status: "uploading" } : q)));

        const formData = new FormData();
        formData.set("productId", productId);
        formData.set("file", file);
        formData.set("color", uploadColor);
        const result = await uploadProductImage(formData);

        if (result.success) {
          setQueue((prev) => prev.map((q) => (q.key === key ? { ...q, status: "done" } : q)));
        } else {
          anyError = true;
          setQueue((prev) =>
            prev.map((q) => (q.key === key ? { ...q, status: "error", error: result.error } : q))
          );
        }
      }

      router.refresh();

      if (!anyError) {
        // Brief pause so the admin actually sees the final checkmarks
        // before the queue clears back to the dropzone — errors stay
        // visible until the next batch replaces them.
        setTimeout(() => setQueue([]), 1200);
      }
    });
  }

  function handleFilesRejected(rejections: { file: File; reason: string }[]) {
    const items: QueueItem[] = rejections.map((r, index) => ({
      key: `rejected-${Date.now()}-${index}-${r.file.name}`,
      name: r.file.name,
      status: "error",
      error: r.reason === "size" ? t("imageTooLarge") : t("imageWrongType"),
    }));
    setQueue((prev) => [...prev, ...items]);
  }

  function handleRemove(imageId: string) {
    startTransition(async () => {
      const result = await removeProductImage({ imageId });
      if (result.success) router.refresh();
    });
  }

  function handleRecolor(imageId: string, color: string) {
    startTransition(async () => {
      const result = await updateProductImageColor({ imageId, color });
      if (result.success) router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {colors.length > 0 && (
        <p className="text-muted-foreground text-xs">{t("colorTaggingNote")}</p>
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
                className="bg-background/90 text-foreground absolute top-1 end-1 rounded px-1.5 py-0.5 text-xs opacity-0 transition group-hover:opacity-100"
              >
                {t("remove")}
              </button>
            </div>
            {colors.length > 0 && (
              <select
                value={image.color ?? GENERAL_VALUE}
                disabled={isPending}
                onChange={(e) => handleRecolor(image.id, e.target.value)}
                className="border-input w-24 rounded-md border bg-transparent px-1 py-0.5 text-xs"
                aria-label={t("colorForPhotoOf", { name: image.altText ?? t("productFallback") })}
              >
                <option value={GENERAL_VALUE}>{t("generalColor")}</option>
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

      {colors.length > 0 && (
        <div>
          <label className="text-muted-foreground mb-1 block text-xs" htmlFor="upload-color">
            {t("newPhotoColorLabel")}
          </label>
          <select
            id="upload-color"
            value={uploadColor}
            onChange={(e) => setUploadColor(e.target.value)}
            className="border-input rounded-md border bg-transparent px-2 py-1 text-sm"
          >
            <option value={GENERAL_VALUE}>{t("generalAllColors")}</option>
            {colors.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </div>
      )}

      {queue.length > 0 ? (
        <div className="border-input space-y-2 rounded-lg border p-3">
          <AnimatePresence initial={false}>
            {queue.map((item) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-sm"
              >
                {item.status === "uploading" || item.status === "pending" ? (
                  <Loader2Icon className="text-muted-foreground size-4 shrink-0 animate-spin" />
                ) : item.status === "done" ? (
                  <CheckIcon className="size-4 shrink-0 text-green-600" />
                ) : (
                  <XIcon className="text-destructive size-4 shrink-0" />
                )}
                <span className="truncate">{item.name}</span>
                {item.error && <span className="text-destructive text-xs">— {item.error}</span>}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <ProductImageDropzone
          accept={ACCEPTED_TYPES}
          maxFileSizeBytes={MAX_FILE_SIZE_BYTES}
          disabled={isUploading}
          onFilesSelected={handleFilesSelected}
          onFilesRejected={handleFilesRejected}
          label={t("dropzoneLabel")}
          hint={t("dropzoneHint")}
          browseLabel={t("dropzoneBrowse")}
          dragActiveLabel={t("dropzoneDragActive")}
        />
      )}
    </div>
  );
}
