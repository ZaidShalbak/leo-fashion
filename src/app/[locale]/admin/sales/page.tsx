import Link from "next/link";
import type { Metadata } from "next";

import { db } from "@/server/db";
import { isSaleLive } from "@/lib/sales";
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

export const metadata: Metadata = { title: "Sales — Admin" };

const SCOPE_LABELS = {
  SITE_WIDE: "Entire site",
  COLLECTION: "Category",
  BRAND: "Brand",
} as const;

export default async function AdminSalesPage() {
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
        <h1 className="text-xl font-semibold tracking-tight">Sales</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Automatic percentage markdowns — no code needed, shown directly on the storefront
          as a struck-through price. Stacks with a customer&apos;s promo code at checkout.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Applies to</TableHead>
            <TableHead>Off</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Window</TableHead>
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
                    <Badge variant="secondary">Inactive</Badge>
                  ) : scheduled ? (
                    <Badge variant="secondary">Scheduled</Badge>
                  ) : expired ? (
                    <Badge variant="secondary">Expired</Badge>
                  ) : isSaleLive(sale, now) ? (
                    <Badge>Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
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
      {sales.length === 0 && <p className="text-muted-foreground text-sm">No sales yet.</p>}

      <div className="space-y-3">
        <h2 className="text-sm font-medium">Add a sale</h2>
        <NewSaleForm
          collections={collections.map((c) => ({ id: c.id, title: c.title }))}
          brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        />
      </div>
    </div>
  );
}
