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
import { NavMegaMenu } from "@/components/storefront/NavMegaMenu";
import { CategoriesMenuGrid, type CategoryMenuItem } from "@/components/storefront/CategoriesMenuGrid";
import { BrandsMenuGrid, type BrandMenuItem } from "@/components/storefront/BrandsMenuGrid";

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
  const tBrands = await getTranslations("BrandsSection");
  const locale = await getLocale();
  const [collectionsRaw, brandsRaw, user, cartItemCount] = await Promise.all([
    // Includes each collection's first active product's first image (not
    // just bare id/handle/title) so the Categories mega menu can show a
    // real photo per tile — same shape page.tsx's homepage query uses,
    // minus the sale-percent calculation the homepage layers on top,
    // since the mega menu deliberately skips sale badges (see
    // NavMegaMenu/CategoriesMenuGrid).
    db.collection.findMany({
      orderBy: { title: "asc" },
      include: {
        products: {
          take: 1,
          orderBy: { product: { createdAt: "asc" } },
          where: { product: { status: "active" } },
          include: {
            product: {
              include: { images: { orderBy: { position: "asc" }, take: 1 } },
            },
          },
        },
      },
    }),
    // Same shape as the homepage's brand query — every brand plus its
    // active-product count, for the Brands mega menu.
    db.brand.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: { where: { status: "active" } } } } },
    }),
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
            </nav>

            <div className="flex items-center gap-5 rtl:gap-6">
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
