import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Bebas_Neue, Archivo, Tajawal } from "next/font/google";

import { routing } from "@/i18n/routing";
import "../globals.css";

// Uses the `geist` package's bundled font files (next/font/local under the
// hood) instead of next/font/google for the sitewide sans/mono, since
// fonts.googleapis.com wasn't reachable from an earlier sandbox's network
// allowlist. Same typeface, no build-time network fetch. The homepage
// "showcase" bands below use real next/font/google fonts instead (Google
// Fonts is reachable from this environment) — next/font/google self-hosts
// into .next at build time either way, so the running app never has a
// runtime dependency on fonts.googleapis.com regardless of which one is
// used. These three are scoped to the showcase sections only (see
// --font-showcase-display/--font-showcase-body in globals.css) and never
// touch --font-sans, so the rest of the site stays on Geist.
const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas-neue",
});
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo" });
const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["500", "700", "800"],
  variable: "--font-tajawal",
});

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
      className={`${GeistSans.variable} ${GeistMono.variable} ${bebasNeue.variable} ${archivo.variable} ${tajawal.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <NextIntlClientProvider>{props.children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
