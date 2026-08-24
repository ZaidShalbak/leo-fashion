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

  // The happy-path stages actually reached, in order — everything up to
  // (but not including) a cancellation, since updateOrderStatus already
  // guarantees entries is a valid prefix of HAPPY_PATH or that prefix
  // ending in "cancelled".
  const reachedHappyPath = entries.filter((e) => e.status !== "cancelled");
  const cancelledEntry = entries.find((e) => e.status === "cancelled");

  return (
    <div>
      <p className="mb-4 text-sm font-medium">{t("heading")}</p>
      <ol className="space-y-4">
        {HAPPY_PATH.map((stage) => {
          const reached = reachedHappyPath.find((e) => e.status === stage);
          // Once cancelled, don't render happy-path stages that were never
          // reached at all — only the ones actually hit before cancellation.
          if (!reached && isCancelled) return null;
          const Icon = STATUS_ICON[stage];
          return (
            <li key={stage} className="flex items-start gap-3">
              <Icon
                className={cn(
                  "size-5 shrink-0",
                  reached ? "text-foreground" : "text-muted-foreground opacity-50"
                )}
              />
              <div>
                <p className={cn("text-sm", !reached && "text-muted-foreground")}>
                  {tStatus(stage)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {reached
                    ? reached.at.toLocaleDateString(dateLocale, {
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
        {cancelledEntry && (
          <li className="flex items-start gap-3">
            <XCircleIcon className="text-destructive size-5 shrink-0" />
            <div>
              <p className="text-destructive text-sm">{tStatus("cancelled")}</p>
              <p className="text-muted-foreground text-xs">
                {cancelledEntry.at.toLocaleDateString(dateLocale, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </li>
        )}
      </ol>
    </div>
  );
}
