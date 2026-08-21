import { useTranslations } from "next-intl";
import { ShoppingBagIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";

/**
 * Cart entry point in the header — a bag icon with a small count badge
 * instead of a "Cart (N)" text link. Shared between the desktop nav and
 * the always-visible mobile top bar (see StorefrontLayout) so both stay in
 * sync if the treatment ever changes.
 */
export function CartIconLink({ itemCount }: { itemCount: number }) {
  const t = useTranslations("CartIcon");

  return (
    <Link
      href="/cart"
      aria-label={itemCount > 0 ? t("labelWithCount", { count: itemCount }) : t("label")}
      className="relative flex size-9 items-center justify-center text-white/70 transition hover:text-white"
    >
      <ShoppingBagIcon className="size-5" />
      {itemCount > 0 && (
        <span className="absolute -top-0.5 -end-0.5 flex size-4 items-center justify-center rounded-full bg-white text-[10px] leading-none font-medium text-black">
          {itemCount > 9 ? "9+" : itemCount}
        </span>
      )}
    </Link>
  );
}
