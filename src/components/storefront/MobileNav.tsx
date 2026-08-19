"use client";

import Link from "next/link";
import { useState } from "react";

import { SignOutButton } from "./SignOutButton";

type Collection = { id: string; handle: string; title: string };

/**
 * Hamburger menu for small screens — the desktop header's full inline nav
 * (see StorefrontLayout) is hidden below `sm`, and this button/panel takes
 * its place instead of trying to squeeze the same links onto one line.
 * Cart stays as its own always-visible icon link in the header regardless
 * of screen size, since it's the single most-used link.
 */
export function MobileNav({
  collections,
  isSignedIn,
  isAdmin = false,
}: {
  collections: Collection[];
  isSignedIn: boolean;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="border-border flex size-9 items-center justify-center rounded-md border"
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
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
        <nav className="border-border bg-background absolute inset-x-0 top-full z-20 flex flex-col gap-1 border-b px-4 py-4 text-xs tracking-widest uppercase shadow-lg">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/collections/${collection.handle}`}
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground py-2.5 transition"
            >
              {collection.title}
            </Link>
          ))}
          <Link
            href="/brands"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground py-2.5 transition"
          >
            Brands
          </Link>
          {isSignedIn ? (
            <>
              <Link
                href="/account/orders"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground py-2.5 transition"
              >
                Orders
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="text-brand-accent hover:text-foreground py-2.5 transition"
                >
                  Admin
                </Link>
              )}
              <div className="py-2.5">
                <SignOutButton />
              </div>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground py-2.5 transition"
            >
              Sign in
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
