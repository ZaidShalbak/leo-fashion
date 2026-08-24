"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth";
import { logAudit } from "@/server/audit";
import { sendCustomerOrderStatusEmail } from "@/server/email";
import {
  updateOrderStatusSchema,
  ORDER_STATUS_TRANSITIONS,
  type UpdateOrderStatusInput,
} from "@/lib/validators/order";
import type { AppLocale } from "@/i18n/routing";
import type { ActionResult } from "./products";

const NOTIFIABLE_STATUSES = ["shipped", "delivered", "cancelled"] as const;

/**
 * Moves an order to a new status, enforcing ORDER_STATUS_TRANSITIONS
 * server-side — the UI only offers valid next statuses, but this is the
 * actual security boundary (see CLAUDE.md: never trust the UI alone for a
 * transition rule). Setting the same status again is always allowed, so a
 * tracking number can be attached/updated without forcing a status change.
 */
export async function updateOrderStatus(
  input: UpdateOrderStatusInput
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = updateOrderStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }
  const { orderId, status, trackingNumber } = parsed.data;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { user: { select: { email: true, name: true } }, items: true },
  });
  if (!order) return { success: false, error: "Order not found." };

  const isSameStatus = order.status === status;
  const isValidTransition = ORDER_STATUS_TRANSITIONS[order.status].includes(status);
  if (!isSameStatus && !isValidTransition) {
    return {
      success: false,
      error: `Can't move an order from "${order.status}" to "${status}".`,
    };
  }

  const updated = await db.order.update({
    where: { id: orderId },
    data: {
      status,
      ...(trackingNumber !== undefined ? { trackingNumber } : {}),
    },
  });

  // Only fires on a real status change landing on one of the "customer
  // cares about this" statuses — not pending/processing, and not a
  // same-status resubmission (e.g. attaching a tracking number after the
  // fact doesn't re-send "your order shipped!"). sendEmailSafely
  // (src/server/email.ts) already never throws, but this is wrapped in its
  // own try/catch too, as defense in depth, same as placeOrder's admin-
  // email send (src/server/actions/order.ts) — a failed send must never
  // block this status update from completing.
  if (
    !isSameStatus &&
    (NOTIFIABLE_STATUSES as readonly string[]).includes(status)
  ) {
    try {
      await sendCustomerOrderStatusEmail({
        order: { ...updated, items: order.items },
        customerEmail: order.user.email,
        customerName: order.user.name ?? order.user.email,
        locale: (order.localeSnapshot as AppLocale | null) ?? "en",
      });
    } catch (error) {
      console.error("[order] Failed to send customer order-status email:", error);
    }
  }

  await logAudit({
    actorUserId: admin.id,
    action: "order.status_update",
    targetType: "Order",
    targetId: orderId,
    metadata: { from: order.status, to: status, trackingNumber },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderId}`);
  return { success: true };
}
