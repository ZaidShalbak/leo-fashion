import "server-only";
import { cache } from "react";

import type { OrderStatus } from "@prisma/client";

import { db } from "@/server/db";

type AnalyticsOrder = {
  id: string;
  status: OrderStatus;
  createdAt: Date;
  subtotalCents: number;
  discountCents: number;
  deliveryZoneNameSnapshot: string | null;
  discountCodeSnapshot: string | null;
  items: {
    titleSnapshot: string;
    priceCents: number;
    quantity: number;
    costCentsSnapshot: number | null;
  }[];
};

/**
 * Every order + item field the functions below need, fetched once —
 * wrapped in React's `cache()` (same pattern as `getCurrentUser` in
 * src/server/auth.ts) so each exported function can be called
 * independently in one `Promise.all` from the analytics page without
 * triggering a separate full-table read per function; within a single
 * request they all share this one query. Deliberately NOT
 * `unstable_cache` (src/server/queries.ts) — that layer is for public
 * storefront data only; this is admin-only and must stay live.
 */
const getOrdersForAnalytics = cache(async (): Promise<AnalyticsOrder[]> => {
  return db.order.findMany({
    select: {
      id: true,
      status: true,
      createdAt: true,
      subtotalCents: true,
      discountCents: true,
      deliveryZoneNameSnapshot: true,
      discountCodeSnapshot: true,
      items: {
        select: {
          titleSnapshot: true,
          priceCents: true,
          quantity: true,
          costCentsSnapshot: true,
        },
      },
    },
  });
});

// A cancelled order was never actually fulfilled — every revenue/profit
// figure on this page excludes it. The order-status breakdown is the one
// exception (see getOrderStatusCounts), since that's operational
// visibility, not a sales figure.
function isRevenueEligible(order: AnalyticsOrder): boolean {
  return order.status !== "cancelled";
}

// Merchandise revenue only — deliberately excludes deliveryFeeCents (a
// pass-through with no cost-of-goods, folding it in would distort margin).
function orderRevenueCents(order: AnalyticsOrder): number {
  return order.subtotalCents - order.discountCents;
}

// Sum of costCentsSnapshot * quantity across an order's items — items
// with no recorded cost contribute 0 here (never treated as "free," just
// as "unknown, so it can't reduce the total"). Callers that need to warn
// about incompleteness track itemsWithCost/itemsTotal separately (see
// getProfitSummary).
function orderKnownCostCents(order: AnalyticsOrder): number {
  let cost = 0;
  for (const item of order.items) {
    if (item.costCentsSnapshot != null) cost += item.costCentsSnapshot * item.quantity;
  }
  return cost;
}

export type DailyRevenue = { date: string; revenue: number; profit: number };

/** Daily `{ date, revenue, profit }` for the last `days` days (today
 * inclusive), zero-filled so a day with no orders still appears —
 * feeds the two-series revenue/profit BarChart. `date` is
 * "YYYY-MM-DD". */
export async function getRevenueByDay(days = 30): Promise<DailyRevenue[]> {
  const orders = await getOrdersForAnalytics();

  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));

  const byDate = new Map<string, DailyRevenue>();
  for (let i = 0; i < days; i++) {
    const d = new Date(cutoff);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDate.set(key, { date: key, revenue: 0, profit: 0 });
  }

  for (const order of orders) {
    if (!isRevenueEligible(order) || order.createdAt < cutoff) continue;
    const key = order.createdAt.toISOString().slice(0, 10);
    const bucket = byDate.get(key);
    if (!bucket) continue;
    const revenue = orderRevenueCents(order);
    bucket.revenue += revenue;
    bucket.profit += revenue - orderKnownCostCents(order);
  }

  return Array.from(byDate.values());
}

export type OrderStatusCount = { status: OrderStatus; count: number };

/** Count of orders per status, all-time, every status included
 * (cancelled too — this is operational visibility, not a revenue
 * figure, see isRevenueEligible). */
