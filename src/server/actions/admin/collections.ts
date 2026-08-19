"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { logAudit } from "@/server/audit";
import {
  collectionSchema,
  collectionUpdateSchema,
  type CollectionInput,
  type CollectionUpdateInput,
} from "@/lib/validators/product";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createCollection(input: CollectionInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = collectionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid category." };
  }

  let collection: { id: string };
  try {
    collection = await db.collection.create({ data: parsed.data });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "collection.create",
    targetType: "Collection",
    targetId: collection.id,
    metadata: { title: parsed.data.title },
  });

  revalidatePath("/admin/collections");
  return { success: true };
}

export async function updateCollection(input: CollectionUpdateInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = collectionUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid category." };
  }
  const { id, ...fields } = parsed.data;

  try {
    await db.collection.update({ where: { id }, data: fields });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "collection.update",
    targetType: "Collection",
    targetId: id,
    metadata: fields,
  });

  revalidatePath("/admin/collections");
  revalidatePath(`/admin/collections/${id}/edit`);
  return { success: true };
}

/**
 * Collection deletion is safe by design: ProductCollection.collectionId is
 * ON DELETE CASCADE (see prisma/schema.prisma), so this only removes the
 * join-table rows linking products to this category — the products
 * themselves are never touched, they just stop appearing under this
 * category (and lose it from the storefront filter/hero rotation if it
 * was their only one).
 */
export async function deleteCollection(input: { id: string }): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (typeof input.id !== "string" || !input.id) {
    return { success: false, error: "Invalid request." };
  }

  try {
    await db.collection.delete({ where: { id: input.id } });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "collection.delete",
    targetType: "Collection",
    targetId: input.id,
    metadata: {},
  });

  revalidatePath("/admin/collections");
  return { success: true };
}

function friendlyDbError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as Prisma.PrismaClientKnownRequestError).code
  ) {
    const code = (error as Prisma.PrismaClientKnownRequestError).code;
    if (code === "P2002") return "A category with that handle already exists.";
    if (code === "P2025") return "That category no longer exists.";
  }
  throw error;
}
