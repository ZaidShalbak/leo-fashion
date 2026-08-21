import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import { routing } from "@/i18n/routing";
import "../globals.css";

// Uses the `geist` package's bundled font files (next/font/local under the
// hood) instead of next/font/google, since fonts.googleapis.com isn't
// reachable from this sandbox's network allowlist. Same typeface, no
// build-time network fetch. Swap back to next/font/google if/when that
// domain is allowed and self-hosting isn't preferred.

/**
 * Root layout for the storefront's locale branch. This is a *second*,
 * independent root layout — src/app/admin/layout.tsx is the other one, for
 * the (deliberately unlocalized) admin dashboard. Next.js supports
 * multiple root layouts as long as each top-level branch owns its own
 * <html>/<body> and there's no single shared layout.tsx above them (see
 * node_modules/next/dist/docs/.../next-root-params.md, "Multiple root
 * layouts") — that's what makes it possible for /admin to stay completely
 * outside the [locale] routing scheme instead of needing a meaningless
 * /en/admin prefix.
 */
export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(
  props: LayoutProps<"/[locale]">
): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: {
      default: t("title"),
      template: `%s — ${t("title")}`,
    },
    description: t("description"),
  };
}

export default async function LocaleLayout(props: LayoutProps<"/[locale]">) {
  const { locale } = await props.params;

  // params.locale is attacker-controlled input (it's just a URL segment),
  // so it has to be validated against the known locale list before use —
  // same reasoning as validating any other route param — rather than
  // trusted to always be "en" or "ar".
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <NextIntlClientProvider>{props.children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
