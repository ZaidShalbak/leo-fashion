"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { LogOutIcon, PackageIcon, ShieldIcon, UserIcon } from "lucide-react";

import { signOut } from "@/server/actions/auth";

/**
 * Replaces the old "Orders" / "Admin" / "Sign out" text links with a
 * single user-icon button that opens a small dropdown holding all three —
 * the desktop-nav equivalent of what MobileNav already collapses into its
 * hamburger panel. Closes on an outside click or Escape.
 */
export function UserMenu({ isAdmin = false }: { isAdmin?: boolean }) {
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
        aria-label="Account menu"
        className="text-muted-foreground hover:text-foreground flex size-9 items-center justify-center transition"
      >
        <UserIcon className="size-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="border-border bg-background absolute top-full right-0 z-20 mt-1 min-w-40 rounded-md border py-1 text-sm shadow-md"
        >
          <Link
            href="/account/orders"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="hover:bg-muted flex items-center gap-2 px-3 py-2 transition"
          >
            <PackageIcon className="size-4" />
            Orders
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="hover:bg-muted flex items-center gap-2 px-3 py-2 transition"
            >
              <ShieldIcon className="size-4" />
              Admin
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            disabled={isPending}
            onClick={handleSignOut}
            className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-left transition disabled:opacity-50"
          >
            <LogOutIcon className="size-4" />
            {isPending ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
