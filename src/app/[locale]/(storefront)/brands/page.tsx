import Image from "next/image";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { localize } from "@/lib/localizedContent";

type Props = {
  params: Promise<{ locale: AppLocale }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BrandsPage" });
  return { title: t("title") };
}

export default async function BrandsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("BrandsPage");
  const brandsRaw = await db.brand.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { status: "active" } } } } },
  });
  const brands = brandsRaw.map((brand) => ({
    ...brand,
    name: localize(brand.name, brand.nameAr, locale),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground max-w-xl">{t("subtitle")}</p>
      </div>

      {brands.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.slug}`}
              className="border-border bg-card group flex flex-col items-center gap-3 rounded-lg border p-6 text-center transition hover:shadow-sm"
            >
              {brand.logoUrl ? (
                <div className="relative h-12 w-full">
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    fill
                    sizes="200px"
                    className="object-contain grayscale transition group-hover:grayscale-0"
                    // See BrandsSection.tsx — brand logos are arbitrary
                    // admin-entered URLs, so they can't be covered by a
                    // static remotePatterns allowlist.
                    unoptimized
                  />
                </div>
              ) : (
                <span className="text-sm font-semibold">{brand.name}</span>
              )}
              <div>
                <h2 className="text-sm font-medium">{brand.name}</h2>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {t("itemCount", { count: brand._count.products })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">{t("noBrands")}</p>
      )}
    </div>
  );
}
