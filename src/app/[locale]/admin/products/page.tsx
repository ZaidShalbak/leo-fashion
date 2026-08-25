import type { Metadata } from "next";

import { db } from "@/server/db";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AdminProductsTable } from "@/components/admin/AdminProductsTable";
import { AdminProductsGrid } from "@/components/admin/AdminProductsGrid";
import { AdminProductsViewToggle } from "@/components/admin/AdminProductsViewToggle";

export const metadata: Metadata = { title: "Products — Admin" };

type Props = {
  searchParams: Promise<{ view?: string }>;
};

export default async function AdminProductsPage({ searchParams }: Props) {
  const { view: viewParam } = await searchParams;
  const view = viewParam === "grid" ? "grid" : "table";

  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { variants: true, images: { orderBy: { position: "asc" }, take: 1 } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Products</h1>
        <div className="flex items-center gap-3">
          <AdminProductsViewToggle view={view} />
          <Button asChild>
            <Link href="/admin/products/new">New product</Link>
          </Button>
        </div>
      </div>

      {view === "grid" ? (
        <AdminProductsGrid products={products} />
      ) : (
        <AdminProductsTable products={products} />
      )}
    </div>
  );
}
