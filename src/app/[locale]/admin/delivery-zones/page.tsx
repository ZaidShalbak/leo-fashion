import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { Link } from "@/i18n/navigation";
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

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/delivery-zones">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminDeliveryZones" });
  return { title: t("metaTitle") };
}

export default async function AdminDeliveryZonesPage() {
  const t = await getTranslations("AdminDeliveryZones");
  const deliveryZones = await db.deliveryZone.findMany({
    orderBy: { position: "asc" },
    include: { _count: { select: { orders: true } } },
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subheading")}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnName")}</TableHead>
            <TableHead>{t("columnFee")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead>{t("columnOrder")}</TableHead>
            <TableHead>{t("columnOrders")}</TableHead>
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
                {zone.isActive ? (
                  <Badge>{t("statusActive")}</Badge>
                ) : (
                  <Badge variant="secondary">{t("statusInactive")}</Badge>
                )}
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
        <p className="text-muted-foreground text-sm">{t("emptyState")}</p>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-medium">{t("addHeading")}</h2>
        <NewDeliveryZoneForm />
      </div>
    </div>
  );
}
