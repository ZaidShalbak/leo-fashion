import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { OrderDetail } from "@/components/storefront/OrderDetail";

export const metadata: Metadata = { title: "Order details" };

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function AccountOrderDetailPage({ params }: Props) {
  const { orderId } = await params;
  const user = await requireUser(`/account/orders/${orderId}`);

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.userId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <Link
        href="/account/orders"
        className="text-muted-foreground hover:text-foreground text-xs tracking-widest uppercase transition"
      >
        ← All orders
      </Link>
      <div className="mt-6">
        <OrderDetail order={order} />
      </div>
    </div>
  );
}
