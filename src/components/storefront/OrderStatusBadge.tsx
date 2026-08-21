import type { OrderStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const DEFAULT_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_VARIANT: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "outline",
  processing: "secondary",
  shipped: "secondary",
  delivered: "default",
  cancelled: "destructive",
};

/**
 * Shared between the storefront (account order history, order detail —
 * locale-aware) and the admin orders list/detail (always English, and
 * rendered outside the [locale] tree with no NextIntlClientProvider
 * ancestor — see src/app/admin/layout.tsx). Same reasoning as
 * SignOutButton: this can't call useTranslations itself without crashing
 * when rendered from admin, so it takes an optional translated label map
 * instead, defaulting to English for admin's plain, prop-less usage.
 */
export function OrderStatusBadge({
  status,
  labels = DEFAULT_STATUS_LABEL,
}: {
  status: OrderStatus;
  labels?: Record<OrderStatus, string>;
}) {
  return <Badge variant={STATUS_VARIANT[status]}>{labels[status]}</Badge>;
}
