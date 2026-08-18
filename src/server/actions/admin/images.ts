"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { logAudit } from "@/server/audit";
import { uploadProductImageFile, deleteProductImageFile } from "@/server/storage";
import type { ActionResult } from "./products";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * Takes raw FormData (not a Zod-parsed object) because it carries a File —
 * the rest of this codebase's server actions take typed JSON-ish input,
 * but there's no clean way to run a File through a Zod schema, so this one
 * validates by hand instead.
 */
export async function uploadProductImage(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();

  const productId = String(formData.get("productId") ?? "");
  const file = formData.get("file");

  if (!productId || !(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose an image file." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { success: false, error: "Only JPEG, PNG, WebP, or GIF images are supported." };
  }
  if (file.size > MAX_BYTES) {
    return { success: false, error: "Image must be under 5MB." };
  }

  const product = await db.product.findUnique({
    where: { id: productId },
    include: { images: true },
  });
  if (!product) return { success: false, error: "Product not found." };

  let url: string;
  try {
    url = await uploadProductImageFile(productId, file);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed.",
    };
  }

  await db.productImage.create({
    data: { productId, url, altText: product.title, position: product.images.length },
  });

  await logAudit({
    actorUserId: admin.id,
    action: "product.image_add",
    targetType: "Product",
    targetId: productId,
    metadata: { url },
  });

  revalidatePath(`/admin/products/${productId}/edit`);
  return { success: true };
}

const removeImageSchema = z.object({ imageId: z.string().cuid() });

export async function removeProductImage(
  input: z.infer<typeof removeImageSchema>
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = removeImageSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };

  const image = await db.productImage.findUnique({ where: { id: parsed.data.imageId } });
  if (!image) return { success: false, error: "Image not found." };

  await db.productImage.delete({ where: { id: image.id } });
  await deleteProductImageFile(image.url).catch(() => {});

  await logAudit({
    actorUserId: admin.id,
    action: "product.image_remove",
    targetType: "Product",
    targetId: image.productId,
    metadata: { url: image.url },
  });

  revalidatePath(`/admin/products/${image.productId}/edit`);
  return { success: true };
}
