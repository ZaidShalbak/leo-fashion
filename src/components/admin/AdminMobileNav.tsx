"use client";

import { useState } from "react";
import { MenuIcon, StoreIcon, XIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { AdminOrdersNavBadge } from "./AdminOrdersNavBadge";

type NavItem = { href: string; label: string };
type NavGroup = { key: string; items: NavItem[] };

/**
 * Hamburger menu for admin on narrow viewports — the desktop nav (see
 * AdminLayout) is hidden below `sm` and this takes its place, same
 * mechanics as the storefront's MobileNav (local open/close state, an
 * absolutely-positioned dropdown panel, no Radix dependency) but with its
 * own translated strings passed as props rather than calling
 * useTranslations directly, since AdminLayout already resolved every
 * label once and this avoids a second server round trip for the same
 * strings.
 */
export function AdminMobileNav({
  navGroups,
  newOrderCount,
  openMenuLabel,
  closeMenuLabel,
  viewStoreLabel,
}: {
  navGroups: NavGroup[];
  newOrderCount: number;
  openMenuLabel: string;
  closeMenuLabel: string;
  viewStoreLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? closeMenuLabel : openMenuLabel}
        className="border-border text-foreground flex size-9 items-center justify-center rounded-md border"
      >
        {open ? (
          <XIcon className="size-5" aria-hidden="true" />
        ) : (
          <MenuIcon className="size-5" aria-hidden="true" />
        )}
      </button>

      {open && (
        <nav className="border-border bg-background absolute inset-x-0 top-full z-20 flex flex-col gap-1 border-b px-4 py-3 text-sm shadow-sm">
          {navGroups.map((group) => (
            <div key={group.key} className="flex flex-col">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground relative flex items-center justify-between py-2 transition"
                >
                  {item.label}
                  {item.href === "/admin/orders" && (
                    <AdminOrdersNavBadge count={newOrderCount} inline />
                  )}
                </Link>
              ))}
            </div>
          ))}
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 border-t py-2 pt-3 transition"
          >
            <StoreIcon className="size-4" aria-hidden="true" />
            {viewStoreLabel}
          </Link>
        </nav>
      )}
    </div>
  );
}
