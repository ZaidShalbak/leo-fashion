"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { logAudit } from "@/server/audit";
import {
  productSchema,
  productUpdateSchema,
  productVariantSchema,
  type ProductInput,
  type ProductUpdateInput,
} from "@/lib/validators/product";

export type ActionResult = { success: true } | { success: false; error: string };

/**
 * Creates a product with its initial variants and collection memberships,
 * then redirects to its edit page (where images get added — see
 * src/server/actions/admin/images.ts). Variant *changes* after this point
 * go through addProductVariant/updateProductVariant/removeProductVariant
 * below, not through updateProduct, so there's exactly one code path that
 * decides how to reconcile a variant list.
 */
export async function createProduct(input: ProductInput) {
  const admin = await requireAdmin();

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid product." } as const;
  }
  const { collectionIds, variants, ...productFields } = parsed.data;

  let product: { id: string };
  try {
    product = await db.product.create({
      data: {
        ...productFields,
        collections: { create: collectionIds.map((collectionId) => ({ collectionId })) },
        variants: { create: variants },
      },
    });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) } as const;
  }

  await logAudit({
    actorUserId: admin.id,
    action: "product.create",
    targetType: "Product",
    targetId: product.id,
    metadata: { title: productFields.title },
  });

  revalidatePath("/admin/products");
  redirect(`/admin/products/${product.id}/edit`);
}

