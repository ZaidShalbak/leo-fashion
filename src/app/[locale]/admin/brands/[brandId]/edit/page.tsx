import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { EditBrandForm } from "@/components/admin/EditBrandForm";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/brands/[brandId]/edit">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminBrands" });
  return { title: t("editMetaTitle") };
}

export default async function EditBrandPage({
  params,
}: PageProps<"/[locale]/admin/brands/[brandId]/edit">) {
  const { brandId } = await params;
  const t = await getTranslations("AdminBrands");

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand) notFound();

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("editHeading")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{brand.name}</p>
      </div>

      <EditBrandForm brand={brand} />
    </div>
  );
}
