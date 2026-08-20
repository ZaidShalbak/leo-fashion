"use client";

import Image from "next/image";

/**
 * A live, always-in-sync preview of one carousel slide — deliberately
 * styled identically to the real HeroCarousel slide markup (same aspect
 * ratio, gradient, text layout, CTA chip) so what an admin sees while
 * filling out the form is what actually ships on the homepage, not an
 * approximation. Pure/presentational: the calling form owns all the state
 * and just re-renders this on every keystroke/file pick.
 */
export function HeroBannerPreview({
  imageUrl,
  headline,
  subtext,
  ctaLabel,
}: {
  imageUrl: string | null;
  headline: string;
  subtext: string;
  ctaLabel: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium">Preview</p>
      <div className="bg-muted border-border relative aspect-[16/9] w-full overflow-hidden rounded-lg border sm:aspect-[21/9]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            unoptimized={imageUrl.startsWith("blob:")}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            Choose an image to preview it here
          </div>
        )}
        <div className="from-foreground/70 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 space-y-1 p-5 sm:p-8">
          <h2 className="text-background text-xl font-semibold tracking-tight sm:text-3xl">
            {headline || "Your headline"}
          </h2>
          {subtext && (
            <p className="text-background/90 max-w-md text-sm sm:text-base">{subtext}</p>
          )}
          {ctaLabel && (
            <span className="bg-background text-foreground mt-2 inline-block rounded-md px-3 py-1.5 text-xs font-medium sm:text-sm">
              {ctaLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
