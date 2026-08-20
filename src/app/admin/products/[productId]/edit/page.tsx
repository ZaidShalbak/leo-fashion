import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { db } from "@/server/db";
import { EditProductForm } from "@/components/admin/EditProductForm";
import { VariantsManager } from "@/components/admin/VariantsManager";
import { ImageManager } from "@/components/admin/ImageManager";

export const metadata: Metadata = { title: "Edit product — Admin" };

type Props = {
  params: Promise<{ productId: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { productId } = await params;

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
        <h1 className="text-xl font-semibold tracking-tight">Edit product</h1>
        <p className="text-muted-foreground mt-1 text-sm">{product.title}</p>
      </div>

      <EditProductForm
        product={{
          id: product.id,
          title: product.title,
          slug: product.slug,
          description: product.description,
          basePriceCents: product.basePriceCents,
          status: product.status,
          brandId: product.brandId,
          collectionIds: product.collections.map((c) => c.collectionId),
        }}
        collections={collections}
        brands={brands}
      />

      <div className="space-y-3">
        <h2 className="text-sm font-medium">Images</h2>
        <ImageManager
          productId={product.id}
          images={product.images}
          colors={[...new Set(product.variants.map((v) => v.color))]}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">Variants</h2>
        <VariantsManager productId={product.id} variants={product.variants} />
      </div>
    </div>
  );
}
