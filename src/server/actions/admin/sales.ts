"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { logAudit } from "@/server/audit";
import { startOfDayUtc, endOfDayUtc } from "@/lib/heroBanners";
import {
  saleSchema,
  saleUpdateSchema,
  type SaleInput,
  type SaleUpdateInput,
} from "@/lib/validators/sales";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createSale(input: SaleInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid sale." };
  }
  const { startsAt, endsAt, scope, collectionId, brandId, ...fields } = parsed.data;

  let sale: { id: string };
  try {
    sale = await db.sale.create({
      data: {
        ...fields,
        scope,
        // Only the field matching scope is kept — a COLLECTION-scoped
        // sale never carries a stray brandId even if one was somehow
        // submitted, and vice versa.
        collectionId: scope === "COLLECTION" ? (collectionId ?? null) : null,
        brandId: scope === "BRAND" ? (brandId ?? null) : null,
        startsAt: startsAt ? startOfDayUtc(startsAt) : null,
        endsAt: endsAt ? endOfDayUtc(endsAt) : null,
      },
    });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "sale.create",
    targetType: "Sale",
    targetId: sale.id,
    metadata: { title: fields.title, scope, percentOff: fields.percentOff },
  });

  revalidatePath("/admin/sales");
  revalidatePath("/");
  return { success: true };
}

/**
 * Full-resend update, same model as EditDiscountCodeForm — the edit form
 * always resubmits every field, so a blank startsAt/endsAt means "clear
 * it," not "leave unchanged."
 */
export async function updateSale(input: SaleUpdateInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = saleUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid sale." };
  }
  const { id, startsAt, endsAt, scope, collectionId, brandId, ...fields } = parsed.data;

  try {
    await db.sale.update({
      where: { id },
      data: {
        ...fields,
        scope,
        collectionId: scope === "COLLECTION" ? (collectionId ?? null) : null,
        brandId: scope === "BRAND" ? (brandId ?? null) : null,
        startsAt: startsAt ? startOfDayUtc(startsAt) : null,
        endsAt: endsAt ? endOfDayUtc(endsAt) : null,
      },
    });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "sale.update",
    targetType: "Sale",
    targetId: id,
    metadata: { title: fields.title, scope, percentOff: fields.percentOff, isActive: fields.isActive },
  });

  revalidatePath("/admin/sales");
  revalidatePath(`/admin/sales/${id}/edit`);
  revalidatePath("/");
  return { success: true };
}

/**
 * Deleting a sale is unconditionally safe — collectionId/brandId are
 * ON DELETE CASCADE from the Collection/Brand side (see prisma/
 * schema.prisma), but deleting the Sale itself just removes a live
 * targeting rule; no OrderItem/Order ever references a Sale directly
 * (compareAtPriceCentsSnapshot is a plain frozen number, not an FK), so
 * every past order's struck-through price is completely unaffected.
 */
export async function deleteSale(input: { id: string }): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (typeof input.id !== "string" || !input.id) {
    return { success: false, error: "Invalid request." };
  }

  try {
    await db.sale.delete({ where: { id: input.id } });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "sale.delete",
    targetType: "Sale",
    targetId: input.id,
    metadata: {},
  });

  revalidatePath("/admin/sales");
  revalidatePath("/");
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
    if (code === "P2025") return "That sale no longer exists.";
  }
  throw error;
}
