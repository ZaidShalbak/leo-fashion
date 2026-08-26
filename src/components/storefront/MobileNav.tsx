"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Link } from "@/i18n/navigation";
import { SignOutButton } from "./SignOutButton";

type Collection = { id: string; handle: string; title: string };

/**
 * Hamburger menu for small screens — the desktop header's full inline nav
 * (see StorefrontLayout) is hidden below `sm`, and this button/panel takes
 * its place instead of trying to squeeze the same links onto one line.
 * Cart stays as its own always-visible icon link in the header regardless
 * of screen size, since it's the single most-used link.
 *
 * The "Admin" item uses the same locale-aware `Link` as everything else
 * here — /admin is now a nested, bilingual route under [locale] (see
 * src/app/[locale]/admin/layout.tsx), same reasoning as UserMenu.
 */
export function MobileNav({
  collections,
  isSignedIn,
  isAdmin = false,
  newOrderCount = 0,
}: {
  collections: Collection[];
  isSignedIn: boolean;
  isAdmin?: boolean;
  newOrderCount?: number;
}) {
  const t = useTranslations("MobileNav");
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? t("closeMenu") : t("openMenu")}
        className="flex size-9 items-center justify-center rounded-md border border-white/20 text-white"
      >
        <span className="sr-only">{open ? t("closeMenu") : t("openMenu")}</span>
        {open ? (
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {open && (
        <nav className="border-border bg-background absolute inset-x-0 top-full z-20 flex flex-col gap-1 border-b px-4 py-3 text-sm shadow-sm">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/collections/${collection.handle}`}
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground py-2 transition"
            >
              {collection.title}
            </Link>
          ))}
          <Link
            href="/brands"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground py-2 transition"
          >
            {t("brands")}
          </Link>
          {isSignedIn ? (
            <>
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground py-2 transition"
              >
                {t("myAccount")}
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground flex items-center justify-between py-2 transition"
                >
                  {t("admin")}
                  {newOrderCount > 0 && (
                    <span className="bg-destructive flex size-4 items-center justify-center rounded-full text-[10px] leading-none font-medium text-white">
                      {newOrderCount > 9 ? "9+" : newOrderCount}
                    </span>
                  )}
                </Link>
              )}
              <div className="py-2">
                <SignOutButton label={t("signOut")} pendingLabel={t("signingOut")} />
              </div>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground py-2 transition"
            >
              {t("signIn")}
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
