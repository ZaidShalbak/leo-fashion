import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { db } from "@/server/db";
import { EditBrandForm } from "@/components/admin/EditBrandForm";

export const metadata: Metadata = { title: "Edit brand — Admin" };

type Props = {
  params: Promise<{ brandId: string }>;
};

export default async function EditBrandPage({ params }: Props) {
  const { brandId } = await params;

  const brand = await db.brand.findUnique({ where: { id: brandId } });
  if (!brand) notFound();

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Edit brand</h1>
        <p className="text-muted-foreground mt-1 text-sm">{brand.name}</p>
      </div>

      <EditBrandForm brand={brand} />
    </div>
  );
}
