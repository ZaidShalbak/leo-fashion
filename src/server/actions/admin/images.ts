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
 *
 * The optional "color" field tags this photo as showing one specific
 * variant color (e.g. "Black") — see ProductImage.color's comment in
 * schema.prisma. It's validated against the product's *actual* variant
 * colors rather than accepted as free text, so a typo can't create a color
 * tag that silently never matches anything in the storefront gallery
 * (src/components/storefront/ProductDetail.tsx). An empty/omitted color
 * means a general image, shown for every color as a fallback.
 */
export async function uploadProductImage(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();

  const productId = String(formData.get("productId") ?? "");
  const file = formData.get("file");
  const colorInput = String(formData.get("color") ?? "").trim();

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
    include: { images: true, variants: true },
  });
  if (!product) return { success: false, error: "Product not found." };

  let color: string | null = null;
  if (colorInput) {
    const validColors = new Set(product.variants.map((v) => v.color));
    if (!validColors.has(colorInput)) {
      return { success: false, error: "That color doesn't match any variant on this product." };
    }
    color = colorInput;
  }

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
    data: {
      productId,
      url,
      color,
      altText: color ? `${product.title} — ${color}` : product.title,
      position: product.images.length,
    },
  });

  await logAudit({
    actorUserId: admin.id,
    action: "product.image_add",
    targetType: "Product",
    targetId: productId,
    metadata: { url, color },
  });

  revalidatePath(`/admin/products/${productId}/edit`);
  return { success: true };
}

const updateImageColorSchema = z.object({
  imageId: z.string().cuid(),
  color: z.string().trim().max(60).optional(),
});

/**
 * Retags an existing image's color without re-uploading — mainly for
 * photos that existed before this feature (all color: null) or a
 * mis-tagged upload. Same validation as uploadProductImage: an empty
 * color clears it back to "general," anything else must match one of the
 * product's actual variant colors.
 */
export async function updateProductImageColor(
  input: z.infer<typeof updateImageColorSchema>
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = updateImageColorSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };

  const image = await db.productImage.findUnique({ where: { id: parsed.data.imageId } });
  if (!image) return { success: false, error: "Image not found." };

  let color: string | null = null;
  const colorInput = parsed.data.color?.trim();
  if (colorInput) {
    const variants = await db.productVariant.findMany({
      where: { productId: image.productId },
      select: { color: true },
    });
    const validColors = new Set(variants.map((v) => v.color));
    if (!validColors.has(colorInput)) {
      return { success: false, error: "That color doesn't match any variant on this product." };
    }
    color = colorInput;
  }

  await db.productImage.update({ where: { id: image.id }, data: { color } });

  await logAudit({
    actorUserId: admin.id,
    action: "product.image_recolor",
    targetType: "Product",
    targetId: image.productId,
    metadata: { imageId: image.id, color },
  });

  revalidatePath(`/admin/products/${image.productId}/edit`);
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
