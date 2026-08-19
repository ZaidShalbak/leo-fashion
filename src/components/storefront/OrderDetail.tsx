import type { Order, OrderItem } from "@prisma/client";

import { OrderStatusBadge } from "./OrderStatusBadge";
import { formatPriceCents } from "./PriceDisplay";

type OrderWithItems = Order & { items: OrderItem[] };

export function OrderDetail({ order }: { order: OrderWithItems }) {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">
            Order #{order.id.slice(-8).toUpperCase()}
          </p>
          <p className="text-muted-foreground text-sm">
            Placed {order.createdAt.toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div>
        <p className="mb-3 text-xs tracking-widest uppercase">Items</p>
        <ul className="divide-border divide-y">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-3 text-sm">
              <span>
                <span className="block">{item.titleSnapshot}</span>
                <span className="text-muted-foreground">
                  {item.size} / {item.color} × {item.quantity}
                </span>
              </span>
              <span className="shrink-0">
                {formatPriceCents(item.priceCents * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="border-border mt-2 flex justify-between border-t pt-3 text-sm">
          <span>Subtotal</span>
          <span className="font-serif italic">{formatPriceCents(order.subtotalCents)}</span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs tracking-widest uppercase">Shipping address</p>
        <p className="text-muted-foreground text-sm">
          {order.shippingName}
          <br />
          {order.shippingLine1}
          {order.shippingLine2 ? `, ${order.shippingLine2}` : ""}
          <br />
          {order.shippingCity}
          {order.shippingState ? `, ${order.shippingState}` : ""}{" "}
          {order.shippingPostalCode}
          <br />
          {order.shippingCountry}
          {order.shippingPhone ? ` · ${order.shippingPhone}` : ""}
        </p>
      </div>

      {order.trackingNumber && (
        <div>
          <p className="mb-1 text-xs tracking-widest uppercase">Tracking</p>
          <p className="text-muted-foreground text-sm">{order.trackingNumber}</p>
        </div>
      )}
    </div>
  );
}
