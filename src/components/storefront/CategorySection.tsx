import { useTranslations } from "next-intl";

import { SectionBand } from "./SectionBand";
import { CategoryTile } from "./CategoryTile";

type CategorySectionCollection = {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  products: { product: { images: { url: string; altText: string | null }[] } }[];
};

// A small enumerated set of literal Tailwind arbitrary-value classes, not a
// dynamically interpolated string — Tailwind's JIT scanner needs to see the
// full class name at build time to generate CSS for it.
const GRID_CLASS_BY_COUNT: Record<number, string> = {
  1: "grid-cols-1",
  2: "sm:grid-cols-[1.2fr_1fr]",
  3: "sm:grid-cols-[1.2fr_1fr_1fr]",
};

export function CategorySection({
  collections,
}: {
  collections: CategorySectionCollection[];
}) {
  const t = useTranslations("CategorySection");
  const tiles = collections.slice(0, 3);
  if (tiles.length === 0) return null;

  const gridClass = GRID_CLASS_BY_COUNT[tiles.length] ?? GRID_CLASS_BY_COUNT[3];

  return (
    <SectionBand tone="ink" title={t("title")} subtitle={t("subtitle")}>
      <div className={`grid grid-cols-1 gap-0.5 ${gridClass}`}>
        {tiles.map((collection, index) => {
          const leadImage = collection.products[0]?.product.images[0];
          return (
            <CategoryTile
              key={collection.id}
              href={`/collections/${collection.handle}`}
              title={collection.title}
              description={collection.description}
              imageUrl={leadImage?.url}
              imageAlt={leadImage?.altText ?? collection.title}
              tall={index === 0 && tiles.length > 1}
            />
          );
        })}
      </div>
    </SectionBand>
  );
}
