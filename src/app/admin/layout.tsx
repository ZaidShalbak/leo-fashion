import Link from "next/link";

import { requireAdmin } from "@/server/auth";
import { SignOutButton } from "@/components/storefront/SignOutButton";

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
  );
}
