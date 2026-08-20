"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateHeroBanner } from "@/server/actions/admin/heroBanners";
import { HeroBannerPreview } from "./HeroBannerPreview";

type HeroBanner = {
  id: string;
  imageUrl: string;
  headline: string;
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
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [previewUrl, setPreviewUrl] = useState(banner.imageUrl);
  const [headline, setHeadline] = useState(banner.headline);
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
          <Label htmlFor="image">Replace image (optional)</Label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="text-sm"
          />
          <p className="text-muted-foreground text-xs">Leave empty to keep the current photo.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="headline">Headline</Label>
          <Input
            id="headline"
            name="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="subtext">Subtext (optional)</Label>
          <Input id="subtext" name="subtext" value={subtext} onChange={(e) => setSubtext(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ctaLabel">Button text (optional)</Label>
            <Input
              id="ctaLabel"
              name="ctaLabel"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="Shop now"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ctaUrl">Links to</Label>
            <Input id="ctaUrl" name="ctaUrl" defaultValue={banner.ctaUrl} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="startsAt">Starts on (optional)</Label>
            <Input
              id="startsAt"
              name="startsAt"
              type="date"
              defaultValue={banner.startsAt ? toDateInputValue(banner.startsAt) : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endsAt">Ends on (optional)</Label>
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
          Active
        </label>

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/hero-banners")}
          >
            Cancel
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
