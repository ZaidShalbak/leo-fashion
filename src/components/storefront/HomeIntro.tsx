"use client";

import { motion } from "motion/react";

const transition = { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const };

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
 *
 * The whole block — title AND tagline — stays LTR-anchored regardless of
 * locale, matching the already-established "Leo Fashion" LTR-island
 * treatment (see CLAUDE.md — the nav wordmark does the same). `dir="ltr"`
 * lives on the wrapping <section>, not just the title: putting it only on
 * the title wasn't enough on its own — a block-level element narrower
 * than its container (the tagline's `max-w-xl`) still hugs the *end* edge
 * under RTL flow regardless of its own text-align, so with only the title
 * pinned left, the tagline drifted to the right edge below it, splitting
 * the block across both sides of the page. Fine when the title was small
 * text; glaring once it became a multi-line headline. Setting `dir` on
 * the shared ancestor fixes both the box flow and the default text
 * alignment in one place. The tagline's Arabic text still renders with
 * correct internal (right-to-left) character order either way — Unicode
 * bidi resolution follows each character's own script, not the paragraph
 * base direction; `dir` only decides which edge things default to.
 */
export function HomeIntro({ title, tagline }: { title: string; tagline: string }) {
  return (
    <section className="space-y-3" dir="ltr">
      <motion.h1
        initial={{ opacity: 0, y: 28 }}
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
      >
        {title}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transition, delay: 0.2 }}
        className="text-muted-foreground max-w-xl text-base sm:text-lg"
      >
        {tagline}
      </motion.p>
    </section>
  );
}
