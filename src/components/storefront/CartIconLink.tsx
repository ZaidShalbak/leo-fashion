"use client";

import { useTranslations } from "next-intl";
import { ShoppingBagIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Link } from "@/i18n/navigation";

/**
 * Cart entry point in the header — a bag icon with a small count badge
 * instead of a "Cart (N)" text link. Shared between the desktop nav and
 * the always-visible mobile top bar (see StorefrontLayout) so both stay in
 * sync if the treatment ever changes.
 *
 * `data-cart-icon-target` marks both instances as valid landing spots for
 * VariantSelector's fly-to-cart animation, which picks whichever one is
 * actually visible at the current viewport width (only one ever is, since
 * the desktop nav and mobile top bar are mutually exclusive via Tailwind
 * breakpoints — see StorefrontLayout).
 */
export function CartIconLink({ itemCount }: { itemCount: number }) {
  const t = useTranslations("CartIcon");

  return (
    <Link
      href="/cart"
      data-cart-icon-target
      aria-label={itemCount > 0 ? t("labelWithCount", { count: itemCount }) : t("label")}
      className="relative flex size-9 items-center justify-center text-white/70 transition hover:text-white"
    >
      <motion.span
        // Keyed by count, same trick as the badge below — a plain keyed
        // element replays its `animate` on every distinct value, so this
        // bump/wiggle fires on every add, not just the first one. Explicit
        // `initial` (matching the resting pose) is required here: without
        // it, Motion treats a freshly-keyed element's `animate` values as
        // its starting pose too and nothing actually plays.
        key={itemCount}
        initial={{ scale: 1, rotate: 0 }}
        animate={
          itemCount > 0
            ? { scale: [1, 1.3, 0.9, 1.05, 1], rotate: [0, -12, 10, -4, 0] }
            : { scale: 1, rotate: 0 }
        }
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex"
      >
        <ShoppingBagIcon className="size-5" />
      </motion.span>
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.span
            // Keyed by the count itself, not just presence — remounts (and
            // so replays the pop-in) every time the number changes, not
            // only on the 0-to-1 transition.
            key={itemCount}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
            className="bg-destructive absolute -top-0.5 -end-0.5 flex size-4 items-center justify-center rounded-full text-[10px] leading-none font-medium text-white"
          >
            {itemCount > 9 ? "9+" : itemCount}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
