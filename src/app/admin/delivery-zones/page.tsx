import Link from "next/link";
import type { Metadata } from "next";

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
import { formatPriceCents } from "@/components/storefront/PriceDisplay";
import { NewDeliveryZoneForm } from "@/components/admin/NewDeliveryZoneForm";
import { DeleteDeliveryZoneButton } from "@/components/admin/DeleteDeliveryZoneButton";

export const metadata: Metadata = { title: "Delivery areas — Admin" };

export default async function AdminDeliveryZonesPage() {
  const deliveryZones = await db.deliveryZone.findMany({
    orderBy: { position: "asc" },
    include: { _count: { select: { orders: true } } },
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Delivery areas</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          The delivery destinations a customer picks from at checkout, each
          with its own flat fee.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Fee</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Orders</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveryZones.map((zone) => (
            <TableRow key={zone.id}>
              <TableCell>
                <Link
                  href={`/admin/delivery-zones/${zone.id}/edit`}
                  className="font-medium hover:underline"
                  dir="rtl"
                >
                  {zone.name}
                </Link>
              </TableCell>
              <TableCell>{formatPriceCents(zone.feeCents)}</TableCell>
              <TableCell>
                {zone.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
              </TableCell>
              <TableCell className="text-muted-foreground">{zone.position}</TableCell>
              <TableCell>{zone._count.orders}</TableCell>
              <TableCell>
                <DeleteDeliveryZoneButton
                  deliveryZoneId={zone.id}
                  name={zone.name}
                  orderCount={zone._count.orders}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {deliveryZones.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No delivery areas yet — checkout won&apos;t work until at least one
          exists.
        </p>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-medium">Add a delivery area</h2>
        <NewDeliveryZoneForm />
      </div>
    </div>
  );
}
