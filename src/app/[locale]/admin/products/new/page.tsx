import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { NewProductForm } from "@/components/admin/NewProductForm";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/products/new">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminProducts" });
  return { title: t("metaTitleNew") };
}

export default async function NewProductPage() {
  const t = await getTranslations("AdminProducts");
  const [collections, brands] = await Promise.all([
    db.collection.findMany({ orderBy: { title: "asc" } }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">{t("newProductHeading")}</h1>
      <NewProductForm collections={collections} brands={brands} />
    </div>
  );
}
