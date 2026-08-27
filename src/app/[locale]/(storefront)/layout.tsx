import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";

import type { User } from "@prisma/client";

import { db } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { getBrandsWithActiveCountCached, getCollectionsWithLeadImageCached } from "@/server/queries";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/localizedContent";
import { CartIconLink } from "@/components/storefront/CartIconLink";
import { WishlistIconLink } from "@/components/storefront/WishlistIconLink";
import { UserMenu } from "@/components/storefront/UserMenu";
import { MobileNav } from "@/components/storefront/MobileNav";
import { LanguageSwitcher } from "@/components/storefront/LanguageSwitcher";
import { SocialLinks } from "@/components/storefront/SocialLinks";
import { SearchBox } from "@/components/storefront/SearchBox";
import { LeoFashionLogo } from "@/components/storefront/Logo";
import { WhatsAppButton } from "@/components/storefront/WhatsAppButton";
import { ConfirmDialogProvider } from "@/components/providers/ConfirmDialogProvider";
import { NavMegaMenu } from "@/components/storefront/NavMegaMenu";
import { CategoriesMenuGrid, type CategoryMenuItem } from "@/components/storefront/CategoriesMenuGrid";
import { BrandsMenuGrid, type BrandMenuItem } from "@/components/storefront/BrandsMenuGrid";
import { StoreLocationCard } from "@/components/storefront/StoreLocationCard";

/** Takes the already-resolved user rather than calling getCurrentUser()
 * itself — that call is real work (a Supabase Auth check plus a DB
 * lookup), and this used to run it a second time on every single
 * storefront page load, duplicating the one StorefrontLayout already
 * does below. */
