"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { logAudit } from "@/server/audit";
import type { ActionResult } from "./products";

const adjustInventorySchema = z.object({
  variantId: z.string().cuid(),
  delta: z.number().int().refine((n) => n !== 0, "Enter a non-zero change."),
  reason: z.string().trim().min(1, "A reason is required").max(200),
});

export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;

/**
 * Manually adjusts a variant's stock by `delta` (positive = restock,
 * negative = write-off/correction), recording `reason` in the audit log.
 * Rejects any adjustment that would take stock negative — inventory should
 * never go below zero, whether it's an order decrementing it or an admin
 * correcting it by hand.
 */
export async function adjustInventory(input: AdjustInventoryInput): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = adjustInventorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }
  const { variantId, delta, reason } = parsed.data;

  try {
    await db.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
      if (!variant) throw new Error("Variant not found.");

      const newQuantity = variant.inventoryQuantity + delta;
      if (newQuantity < 0) {
        throw new Error(
          `That would take stock below zero (currently ${variant.inventoryQuantity}).`
        );
      }

      await tx.productVariant.update({
        where: { id: variantId },
        data: { inventoryQuantity: newQuantity },
      });

      await logAudit(
        {
          actorUserId: admin.id,
          action: "inventory.adjust",
          targetType: "ProductVariant",
          targetId: variantId,
          metadata: { delta, reason, previousQuantity: variant.inventoryQuantity, newQuantity },
        },
        tx
      );
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Adjustment failed." };
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/products");
  return { success: true };
}
