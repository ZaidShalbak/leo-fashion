import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { EditDeliveryZoneForm } from "@/components/admin/EditDeliveryZoneForm";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/delivery-zones/[deliveryZoneId]/edit">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminDeliveryZones" });
  return { title: t("metaTitleEdit") };
}

export default async function EditDeliveryZonePage({
  params,
}: PageProps<"/[locale]/admin/delivery-zones/[deliveryZoneId]/edit">) {
  const { deliveryZoneId } = await params;
  const t = await getTranslations("AdminDeliveryZones");

  const deliveryZone = await db.deliveryZone.findUnique({ where: { id: deliveryZoneId } });
  if (!deliveryZone) notFound();

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("editHeading")}</h1>
        <p className="text-muted-foreground mt-1 text-sm" dir="rtl">
          {deliveryZone.name}
        </p>
      </div>

      <EditDeliveryZoneForm deliveryZone={deliveryZone} />
    </div>
  );
}
