import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { isHeroBannerLive } from "@/lib/heroBanners";
import { HeroBannerReorderList } from "@/components/admin/HeroBannerReorderList";
import { NewHeroBannerForm } from "@/components/admin/NewHeroBannerForm";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/hero-banners">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminHeroBanners" });
  return { title: t("metaTitle") };
}

function statusOf(
  banner: { isActive: boolean; startsAt: Date | null; endsAt: Date | null },
  now: Date
): "live" | "scheduled" | "expired" | "inactive" {
  if (!banner.isActive) return "inactive";
  if (isHeroBannerLive(banner, now)) return "live";
  if (banner.startsAt && banner.startsAt.getTime() > now.getTime()) return "scheduled";
  return "expired";
}

export default async function AdminHeroBannersPage() {
  const t = await getTranslations("AdminHeroBanners");
  const banners = await db.heroBanner.findMany({ orderBy: { position: "asc" } });
  const now = new Date();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subheading")}</p>
      </div>

      <HeroBannerReorderList
        // Keyed off the id list so that when a banner is added or removed
        // elsewhere on this page (see NewHeroBannerForm's router.refresh()),
        // React remounts the list with the fresh prop instead of keeping the
        // old internal state around — a plain prop change wouldn't
        // otherwise be picked up, since the list owns its own working copy
        // for drag-and-drop. Reordering itself doesn't change this key (see
        // HeroBannerReorderList), so an in-progress or just-saved drag isn't
        // disturbed by it.
        key={banners.map((b) => b.id).join(",")}
        banners={banners.map((b) => ({
          id: b.id,
          imageUrl: b.imageUrl,
          headline: b.headline,
          status: statusOf(b, now),
        }))}
      />

      <div className="space-y-3">
        <h2 className="text-sm font-medium">{t("addBannerHeading")}</h2>
        <NewHeroBannerForm />
      </div>
    </div>
  );
}
