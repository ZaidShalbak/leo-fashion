"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDownIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Same custom cubic-bezier RollingText.tsx already uses for timed UI-chrome
// reveals (as opposed to the springs VariantSelector uses for interactive
// selection state) — keeps this dropdown's motion in the same "voice" as
// the rest of the site rather than introducing a new feel.
const EASE = [0.338, 0.015, 0.395, 0.959] as const;

const panelVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: EASE, staggerChildren: 0.03, delayChildren: 0.05 },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE } },
};

// Exported so CategoriesMenuGrid/BrandsMenuGrid's tiles can opt into the
// panel's stagger — a motion.div using this as its `variants` picks up
// the parent's staggerChildren automatically as long as it doesn't set
// its own initial/animate, per Motion's variant-propagation behavior.
export const staggerItemVariants = {
  hidden: { opacity: 0, y: -6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE } },
};

const CLOSE_DELAY_MS = 150;

/**
 * Shared trigger+panel behavior for the header's Categories/Brands
 * dropdowns — hover-intent open (a short delay on leave so moving the
 * pointer from the trigger to the panel doesn't flicker closed), plus
 * click-toggle and outside-click/Escape-to-close, matching the pattern
 * already established in UserMenu.tsx/SearchBox.tsx. Content is passed
 * as children so both menus share identical open/close/animation
 * behavior by construction.
 */
export function NavMegaMenu({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function closeSoon() {
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }
  function closeNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) closeNow();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeNow();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative" onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        type="button"
        onClick={() => (open ? closeNow() : openNow())}
        aria-expanded={open}
        className="flex items-center gap-1 text-white/70 transition hover:text-white rtl:text-base rtl:font-medium"
      >
        {label}
        <ChevronDownIcon
          className={`size-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={closeNow}
            className="border-border bg-background text-foreground absolute start-0 top-full z-30 mt-3 w-[min(32rem,calc(100vw-2rem))] rounded-md border p-4 shadow-lg"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
