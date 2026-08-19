import Link from "next/link";
import type { Metadata } from "next";

import { requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { OrderStatusBadge } from "@/components/storefront/OrderStatusBadge";
import { formatPriceCents } from "@/components/storefront/PriceDisplay";

export const metadata: Metadata = { title: "Your orders" };

export default async function AccountOrdersPage() {
  const user = await requireUser("/account/orders");

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h1 className="font-serif text-2xl italic sm:text-3xl">Your orders</h1>

      {orders.length === 0 ? (
        <div className="mt-8 text-center">
          <p className="text-muted-foreground">
            You haven&apos;t placed any orders yet.
          </p>
          <Link href="/" className="text-brand-accent mt-4 inline-block text-sm underline">
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="divide-border mt-6 divide-y">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/account/orders/${order.id}`}
                className="flex items-center justify-between gap-4 py-4 transition hover:opacity-70"
              >
                <div>
                  <p className="text-sm">
                    Order #{order.id.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {order.createdAt.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    · {order.items.length} item
                    {order.items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-serif text-sm italic">
                    {formatPriceCents(order.subtotalCents)}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
