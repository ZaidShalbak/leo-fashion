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
    <div className="grid max-w-4xl gap-10 lg:grid-cols-[1fr_320px]">
      <MarkOrderViewed orderId={order.id} alreadyViewed={order.viewedByAdminAt !== null} />
      <div>
        <p className="text-muted-foreground mb-4 text-sm">
          Customer: {order.user.name ?? "—"} · {order.user.email}
        </p>
        <OrderStatusTimeline order={order} />
        <div className="mt-8">
          <OrderDetail order={order} />
        </div>
      </div>

      <OrderStatusControl
        orderId={order.id}
        currentStatus={order.status}
        currentTrackingNumber={order.trackingNumber}
      />
    </div>
  );
}
