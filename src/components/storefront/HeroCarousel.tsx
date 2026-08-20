"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { Link } from "@/i18n/navigation";

export type HeroSlide = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  imageAlt: string;
  href: string;
  /** Optional visible button chip — the whole slide is always a link to `href` either way. */
  ctaLabel?: string | null;
};

const AUTO_ADVANCE_MS = 6000;

/**
 * Homepage hero carousel — one slide per collection (see homepage), each
 * using that collection's top product photo as the banner image and
 * linking through to the collection page. Auto-advances, pauses on
 * hover/focus, and exposes arrow + dot controls for manual navigation.
 * Built as a small client component (transform-based slide track) rather
 * than pulling in a carousel library for three-ish slides.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const t = useTranslations("HeroCarousel");
  const isRtl = useLocale() === "ar";
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const count = slides.length;

  const goTo = useCallback(
    (i: number) => {
      if (count === 0) return;
      setIndex(((i % count) + count) % count);
    },
    [count]
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (isPaused || count <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, count]);

  if (count === 0) return null;

  // `translateX` is a raw physical transform — it always moves the track
  // toward +X (visually right) for a positive value, regardless of `dir`.
  // The flex track itself already lays out slide 0 on the correct side on
  // its own (browsers reverse `flex-direction: row` under dir="rtl"), but
  // sliding it forward means moving further *toward the reading-start
  // side*, which is -X in LTR and +X in RTL — so the sign has to flip, or
  // "next slide" would visually run backwards in Arabic.
  const trackOffset = (isRtl ? 1 : -1) * index * 100;

  return (
    <section
      className="group/carousel border-border relative overflow-hidden rounded-lg border"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      aria-roledescription="carousel"
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(${trackOffset}%)` }}
      >
        {slides.map((slide) => (
          <Link
            key={slide.id}
            href={slide.href}
            className="relative aspect-[16/9] w-full shrink-0 sm:aspect-[21/9]"
          >
            <Image
              src={slide.imageUrl}
              alt={slide.imageAlt}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="from-foreground/70 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 space-y-1 p-5 sm:p-8">
              <h2 className="text-background text-xl font-semibold tracking-tight sm:text-3xl">
                {slide.title}
              </h2>
              {slide.description && (
                <p className="text-background/90 max-w-md text-sm sm:text-base">
                  {slide.description}
                </p>
              )}
              {slide.ctaLabel && (
                <span className="bg-background text-foreground mt-2 inline-block rounded-md px-3 py-1.5 text-xs font-medium sm:text-sm">
                  {slide.ctaLabel}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {count > 1 && (
        <>
          {/* Positioned with logical start-/end- (not left-/right-) so they
              swap sides in RTL, and the glyphs themselves flip too — a
              "previous" arrow should point toward the reading-start side,
              which is visually right-to-left in Arabic, not always "‹". */}
          <button
            type="button"
            onClick={prev}
            aria-label={t("previousSlide")}
            className="bg-background/80 text-foreground hover:bg-background absolute top-1/2 start-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full opacity-0 transition-opacity group-hover/carousel:opacity-100 focus-visible:opacity-100 sm:size-9"
          >
            {isRtl ? "›" : "‹"}
          </button>
          <button
            type="button"
            onClick={next}
            aria-label={t("nextSlide")}
            className="bg-background/80 text-foreground hover:bg-background absolute top-1/2 end-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full opacity-0 transition-opacity group-hover/carousel:opacity-100 focus-visible:opacity-100 sm:size-9"
          >
            {isRtl ? "‹" : "›"}
          </button>

          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-2 sm:bottom-3">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={t("goToSlide", { number: i + 1 })}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "bg-background w-6" : "bg-background/60 w-1.5"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
