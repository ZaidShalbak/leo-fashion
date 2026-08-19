import Link from "next/link";
import { cookies } from "next/headers";

import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { SignOutButton } from "@/components/storefront/SignOutButton";
import { MobileNav } from "@/components/storefront/MobileNav";

async function getCartItemCount(): Promise<number> {
  const user = await getCurrentUser();

  if (user) {
    const cart = await db.cart.findUnique({
      where: { userId: user.id },
      include: { items: true },
    });
    return cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  }

  const cookieStore = await cookies();
  const guestToken = cookieStore.get("cart_token")?.value;
  if (!guestToken) return 0;

  const cart = await db.cart.findUnique({
    where: { guestToken },
    include: { items: true },
  });
  return cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collections, user, cartItemCount] = await Promise.all([
    db.collection.findMany({ orderBy: { title: "asc" } }),
    getCurrentUser(),
    getCartItemCount(),
  ]);

  // `dark` applies the storefront's dark-luxe palette (see globals.css) —
  // scoped to this subtree only, so /admin keeps the plain light theme.
  // `min-h-screen` (not `min-h-full`) because `min-height: 100%` doesn't
  // reliably resolve through body's own `min-h-full` — a `min-height`
  // ancestor doesn't establish a definite height for percentage children,
  // so on short pages this div would fall short of the viewport and leave
  // a plain-white gap below the footer (only visible now that the
  // storefront background isn't plain white anymore).
  return (
    <div className="dark bg-background text-foreground flex min-h-screen flex-col">
      <header className="border-border bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
          <Link
            href="/"
            className="font-serif text-xl tracking-tight italic"
          >
            Leo Fashion
          </Link>

          {/* Full inline nav — desktop/tablet only; MobileNav below covers
              small screens with a hamburger + slide-down panel instead. */}
          <nav className="hidden items-center gap-6 text-xs tracking-widest uppercase sm:flex">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/collections/${collection.handle}`}
                className="text-muted-foreground hover:text-foreground transition"
              >
                {collection.title}
              </Link>
            ))}
            <Link
              href="/brands"
              className="text-muted-foreground hover:text-foreground transition"
            >
              Brands
            </Link>
            <Link
              href="/cart"
              className="text-muted-foreground hover:text-foreground transition"
            >
              Cart{cartItemCount > 0 ? ` (${cartItemCount})` : ""}
            </Link>
            {user ? (
              <>
                <Link
                  href="/account/orders"
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  Orders
                </Link>
                {user.role === "admin" && (
                  <Link
                    href="/admin"
                    className="text-brand-accent hover:text-foreground transition"
                  >
                    Admin
                  </Link>
                )}
                <SignOutButton />
              </>
            ) : (
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground transition"
              >
                Sign in
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-4 sm:hidden">
            <Link
              href="/cart"
              className="text-muted-foreground hover:text-foreground text-xs tracking-widest uppercase transition"
            >
              Cart{cartItemCount > 0 ? ` (${cartItemCount})` : ""}
            </Link>
            <MobileNav
              collections={collections}
              isSignedIn={Boolean(user)}
              isAdmin={user?.role === "admin"}
            />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-border text-muted-foreground border-t py-10 text-center text-xs tracking-widest uppercase">
        Leo Fashion — pay-on-delivery / invoice checkout, no card required.
      </footer>
    </div>
  );
}
