"use client";

import { HeartIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { useRouter, usePathname } from "@/i18n/navigation";
import { addToWishlist, removeFromWishlist } from "@/server/actions/wishlist";
import { cn } from "@/lib/utils";

/**
 * Heart-icon toggle used on ProductCard and the product detail page.
 * Optimistic — flips immediately, reverts if the server action fails.
 * Sign-in required (see wishlist.ts): a signed-out click reverts the
 * optimistic flip and sends the visitor to /login with a `next` back to
 * the current page, rather than failing silently or requiring the caller
 * to pre-check auth state.
 */
export function WishlistButton({
  productId,
  initiallyWishlisted,
  className,
}: {
  productId: string;
  initiallyWishlisted: boolean;
  className?: string;
}) {
  const t = useTranslations("WishlistActions");
  const router = useRouter();
  const pathname = usePathname();
  const [isWishlisted, setIsWishlisted] = useState(initiallyWishlisted);
  const [isPending, startTransition] = useTransition();

  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    // ProductCard renders this as a sibling of its <Link>, but keep the
    // guard here too since WishlistButton has no control over where a
    // future caller places it.
    event.preventDefault();
    event.stopPropagation();

    const next = !isWishlisted;
    setIsWishlisted(next);

    startTransition(async () => {
      const result = next ? await addToWishlist(productId) : await removeFromWishlist(productId);
      if (!result.success) {
        setIsWishlisted(!next);
        if (result.reason === "signInRequired") {
          router.push(`/login?next=${encodeURIComponent(pathname)}`);
        }
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={isWishlisted}
      aria-label={isWishlisted ? t("remove") : t("add")}
      className={cn(
        "bg-background/90 text-foreground hover:text-destructive flex size-8 items-center justify-center rounded-full transition disabled:opacity-60",
        className
      )}
    >
      <HeartIcon className={cn("size-4", isWishlisted && "fill-destructive text-destructive")} />
    </button>
  );
}
