import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { EditSaleForm } from "@/components/admin/EditSaleForm";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/sales/[saleId]/edit">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminSales" });
  return { title: t("editMetaTitle") };
}

export default async function EditSalePage({
  params,
}: PageProps<"/[locale]/admin/sales/[saleId]/edit">) {
  const { saleId } = await params;
  const t = await getTranslations("AdminSales");

  const [sale, collections, brands] = await Promise.all([
    db.sale.findUnique({ where: { id: saleId } }),
    db.collection.findMany({ orderBy: { title: "asc" } }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!sale) notFound();

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("editHeading")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{sale.title}</p>
      </div>

      <EditSaleForm
        sale={sale}
        collections={collections.map((c) => ({ id: c.id, title: c.title }))}
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
      />
    </div>
  );
}
