import { useTranslations } from "next-intl";

import { SectionBand } from "./SectionBand";
import { CategoryTile } from "./CategoryTile";

type CategorySectionCollection = {
  id: string;
  handle: string;
  title: string;
  salePercentOff: number | null;
  products: { product: { images: { url: string; altText: string | null }[] } }[];
};

/**
 * A dense wall of small square tiles — every category, not a curated top
 * 3 — deliberately unlike BestSellersSection's few large full-bleed photo
 * cards right below it on the homepage, so the two ink-toned bands don't
 * read as the same layout twice. 2 columns on mobile (was a single giant
 * min-h-[400px] tile per row before this redesign — this is the actual
 * fix for that), up to 5 on desktop.
 */
export function CategorySection({
  collections,
}: {
  collections: CategorySectionCollection[];
}) {
  const t = useTranslations("CategorySection");
  // A collection with no active product/image yet degrades gracefully by
  // just not getting a tile, same "skip rather than show broken"
  // reasoning already used for the hero carousel's collection-derived
  // fallback slides.
  const tiles = collections.filter((collection) => collection.products[0]?.product.images[0]);
  if (tiles.length === 0) return null;

  return (
    <SectionBand tone="ink" title={t("title")} subtitle={t("subtitle")}>
      <div className="border-showcase-ink grid grid-cols-2 border-t-2 border-s-2 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((collection) => {
          const leadImage = collection.products[0]?.product.images[0];
          return (
            <CategoryTile
              key={collection.id}
              href={`/collections/${collection.handle}`}
              title={collection.title}
              imageUrl={leadImage?.url}
              imageAlt={leadImage?.altText ?? collection.title}
              onSaleLabel={
                collection.salePercentOff != null
                  ? t("onSale", { percent: collection.salePercentOff })
                  : undefined
              }
            />
          );
        })}
      </div>
    </SectionBand>
  );
}
