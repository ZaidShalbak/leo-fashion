import { useTranslations } from "next-intl";

import type { ProductCardData } from "@/types/product";
import { SectionBand } from "./SectionBand";
import { BestSellerItem } from "./BestSellerItem";

export function BestSellersSection({ products }: { products: ProductCardData[] }) {
  const t = useTranslations("BestSellersSection");
  if (products.length === 0) return null;

  return (
    <SectionBand tone="ink" title={t("title")} subtitle={t("subtitle")} className="pb-0!">
      <div className="bg-showcase-line -mx-6 flex flex-col gap-px sm:-mx-10 sm:flex-row">
        {products.map((product, index) => (
          <BestSellerItem key={product.id} product={product} rank={index + 1} />
        ))}
      </div>
    </SectionBand>
  );
}
