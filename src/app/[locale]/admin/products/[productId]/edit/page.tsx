import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { EditProductForm } from "@/components/admin/EditProductForm";
import { VariantsManager } from "@/components/admin/VariantsManager";
import { ImageManager } from "@/components/admin/ImageManager";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/products/[productId]/edit">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminProducts" });
  return { title: t("metaTitleEdit") };
}

export default async function EditProductPage({
  params,
}: PageProps<"/[locale]/admin/products/[productId]/edit">) {
  const { productId } = await params;
  const t = await getTranslations("AdminProducts");

  const [product, collections, brands] = await Promise.all([
    db.product.findUnique({
      where: { id: productId },
      include: {
        variants: { orderBy: { sku: "asc" } },
        collections: true,
        images: { orderBy: { position: "asc" } },
      },
    }),
    db.collection.findMany({ orderBy: { title: "asc" } }),
    db.brand.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!product) notFound();

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("editProductHeading")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{product.title}</p>
      </div>

      <EditProductForm
        product={{
          id: product.id,
          title: product.title,
          slug: product.slug,
          description: product.description,
          titleAr: product.titleAr,
          descriptionAr: product.descriptionAr,
          basePriceCents: product.basePriceCents,
          status: product.status,
          brandId: product.brandId,
          collectionIds: product.collections.map((c) => c.collectionId),
        }}
        collections={collections}
        brands={brands}
      />

      <div className="space-y-3">
        <h2 className="text-sm font-medium">{t("imagesHeading")}</h2>
        <ImageManager
          productId={product.id}
          images={product.images}
          colors={[...new Set(product.variants.map((v) => v.color))]}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">{t("variantsHeading")}</h2>
        <VariantsManager productId={product.id} variants={product.variants} />
      </div>
    </div>
  );
}
