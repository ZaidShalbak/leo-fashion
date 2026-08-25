import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { isSaleLive } from "@/lib/sales";
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
import { NewSaleForm } from "@/components/admin/NewSaleForm";
import { DeleteSaleButton } from "@/components/admin/DeleteSaleButton";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/sales">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminSales" });
  return { title: t("metaTitle") };
}

export default async function AdminSalesPage() {
  const t = await getTranslations("AdminSales");
  const SCOPE_LABELS = {
    SITE_WIDE: t("scopeSiteWide"),
    COLLECTION: t("scopeCategory"),
    BRAND: t("scopeBrand"),
  } as const;
  const [sales, collections, brands] = await Promise.all([
    db.sale.findMany({ orderBy: { createdAt: "desc" } }),
    db.collection.findMany({ orderBy: { title: "asc" } }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
  ]);
  const now = new Date();
  const collectionTitleById = new Map(collections.map((c) => [c.id, c.title]));
  const brandNameById = new Map(brands.map((b) => [b.id, b.name]));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subheading")}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnTitle")}</TableHead>
            <TableHead>{t("columnAppliesTo")}</TableHead>
            <TableHead>{t("columnOff")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead>{t("columnWindow")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => {
            const scoped =
              sale.scope === "COLLECTION"
                ? (sale.collectionId && collectionTitleById.get(sale.collectionId)) || "—"
                : sale.scope === "BRAND"
                  ? (sale.brandId && brandNameById.get(sale.brandId)) || "—"
                  : null;
            const scheduled = sale.isActive && sale.startsAt && sale.startsAt.getTime() > now.getTime();
            const expired = sale.isActive && sale.endsAt && sale.endsAt.getTime() < now.getTime();
            return (
              <TableRow key={sale.id}>
                <TableCell>
                  <Link href={`/admin/sales/${sale.id}/edit`} className="font-medium hover:underline">
                    {sale.title}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {SCOPE_LABELS[sale.scope]}
                  {scoped ? ` · ${scoped}` : ""}
                </TableCell>
                <TableCell>{sale.percentOff}%</TableCell>
                <TableCell>
                  {!sale.isActive ? (
                    <Badge variant="secondary">{t("statusInactive")}</Badge>
                  ) : scheduled ? (
                    <Badge variant="secondary">{t("statusScheduled")}</Badge>
                  ) : expired ? (
                    <Badge variant="secondary">{t("statusExpired")}</Badge>
                  ) : isSaleLive(sale, now) ? (
                    <Badge>{t("statusActive")}</Badge>
                  ) : (
                    <Badge variant="secondary">{t("statusInactive")}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {sale.startsAt || sale.endsAt
                    ? [
                        sale.startsAt?.toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }),
                        sale.endsAt?.toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }),
                      ]
                        .filter(Boolean)
                        .join(" – ")
                    : "—"}
                </TableCell>
                <TableCell>
                  <DeleteSaleButton saleId={sale.id} title={sale.title} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {sales.length === 0 && <p className="text-muted-foreground text-sm">{t("emptyState")}</p>}

      <div className="space-y-3">
        <h2 className="text-sm font-medium">{t("addSaleHeading")}</h2>
        <NewSaleForm
          collections={collections.map((c) => ({ id: c.id, title: c.title }))}
          brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        />
      </div>
    </div>
  );
}
