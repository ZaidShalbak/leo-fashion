import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AdminProductsTable } from "@/components/admin/AdminProductsTable";
import { AdminProductsGrid } from "@/components/admin/AdminProductsGrid";
import { AdminProductsViewToggle } from "@/components/admin/AdminProductsViewToggle";
import { Pagination } from "@/components/storefront/Pagination";

const PAGE_SIZE = 25;

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
  const { view: viewParam, page: pageParam } = await searchParams;
  const view = viewParam === "grid" ? "grid" : "table";
  const t = await getTranslations("AdminProducts");

  // No caching layer here (unlike the storefront's getActiveProductsCached)
  // — an admin needs to see their own just-made changes instantly. Total
  // count is fetched first, separately, so the requested page can be
  // clamped into range before deciding `skip` for the real query, rather
  // than risking an empty page for a stale/out-of-range `?page=`.
  const totalCount = await db.product.count();
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const requestedPage = pageParam ? Number(pageParam) : 1;
  const currentPage = Math.min(
    Math.max(1, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1),
    totalPages
  );

  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { variants: true, images: { orderBy: { position: "asc" }, take: 1 } },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
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

      <Pagination currentPage={currentPage} totalPages={totalPages} />
    </div>
  );
}
