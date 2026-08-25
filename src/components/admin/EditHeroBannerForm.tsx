"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateHeroBanner } from "@/server/actions/admin/heroBanners";
import { HeroBannerPreview } from "./HeroBannerPreview";

type HeroBanner = {
  id: string;
  imageUrl: string;
  headline: string | null;
  subtext: string | null;
  ctaLabel: string | null;
  ctaUrl: string;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function EditHeroBannerForm({ banner }: { banner: HeroBanner }) {
  const t = useTranslations("AdminHeroBanners");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [previewUrl, setPreviewUrl] = useState(banner.imageUrl);
  const [headline, setHeadline] = useState(banner.headline ?? "");
  const [subtext, setSubtext] = useState(banner.subtext ?? "");
  const [ctaLabel, setCtaLabel] = useState(banner.ctaLabel ?? "");
  const [isActive, setIsActive] = useState(banner.isActive);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreviewUrl((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("id", banner.id);
    formData.set("isActive", String(isActive));

    startTransition(async () => {
      const result = await updateHeroBanner(formData);
      if (result.success) {
        router.push("/admin/hero-banners");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
      <div className="max-w-md space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="image">{t("replaceImageLabel")}</Label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="text-sm"
          />
          <p className="text-muted-foreground text-xs">{t("replaceImageHelp")}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="headline">{t("headlineLabel")}</Label>
          <Input
            id="headline"
            name="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">{t("headlineHelp")}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="subtext">{t("subtextLabel")}</Label>
          <Input id="subtext" name="subtext" value={subtext} onChange={(e) => setSubtext(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ctaLabel">{t("ctaLabelLabel")}</Label>
            <Input
              id="ctaLabel"
              name="ctaLabel"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder={t("ctaLabelPlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ctaUrl">{t("ctaUrlLabel")}</Label>
            <Input id="ctaUrl" name="ctaUrl" defaultValue={banner.ctaUrl} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="startsAt">{t("startsAtLabel")}</Label>
            <Input
              id="startsAt"
              name="startsAt"
              type="date"
              defaultValue={banner.startsAt ? toDateInputValue(banner.startsAt) : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endsAt">{t("endsAtLabel")}</Label>
            <Input
              id="endsAt"
              name="endsAt"
              type="date"
              defaultValue={banner.endsAt ? toDateInputValue(banner.endsAt) : ""}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          {t("activeLabel")}
        </label>

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? t("saving") : t("saveChanges")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/hero-banners")}
          >
            {t("cancel")}
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <HeroBannerPreview
          imageUrl={previewUrl}
          headline={headline}
          subtext={subtext}
          ctaLabel={ctaLabel}
        />
      </div>
    </form>
  );
}
