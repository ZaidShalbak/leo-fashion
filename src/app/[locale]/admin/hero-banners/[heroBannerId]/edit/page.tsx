import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { EditHeroBannerForm } from "@/components/admin/EditHeroBannerForm";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/hero-banners/[heroBannerId]/edit">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminHeroBanners" });
  return { title: t("editMetaTitle") };
}

export default async function EditHeroBannerPage({
  params,
}: PageProps<"/[locale]/admin/hero-banners/[heroBannerId]/edit">) {
  const { heroBannerId } = await params;
  const t = await getTranslations("AdminHeroBanners");

  const banner = await db.heroBanner.findUnique({ where: { id: heroBannerId } });
  if (!banner) notFound();

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("editHeading")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{banner.headline}</p>
      </div>

      <EditHeroBannerForm banner={banner} />
    </div>
  );
}
