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
import { NewDiscountCodeForm } from "@/components/admin/NewDiscountCodeForm";
import { DeleteDiscountCodeButton } from "@/components/admin/DeleteDiscountCodeButton";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/discount-codes">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminDiscountCodes" });
  return { title: t("metaTitle") };
}

export default async function AdminDiscountCodesPage() {
  const t = await getTranslations("AdminDiscountCodes");
  const discountCodes = await db.discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });
  const now = new Date().getTime();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subheading")}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnCode")}</TableHead>
            <TableHead>{t("columnOff")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead>{t("columnExpires")}</TableHead>
            <TableHead>{t("columnMinOrder")}</TableHead>
            <TableHead>{t("columnRedemptions")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {discountCodes.map((dc) => {
            const expired = dc.expiresAt ? dc.expiresAt.getTime() < now : false;
            const limitReached =
              dc.maxRedemptions != null && dc.redemptionCount >= dc.maxRedemptions;
            return (
              <TableRow key={dc.id}>
                <TableCell>
                  <Link
                    href={`/admin/discount-codes/${dc.id}/edit`}
                    className="font-medium hover:underline"
                  >
                    {dc.code}
                  </Link>
                </TableCell>
                <TableCell>{dc.percentOff}%</TableCell>
                <TableCell>
                  {!dc.isActive ? (
                    <Badge variant="secondary">{t("statusInactive")}</Badge>
                  ) : expired ? (
                    <Badge variant="secondary">{t("statusExpired")}</Badge>
                  ) : limitReached ? (
                    <Badge variant="secondary">{t("statusLimitReached")}</Badge>
                  ) : (
                    <Badge>{t("statusActive")}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {dc.expiresAt
                    ? dc.expiresAt.toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {dc.minSubtotalCents != null ? formatPriceCents(dc.minSubtotalCents) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {dc.redemptionCount}
                  {dc.maxRedemptions != null ? ` / ${dc.maxRedemptions}` : ""}
                </TableCell>
                <TableCell>
                  <DeleteDiscountCodeButton discountCodeId={dc.id} code={dc.code} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {discountCodes.length === 0 && (
        <p className="text-muted-foreground text-sm">{t("emptyState")}</p>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-medium">{t("addHeading")}</h2>
        <NewDiscountCodeForm />
      </div>
    </div>
  );
}
