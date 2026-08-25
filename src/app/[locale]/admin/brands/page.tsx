import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { Link } from "@/i18n/navigation";
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

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/brands">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminBrands" });
  return { title: t("metaTitle") };
}

export default async function AdminBrandsPage() {
  const t = await getTranslations("AdminBrands");
  const brands = await db.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subheading")}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnName")}</TableHead>
            <TableHead>{t("columnSlug")}</TableHead>
            <TableHead>{t("columnProducts")}</TableHead>
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
        <h2 className="text-sm font-medium">{t("addBrandHeading")}</h2>
        <NewBrandForm />
      </div>
    </div>
  );
}
