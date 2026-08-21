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
import { cn } from "@/lib/utils";
import { LOW_STOCK_THRESHOLD as DEFAULT_THRESHOLD } from "@/lib/inventory";
import { ThresholdControl } from "@/components/admin/ThresholdControl";
import { InventoryAdjustControl } from "@/components/admin/InventoryAdjustRow";

export const metadata: Metadata = { title: "Inventory — Admin" };

type Props = {
  searchParams: Promise<{ threshold?: string }>;
};

export default async function AdminInventoryPage({ searchParams }: Props) {
  const { threshold: thresholdParam } = await searchParams;
  const threshold = (() => {
    const n = parseInt(thresholdParam ?? "", 10);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_THRESHOLD;
  })();

  const variants = await db.productVariant.findMany({
    orderBy: [{ inventoryQuantity: "asc" }, { sku: "asc" }],
    include: { product: { select: { title: true, status: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Inventory</h1>
        <ThresholdControl defaultThreshold={DEFAULT_THRESHOLD} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Size / color</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Adjust</TableHead>
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
                    <span className="text-destructive ml-2 text-xs">Low stock</span>
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
