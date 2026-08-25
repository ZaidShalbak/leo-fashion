import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { db } from "@/server/db";
import { EditCollectionForm } from "@/components/admin/EditCollectionForm";

export const metadata: Metadata = { title: "Edit category — Admin" };

type Props = {
  params: Promise<{ collectionId: string }>;
};

export default async function EditCollectionPage({ params }: Props) {
  const { collectionId } = await params;

  const collection = await db.collection.findUnique({ where: { id: collectionId } });
  if (!collection) notFound();

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Edit category</h1>
        <p className="text-muted-foreground mt-1 text-sm">{collection.title}</p>
      </div>

      <EditCollectionForm collection={collection} />
    </div>
  );
}
