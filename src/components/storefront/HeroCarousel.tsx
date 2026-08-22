"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { Link } from "@/i18n/navigation";

export type HeroSlide = {
  id: string;
  /** Optional — some banners bake their own stylized text into the image
   * and don't want a second HTML text layer on top of it. */
  title: string | null;
  description: string | null;
  imageUrl: string;
  imageAlt: string;
  href: string;
  /** Optional visible button chip — the whole slide is always a link to `href` either way. */
  ctaLabel?: string | null;
};

const AUTO_ADVANCE_MS = 6000;
const KEN_BURNS_SCALE = 1.08;

/**
 * Homepage hero carousel — one slide per collection (see homepage), each
 * using that collection's top product photo as the banner image and
 * linking through to the collection page. Auto-advances, pauses on
 * hover/focus, and exposes arrow + dot controls for manual navigation.
 *
 * Only the current slide is ever mounted — AnimatePresence crossfades the
 * outgoing slide out while the incoming one fades in (rather than the
 * earlier version's single flex track holding every slide side by side
 * and sliding a translateX offset). That also removes what used to be
 * this file's trickiest bit: a `dir`-aware sign flip on the slide
 * offset, since a physical `translateX` doesn't mirror under RTL on its
 * own (see CLAUDE.md) — a pure opacity crossfade has no direction to get
 * backwards in the first place. The image inside each slide gets a slow
 * "Ken Burns" zoom (scale 1 -> 1.08) timed to the slide's full dwell
 * time, restarting fresh on every slide since it's keyed by slide.id and
 * so fully remounts each time.
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

  const slide = slides[index]!;

  return (
    <section
      className="group/carousel relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      aria-roledescription="carousel"
    >
      <div className="relative aspect-[16/9] sm:aspect-[21/9]">
        <AnimatePresence initial={false}>
          <motion.div
            key={slide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <Link href={slide.href} className="absolute inset-0 block overflow-hidden">
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: KEN_BURNS_SCALE }}
                transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: "linear" }}
                className="absolute inset-0"
              >
                <Image
                  src={slide.imageUrl}
                  alt={slide.imageAlt}
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className="object-cover"
                />
              </motion.div>
              {(slide.title || slide.description || slide.ctaLabel) && (
                <>
                  {/* Only rendered when there's actual text to protect —
                      a pure-image banner (baked-in text, nothing set here)
                      shows completely clean, no gradient darkening it for
                      no reason. */}
                  <div className="from-foreground/70 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 space-y-1 p-5 sm:p-8">
                    {slide.title && (
                      <h2 className="text-background text-xl font-semibold tracking-tight sm:text-3xl">
                        {slide.title}
                      </h2>
                    )}
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
                </>
              )}
            </Link>
          </motion.div>
        </AnimatePresence>
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
            {slides.map((s, i) => (
              <button
                key={s.id}
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
