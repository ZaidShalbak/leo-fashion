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
import { NewBrandForm } from "@/components/admin/NewBrandForm";
import { DeleteBrandButton } from "@/components/admin/DeleteBrandButton";

export const metadata: Metadata = { title: "Brands — Admin" };

export default async function AdminBrandsPage() {
  const brands = await db.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Brands</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          The vendors and partner labels sold on the storefront.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Products</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {brands.map((brand) => (
            <TableRow key={brand.id}>
              <TableCell>
                <Link href={`/admin/brands/${brand.id}/edit`} className="hover:underline">
                  {brand.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{brand.slug}</TableCell>
              <TableCell>{brand._count.products}</TableCell>
              <TableCell>
                <DeleteBrandButton
                  brandId={brand.id}
                  brandName={brand.name}
                  productCount={brand._count.products}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">Add a brand</h2>
        <NewBrandForm />
      </div>
    </div>
  );
}
