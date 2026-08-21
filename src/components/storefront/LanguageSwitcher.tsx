"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "EN",
  ar: "AR",
};

/**
 * A simple two-way toggle rather than a dropdown — with exactly two
 * locales, a dropdown is an extra click for no benefit. Switching stays on
 * the same page (usePathname/useRouter come from next-intl's navigation
 * wrapper, so `pathname` here is already locale-agnostic — see
 * src/i18n/navigation.ts): browsing a product in Arabic and switching to
 * English keeps you on that same product, not the homepage.
 */
export function LanguageSwitcher() {
  const t = useTranslations("Nav");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchTo(nextLocale: AppLocale) {
    if (nextLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <div
      role="group"
      aria-label={t("languageSwitcherLabel")}
      className="inline-flex items-center rounded-md border border-white/20 p-0.5 text-xs text-white/70"
    >
      {(Object.keys(LOCALE_LABELS) as AppLocale[]).map((code) => (
        <button
          key={code}
          type="button"
          disabled={isPending}
          onClick={() => switchTo(code)}
          aria-pressed={code === locale}
          className={
            code === locale
              ? "rounded bg-white px-2 py-1 font-medium text-black"
              : "rounded px-2 py-1 transition hover:text-white"
          }
        >
          {LOCALE_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
