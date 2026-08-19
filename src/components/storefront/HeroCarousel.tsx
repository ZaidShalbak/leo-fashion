"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type HeroSlide = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  imageAlt: string;
  href: string;
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

  return (
    <section
      className="group/carousel relative overflow-hidden rounded-sm"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      aria-roledescription="carousel"
    >
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((slide) => (
          <Link
            key={slide.id}
            href={slide.href}
            className="relative aspect-[4/5] w-full shrink-0 sm:aspect-[21/9]"
          >
            <Image
              src={slide.imageUrl}
              alt={slide.imageAlt}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
            <div className="absolute inset-x-0 bottom-0 space-y-3 p-6 sm:p-12">
              <p className="text-brand-accent text-xs tracking-[0.25em] uppercase">
                Featured collection
              </p>
              <h2 className="max-w-lg font-serif text-3xl text-white italic sm:text-5xl">
                {slide.title}
              </h2>
              {slide.description && (
                <p className="max-w-md text-sm text-white/80 sm:text-base">
                  {slide.description}
                </p>
              )}
              <span className="text-brand-accent inline-flex items-center gap-2 pt-2 text-xs tracking-[0.2em] uppercase">
                Shop now
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </span>
            </div>
          </Link>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className="flex size-9 items-center justify-center rounded-full border border-white/30 text-white opacity-0 backdrop-blur-sm transition-opacity hover:border-white/60 group-hover/carousel:opacity-100 focus-visible:opacity-100 absolute top-1/2 left-3 -translate-y-1/2 sm:left-5"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="flex size-9 items-center justify-center rounded-full border border-white/30 text-white opacity-0 backdrop-blur-sm transition-opacity hover:border-white/60 group-hover/carousel:opacity-100 focus-visible:opacity-100 absolute top-1/2 right-3 -translate-y-1/2 sm:right-5"
          >
            ›
          </button>

          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 sm:bottom-6">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={`h-[3px] rounded-full transition-all ${
                  i === index ? "w-8 bg-white" : "w-3 bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
