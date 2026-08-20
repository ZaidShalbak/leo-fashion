import { createTranslator } from "use-intl/core";

import en from "../../messages/en.json";
import ar from "../../messages/ar.json";
import type { AppLocale } from "./routing";

const MESSAGES: Record<AppLocale, typeof en> = { en, ar };

/**
 * A hook-free, context-free translator for components shared between the
 * locale-aware storefront and the (always-English, no NextIntlClientProvider
 * ancestor) admin dashboard — OrderDetail and OrderStatusBadge both render
 * from admin pages directly, so they can't call useTranslations()/
 * getTranslations() themselves without crashing there. Callers pass an
 * explicit `locale` (storefront pages pass the real one; admin pages just
 * omit it and get the "en" default), and this returns a plain `t()`
 * function built from the static message JSON — no request context, no
 * provider, safe anywhere.
 */
// Loosely typed on purpose: createTranslator's real signature ties
// `namespace` to a statically-known key of the message tree, which is
// great for the normal useTranslations()/getTranslations() hooks but more
// friction than benefit for this one context-free helper's small set of
// call sites (OrderDetail, OrderStatusBadge's callers) — a plain (key,
// values?) => string is enough here.
type SimpleTranslator = (key: string, values?: Record<string, string | number>) => string;

export function getTranslator(locale: AppLocale = "en", namespace: string): SimpleTranslator {
  return createTranslator({
    locale,
    messages: MESSAGES[locale],
    namespace: namespace as never,
  }) as SimpleTranslator;
}
