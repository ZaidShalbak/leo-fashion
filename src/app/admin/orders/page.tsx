import Link from "next/link";
import type { Metadata } from "next";
import type { OrderStatus } from "@prisma/client";

import { db } from "@/server/db";
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

export const metadata: Metadata = { title: "Orders — Admin" };

const VALID_STATUSES = new Set(["pending", "processing", "shipped", "delivered", "cancelled"]);

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { status } = await searchParams;
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
        <h1 className="text-xl font-semibold tracking-tight">Orders</h1>
        <OrderStatusFilter />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
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
                    New
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <span className="block">{order.user.name ?? order.user.email}</span>
                {order.shippingPhone && (
                  <span className="text-muted-foreground block text-xs" dir="ltr">
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
                <OrderStatusBadge status={order.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {orders.length === 0 && (
        <p className="text-muted-foreground text-sm">No orders match this filter.</p>
      )}
    </div>
  );
}
