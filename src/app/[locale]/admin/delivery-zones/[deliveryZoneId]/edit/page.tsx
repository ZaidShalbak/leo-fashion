import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { db } from "@/server/db";
import { EditDeliveryZoneForm } from "@/components/admin/EditDeliveryZoneForm";

export const metadata: Metadata = { title: "Edit delivery area — Admin" };

type Props = {
  params: Promise<{ deliveryZoneId: string }>;
};

export default async function EditDeliveryZonePage({ params }: Props) {
  const { deliveryZoneId } = await params;

  const deliveryZone = await db.deliveryZone.findUnique({ where: { id: deliveryZoneId } });
  if (!deliveryZone) notFound();

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Edit delivery area</h1>
        <p className="text-muted-foreground mt-1 text-sm" dir="rtl">
          {deliveryZone.name}
        </p>
      </div>

      <EditDeliveryZoneForm deliveryZone={deliveryZone} />
    </div>
  );
}
