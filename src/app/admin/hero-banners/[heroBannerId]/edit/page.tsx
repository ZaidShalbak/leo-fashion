import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { db } from "@/server/db";
import { EditHeroBannerForm } from "@/components/admin/EditHeroBannerForm";

export const metadata: Metadata = { title: "Edit hero banner — Admin" };

type Props = {
  params: Promise<{ heroBannerId: string }>;
};

export default async function EditHeroBannerPage({ params }: Props) {
  const { heroBannerId } = await params;

  const banner = await db.heroBanner.findUnique({ where: { id: heroBannerId } });
  if (!banner) notFound();

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Edit hero banner</h1>
        <p className="text-muted-foreground mt-1 text-sm">{banner.headline}</p>
      </div>

      <EditHeroBannerForm banner={banner} />
    </div>
  );
}