async function getCartItemCount(user: User | null): Promise<number> {
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

/** Only ever queried for a signed-in user — a guest has no wishlist (see
 * wishlist.ts), so callers check `user` first rather than this returning
 * 0 for both "signed out" and "no items" cases. */
async function getWishlistItemCount(userId: string): Promise<number> {
  return db.wishlistItem.count({ where: { userId } });
}

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("Nav");
  const tBrands = await getTranslations("BrandsSection");
  const locale = await getLocale();
  // Resolved once, up front, and passed down to every branch below that
  // needs to know who's signed in — see getCartItemCount's comment for
  // why this can't just run inside the Promise.all like the other
  // fetches (they'd each redundantly re-resolve it themselves).
  const user = await getCurrentUser();
  // Both collection/brand queries are cached (60s) and shared with the
  // homepage, which needs the exact same data — see
  // src/server/queries.ts. Sale-percent badges the homepage layers on
  // top are computed separately there, from the (deliberately uncached)
  // live Sale rows; the mega menu itself skips sale badges entirely (see
  // NavMegaMenu/CategoriesMenuGrid). newOrderCount and wishlistItemCount
  // used to run as two sequential awaits after this block — now
  // parallelized alongside everything else, since both only depend on
  // the `user` already resolved above.
  const [collectionsRaw, brandsRaw, cartItemCount, newOrderCount, wishlistItemCount] = await Promise.all([
    getCollectionsWithLeadImageCached(),
    getBrandsWithActiveCountCached(),
    getCartItemCount(user),
    // Lets an admin browsing the storefront (not already on /admin)
    // notice there's a new order without babysitting the dashboard —
    // mirrors the admin nav's own badge
    // (src/components/admin/AdminOrdersNavBadge.tsx), same underlying
    // count, just surfaced here too. Only ever queried for an actual
    // admin, never for a plain signed-in customer.
    user?.role === "admin" ? db.order.count({ where: { viewedByAdminAt: null } }) : Promise.resolve(0),
    user ? getWishlistItemCount(user.id) : Promise.resolve(0),
  ]);
  // Localized once here and reused for both the desktop nav below and
  // MobileNav — see src/lib/localizedContent.ts.
  const collections = collectionsRaw.map((collection) => ({
    ...collection,
    title: localize(collection.title, collection.titleAr, locale),
  }));
  const categoryMenuItems: CategoryMenuItem[] = collections.map((collection) => {
    const leadImage = collection.products[0]?.product.images[0];
    return {
      id: collection.id,
      handle: collection.handle,
      title: collection.title,
      imageUrl: leadImage?.url,
      imageAlt: leadImage?.altText ?? collection.title,
    };
  });
  const brandMenuItems: BrandMenuItem[] = brandsRaw.map((brand) => ({
    id: brand.id,
    slug: brand.slug,
    name: localize(brand.name, brand.nameAr, locale),
    logoUrl: brand.logoUrl,
    itemCountLabel: tBrands("itemCount", { count: brand._count.products }),
  }));

  return (
    <ConfirmDialogProvider>
    <div className="flex min-h-full flex-col">
      {/* Tajawal is now the sitewide default font for Arabic (see the
          html[dir="rtl"] rule in globals.css), so this header no longer
          needs its own font-family override — the extra size/weight bump
          on the nav links just below is still deliberate, though. */}
      <header className="relative z-50 border-b border-white/10 bg-[#0a0a0a]">
        <div className="mx-auto max-w-6xl px-4">
          {/* Row 1: logo (start) — always-visible search + language switcher
              (desktop/tablet, end) — mobile's own icon row (small screens
              only, unchanged from before this redesign). */}
          <div className="flex items-center justify-between gap-4 py-4">
            <Link href="/" aria-label={t("brandName")} dir="ltr">
              <LeoFashionLogo variant="mark" className="h-7 w-auto text-white" />
            </Link>

            <div className="hidden flex-1 items-center justify-end gap-5 sm:flex">
              <div className="w-full max-w-md">
                <SearchBox alwaysOpen />
              </div>
              <LanguageSwitcher />
            </div>

            <div className="flex items-center gap-1 sm:hidden">
              <SearchBox />
              {user && <WishlistIconLink itemCount={wishlistItemCount} />}
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

          {/* Row 2: Categories/Brands mega-menu triggers (start) — cart +
              account (end). Desktop/tablet only; MobileNav's hamburger
              panel covers the same navigation on small screens. The
              size/weight bump below is scoped to the actual trigger/link
              text only, not the icon-based controls beside it. */}
          <div className="hidden items-center justify-between gap-5 border-t border-white/10 py-3 text-sm rtl:gap-6 sm:flex">
            <nav className="flex items-center gap-5 rtl:gap-6">
              <NavMegaMenu label={t("categories")}>
                <CategoriesMenuGrid categories={categoryMenuItems} />
              </NavMegaMenu>
              <NavMegaMenu label={t("brands")}>
                <BrandsMenuGrid brands={brandMenuItems} />
              </NavMegaMenu>
              <Link href="/sale" className="font-medium text-red-400 transition hover:text-red-300">
                {t("sale")}
              </Link>
            </nav>

            <div className="flex items-center gap-5 rtl:gap-6">
              {user && <WishlistIconLink itemCount={wishlistItemCount} />}
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
            </div>
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
      <footer className="relative z-50 border-t border-white/10 bg-[#0a0a0a] py-14 text-sm text-white/70">
        <div className="mx-auto max-w-4xl px-4">
          {/* Mobile: everything stacks in one centered column. sm: and up:
              two even columns — the location card on its own on the start
              side, brand/social/legal on the end side — mirroring
              correctly under RTL via plain DOM order (CSS Grid is
              direction-aware, same reasoning already used for the
              product-detail/checkout grids) rather than any explicit
              start/end utility on the grid itself. */}
          <div className="grid grid-cols-1 items-start gap-12 text-center sm:grid-cols-2 sm:gap-16 sm:text-start">
            <div className="flex justify-center sm:justify-start">
              <StoreLocationCard />
            </div>

            <div className="flex flex-col items-center sm:items-start">
              <LeoFashionLogo variant="full" className="mb-6 h-24 w-auto text-white" />
              <p className="mb-8 max-w-sm">{t("footer")}</p>
              <p className="mb-3 text-xs font-medium tracking-[0.1em] text-white/45 uppercase">
                {t("followUs")}
              </p>
              <SocialLinks />
              <div className="mt-8 flex flex-col items-center gap-2 text-xs sm:items-start">
                <Link href="/terms" className="underline-offset-2 hover:text-white hover:underline">
                  {t("termsLink")}
                </Link>
                <Link href="/privacy" className="underline-offset-2 hover:text-white hover:underline">
                  {t("privacyLink")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
      <WhatsAppButton />
    </div>
    </ConfirmDialogProvider>
  );
}
