import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";

import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/localizedContent";
import { CartIconLink } from "@/components/storefront/CartIconLink";
import { UserMenu } from "@/components/storefront/UserMenu";
import { MobileNav } from "@/components/storefront/MobileNav";
import { LanguageSwitcher } from "@/components/storefront/LanguageSwitcher";
import { SocialLinks } from "@/components/storefront/SocialLinks";
import { SearchBox } from "@/components/storefront/SearchBox";
import { LeoFashionLogo } from "@/components/storefront/Logo";
import { WhatsAppButton } from "@/components/storefront/WhatsAppButton";
import { ConfirmDialogProvider } from "@/components/providers/ConfirmDialogProvider";

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
  const t = await getTranslations("Nav");
  const locale = await getLocale();
  const [collectionsRaw, user, cartItemCount] = await Promise.all([
    db.collection.findMany({ orderBy: { title: "asc" } }),
    getCurrentUser(),
    getCartItemCount(),
  ]);
  // Lets an admin browsing the storefront (not already on /admin) notice
  // there's a new order without babysitting the dashboard — mirrors the
  // admin nav's own badge (src/components/admin/AdminOrdersNavBadge.tsx),
  // same underlying count, just surfaced here too. Only ever queried for
  // an actual admin, never for a plain signed-in customer.
  const newOrderCount =
    user?.role === "admin" ? await db.order.count({ where: { viewedByAdminAt: null } }) : 0;
  // Localized once here and reused for both the desktop nav below and
  // MobileNav — see src/lib/localizedContent.ts.
  const collections = collectionsRaw.map((collection) => ({
    ...collection,
    title: localize(collection.title, collection.titleAr, locale),
  }));

  return (
    <ConfirmDialogProvider>
    <div className="flex min-h-full flex-col">
      {/* Tajawal is now the sitewide default font for Arabic (see the
          html[dir="rtl"] rule in globals.css), so this header no longer
          needs its own font-family override — the extra size/weight bump
          on the nav links just below is still deliberate, though. */}
      <header className="relative z-50 border-b border-white/10 bg-[#0a0a0a]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" aria-label={t("brandName")} dir="ltr">
            <LeoFashionLogo variant="mark" className="h-7 w-auto text-white" />
          </Link>

          {/* Full inline nav — desktop/tablet only; MobileNav below covers
              small screens with a hamburger + slide-down panel instead. The
              size/weight bump below is scoped to the actual text links
              only (not the whole <nav>), so it doesn't cascade into the
              icon-based controls (search/cart/user menu/language switcher)
              alongside them. */}
          <nav className="hidden items-center gap-5 text-sm rtl:gap-6 sm:flex">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/collections/${collection.handle}`}
                className="text-white/70 transition hover:text-white rtl:text-base rtl:font-medium"
              >
                {collection.title}
              </Link>
            ))}
            <Link
              href="/brands"
              className="text-white/70 transition hover:text-white rtl:text-base rtl:font-medium"
            >
              {t("brands")}
            </Link>
            <SearchBox />
            <CartIconLink itemCount={cartItemCount} />
            {user ? (
              <UserMenu isAdmin={user.role === "admin"} newOrderCount={newOrderCount} />
            ) : (
              <Link
                href="/login"
                className="text-white/70 transition hover:text-white rtl:text-base rtl:font-medium"
              >
                {t("signIn")}
              </Link>
            )}
            <LanguageSwitcher />
          </nav>

          <div className="flex items-center gap-1 sm:hidden">
            <SearchBox />
            <CartIconLink itemCount={cartItemCount} />
            <LanguageSwitcher />
            <MobileNav
              collections={collections}
              isSignedIn={Boolean(user)}
              isAdmin={user?.role === "admin"}
              newOrderCount={newOrderCount}
            />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      {/* z-50 on both header and footer (matching, not just "above the
          overlay") is deliberate: FilterBar's loading overlay is a
          fixed inset-0 at a lower z-index, meant to cover only the main
          content area. Rather than measuring header/footer heights to
          geometrically exclude them, this leans on both already having
          solid black backgrounds — stacking them above the overlay just
          hides it behind their opaque bg, no coordinates needed. */}
      <footer className="relative z-50 border-t border-white/10 bg-[#0a0a0a] py-10 text-center text-sm text-white/70">
        <LeoFashionLogo variant="full" className="mx-auto mb-6 h-16 w-auto text-white" />
        <SocialLinks />
        <p className="mt-4">{t("footer")}</p>
        <div className="mt-3 flex items-center justify-center gap-4 text-xs">
          <Link href="/terms" className="underline-offset-2 hover:text-white hover:underline">
            {t("termsLink")}
          </Link>
          <Link href="/privacy" className="underline-offset-2 hover:text-white hover:underline">
            {t("privacyLink")}
          </Link>
        </div>
      </footer>
      <WhatsAppButton />
    </div>
    </ConfirmDialogProvider>
  );
}
