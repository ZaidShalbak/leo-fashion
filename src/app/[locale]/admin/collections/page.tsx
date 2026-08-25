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
import { NewCollectionForm } from "@/components/admin/NewCollectionForm";
import { DeleteCollectionButton } from "@/components/admin/DeleteCollectionButton";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/collections">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminCollections" });
  return { title: t("metaTitle") };
}

export default async function AdminCollectionsPage() {
  const t = await getTranslations("AdminCollections");
  const collections = await db.collection.findMany({
    orderBy: { title: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("subheadingPrefix")} <code>/collections/[handle]</code>
          {t("subheadingSuffix")}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnName")}</TableHead>
            <TableHead>{t("columnHandle")}</TableHead>
            <TableHead>{t("columnProducts")}</TableHead>
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
        <h2 className="text-sm font-medium">{t("addCategoryHeading")}</h2>
        <NewCollectionForm />
      </div>
    </div>
  );
}
