"use client";

import Image from "next/image";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, useScroll, useTransform } from "motion/react";

import { Link } from "@/i18n/navigation";

export type ScrollCarouselSlide = {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  imageUrl: string;
  imageAlt: string;
};

/**
 * EXPERIMENTAL homepage section — a scroll-linked carousel (inspired by
 * animejs.com's Scroll Observer-driven homepage demo) rather than the
 * timer/arrow-driven HeroCarousel. The section pins in place
 * (`sticky top-0`) for one viewport-height of scroll per slide; each
 * slide's opacity/scale is derived directly from scroll progress via
 * Motion's useScroll/useTransform (already the animation library used
 * everywhere else in this app — HeroCarousel, RollingText, NavMegaMenu,
 * FilterSidebar's collapsible sections — so this needed no new
 * dependency) rather than React state synced to a scroll listener, which
 * keeps the animation on the compositor thread instead of tied to
 * render passes.
 *
 * Deliberately kept separate from HeroCarousel rather than replacing
 * it — this is here to be evaluated, not committed to.
 */
export function ScrollCarousel({ slides }: { slides: ScrollCarouselSlide[] }) {
  const t = useTranslations("ScrollCarousel");
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const count = slides.length;
  if (count === 0) return null;

  return (
    <section
      ref={containerRef}
      // One viewport-height of scroll distance per slide — long enough
      // that each slide gets a real, deliberate dwell as you scroll
      // through it, short enough that trying it out doesn't take forever.
      style={{ height: `${count * 100}vh` }}
      className="relative"
    >
      <div className="bg-showcase-ink text-showcase-paper sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-x-0 top-8 z-10 text-center sm:top-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase opacity-55">
            {t("eyebrow")}
          </p>
        </div>

        {slides.map((slide, index) => (
          <ScrollCarouselSlideLayer
            key={slide.id}
            slide={slide}
            index={index}
            count={count}
            scrollYProgress={scrollYProgress}
          />
        ))}

        <div className="absolute inset-x-0 bottom-8 z-10 flex justify-center gap-2 sm:bottom-10">
          {slides.map((slide, index) => (
            <ScrollCarouselDot
              key={slide.id}
              index={index}
              count={count}
              scrollYProgress={scrollYProgress}
              label={t("dotLabel", { title: slide.title })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ScrollCarouselSlideLayer({
  slide,
  index,
  count,
  scrollYProgress,
}: {
  slide: ScrollCarouselSlide;
  index: number;
  count: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  // Each slide owns an equal [start, end) segment of the full 0-1 scroll
  // range. A short overlap on either side (rather than a hard cut) is
  // what produces the crossfade — progress values inside a slide's own
  // segment sit at opacity 1; the overlap into its neighbors' segments
  // is where the fade actually happens.
  const segment = 1 / count;
  const start = index * segment;
  const end = start + segment;
  const overlap = segment * 0.4;

  const opacity = useTransform(
    scrollYProgress,
    [
      Math.max(0, start - overlap),
      start,
      end - overlap,
      Math.min(1, end),
    ],
    [0, 1, 1, 0]
  );
  // A slow, continuous scale tied to how far *through* this slide's own
  // segment scroll progress currently is — same "photo drifts slowly
  // while its slide is showing" idea as HeroCarousel's Ken Burns zoom,
  // just driven by scroll position instead of elapsed time.
  const scale = useTransform(scrollYProgress, [start, end], [1, 1.12]);

  return (
    <motion.div style={{ opacity }} className="absolute inset-0">
      <Link href={`/collections/${slide.handle}`} className="absolute inset-0 block">
        <motion.div style={{ scale }} className="absolute inset-0">
          <Image
            src={slide.imageUrl}
            alt={slide.imageAlt}
            fill
            priority={index === 0}
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-x-0 bottom-24 space-y-2 px-6 text-center sm:bottom-28">
          <h2 className="font-showcase-display text-[clamp(2rem,6vw,4rem)] leading-[0.95] font-bold uppercase rtl:normal-case">
            {slide.title}
          </h2>
          {slide.description && (
            <p className="mx-auto max-w-md text-sm opacity-80 sm:text-base">
              {slide.description}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

function ScrollCarouselDot({
  index,
  count,
  scrollYProgress,
  label,
}: {
  index: number;
  count: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  label: string;
}) {
  const segment = 1 / count;
  const start = index * segment;
  const end = start + segment;
  const width = useTransform(scrollYProgress, [start, (start + end) / 2, end], [6, 24, 6]);

  return <motion.span aria-label={label} style={{ width }} className="bg-showcase-paper h-1.5 rounded-full" />;
}