export async function getOrderStatusCounts(): Promise<OrderStatusCount[]> {
  const orders = await getOrdersForAnalytics();
  const counts = new Map<OrderStatus, number>();
  for (const order of orders) {
    counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
}

export type TopProduct = { title: string; quantity: number; revenueCents: number };

/** Best-selling products by revenue (all-time, non-cancelled orders),
 * grouped by OrderItem.titleSnapshot rather than a live Product join —
 * survives a since-deleted product the same way every other historical
 * report in this app does. */
export async function getTopProducts(limit = 10): Promise<TopProduct[]> {
  const orders = await getOrdersForAnalytics();
  const byTitle = new Map<string, TopProduct>();

  for (const order of orders) {
    if (!isRevenueEligible(order)) continue;
    for (const item of order.items) {
      const existing = byTitle.get(item.titleSnapshot);
      const revenueCents = item.priceCents * item.quantity;
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenueCents += revenueCents;
      } else {
        byTitle.set(item.titleSnapshot, {
          title: item.titleSnapshot,
          quantity: item.quantity,
          revenueCents,
        });
      }
    }
  }

  return Array.from(byTitle.values())
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, limit);
}

export type DeliveryZoneRevenue = { zoneName: string; revenueCents: number };

/** Revenue by delivery zone (all-time, non-cancelled orders). Orders
 * placed before delivery zones existed have a null snapshot — bucketed
 * under a caller-supplied fallback label rather than silently dropped,
 * so that revenue isn't just missing from the chart. */
export async function getRevenueByDeliveryZone(
  unknownZoneLabel: string
): Promise<DeliveryZoneRevenue[]> {
  const orders = await getOrdersForAnalytics();
  const byZone = new Map<string, number>();

  for (const order of orders) {
    if (!isRevenueEligible(order)) continue;
    const zoneName = order.deliveryZoneNameSnapshot ?? unknownZoneLabel;
    byZone.set(zoneName, (byZone.get(zoneName) ?? 0) + orderRevenueCents(order));
  }

  return Array.from(byZone.entries())
    .map(([zoneName, revenueCents]) => ({ zoneName, revenueCents }))
    .sort((a, b) => b.revenueCents - a.revenueCents);
}

export type DiscountCodeUsage = { code: string; orderCount: number; totalDiscountCents: number };

/** Usage of each discount code across non-cancelled orders — orders
 * with no code applied are excluded entirely (nothing to report). */
export async function getDiscountCodeUsage(): Promise<DiscountCodeUsage[]> {
  const orders = await getOrdersForAnalytics();
  const byCode = new Map<string, DiscountCodeUsage>();

  for (const order of orders) {
    if (!isRevenueEligible(order) || !order.discountCodeSnapshot) continue;
    const existing = byCode.get(order.discountCodeSnapshot);
    if (existing) {
      existing.orderCount += 1;
      existing.totalDiscountCents += order.discountCents;
    } else {
      byCode.set(order.discountCodeSnapshot, {
        code: order.discountCodeSnapshot,
        orderCount: 1,
        totalDiscountCents: order.discountCents,
      });
    }
  }

  return Array.from(byCode.values()).sort((a, b) => b.orderCount - a.orderCount);
}

export type ProfitSummary = {
  revenueCents: number;
  costCents: number;
  profitCents: number;
  marginPercent: number | null;
  orderCount: number;
  itemsWithCost: number;
  itemsTotal: number;
};

/** All-time totals (non-cancelled orders): revenue, known cost, profit,
 * margin, and how many line items actually had a cost recorded — the
 * page shows that last pair as "based on N of M items" so an admin
 * knows when the profit figure is likely understated cost (never
 * silently treated as complete). `marginPercent` is null rather than 0
 * when there's no revenue to divide by. */
export async function getProfitSummary(): Promise<ProfitSummary> {
  const orders = await getOrdersForAnalytics();

  let revenueCents = 0;
  let costCents = 0;
  let orderCount = 0;
  let itemsWithCost = 0;
  let itemsTotal = 0;

  for (const order of orders) {
    if (!isRevenueEligible(order)) continue;
    orderCount += 1;
    revenueCents += orderRevenueCents(order);
    costCents += orderKnownCostCents(order);
    for (const item of order.items) {
      itemsTotal += 1;
      if (item.costCentsSnapshot != null) itemsWithCost += 1;
    }
  }

  const profitCents = revenueCents - costCents;
  return {
    revenueCents,
    costCents,
    profitCents,
    marginPercent: revenueCents > 0 ? (profitCents / revenueCents) * 100 : null,
    orderCount,
    itemsWithCost,
    itemsTotal,
  };
}
