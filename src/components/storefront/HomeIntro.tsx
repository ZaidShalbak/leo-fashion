"use client";

import { motion } from "motion/react";

const transition = { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const };

/**
 * The homepage's intro line, directly below the hero carousel and above
 * the "showcase" bands (CategorySection, BrandsSection, etc). Bigger and
 * bolder than the plain text it used to be, using the same
 * font-showcase-display treatment as the section headings below it so it
 * reads as a bridge between the hero and those bands — but deliberately
 * kept inside the normal constrained container (not a full-bleed ink band
 * of its own), since the hero already owns the "big cinematic statement"
 * job immediately above it; a second full-bleed dark band here would
 * compete with it rather than lead into it.
 */
export function HomeIntro({ title, tagline }: { title: string; tagline: string }) {
  return (
    <section className="space-y-3">
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        // font-bold pins an explicit, exactly-loaded weight (700) rather
        // than the browser's default 400 — Tajawal was only loaded at
        // 500/700/800 (see layout.tsx), and Latin glyphs specifically
        // (this title stays untranslated, see CLAUDE.md) don't reliably
        // nearest-match to a loaded weight the way Arabic script does,
        // rendering as a thin fallback instead. Bebas Neue only has one
        // static weight and renders identically regardless.
        className="font-showcase-display text-foreground text-5xl leading-[0.9] font-bold uppercase sm:text-7xl rtl:normal-case"
        dir="ltr"
      >
        {title}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transition, delay: 0.12 }}
        className="text-muted-foreground max-w-xl text-base sm:text-lg"
      >
        {tagline}
      </motion.p>
    </section>
  );
}
