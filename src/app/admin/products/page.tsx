import Link from "next/link";
import type { Metadata } from "next";

import { db } from "@/server/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPriceCents } from "@/components/storefront/PriceDisplay";
import { ProductStatusToggle } from "@/components/admin/ProductStatusToggle";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";

export const metadata: Metadata = { title: "Products — Admin" };

const STATUS_VARIANT = {
  draft: "outline",
  active: "default",
  archived: "secondary",
} as const;

export default async function AdminProductsPage() {
  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { variants: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Products</h1>
        <Button asChild>
          <Link href="/admin/products/new">New product</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Variants</TableHead>
            <TableHead>Total stock</TableHead>
            <TableHead />
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const totalStock = product.variants.reduce(
              (sum, v) => sum + v.inventoryQuantity,
              0
            );
            return (
              <TableRow key={product.id}>
                <TableCell>
                  <Link href={`/admin/products/${product.id}/edit`} className="hover:underline">
                    {product.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[product.status]}>{product.status}</Badge>
                </TableCell>
                <TableCell>{formatPriceCents(product.basePriceCents)}</TableCell>
                <TableCell>{product.variants.length}</TableCell>
                <TableCell>{totalStock}</TableCell>
                <TableCell>
                  <ProductStatusToggle productId={product.id} status={product.status} />
                </TableCell>
                <TableCell>
                  <DeleteProductButton productId={product.id} productTitle={product.title} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
