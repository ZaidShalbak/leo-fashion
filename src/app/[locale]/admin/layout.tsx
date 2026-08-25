import type { Metadata } from "next";
import {
  BadgePercentIcon,
  ClipboardListIcon,
  LayersIcon,
  PercentIcon,
  ShirtIcon,
  StoreIcon,
  TagIcon,
  TruckIcon,
  ImageIcon as HeroBannerIcon,
  WarehouseIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { Link } from "@/i18n/navigation";
import { SignOutButton } from "@/components/storefront/SignOutButton";
import { AdminOrdersNavBadge } from "@/components/admin/AdminOrdersNavBadge";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { AdminLanguageSwitcher } from "@/components/admin/AdminLanguageSwitcher";
import { ConfirmDialogProvider } from "@/components/providers/ConfirmDialogProvider";

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]/admin">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminLayout" });
  return {
    title: { default: t("metaTitle"), template: `%s — ${t("metaTitle")}` },
    description: t("metaDescription"),
  };
}

// Nav items grouped by concern (catalog / commerce / content) — a thin
// rule is rendered between groups in the sidebar instead of reordering
// the items themselves, since the original order already followed this
// same grouping.
const NAV_GROUPS = [
  {
    key: "catalog",
    items: [
      { href: "/admin/products", labelKey: "navProducts", Icon: ShirtIcon } as const,
      { href: "/admin/brands", labelKey: "navBrands", Icon: TagIcon } as const,
      { href: "/admin/collections", labelKey: "navCategories", Icon: LayersIcon } as const,
      { href: "/admin/inventory", labelKey: "navInventory", Icon: WarehouseIcon } as const,
    ],
  },
  {
    key: "commerce",
    items: [
      { href: "/admin/orders", labelKey: "navOrders", Icon: ClipboardListIcon } as const,
      { href: "/admin/discount-codes", labelKey: "navDiscountCodes", Icon: PercentIcon } as const,
      { href: "/admin/sales", labelKey: "navSales", Icon: BadgePercentIcon } as const,
      { href: "/admin/delivery-zones", labelKey: "navDeliveryAreas", Icon: TruckIcon } as const,
    ],
  },
  {
    key: "content",
    items: [
      { href: "/admin/hero-banners", labelKey: "navHeroBanners", Icon: HeroBannerIcon } as const,
    ],
  },
] satisfies { key: string; items: readonly { href: string; labelKey: string; Icon: typeof ShirtIcon }[] }[];

/**
 * Nested layout under src/app/[locale]/layout.tsx — admin no longer owns
 * its own <html>/<body> root (that layout already provides it, plus fonts
 * and NextIntlClientProvider), now that admin is genuinely bilingual
 * rather than a deliberately-unlocalized second root layout. See
 * src/proxy.ts for the matching change (admin no longer excluded from
 * locale routing).
 *
 * Nav lives in a sidebar (not a horizontal bar) so the header stays light
 * — brand, language, "view store", and sign-out only — regardless of how
 * many admin sections exist. A plain flex row with the sidebar first in
 * DOM order and the main content second renders the sidebar on the
 * correct side automatically under both dir="ltr" and dir="rtl" (flex-row
 * is direction-aware), no locale-conditional class needed.
 */
export default async function AdminLayout({
  children,
}: LayoutProps<"/[locale]/admin">) {
  // Explicit gate — a route living under /admin is not itself a security
  // boundary, per CLAUDE.md. Every admin page (and every admin server
  // action) checks this independently too.
  await requireAdmin();
  const newOrderCount = await db.order.count({ where: { viewedByAdminAt: null } });
  const t = await getTranslations("AdminLayout");

  const navGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.map((item) => ({ ...item, label: t(item.labelKey) })),
  }));
  // AdminMobileNav is a Client Component — it can't receive the Icon
  // component references above as props (React can't serialize a
  // function/component reference across the server/client boundary
  // unless it's a Server Action), so it gets a stripped-down, icon-free
  // copy of the same groups instead.
  const mobileNavGroups = navGroups.map((group) => ({
    key: group.key,
    items: group.items.map(({ href, label }) => ({ href, label })),
  }));

  return (
    <ConfirmDialogProvider>
      <div className="flex min-h-full flex-col">
        <header className="border-border border-b">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4">
            <Link href="/admin" dir="ltr" className="text-lg font-semibold tracking-tight">
              {t("brandName")}
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <AdminLanguageSwitcher />
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground hidden items-center gap-1.5 transition sm:flex"
              >
                <StoreIcon className="size-4" aria-hidden="true" />
                {t("viewStore")}
              </Link>
              <SignOutButton label={t("signOut")} pendingLabel={t("signingOut")} />
              <AdminMobileNav
                navGroups={mobileNavGroups}
                newOrderCount={newOrderCount}
                openMenuLabel={t("openMenu")}
                closeMenuLabel={t("closeMenu")}
                viewStoreLabel={t("viewStore")}
              />
            </div>
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 py-8">
          <aside className="hidden w-48 shrink-0 sm:block">
            <nav className="sticky top-8 space-y-6 text-sm">
              {navGroups.map((group, groupIndex) => (
                <div
                  key={group.key}
                  className={
                    groupIndex > 0 ? "border-border space-y-1 border-t pt-4" : "space-y-1"
                  }
                >
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-muted-foreground hover:bg-muted hover:text-foreground relative flex items-center gap-2 rounded-md px-3 py-2 transition"
                    >
                      <item.Icon className="size-4 shrink-0" aria-hidden="true" />
                      {item.label}
                      {item.href === "/admin/orders" && (
                        <AdminOrdersNavBadge count={newOrderCount} />
                      )}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </ConfirmDialogProvider>
  );
}
