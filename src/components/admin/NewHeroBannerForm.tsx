"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createHeroBanner } from "@/server/actions/admin/heroBanners";
import { HeroBannerPreview } from "./HeroBannerPreview";

export function NewHeroBannerForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // All controlled, purely so HeroBannerPreview can reflect every
  // keystroke/file pick live — createHeroBanner still reads the actual
  // form fields via FormData on submit, not this state.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [subtext, setSubtext] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [isActive, setIsActive] = useState(true);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("isActive", String(isActive));

    startTransition(async () => {
      const result = await createHeroBanner(formData);
      if (result.success) {
        formRef.current?.reset();
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setHeadline("");
        setSubtext("");
        setCtaLabel("");
        setIsActive(true);
        // The reorder list above is keyed off the banner id list (see
        // AdminHeroBannersPage), so this refresh both re-fetches the row
        // we just created *and* forces that list to remount and pick it
        // up — without the key, a plain refresh() alone wouldn't do
        // anything since the list component isn't being re-mounted.
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
      <div className="max-w-md space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="image">Image</Label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            required
            className="text-sm"
          />
          <p className="text-muted-foreground text-xs">
            A wide photo works best — around a 21:9 or 16:9 crop.
          </p>
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
            <Input id="ctaUrl" name="ctaUrl" placeholder="/collections/outerwear" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="startsAt">Starts on (optional)</Label>
            <Input id="startsAt" name="startsAt" type="date" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endsAt">Ends on (optional)</Label>
            <Input id="endsAt" name="endsAt" type="date" />
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

        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding…" : "Add banner"}
        </Button>
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
