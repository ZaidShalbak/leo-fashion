"use client";

import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LogOutIcon, PackageIcon, ShieldIcon, UserIcon } from "lucide-react";

import { signOut } from "@/server/actions/auth";
import { Link } from "@/i18n/navigation";

/**
 * Replaces the old "Orders" / "Admin" / "Sign out" text links with a
 * single user-icon button that opens a small dropdown holding all three —
 * the desktop-nav equivalent of what MobileNav already collapses into its
 * hamburger panel. Closes on an outside click or Escape.
 *
 * The closed icon and the open panel are two separate elements sharing a
 * `layoutId` — Motion morphs the bounding box between them (a small
 * circle -> a wider menu box) instead of the panel just appearing next to
 * a still-visible icon, per Motion's "Clerk: User Button" example
 * (motion.dev/examples/react-clerk-user-button): the closed control
 * expands *into* the open menu rather than opening a separate panel
 * beside it.
 *
 * The "Admin" item deliberately uses plain next/link (aliased `NextLink`),
 * not the locale-aware `Link` — /admin lives outside the [locale] routing
 * scheme entirely (see src/i18n/routing.ts), so prefixing it with the
 * current locale would produce a broken /en/admin or /ar/admin URL.
 */
export function UserMenu({ isAdmin = false }: { isAdmin?: boolean }) {
  const t = useTranslations("UserMenu");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleSignOut() {
    setOpen(false);
    startTransition(() => signOut());
  }

  return (
    <div ref={containerRef} className="relative">
      <AnimatePresence initial={false}>
        {!open && (
          <motion.button
            key="closed"
            layoutId="user-menu-shell"
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="menu"
            aria-expanded={false}
            aria-label={t("accountMenu")}
            className="flex size-9 items-center justify-center rounded-full text-white/70 transition hover:text-white"
          >
            <UserIcon className="size-5" />
          </motion.button>
        )}

        {open && (
          <motion.div
            key="open"
            layoutId="user-menu-shell"
            role="menu"
            aria-label={t("accountMenu")}
            className="border-border bg-background absolute top-0 end-0 z-20 min-w-40 overflow-hidden rounded-md border py-1 text-sm shadow-md"
          >
            <motion.div
              // The shell's own layout morph (position/size/border-radius)
              // is handled by the shared layoutId above; this inner fade
              // is just for the menu items themselves, so they don't pop
              // in instantly the moment the shell has barely started
              // expanding.
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.15 }}
            >
              <Link
                href="/account/orders"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="hover:bg-muted flex items-center gap-2 px-3 py-2 transition"
              >
                <PackageIcon className="size-4" />
                {t("orders")}
              </Link>
              {isAdmin && (
                <NextLink
                  href="/admin"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="hover:bg-muted flex items-center gap-2 px-3 py-2 transition"
                >
                  <ShieldIcon className="size-4" />
                  {t("admin")}
                </NextLink>
              )}
              <button
                type="button"
                role="menuitem"
                disabled={isPending}
                onClick={handleSignOut}
                className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-start transition disabled:opacity-50"
              >
                <LogOutIcon className="size-4" />
                {isPending ? t("signingOut") : t("signOut")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