/** Updates a product's own fields and collection memberships — not its variants. */
export async function updateProduct(input: ProductUpdateInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = productUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid product." };
  }
  const { id, collectionIds, variants: _variants, ...fields } = parsed.data;
  void _variants; // intentionally ignored — see createProduct's comment

  try {
    await db.product.update({
      where: { id },
      data: {
        ...fields,
        ...(collectionIds !== undefined
          ? {
              collections: {
                deleteMany: {},
                create: collectionIds.map((collectionId) => ({ collectionId })),
              },
            }
          : {}),
      },
    });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "product.update",
    targetType: "Product",
    targetId: id,
    metadata: fields,
  });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}/edit`);
  return { success: true };
}

const setProductStatusSchema = z.object({
  productId: z.string().cuid(),
  status: z.enum(["draft", "active", "archived"]),
});

export async function setProductStatus(
  input: z.infer<typeof setProductStatusSchema>
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = setProductStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };

  await db.product.update({
    where: { id: parsed.data.productId },
    data: { status: parsed.data.status },
  });

  await logAudit({
    actorUserId: admin.id,
    action: "product.status_update",
    targetType: "Product",
    targetId: parsed.data.productId,
    metadata: { status: parsed.data.status },
  });

  revalidatePath("/admin/products");
  return { success: true };
}

/**
 * Hard-deletes a product. Variants, images, and collection memberships
 * cascade automatically (ON DELETE CASCADE — see schema). OrderItem keeps
 * its historical snapshot via ON DELETE SET NULL, so past orders are
 * unaffected. CartItem has no cascade/set-null (ON DELETE RESTRICT — a
 * deliberate "don't silently vanish something someone has in their cart"
 * guard), so deleting a product that's currently in any cart fails with a
 * friendly error instead of the delete just going through; that's the
 * expected outcome, not a bug — ask the admin to wait for the cart to
 * clear (or archive the product instead) rather than deleting under it.
 */
const deleteProductSchema = z.object({ productId: z.string().cuid() });

export async function deleteProduct(
  input: z.infer<typeof deleteProductSchema>
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = deleteProductSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };

  let title: string;
  try {
    const deleted = await db.product.delete({ where: { id: parsed.data.productId } });
    title = deleted.title;
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "product.delete",
    targetType: "Product",
    targetId: parsed.data.productId,
    metadata: { title },
  });

  revalidatePath("/admin/products");
  return { success: true };
}

const duplicateProductSchema = z.object({ productId: z.string().cuid() });

/**
 * Clones a product as a starting point for a new listing — variants,
 * collection memberships, and image references all copy over, but the
 * result always lands as `draft` (never accidentally goes live as a
 * second copy of something already selling) with fresh stock at 0 (a
 * duplicate isn't the same physical inventory as the original — an admin
 * restocks it deliberately via Inventory once it's ready, same as any new
 * product). Slug and every variant SKU get a timestamp suffix to satisfy
 * their unique constraints without a collision-detection loop.
 */
export async function duplicateProduct(
  input: z.infer<typeof duplicateProductSchema>
): Promise<ActionResult & { newProductId?: string }> {
  const admin = await requireAdmin();
  const parsed = duplicateProductSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };

  const original = await db.product.findUnique({
    where: { id: parsed.data.productId },
    include: { variants: true, images: true, collections: true },
  });
  if (!original) return { success: false, error: "Product not found." };

  const suffix = Date.now();
  let newProduct: { id: string; title: string };
  try {
    newProduct = await db.product.create({
      data: {
        title: `${original.title} (Copy)`,
        titleAr: original.titleAr ? `${original.titleAr} (نسخة)` : null,
        slug: `${original.slug}-copy-${suffix}`,
        description: original.description,
        descriptionAr: original.descriptionAr,
        basePriceCents: original.basePriceCents,
        status: "draft",
        brandId: original.brandId,
        collections: {
          create: original.collections.map((c) => ({ collectionId: c.collectionId })),
        },
        variants: {
          create: original.variants.map((v) => ({
            sku: `${v.sku}-COPY-${suffix}`,
            size: v.size,
            color: v.color,
            priceOverrideCents: v.priceOverrideCents,
            costCents: v.costCents,
            inventoryQuantity: 0,
          })),
        },
        images: {
          create: original.images.map((img) => ({
            url: img.url,
            altText: img.altText,
            position: img.position,
            color: img.color,
          })),
        },
      },
    });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "product.duplicate",
    targetType: "Product",
    targetId: newProduct.id,
    metadata: { sourceProductId: original.id, title: newProduct.title },
  });

  revalidatePath("/admin/products");
  return { success: true, newProductId: newProduct.id };
}

const addVariantSchema = productVariantSchema.extend({ productId: z.string().cuid() });

export async function addProductVariant(
  input: z.infer<typeof addVariantSchema>
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = addVariantSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid variant." };
  }
  const { productId, ...variantFields } = parsed.data;

  let variant: { id: string };
  try {
    variant = await db.productVariant.create({ data: { productId, ...variantFields } });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "variant.create",
    targetType: "ProductVariant",
    targetId: variant.id,
    metadata: { productId, sku: variantFields.sku },
  });

  revalidatePath(`/admin/products/${productId}/edit`);
  return { success: true };
}

const updateVariantSchema = productVariantSchema
  .omit({ inventoryQuantity: true })
  .extend({ variantId: z.string().cuid() });

export async function updateProductVariant(
  input: z.infer<typeof updateVariantSchema>
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = updateVariantSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid variant." };
  }
  const { variantId, ...fields } = parsed.data;

  let productId: string;
  try {
    const updated = await db.productVariant.update({
      where: { id: variantId },
      data: fields,
    });
    productId = updated.productId;
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "variant.update",
    targetType: "ProductVariant",
    targetId: variantId,
    metadata: fields,
  });

  revalidatePath(`/admin/products/${productId}/edit`);
  return { success: true };
}

const removeVariantSchema = z.object({ variantId: z.string().cuid() });

export async function removeProductVariant(
  input: z.infer<typeof removeVariantSchema>
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = removeVariantSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };

  let productId: string;
  try {
    const deleted = await db.productVariant.delete({ where: { id: parsed.data.variantId } });
    productId = deleted.productId;
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "variant.delete",
    targetType: "ProductVariant",
    targetId: parsed.data.variantId,
    metadata: {},
  });

  revalidatePath(`/admin/products/${productId}/edit`);
  return { success: true };
}

/** Maps common Prisma errors to messages an admin can act on. */
function friendlyDbError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as Prisma.PrismaClientKnownRequestError).code
  ) {
    const code = (error as Prisma.PrismaClientKnownRequestError).code;
    if (code === "P2002") return "That value is already in use (e.g. a duplicate SKU or slug).";
    if (code === "P2003" || code === "P2014") {
      return "Can't remove this — it's still referenced by an existing cart or order.";
    }
  }
  throw error;
}
