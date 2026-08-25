import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { db } from "@/server/db";
import { EditSaleForm } from "@/components/admin/EditSaleForm";

export const metadata: Metadata = { title: "Edit sale — Admin" };

type Props = {
  params: Promise<{ saleId: string }>;
};

export default async function EditSalePage({ params }: Props) {
  const { saleId } = await params;

  const [sale, collections, brands] = await Promise.all([
    db.sale.findUnique({ where: { id: saleId } }),
    db.collection.findMany({ orderBy: { title: "asc" } }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!sale) notFound();

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Edit sale</h1>
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
