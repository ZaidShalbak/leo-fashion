import type { Metadata } from "next";

import { db } from "@/server/db";
import { NewProductForm } from "@/components/admin/NewProductForm";

export const metadata: Metadata = { title: "New product — Admin" };

export default async function NewProductPage() {
  const [collections, brands] = await Promise.all([
    db.collection.findMany({ orderBy: { title: "asc" } }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">New product</h1>
      <NewProductForm collections={collections} brands={brands} />
    </div>
  );
}
