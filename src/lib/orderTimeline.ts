import type { AuditLog, Order } from "@prisma/client";
import { z } from "zod";

import { orderStatusSchema, type OrderStatus } from "./validators/order";

const auditMetadataSchema = z.object({
  from: orderStatusSchema,
  to: orderStatusSchema,
  trackingNumber: z.string().nullish(),
});

export type OrderTimelineEntry = { status: OrderStatus; at: Date };

/**
 * Reconstructs an order's status-change history from AuditLog rows —
 * there's no dedicated history table. Order.status is only ever set in two
 * places: "pending" at creation inside placeOrder (no AuditLog row), and
 * inside updateOrderStatus (which always logs { from, to, trackingNumber },
 * including same-status resubmissions used just to attach a tracking
 * number). So order.createdAt plus every real (from !== to) AuditLog row,
 * in order, is a complete and accurate timeline.
 *
 * Because updateOrderStatus already enforces ORDER_STATUS_TRANSITIONS
 * server-side, the result is always a valid prefix of
 * pending -> processing -> shipped -> delivered, or that same prefix
 * ending in cancelled — callers don't need to defend against out-of-order
 * or skipped-stage entries.
 */
export function buildOrderStatusTimeline(
  order: Pick<Order, "createdAt">,
  auditRows: Pick<AuditLog, "metadata" | "createdAt">[]
): OrderTimelineEntry[] {
  const entries: OrderTimelineEntry[] = [{ status: "pending", at: order.createdAt }];

  for (const row of auditRows) {
    const parsed = auditMetadataSchema.safeParse(row.metadata);
    if (!parsed.success) continue; // defensively skip malformed/legacy rows
    if (parsed.data.from === parsed.data.to) continue; // tracking-number-only resubmission
    entries.push({ status: parsed.data.to, at: row.createdAt });
  }

  return entries;
}
