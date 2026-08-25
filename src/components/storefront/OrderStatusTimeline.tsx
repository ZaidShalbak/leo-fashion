import type { Order, OrderStatus } from "@prisma/client";
import {
  CheckCircle2Icon,
  ClipboardCheckIcon,
  PackageIcon,
  TruckIcon,
  XCircleIcon,
} from "lucide-react";

import { db } from "@/server/db";
import { buildOrderStatusTimeline } from "@/lib/orderTimeline";
import { getTranslator } from "@/i18n/getTranslator";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const HAPPY_PATH: OrderStatus[] = ["pending", "processing", "shipped", "delivered"];

const STATUS_ICON: Record<OrderStatus, typeof ClipboardCheckIcon> = {
  pending: ClipboardCheckIcon,
  processing: PackageIcon,
  shipped: TruckIcon,
  delivered: CheckCircle2Icon,
  cancelled: XCircleIcon,
};

// A distinct color per status, not just "reached vs. not" — makes the
// stage itself recognizable at a glance (e.g. amber = processing, blue =
// shipped) rather than only communicating progress.
const STATUS_DOT_COLOR: Record<OrderStatus, string> = {
  pending: "bg-slate-400",
  processing: "bg-amber-500",
  shipped: "bg-blue-500",
  delivered: "bg-emerald-500",
  cancelled: "bg-red-500",
};

type TimelineNode = { status: OrderStatus; reached: boolean; at: Date | null };

/**
 * A visual milestone timeline of an order's status history — shared
 * between the admin order detail page (English default) and the
 * storefront's order-confirmation/account-order-detail pages (bilingual),
 * following the same context-free-translator pattern OrderDetail already
 * established (src/i18n/getTranslator.ts). Does its own AuditLog read
 * internally so none of its 3 callers need to change their own queries.
 */
export async function OrderStatusTimeline({
  order,
  locale = "en",
}: {
  order: Pick<Order, "id" | "status" | "createdAt">;
  locale?: AppLocale;
}) {
  const auditRows = await db.auditLog.findMany({
    where: { targetType: "Order", targetId: order.id, action: "order.status_update" },
    orderBy: { createdAt: "asc" },
  });
  const entries = buildOrderStatusTimeline(order, auditRows);
  const t = getTranslator(locale, "OrderStatusTimeline");
  const tStatus = getTranslator(locale, "OrderStatus");
  const dateLocale = locale === "ar" ? "ar" : "en-US";
  const isCancelled = order.status === "cancelled";

  const reachedHappyPath = entries.filter((e) => e.status !== "cancelled");
  const cancelledEntry = entries.find((e) => e.status === "cancelled");

  // One flat list of nodes to render, so the "line between this node and
  // the next" and "which single node is current" logic each only need to
  // run once, over one array, instead of being duplicated across two
  // separate render blocks (happy path vs. the cancelled branch).
  const nodes: TimelineNode[] = [];
  for (const stage of HAPPY_PATH) {
    const reachedEntry = reachedHappyPath.find((e) => e.status === stage);
    // Once cancelled, only render stages actually reached before the
    // cancellation — entries is guaranteed a valid prefix of HAPPY_PATH
    // (or that prefix ending in cancelled), so "not reached" here always
    // means "after the cancellation point," never a gap.
    if (!reachedEntry && isCancelled) continue;
    nodes.push({ status: stage, reached: !!reachedEntry, at: reachedEntry?.at ?? null });
  }
  if (cancelledEntry) {
    nodes.push({ status: "cancelled", reached: true, at: cancelledEntry.at });
  }
  const currentIndex = nodes.reduce(
    (last, node, i) => (node.reached ? i : last),
    -1
  );

  return (
    <div>
      <p className="mb-4 text-sm font-medium">{t("heading")}</p>
      <ol>
        {nodes.map((node, i) => {
          const Icon = STATUS_ICON[node.status];
          const isCurrent = i === currentIndex;
          const isLast = i === nodes.length - 1;
          return (
            <li key={node.status} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="relative flex size-8 shrink-0 items-center justify-center">
                  {isCurrent && (
                    <span
                      className={cn(
                        "absolute inline-flex size-8 animate-ping rounded-full opacity-60",
                        STATUS_DOT_COLOR[node.status]
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "relative flex size-8 items-center justify-center rounded-full",
                      node.reached
                        ? [STATUS_DOT_COLOR[node.status], "text-white"]
                        : "bg-muted border-border text-muted-foreground border"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                </span>
                {/* Connecting line to the next node — omitted after the
                    last one. A plain neutral color regardless of status,
                    since the dots themselves already carry the per-status
                    color; a colored line risked looking like a gradient
                    error between two different hues. */}
                {!isLast && <span className="bg-border mt-1 w-px flex-1" />}
              </div>
              <div className={cn("pb-6", isLast && "pb-0")}>
                <p className={cn("text-sm", !node.reached && "text-muted-foreground")}>
                  {tStatus(node.status)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {node.at
                    ? node.at.toLocaleDateString(dateLocale, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : t("upcoming")}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
