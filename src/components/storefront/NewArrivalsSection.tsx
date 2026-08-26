import { useTranslations } from "next-intl";

import type { ProductCardData } from "@/types/product";
import { SectionBand } from "./SectionBand";
import { NewArrivalsCard } from "./NewArrivalsCard";

export function NewArrivalsSection({
  products,
  cartQuantityByVariant,
  wishlistedProductIds,
}: {
  products: ProductCardData[];
  cartQuantityByVariant?: Record<string, number>;
  wishlistedProductIds?: Set<string>;
}) {
  const t = useTranslations("NewArrivalsSection");

  return (
    <SectionBand tone="paper" title={t("title")} subtitle={t("subtitle")}>
      {products.length > 0 ? (
        <div className="bg-showcase-line-paper grid grid-cols-2 gap-px sm:grid-cols-4">
          {products.map((product) => (
            <NewArrivalsCard
              key={product.id}
              product={product}
              cartQuantityByVariant={cartQuantityByVariant}
              isWishlisted={wishlistedProductIds?.has(product.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-showcase-ink/70">{t("noProducts")}</p>
      )}
    </SectionBand>
  );
}
