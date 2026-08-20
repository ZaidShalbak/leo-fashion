"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { logAudit } from "@/server/audit";
import { endOfDayUtc } from "@/lib/discount";
import {
  discountCodeSchema,
  discountCodeUpdateSchema,
  type DiscountCodeInput,
  type DiscountCodeUpdateInput,
} from "@/lib/validators/discount";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createDiscountCode(input: DiscountCodeInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = discountCodeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid discount code." };
  }
  const { expiresAt, ...fields } = parsed.data;

  let discountCode: { id: string };
  try {
    discountCode = await db.discountCode.create({
      data: { ...fields, expiresAt: expiresAt ? endOfDayUtc(expiresAt) : null },
    });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "discount_code.create",
    targetType: "DiscountCode",
    targetId: discountCode.id,
    metadata: { code: fields.code, percentOff: fields.percentOff },
  });

  revalidatePath("/admin/discount-codes");
  return { success: true };
}

/**
 * Full-resend update, same model as EditBrandForm/EditCollectionForm — the
 * edit form is always pre-filled with the current row and resubmits every
 * field, so a blank expiresAt/minSubtotalCents/maxRedemptions input here
 * means "clear it," not "leave unchanged." redemptionCount is
 * deliberately not editable through this action at all — it only ever
 * advances inside placeOrder's transaction (see order.ts).
 */
export async function updateDiscountCode(
  input: DiscountCodeUpdateInput
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = discountCodeUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid discount code." };
  }
  const { id, expiresAt, code, percentOff, isActive, minSubtotalCents, maxRedemptions } =
    parsed.data;

  try {
    await db.discountCode.update({
      where: { id },
      data: {
        ...(code !== undefined ? { code } : {}),
        ...(percentOff !== undefined ? { percentOff } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        expiresAt: expiresAt ? endOfDayUtc(expiresAt) : null,
        minSubtotalCents: minSubtotalCents ?? null,
        maxRedemptions: maxRedemptions ?? null,
      },
    });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "discount_code.update",
    targetType: "DiscountCode",
    targetId: id,
    metadata: { code, percentOff, isActive },
  });

  revalidatePath("/admin/discount-codes");
  revalidatePath(`/admin/discount-codes/${id}/edit`);
  return { success: true };
}

/**
 * Deleting a code is safe by the same reasoning as brand/category
 * deletion: Order.discountCodeId is ON DELETE SET NULL, and every order
 * that ever used this code already has its own discountCodeSnapshot/
 * discountPercentSnapshot/discountCents, so its history and total stay
 * exactly as charged — only the live FK link goes away.
 */
export async function deleteDiscountCode(input: { id: string }): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (typeof input.id !== "string" || !input.id) {
    return { success: false, error: "Invalid request." };
  }

  try {
    await db.discountCode.delete({ where: { id: input.id } });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "discount_code.delete",
    targetType: "DiscountCode",
    targetId: input.id,
    metadata: {},
  });

  revalidatePath("/admin/discount-codes");
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
    if (code === "P2002") return "A discount code with that code already exists.";
    if (code === "P2025") return "That discount code no longer exists.";
  }
  throw error;
}
