"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { logAudit } from "@/server/audit";
import {
  deliveryZoneSchema,
  deliveryZoneUpdateSchema,
  type DeliveryZoneInput,
  type DeliveryZoneUpdateInput,
} from "@/lib/validators/deliveryZone";

export type ActionResult = { success: true } | { success: false; error: string };

export async function createDeliveryZone(input: DeliveryZoneInput): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = deliveryZoneSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid delivery area." };
  }

  let deliveryZone: { id: string };
  try {
    deliveryZone = await db.deliveryZone.create({ data: parsed.data });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "delivery_zone.create",
    targetType: "DeliveryZone",
    targetId: deliveryZone.id,
    metadata: { name: parsed.data.name, feeCents: parsed.data.feeCents },
  });

  revalidatePath("/admin/delivery-zones");
  return { success: true };
}

/**
 * Full-resend update, same model as EditCollectionForm/EditBrandForm —
 * the edit form is always pre-filled with the current row and resubmits
 * every field.
 */
export async function updateDeliveryZone(
  input: DeliveryZoneUpdateInput
): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = deliveryZoneUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid delivery area." };
  }
  const { id, ...fields } = parsed.data;

  try {
    await db.deliveryZone.update({ where: { id }, data: fields });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "delivery_zone.update",
    targetType: "DeliveryZone",
    targetId: id,
    metadata: fields,
  });

  revalidatePath("/admin/delivery-zones");
  revalidatePath(`/admin/delivery-zones/${id}/edit`);
  revalidatePath("/checkout");
  return { success: true };
}

/**
 * Deletion is safe by the same reasoning as brand/category/discount-code
 * deletion: Order.deliveryZoneId is ON DELETE SET NULL, and every order
 * that ever used this zone already has its own deliveryZoneNameSnapshot/
 * deliveryFeeCents, so its history and total stay exactly as charged —
 * only the live FK link goes away.
 */
export async function deleteDeliveryZone(input: { id: string }): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (typeof input.id !== "string" || !input.id) {
    return { success: false, error: "Invalid request." };
  }

  try {
    await db.deliveryZone.delete({ where: { id: input.id } });
  } catch (error) {
    return { success: false, error: friendlyDbError(error) };
  }

  await logAudit({
    actorUserId: admin.id,
    action: "delivery_zone.delete",
    targetType: "DeliveryZone",
    targetId: input.id,
    metadata: {},
  });

  revalidatePath("/admin/delivery-zones");
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
    if (code === "P2025") return "That delivery area no longer exists.";
  }
  throw error;
}
