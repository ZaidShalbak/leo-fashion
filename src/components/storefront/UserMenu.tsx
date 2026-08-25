"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { LogOutIcon, PackageIcon, ShieldIcon, UserIcon } from "lucide-react";

import { signOut } from "@/server/actions/auth";
import { Link } from "@/i18n/navigation";

/**
 * Replaces the old "Orders" / "Admin" / "Sign out" text links with a
 * single user-icon button that opens a small dropdown holding all three —
 * the desktop-nav equivalent of what MobileNav already collapses into its
 * hamburger panel. Closes on an outside click or Escape.
 *
 * The "Admin" item uses the locale-aware `Link` like every other item
 * here — /admin is now a nested, bilingual route under [locale] (see
 * src/app/[locale]/admin/layout.tsx), not a locale-blind second root
 * layout, so it needs the current locale prefix like any other link.
 */
export function UserMenu({
  isAdmin = false,
  newOrderCount = 0,
}: {
  isAdmin?: boolean;
  newOrderCount?: number;
}) {
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
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          isAdmin && newOrderCount > 0
            ? t("accountMenuWithNewOrders", { count: newOrderCount })
            : t("accountMenu")
        }
        className="relative flex size-9 items-center justify-center text-white/70 transition hover:text-white"
      >
        <UserIcon className="size-5" />
        {isAdmin && newOrderCount > 0 && (
          <span className="bg-destructive absolute top-1 end-1 flex size-4 items-center justify-center rounded-full text-[10px] leading-none font-medium text-white">
            {newOrderCount > 9 ? "9+" : newOrderCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="border-border bg-background absolute top-full end-0 z-20 mt-1 min-w-40 rounded-md border py-1 text-sm shadow-md"
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
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="hover:bg-muted flex items-center justify-between gap-2 px-3 py-2 transition"
            >
              <span className="flex items-center gap-2">
                <ShieldIcon className="size-4" />
                {t("admin")}
              </span>
              {newOrderCount > 0 && (
                <span className="bg-destructive flex size-4 items-center justify-center rounded-full text-[10px] leading-none font-medium text-white">
                  {newOrderCount > 9 ? "9+" : newOrderCount}
                </span>
              )}
            </Link>
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
        </div>
      )}
    </div>
  );
}
