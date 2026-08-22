"use client";

import { motion } from "motion/react";

const outgoingVariants = { rest: { y: "0%" }, active: { y: "100%" } };
const incomingVariants = { rest: { y: "-100%" }, active: { y: "0%" } };
const transition = { duration: 0.3, ease: [0.338, 0.015, 0.395, 0.959] as const };

/**
 * Hover micro-interaction for a button/link label: the current label
 * rolls down and out while a duplicate rolls down and in from above,
 * landing in the same spot — from Motion's "Rolling text button" example
 * (motion.dev/examples/react-rolling-text-button), adapted into a
 * reusable, purely presentational wrapper so it can drop into any
 * button's label without duplicating this markup per call site.
 *
 * Deliberately a *controlled* component (`active`, not its own internal
 * hover state) — a version that manages its own onMouseEnter/Leave would
 * only ever see hover events that land on this label span itself, which
 * is smaller than the button's full clickable area (padding included),
 * so hovering the padding wouldn't trigger it. Callers instead put the
 * hover listeners on the actual button/link element and pass the result
 * in as `active`, matching real button hover semantics regardless of
 * padding. Only the second (incoming) span is `aria-hidden` — it's a
 * visual clone used purely for the roll-in effect; the first span still
 * carries the button's real accessible name, same as if this wrapper
 * weren't here at all.
 */
export function RollingText({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="relative inline-block overflow-hidden align-middle">
      <motion.span
        className="block"
        variants={outgoingVariants}
        initial="rest"
        animate={active ? "active" : "rest"}
        transition={transition}
      >
        {children}
      </motion.span>
      <motion.span
        className="absolute inset-0 block"
        variants={incomingVariants}
        initial="rest"
        animate={active ? "active" : "rest"}
        transition={transition}
        aria-hidden="true"
      >
        {children}
      </motion.span>
    </span>
  );
}
