import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AdminProductsTable } from "@/components/admin/AdminProductsTable";
import { AdminProductsGrid } from "@/components/admin/AdminProductsGrid";
import { AdminProductsViewToggle } from "@/components/admin/AdminProductsViewToggle";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/products">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminProducts" });
  return { title: t("metaTitleList") };
}

export default async function AdminProductsPage({
  searchParams,
}: PageProps<"/[locale]/admin/products">) {
  const { view: viewParam } = await searchParams;
  const view = viewParam === "grid" ? "grid" : "table";
  const t = await getTranslations("AdminProducts");

  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { variants: true, images: { orderBy: { position: "asc" }, take: 1 } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">{t("heading")}</h1>
        <div className="flex items-center gap-3">
          <AdminProductsViewToggle view={view} />
          <Button asChild>
            <Link href="/admin/products/new">{t("newProduct")}</Link>
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
