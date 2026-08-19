import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";

/**
 * Cart entry point in the header — a bag icon with a small count badge
 * instead of a "Cart (N)" text link. Shared between the desktop nav and
 * the always-visible mobile top bar (see StorefrontLayout) so both stay in
 * sync if the treatment ever changes.
 */
export function CartIconLink({ itemCount }: { itemCount: number }) {
  return (
    <Link
      href="/cart"
      aria-label={itemCount > 0 ? `Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}` : "Cart"}
      className="text-muted-foreground hover:text-foreground relative flex size-9 items-center justify-center transition"
    >
      <ShoppingBagIcon className="size-5" />
      {itemCount > 0 && (
        <span className="bg-foreground text-background absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] leading-none font-medium">
          {itemCount > 9 ? "9+" : itemCount}
        </span>
      )}
    </Link>
  );
}
