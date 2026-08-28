"use client";

import Image from "next/image";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, useScroll, useTransform } from "motion/react";

type WalkFrame = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  imageUrl: string;
  imageAlt: string;
};

/**
 * A real, matched photo series — not disconnected stock photos — so the
 * walk-through actually reads as one place: all 8 shots on Unsplash's
 * @mercantile account are Clark Street Mercantile's own photos of their
 * own menswear boutique (5200 Clark St, Montreal), shot on the same
 * camera in the same visit. Freely licensed (Unsplash License). Ordered
 * to read as walking deeper in — wide interior view, into the racks,
 * then closer looks at individual pieces on display — even though it's
 * still someone else's real store, not this one. Swap for a real
 * walkthrough of the actual store whenever one exists; nothing else in
 * this component needs to change to do that.
 */
const WALK_FRAMES: WalkFrame[] = [
  {
    id: "interior",
    titleKey: "interiorTitle",
    descriptionKey: "interiorDescription",
    imageUrl:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2400&auto=format&fit=crop",
    imageAlt: "Clothing boutique interior",
  },
  {
    id: "racks",
    titleKey: "racksTitle",
    descriptionKey: "racksDescription",
    imageUrl:
      "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=2400&auto=format&fit=crop",
    imageAlt: "Clothing boutique interior with hanging racks",
  },
  {
    id: "jacket-1",
    titleKey: "detailTitle",
    descriptionKey: "detailDescription",
    imageUrl:
      "https://images.unsplash.com/photo-1441986380878-c4248f5b8b5b?q=80&w=2400&auto=format&fit=crop",
    imageAlt: "Jacket displayed on a wall",
  },
  {
    id: "jacket-2",
    titleKey: "styleTitle",
    descriptionKey: "styleDescription",
    imageUrl:
      "https://images.unsplash.com/photo-1441984344779-4716bd9e6b04?q=80&w=2400&auto=format&fit=crop",
    imageAlt: "Jacket hanging on a wooden wall beside a decorative paddle",
  },
  {
    id: "shoe",
    titleKey: "boutiqueTitle",
    descriptionKey: "boutiqueDescription",
    imageUrl:
      "https://images.unsplash.com/photo-1441986236893-3b3ed54c6cb1?q=80&w=2400&auto=format&fit=crop",
    imageAlt: "Leather wingtip shoe on a floating shelf",
  },
];

/**
 * EXPERIMENTAL homepage section — a scroll-linked "walk through the store"
 * (inspired by animejs.com's Scroll Observer-driven homepage demo and
 * Apple-style scroll-scrubbed product pages) rather than the timer/arrow-
 * driven HeroCarousel. The section pins in place (`sticky top-0`) for one
 * viewport-height of scroll per frame; each frame's opacity/scale/depth is
 * derived directly from scroll progress via Motion's
 * useScroll/useTransform (already the animation library used everywhere
 * else in this app) rather than React state synced to a scroll listener,
 * keeping the animation on the compositor thread instead of tied to
 * render passes.
 *
 * A real Apple-style effect scrubs through dozens/hundreds of photographed
 * frames along one continuous camera path — this store doesn't have that
 * (no physical location to shoot), so instead this crossfades between a
 * real matched photo series of one actual boutique (see WALK_FRAMES above)
 * with a stronger forward-dolly zoom, a subtle `perspective`/`rotateX`
 * tilt that settles as each frame becomes current, and the title/
 * description drifting slightly slower than the photo — three cheap depth
 * cues (scale, tilt, parallax) standing in for true 3D, not a literal
 * continuous corridor. Deliberately kept separate from HeroCarousel
 * rather than replacing it — this is here to be evaluated, not committed
 * to.
 */
export function ScrollCarousel() {
  const t = useTranslations("ScrollCarousel");
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const count = WALK_FRAMES.length;

  return (
    <section
      ref={containerRef}
      // One viewport-height of scroll distance per frame — long enough
      // that each frame gets a real, deliberate dwell as you scroll
      // through it, short enough that trying it out doesn't take forever.
      style={{ height: `${count * 100}vh` }}
      className="relative"
    >
      <div
        className="bg-showcase-ink text-showcase-paper sticky top-0 h-screen overflow-hidden"
        style={{ perspective: "1200px" }}
      >
        <div className="absolute inset-x-0 top-8 z-10 text-center sm:top-10">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase opacity-55">
            {t("eyebrow")}
          </p>
        </div>

        {WALK_FRAMES.map((frame, index) => (
          <ScrollCarouselFrame
            key={frame.id}
            frame={frame}
            index={index}
            count={count}
            scrollYProgress={scrollYProgress}
            title={t(frame.titleKey)}
            description={t(frame.descriptionKey)}
          />
        ))}

        <div className="absolute inset-x-0 bottom-8 z-10 flex justify-center gap-2 sm:bottom-10">
          {WALK_FRAMES.map((frame, index) => (
            <ScrollCarouselDot
              key={frame.id}
              index={index}
              count={count}
              scrollYProgress={scrollYProgress}
              label={t("dotLabel", { title: t(frame.titleKey) })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ScrollCarouselFrame({
  frame,
  index,
  count,
  scrollYProgress,
  title,
  description,
}: {
  frame: WalkFrame;
  index: number;
  count: number;
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  title: string;
  description: string;
}) {
  // Each frame owns an equal [start, end) segment of the full 0-1 scroll
  // range. A short overlap on either side (rather than a hard cut) is
  // what produces the crossfade — progress values inside a frame's own
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
  // A pronounced continuous scale across this frame's own segment — the
  // main "walking toward it" cue, stronger than a simple Ken Burns drift
  // since this is standing in for forward camera motion, not just a
  // slow zoom on a static product photo.
  const scale = useTransform(scrollYProgress, [start, end], [1, 1.35]);
  // Settles from a slight backward tilt to dead-on as the frame becomes
  // current — combined with the `perspective` on the parent, this reads
  // as the frame swinging into place rather than a flat crossfade.
  const rotateX = useTransform(
    scrollYProgress,
    [Math.max(0, start - overlap), start],
    [6, 0]
  );
  // The text drifts upward slower than the photo scales — a cheap
  // multi-plane parallax cue (foreground text, background photo moving
  // at different rates) that reinforces depth without a second image
  // layer.
  const textY = useTransform(scrollYProgress, [start, end], [24, -24]);

  return (
    <motion.div style={{ opacity }} className="absolute inset-0">
      <motion.div style={{ scale, rotateX }} className="absolute inset-0">
        <Image
          src={frame.imageUrl}
          alt={frame.imageAlt}
          fill
          priority={index === 0}
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>
      <div className="absolute inset-0 bg-black/40" />
      <motion.div
        style={{ y: textY }}
        className="absolute inset-x-0 bottom-24 space-y-2 px-6 text-center sm:bottom-28"
      >
        <h2 className="font-showcase-display text-[clamp(2rem,6vw,4rem)] leading-[0.95] font-bold uppercase rtl:normal-case">
          {title}
        </h2>
        <p className="mx-auto max-w-md text-sm opacity-80 sm:text-base">{description}</p>
      </motion.div>
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
