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

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-border relative border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Leo Fashion
          </Link>

          {/* Full inline nav — desktop/tablet only; MobileNav below covers
              small screens with a hamburger + slide-down panel instead. */}
          <nav className="hidden items-center gap-5 text-sm sm:flex">
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

          <div className="flex items-center gap-3 sm:hidden">
            <Link
              href="/cart"
              className="text-muted-foreground hover:text-foreground text-sm transition"
            >
              Cart{cartItemCount > 0 ? ` (${cartItemCount})` : ""}
            </Link>
            <MobileNav collections={collections} isSignedIn={Boolean(user)} />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-border text-muted-foreground border-t py-8 text-center text-sm">
        Leo Fashion — pay-on-delivery / invoice checkout, no card required.
      </footer>
    </div>
  );
}
