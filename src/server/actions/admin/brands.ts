"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { logAudit } from "@/server/audit";
import {
  brandSchema,
  brandUpdateSchema,
  type BrandInput,
  type BrandUpdateInput,
} from "@/lib/validators/brand";

export type ActionResult = { success: true } | { success: false; error: string };

/** Minimal brand management — list lives on the page itself; this only creates. */
export async function createBrand(input: BrandInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid brand." };
  }
  const { logoUrl, ...fields } = parsed.data;

  let brand: { id: string };
  try {
    brand = await db.brand.create({
      data: { ...fields, logoUrl: logoUrl || undefined },
    });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "brand.create",
    targetType: "Brand",
    targetId: brand.id,
    metadata: { name: fields.name },
  });

  revalidatePath("/admin/brands");
  return { success: true };
}

export async function updateBrand(input: BrandUpdateInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = brandUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid brand." };
  }
  const { id, logoUrl, ...fields } = parsed.data;

  try {
    await db.brand.update({
      where: { id },
      data: { ...fields, ...(logoUrl !== undefined ? { logoUrl: logoUrl || null } : {}) },
    });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "brand.update",
    targetType: "Brand",
    targetId: id,
    metadata: fields,
  });

  revalidatePath("/admin/brands");
  revalidatePath(`/admin/brands/${id}/edit`);
  return { success: true };
}

/**
 * Brand deletion is safe by design: Product.brandId is ON DELETE SET NULL
 * (see prisma/schema.prisma), so any products carrying this brand simply
 * become brand-less rather than being blocked or cascaded away. That's the
 * right behavior for cleaning up a mistakenly-created or dummy brand
 * without taking its products down too.
 */
export async function deleteBrand(input: { id: string }): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (typeof input.id !== "string" || !input.id) {
    return { success: false, error: "Invalid request." };
  }

  try {
    await db.brand.delete({ where: { id: input.id } });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "brand.delete",
    targetType: "Brand",
    targetId: input.id,
    metadata: {},
  });

  revalidatePath("/admin/brands");
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
    if (code === "P2002") return "A brand with that slug already exists.";
    if (code === "P2025") return "That brand no longer exists.";
  }
  throw error;
}
