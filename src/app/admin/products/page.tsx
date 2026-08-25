import Link from "next/link";
import type { Metadata } from "next";

import { db } from "@/server/db";
import { Button } from "@/components/ui/button";
import { AdminProductsTable } from "@/components/admin/AdminProductsTable";

export const metadata: Metadata = { title: "Products — Admin" };

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

      <AdminProductsTable products={products} />
    </div>
  );
}
