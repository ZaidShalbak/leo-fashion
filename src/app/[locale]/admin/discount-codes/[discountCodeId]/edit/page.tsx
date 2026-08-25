import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { EditDiscountCodeForm } from "@/components/admin/EditDiscountCodeForm";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/discount-codes/[discountCodeId]/edit">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminDiscountCodes" });
  return { title: t("editMetaTitle") };
}

export default async function EditDiscountCodePage({
  params,
}: PageProps<"/[locale]/admin/discount-codes/[discountCodeId]/edit">) {
  const { discountCodeId } = await params;
  const t = await getTranslations("AdminDiscountCodes");

  const discountCode = await db.discountCode.findUnique({ where: { id: discountCodeId } });
  if (!discountCode) notFound();

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("editHeading")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{discountCode.code}</p>
      </div>

      <EditDiscountCodeForm discountCode={discountCode} />
    </div>
  );
}
