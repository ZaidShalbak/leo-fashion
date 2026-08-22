import type { Metadata } from "next";
import Link from "next/link";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import { requireAdmin } from "@/server/auth";
import { SignOutButton } from "@/components/storefront/SignOutButton";
import "../globals.css";

export const metadata: Metadata = {
  title: {
    default: "Leo Fashion Admin",
    template: "%s — Leo Fashion Admin",
  },
  description: "Leo Fashion admin dashboard.",
};

/**
 * Root layout for the admin dashboard. This is a *second*, independent
 * root layout — src/app/[locale]/layout.tsx is the other one, for the
 * storefront. The admin dashboard is deliberately English-only/LTR (it's
 * an internal tool used by one person, not worth translating — see
 * src/i18n/routing.ts and CLAUDE.md) and lives entirely outside the
 * [locale] routing scheme, so it needs its own <html>/<body>/fonts rather
 * than nesting under the storefront's locale-aware root layout. Next.js
 * supports this "multiple root layouts" structure as long as there's no
 * single shared layout.tsx above both branches (see
 * node_modules/next/dist/docs/.../next-root-params.md).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Explicit gate — a route living under /admin is not itself a security
  // boundary, per CLAUDE.md. Every admin page (and every admin server
  // action) checks this independently too.
  const admin = await requireAdmin();

  return (
    <html
      lang="en"
      dir="ltr"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="flex min-h-full flex-col">
          <header className="border-border border-b">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4">
              <div className="flex items-center gap-6">
                <Link href="/admin" className="text-lg font-semibold tracking-tight">
                  Leo Fashion Admin
                </Link>
                <nav className="flex gap-5 text-sm">
                  <Link
                    href="/admin/products"
                    className="text-muted-foreground hover:text-foreground transition"
                  >
                    Products
                  </Link>
                  <Link
                    href="/admin/brands"
                    className="text-muted-foreground hover:text-foreground transition"
                  >
                    Brands
                  </Link>
                  <Link
                    href="/admin/collections"
                    className="text-muted-foreground hover:text-foreground transition"
                  >
                    Categories
                  </Link>
                  <Link
                    href="/admin/inventory"
                    className="text-muted-foreground hover:text-foreground transition"
                  >
                    Inventory
                  </Link>
                  <Link
                    href="/admin/orders"
                    className="text-muted-foreground hover:text-foreground transition"
                  >
                    Orders
                  </Link>
                  <Link
                    href="/admin/discount-codes"
                    className="text-muted-foreground hover:text-foreground transition"
                  >
                    Discount codes
                  </Link>
                  <Link
                    href="/admin/sales"
                    className="text-muted-foreground hover:text-foreground transition"
                  >
                    Sales
                  </Link>
                  <Link
                    href="/admin/delivery-zones"
                    className="text-muted-foreground hover:text-foreground transition"
                  >
                    Delivery areas
                  </Link>
                  <Link
                    href="/admin/hero-banners"
                    className="text-muted-foreground hover:text-foreground transition"
                  >
                    Hero banners
                  </Link>
                </nav>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <Link href="/" className="text-muted-foreground hover:text-foreground transition">
                  View store
                </Link>
                <span className="text-muted-foreground">{admin.email}</span>
                <SignOutButton />
              </div>
            </div>
          </header>
          <main className="flex-1">
            <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
