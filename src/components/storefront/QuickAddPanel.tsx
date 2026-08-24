"use client";

import { useTranslations } from "next-intl";

import { colorSwatchValue } from "@/lib/colorSwatch";
import { cn } from "@/lib/utils";
import type { UseQuickAddResult } from "@/hooks/useQuickAdd";

const TONE_CLASSES = {
  light:
    "bg-white/95 text-foreground dark:bg-black/85 shadow-md backdrop-blur-sm",
  showcase: "bg-showcase-ink/90 text-showcase-paper shadow-md backdrop-blur-sm",
} as const;

const CHIP_TONE_CLASSES = {
  light: "border-input bg-white hover:border-primary dark:bg-black",
  showcase: "border-showcase-line-paper/40 bg-showcase-ink text-showcase-paper hover:border-showcase-paper",
} as const;

const BUTTON_TONE_CLASSES = {
  light: "bg-foreground text-background",
  showcase: "bg-showcase-rivet text-showcase-paper",
} as const;

/**
 * The shared quick-add UI (color swatches -> size chips -> "Add to cart"
 * button) rendered inside every product card's image-box overlay. Purely
 * presentational — all selection/add-to-cart logic lives in the
 * useQuickAdd hook this takes as a prop. `tone` maps to each card's own
 * palette: "light" for ProductCard/NewArrivalsCard (both sit on a light
 * background), "showcase" for BestSellerItem (sits in the homepage's dark
 * showcase section, see globals.css's --showcase-* tokens).
 */
export function QuickAddPanel({
  quickAdd,
  tone = "light",
  className,
}: {
  quickAdd: UseQuickAddResult;
  tone?: "light" | "showcase";
  className?: string;
}) {
  const t = useTranslations("QuickAddPanel");

  return (
    <div
      className={cn(
        "pointer-events-auto rounded-md p-2 transition-opacity",
        TONE_CLASSES[tone],
        className
      )}
    >
      {quickAdd.phase === "added" ? (
        <p className="text-center text-xs font-medium">{t("added")}</p>
      ) : quickAdd.phase === "adding" ? (
        <p className="text-center text-xs opacity-70">{t("adding")}</p>
      ) : quickAdd.phase === "error" ? (
        <p className="text-destructive text-center text-xs">{quickAdd.errorMessage}</p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex flex-wrap justify-center gap-1.5">
            {quickAdd.colors.map((color) => {
              const disabled = !quickAdd.colorHasStock(color);
              const swatch = colorSwatchValue(color);
              const selected = quickAdd.selectedColor === color;
              return (
                <button
                  key={color}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-label={t("colorAria", { color })}
                  onMouseEnter={() => quickAdd.setPreviewColor(color)}
                  onClick={() => quickAdd.selectColor(color)}
                  className={cn(
                    "size-6 rounded-full border shadow-sm transition",
                    selected && "ring-primary ring-2",
                    disabled
                      ? "cursor-not-allowed opacity-30"
                      : "hover:scale-110 hover:ring-2 hover:ring-primary/50"
                  )}
                  style={swatch ? { backgroundColor: swatch } : undefined}
                  title={color}
                >
                  {!swatch && <span className="sr-only">{color}</span>}
                </button>
              );
            })}
          </div>

          {quickAdd.selectedColor && (
            <div className="flex flex-wrap justify-center gap-1">
              {quickAdd.sizes.map(({ size, inStock }) => (
                <button
                  key={size}
                  type="button"
                  disabled={!inStock}
                  aria-pressed={quickAdd.selectedSize === size}
                  aria-label={t("sizeAria", { size })}
                  onClick={() => quickAdd.selectSize(size)}
                  className={cn(
                    "min-w-8 rounded border px-2 py-1 text-xs transition",
                    CHIP_TONE_CLASSES[tone],
                    quickAdd.selectedSize === size && "border-primary bg-primary/10",
                    !inStock && "text-muted-foreground cursor-not-allowed line-through opacity-40"
                  )}
                >
                  {size}
                </button>
              ))}
            </div>
          )}

          {quickAdd.canAddToCart && (
            <button
              type="button"
              onClick={(e) => quickAdd.handleAddToCart(e.currentTarget.getBoundingClientRect())}
              className={cn(
                "w-full rounded px-2 py-1.5 text-xs font-medium transition hover:opacity-90",
                BUTTON_TONE_CLASSES[tone]
              )}
            >
              {t("addToCart")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
