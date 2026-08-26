"use client";

import { useTranslations } from "next-intl";
import { HeartIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Link } from "@/i18n/navigation";

/**
 * Wishlist entry point in the header — only rendered for a signed-in
 * visitor (see StorefrontLayout; a guest has no wishlist to link to, see
 * wishlist.ts). Same animated-badge treatment as CartIconLink, just a
 * heart instead of a bag, linking straight to the account page's wishlist
 * section.
 */
export function WishlistIconLink({ itemCount }: { itemCount: number }) {
  const t = useTranslations("WishlistActions");

  return (
    <Link
      href="/account#wishlist"
      aria-label={itemCount > 0 ? t("headerLabelWithCount", { count: itemCount }) : t("headerLabel")}
      className="relative flex size-9 items-center justify-center text-white/70 transition hover:text-white"
    >
      <motion.span
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
        <HeartIcon className={itemCount > 0 ? "size-5 fill-current" : "size-5"} />
      </motion.span>
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.span
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
