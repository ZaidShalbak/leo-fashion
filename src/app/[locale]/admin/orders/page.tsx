import type { Metadata } from "next";
import type { OrderStatus } from "@prisma/client";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { Link } from "@/i18n/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/components/storefront/OrderStatusBadge";
import { formatPriceCents } from "@/components/storefront/PriceDisplay";
import { OrderStatusFilter } from "@/components/admin/OrderStatusFilter";
import { calculateTotalCents } from "@/lib/cart-totals";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/orders">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminOrders" });
  return { title: t("metaTitle") };
}

const VALID_STATUSES = new Set(["pending", "processing", "shipped", "delivered", "cancelled"]);

export default async function AdminOrdersPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/orders">) {
  const { locale } = await params;
  const t = await getTranslations("AdminOrders");
  const tStatus = await getTranslations("OrderStatus");
  const statusLabels = {
    pending: tStatus("pending"),
    processing: tStatus("processing"),
    shipped: tStatus("shipped"),
    delivered: tStatus("delivered"),
    cancelled: tStatus("cancelled"),
  };
  const { status: statusParam } = await searchParams;
  const status = Array.isArray(statusParam) ? statusParam[0] : statusParam;
  const statusFilter = status && VALID_STATUSES.has(status) ? (status as OrderStatus) : undefined;

  const orders = await db.order.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true, name: true } }, items: true },
  });
  // shippingPhone (not the user account's own phone — there isn't one) is
  // what the customer actually gave for this specific order, so it's read
  // straight off each order row below rather than joined from User.

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t("heading")}</h1>
        <OrderStatusFilter />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnOrder")}</TableHead>
            <TableHead>{t("columnCustomer")}</TableHead>
            <TableHead>{t("columnDate")}</TableHead>
            <TableHead>{t("columnItems")}</TableHead>
            <TableHead>{t("columnTotal")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                  #{order.id.slice(-8).toUpperCase()}
                </Link>
                {order.viewedByAdminAt === null && (
                  <Badge variant="destructive" className="ms-2 animate-pulse">
                    {t("newBadge")}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <span className="block">{order.user.name ?? order.user.email}</span>
                {order.shippingPhone && (
                  // dir="ltr" here is a block-level element, so it also
                  // resets its own text-align to "left" regardless of the
                  // page's real direction (logical alignment resolves
                  // against an element's own dir, not its ancestor's) —
                  // pinning it explicitly by locale is what actually keeps
                  // it under the name above in Arabic.
                  <span
                    className={`text-muted-foreground block text-xs ${locale === "ar" ? "text-right" : "text-left"}`}
                    dir="ltr"
                  >
                    {order.shippingPhone}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {order.createdAt.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>
              <TableCell>{order.items.length}</TableCell>
              <TableCell>
                {formatPriceCents(
                  calculateTotalCents(
                    order.subtotalCents,
                    order.discountCents,
                    order.deliveryFeeCents ?? 0
                  )
                )}
              </TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status} labels={statusLabels} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {orders.length === 0 && (
        <p className="text-muted-foreground text-sm">{t("noOrdersMatch")}</p>
      )}
    </div>
  );
}
