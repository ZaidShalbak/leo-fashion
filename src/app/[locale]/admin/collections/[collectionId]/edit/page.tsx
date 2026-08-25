import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { EditCollectionForm } from "@/components/admin/EditCollectionForm";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/collections/[collectionId]/edit">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminCollections" });
  return { title: t("editMetaTitle") };
}

export default async function EditCollectionPage({
  params,
}: PageProps<"/[locale]/admin/collections/[collectionId]/edit">) {
  const { collectionId } = await params;
  const t = await getTranslations("AdminCollections");

  const collection = await db.collection.findUnique({ where: { id: collectionId } });
  if (!collection) notFound();

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("editHeading")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{collection.title}</p>
      </div>

      <EditCollectionForm collection={collection} />
    </div>
  );
}
