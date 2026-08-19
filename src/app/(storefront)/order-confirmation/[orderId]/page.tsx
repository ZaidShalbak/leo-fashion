import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { OrderDetail } from "@/components/storefront/OrderDetail";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Order confirmed" };

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderConfirmationPage({ params }: Props) {
  const { orderId } = await params;
  const user = await requireUser(`/order-confirmation/${orderId}`);

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.userId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="mb-8 text-center">
        <p className="text-brand-accent text-xs tracking-[0.25em] uppercase">
          Order confirmed
        </p>
        <h1 className="font-serif text-3xl italic">
          Thanks — your order is in.
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          We&apos;ll follow up with fulfillment details. No payment was
          collected — this order is invoice / pay-on-delivery.
        </p>
      </div>

      <OrderDetail order={order} />

      <div className="mt-8 flex justify-center gap-3">
        <Button asChild variant="outline" className="text-xs tracking-[0.2em] uppercase">
          <Link href="/">Continue shopping</Link>
        </Button>
        <Button asChild className="text-xs tracking-[0.2em] uppercase">
          <Link href="/account/orders">View my orders</Link>
        </Button>
      </div>
    </div>
  );
}
