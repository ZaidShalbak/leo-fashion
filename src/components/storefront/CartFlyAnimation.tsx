"use client";

import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { ShirtIcon } from "lucide-react";

/** Start/end rects (viewport-relative) for one fly-to-cart animation run. */
export type FlyRun = { id: number; start: DOMRect; end: DOMRect };

/**
 * Picks whichever cart-icon instance is actually visible at the current
 * viewport width — CartIconLink renders once in the desktop nav and once
 * in the mobile top bar (see its own comment), and exactly one of the two
 * has a real, non-zero layout box at any given time since they're mutually
 * exclusive via Tailwind breakpoints.
 */
export function findVisibleCartIcon(): Element | null {
  const candidates = document.querySelectorAll("[data-cart-icon-target]");
  return Array.from(candidates).find((el) => el.getClientRects().length > 0) ?? null;
}

/**
 * The fly-to-cart flourish — a small shirt icon (a clothing-store-
 * appropriate stand-in for "the item," since actually cloning the product
 * photo would need extra prop plumbing this component doesn't otherwise
 * need) travels from wherever it was added to whichever cart icon is
 * currently visible (see findVisibleCartIcon) and shrinks away as it
 * arrives, roughly timed to land alongside CartIconLink's own badge pop-in.
 * Portaled to document.body (not rendered in place) since it needs to be
 * `position: fixed` relative to the viewport and fly across unrelated parts
 * of the page. z-[70]: above the header/footer's z-50 and the WhatsApp
 * button's z-[60] so it stays visible the entire flight, including over the
 * header itself. Shared by VariantSelector (product detail page) and
 * ProductCard (storefront grid quick-add).
 */
export function CartFlyAnimation({
  flyRun,
  onComplete,
}: {
  flyRun: FlyRun | null;
  onComplete: () => void;
}) {
  if (!flyRun) return null;

  return createPortal(
    <motion.div
      key={flyRun.id}
      className="bg-foreground text-background pointer-events-none fixed z-[70] flex size-8 items-center justify-center rounded-full shadow-lg"
      style={{
        left: flyRun.start.left + flyRun.start.width / 2 - 16,
        top: flyRun.start.top + flyRun.start.height / 2 - 16,
      }}
      initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
      animate={{
        x:
          flyRun.end.left +
          flyRun.end.width / 2 -
          (flyRun.start.left + flyRun.start.width / 2),
        y:
          flyRun.end.top +
          flyRun.end.height / 2 -
          (flyRun.start.top + flyRun.start.height / 2),
        scale: 0.4,
        opacity: 0,
        rotate: 15,
      }}
      transition={{ duration: 1.7, ease: [0.2, 0.7, 0.2, 1] }}
      onAnimationComplete={onComplete}
    >
      <ShirtIcon className="size-4" />
    </motion.div>,
    document.body
  );
}
