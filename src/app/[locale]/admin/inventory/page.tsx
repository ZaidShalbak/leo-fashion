import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { LOW_STOCK_THRESHOLD as DEFAULT_THRESHOLD } from "@/lib/inventory";
import { ThresholdControl } from "@/components/admin/ThresholdControl";
import { InventoryAdjustControl } from "@/components/admin/InventoryAdjustRow";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/inventory">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminInventory" });
  return { title: t("metaTitle") };
}

export default async function AdminInventoryPage({
  searchParams,
}: PageProps<"/[locale]/admin/inventory">) {
  const t = await getTranslations("AdminInventory");
  const { threshold: thresholdParam } = await searchParams;
  const threshold = (() => {
    const raw = Array.isArray(thresholdParam) ? thresholdParam[0] : thresholdParam;
    const n = parseInt(raw ?? "", 10);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_THRESHOLD;
  })();

  const variants = await db.productVariant.findMany({
    orderBy: [{ inventoryQuantity: "asc" }, { sku: "asc" }],
    include: { product: { select: { title: true, status: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t("heading")}</h1>
        <ThresholdControl defaultThreshold={DEFAULT_THRESHOLD} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnProduct")}</TableHead>
            <TableHead>{t("columnSku")}</TableHead>
            <TableHead>{t("columnSizeColor")}</TableHead>
            <TableHead>{t("columnStock")}</TableHead>
            <TableHead>{t("columnAdjust")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {variants.map((variant) => {
            const lowStock = variant.inventoryQuantity <= threshold;
            return (
              <TableRow key={variant.id} className={cn(lowStock && "bg-destructive/5")}>
                <TableCell>{variant.product.title}</TableCell>
                <TableCell className="font-mono text-xs">{variant.sku}</TableCell>
                <TableCell>
                  {variant.size} / {variant.color}
                </TableCell>
                <TableCell>
                  <span className={cn(lowStock && "text-destructive font-medium")}>
                    {variant.inventoryQuantity}
                  </span>
                  {lowStock && (
                    <span className="text-destructive ms-2 text-xs">{t("lowStock")}</span>
                  )}
                </TableCell>
                <TableCell>
                  <InventoryAdjustControl variantId={variant.id} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
