import Link from "next/link";
import type { Metadata } from "next";

import { db } from "@/server/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewCollectionForm } from "@/components/admin/NewCollectionForm";
import { DeleteCollectionButton } from "@/components/admin/DeleteCollectionButton";

export const metadata: Metadata = { title: "Categories — Admin" };

export default async function AdminCollectionsPage() {
  const collections = await db.collection.findMany({
    orderBy: { title: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Categories</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          The categories products are grouped into on the storefront (shown as
          &ldquo;Shop by category&rdquo; and at <code>/collections/[handle]</code>).
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Handle</TableHead>
            <TableHead>Products</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {collections.map((collection) => (
            <TableRow key={collection.id}>
              <TableCell>
                <Link
                  href={`/admin/collections/${collection.id}/edit`}
                  className="hover:underline"
                >
                  {collection.title}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{collection.handle}</TableCell>
              <TableCell>{collection._count.products}</TableCell>
              <TableCell>
                <DeleteCollectionButton
                  collectionId={collection.id}
                  collectionTitle={collection.title}
                  productCount={collection._count.products}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">Add a category</h2>
        <NewCollectionForm />
      </div>
    </div>
  );
}
