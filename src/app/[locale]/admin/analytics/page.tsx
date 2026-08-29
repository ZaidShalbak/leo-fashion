import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  getDiscountCodeUsage,
  getOrderStatusCounts,
  getProfitSummary,
  getRevenueByDay,
  getRevenueByDeliveryZone,
  getTopProducts,
} from "@/server/analytics";
import { formatPriceCents } from "@/components/storefront/PriceDisplay";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart } from "@/components/charts/bar-chart";
import { Bar } from "@/components/charts/bar";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/analytics">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminAnalytics" });
  return { title: t("metaTitle") };
}

// Cancelled reuses --destructive (red) to stay consistent with
// OrderStatusBadge's existing color convention for that status; the rest
// draw from the qualitative palette (see globals.css) rather than the
// installed grayscale --chart-scale-* ramp.
const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: "var(--chart-qual-3)",
  processing: "var(--chart-qual-1)",
  shipped: "var(--chart-qual-5)",
  delivered: "var(--chart-qual-2)",
  cancelled: "var(--destructive)",
};

export default async function AdminAnalyticsPage() {
  const t = await getTranslations("AdminAnalytics");
  const tStatus = await getTranslations("OrderStatus");

  const [revenueByDay, statusCounts, topProducts, zoneRevenue, discountUsage, profit] =
    await Promise.all([
      getRevenueByDay(30),
      getOrderStatusCounts(),
      getTopProducts(10),
      getRevenueByDeliveryZone(t("noDeliveryZone")),
      getDiscountCodeUsage(),
      getProfitSummary(),
    ]);

  const aov = profit.orderCount > 0 ? profit.revenueCents / profit.orderCount : 0;
  const missingCostCount = profit.itemsTotal - profit.itemsWithCost;

  const statusPieData = statusCounts.map((row) => ({
    label: tStatus(row.status),
    value: row.count,
    color: ORDER_STATUS_COLORS[row.status],
  }));

  const zonePieData = zoneRevenue.map((row, index) => ({
    label: row.zoneName,
    value: row.revenueCents,
    color: `var(--chart-qual-${(index % 5) + 1})`,
  }));

  const topProductsBarData = topProducts.map((p) => ({ name: p.title, revenue: p.revenueCents / 100 }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subheading")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("statRevenue")}</CardDescription>
            <CardTitle className="text-2xl">{formatPriceCents(profit.revenueCents)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("statOrders")}</CardDescription>
            <CardTitle className="text-2xl">{profit.orderCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("statAov")}</CardDescription>
            <CardTitle className="text-2xl">{formatPriceCents(Math.round(aov))}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("statProfit")}</CardDescription>
            <CardTitle className="text-2xl">
              {formatPriceCents(profit.profitCents)}
              {profit.marginPercent != null && (
                <span className="text-muted-foreground ms-1.5 text-sm font-normal">
                  ({profit.marginPercent.toFixed(1)}%)
                </span>
              )}
            </CardTitle>
            {missingCostCount > 0 && (
              <p className="text-muted-foreground text-xs">
                {t("statProfitCaveat", { withCost: profit.itemsWithCost, total: profit.itemsTotal })}
              </p>
            )}
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("revenueTrendHeading")}</CardTitle>
          <CardDescription>{t("revenueTrendSubheading")}</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart data={revenueByDay} xDataKey="date">
            <Grid horizontal />
            <Bar dataKey="revenue" fill="var(--chart-line-primary)" />
            <Bar dataKey="profit" fill="var(--chart-line-secondary)" />
            <BarXAxis />
            <ChartTooltip />
          </BarChart>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("orderStatusHeading")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {statusPieData.length > 0 ? (
              <PieChart data={statusPieData} size={220}>
                {statusPieData.map((_, index) => (
                  <PieSlice key={index} index={index} />
                ))}
              </PieChart>
            ) : (
              <p className="text-muted-foreground text-sm">{t("emptyState")}</p>
            )}
            <ul className="w-full space-y-1 text-sm">
              {statusPieData.map((row) => (
                <li key={row.label} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: row.color }}
                      aria-hidden="true"
                    />
                    {row.label}
                  </span>
                  <span className="text-muted-foreground">{row.value}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("deliveryZoneHeading")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {zonePieData.length > 0 ? (
              <PieChart data={zonePieData} size={220} innerRadius={55}>
                {zonePieData.map((_, index) => (
                  <PieSlice key={index} index={index} />
                ))}
              </PieChart>
            ) : (
              <p className="text-muted-foreground text-sm">{t("emptyState")}</p>
            )}
            <ul className="w-full space-y-1 text-sm">
              {zonePieData.map((row) => (
                <li key={row.label} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block size-2.5 rounded-full"
                      style={{ backgroundColor: row.color }}
                      aria-hidden="true"
                    />
                    {row.label}
                  </span>
                  <span className="text-muted-foreground">{formatPriceCents(row.value)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("topProductsHeading")}</CardTitle>
        </CardHeader>
        <CardContent>
          {topProductsBarData.length > 0 ? (
            <BarChart data={topProductsBarData} xDataKey="name" orientation="horizontal">
              <Grid vertical horizontal={false} />
              <Bar dataKey="revenue" fill="var(--chart-line-primary)" />
              <ChartTooltip />
            </BarChart>
          ) : (
            <p className="text-muted-foreground text-sm">{t("emptyState")}</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">{t("discountCodesHeading")}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnCode")}</TableHead>
              <TableHead>{t("columnOrders")}</TableHead>
              <TableHead>{t("columnTotalDiscount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discountUsage.map((row) => (
              <TableRow key={row.code}>
                <TableCell className="font-medium">{row.code}</TableCell>
                <TableCell>{row.orderCount}</TableCell>
                <TableCell>{formatPriceCents(row.totalDiscountCents)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {discountUsage.length === 0 && (
          <p className="text-muted-foreground text-sm">{t("emptyState")}</p>
        )}
      </div>
    </div>
  );
}
