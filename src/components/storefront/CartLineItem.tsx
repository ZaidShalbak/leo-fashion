"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { updateCartItem, removeCartItem } from "@/server/actions/cart";
import { effectivePriceCents } from "@/lib/cart-totals";
import { formatPriceCents } from "./PriceDisplay";

export type CartLineItemData = {
  id: string;
  quantity: number;
  product: {
    slug: string;
    title: string;
    basePriceCents: number;
    images: { url: string; altText: string | null }[];
  };
  variant: {
    size: string;
    color: string;
    priceOverrideCents: number | null;
    inventoryQuantity: number;
  };
};

export function CartLineItem({ item }: { item: CartLineItemData }) {
  const t = useTranslations("CartLineItem");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const priceCents = effectivePriceCents(
    item.product.basePriceCents,
    item.variant.priceOverrideCents
  );
  const image = item.product.images[0];
  const maxQuantity = Math.min(item.variant.inventoryQuantity, 20);

  function handleQuantityChange(quantity: number) {
    if (quantity < 1) return;
    setError(null);
    startTransition(async () => {
      const result = await updateCartItem({ cartItemId: item.id, quantity });
      if (!result.success) setError(result.error);
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeCartItem({ cartItemId: item.id });
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="flex gap-4 py-4" data-slot="cart-line-item">
      <Link
        href={`/products/${item.product.slug}`}
        className="bg-muted relative size-24 shrink-0 overflow-hidden rounded-md"
      >
        {image && (
          <Image
            src={image.url}
            alt={image.altText ?? item.product.title}
            fill
            sizes="96px"
            className="object-cover"
          />
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href={`/products/${item.product.slug}`}
              className="text-sm font-medium hover:underline"
            >
              {item.product.title}
            </Link>
            <p className="text-muted-foreground text-sm">
              {item.variant.size} / {item.variant.color}
            </p>
          </div>
          <p className="text-sm font-medium">
            {formatPriceCents(priceCents * item.quantity)}
          </p>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <div className="border-input flex items-center rounded-md border">
            <button
              type="button"
              disabled={isPending || item.quantity <= 1}
              onClick={() => handleQuantityChange(item.quantity - 1)}
              className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center disabled:opacity-40"
              aria-label={t("decreaseQuantity")}
            >
              −
            </button>
            <span className="w-8 text-center text-sm" aria-live="polite">
              {item.quantity}
            </span>
            <button
              type="button"
              disabled={isPending || item.quantity >= maxQuantity}
              onClick={() => handleQuantityChange(item.quantity + 1)}
              className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center disabled:opacity-40"
              aria-label={t("increaseQuantity")}
            >
              +
            </button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={handleRemove}
            className="text-muted-foreground"
          >
            {t("remove")}
          </Button>
        </div>

        {item.quantity >= maxQuantity && (
          <p className="text-muted-foreground text-xs">
            {item.variant.inventoryQuantity <= 20
              ? t("maxStockReached")
              : t("maxPerItem")}
          </p>
        )}
        {error && (
          <p role="alert" className="text-destructive text-xs">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
