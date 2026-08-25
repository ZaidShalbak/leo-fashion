import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { db } from "@/server/db";
import { OrderDetail } from "@/components/storefront/OrderDetail";
import { OrderStatusTimeline } from "@/components/storefront/OrderStatusTimeline";
import { OrderStatusControl } from "@/components/admin/OrderStatusControl";
import { MarkOrderViewed } from "@/components/admin/MarkOrderViewed";

export const metadata: Metadata = { title: "Order — Admin" };

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function AdminOrderDetailPage({ params }: Props) {
  const { orderId } = await params;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: { select: { email: true, name: true } } },
  });

  if (!order) notFound();

  return (
    <div className="max-w-6xl">
      <MarkOrderViewed orderId={order.id} alreadyViewed={order.viewedByAdminAt !== null} />
      <p className="text-muted-foreground mb-6 text-sm">
        Customer: {order.user.name ?? "—"} · {order.user.email}
      </p>

      <div className="grid gap-10 lg:grid-cols-[1fr_260px_300px]">
        <OrderDetail order={order} />
        <OrderStatusTimeline order={order} />
        <OrderStatusControl
          orderId={order.id}
          currentStatus={order.status}
          currentTrackingNumber={order.trackingNumber}
        />
      </div>
    </div>
  );
}
