import type { Metadata } from "next";

import { db } from "@/server/db";
import { isHeroBannerLive } from "@/lib/heroBanners";
import { HeroBannerReorderList } from "@/components/admin/HeroBannerReorderList";
import { NewHeroBannerForm } from "@/components/admin/NewHeroBannerForm";

export const metadata: Metadata = { title: "Hero banners — Admin" };

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
  const banners = await db.heroBanner.findMany({ orderBy: { position: "asc" } });
  const now = new Date();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Hero banners</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          What shows in the homepage carousel. If there are no live banners, the homepage falls
          back to showing your categories instead.
        </p>
      </div>

      <HeroBannerReorderList
        banners={banners.map((b) => ({
          id: b.id,
          imageUrl: b.imageUrl,
          headline: b.headline,
          status: statusOf(b, now),
        }))}
      />

      <div className="space-y-3">
        <h2 className="text-sm font-medium">Add a banner</h2>
        <NewHeroBannerForm />
      </div>
    </div>
  );
}
