"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { PriceDisplay } from "./PriceDisplay";
import { WishlistButton } from "./WishlistButton";

export type WishlistProductSummary = {
  id: string;
  slug: string;
  title: string;
  brandName: string | null;
  imageUrl?: string;
  imageAlt?: string;
  priceCents: number;
  compareAtCents?: number | null;
};

/**
 * Simplified sibling of ProductCard for the account page's wishlist
 * section — a saved-items list, not a shop grid, so no quick-add panel or
 * stock badges. Removing an item drops its card immediately (via
 * WishlistButton's onRemoved) rather than waiting on a full page refresh.
 */
export function AccountWishlistGrid({ products }: { products: WishlistProductSummary[] }) {
  const t = useTranslations("Account");
  const [items, setItems] = useState(products);

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("wishlistEmpty")}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
      {items.map((product) => (
        <div key={product.id} className="group relative">
          <Link href={`/products/${product.slug}`} className="block">
            <div className="bg-muted relative aspect-[4/5] overflow-hidden rounded-lg">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.imageAlt ?? product.title}
                  fill
                  sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : null}
            </div>
            <div className="mt-2 space-y-0.5">
              {product.brandName && (
                <span className="text-muted-foreground block text-xs tracking-wide uppercase">
                  {product.brandName}
                </span>
              )}
              <h3 className="text-sm font-medium">{product.title}</h3>
              <PriceDisplay cents={product.priceCents} compareAtCents={product.compareAtCents ?? undefined} />
            </div>
          </Link>
          <WishlistButton
            productId={product.id}
            initiallyWishlisted
            className="absolute top-2 end-2"
            onRemoved={() => setItems((prev) => prev.filter((p) => p.id !== product.id))}
          />
        </div>
      ))}
    </div>
  );
}
