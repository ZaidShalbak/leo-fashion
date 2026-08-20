"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applyDiscountCode, removeDiscountCode } from "@/server/actions/discount";

/**
 * Client-only promo-code input for the cart page. This is a preview only —
 * applyDiscountCode just stores the code on the cart and validates it
 * against the live subtotal (see src/server/actions/discount.ts); the real,
 * final validation and redemption happen inside placeOrder at checkout
 * time. router.refresh() re-runs the cart page's server-side read so the
 * discount line/total shown here always reflects the DB, not local state.
 */
export function PromoCodeForm({ appliedCode }: { appliedCode: string | null }) {
  const t = useTranslations("PromoCodeForm");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApply(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await applyDiscountCode({ code });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setCode("");
      router.refresh();
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeDiscountCode();
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (appliedCode) {
    return (
      <div>
        <div className="border-input flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          <span>
            {t("appliedPrefix")} <span className="font-medium" dir="ltr">{appliedCode}</span>{" "}
            {t("appliedSuffix")}
          </span>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            aria-label={t("removeCode")}
            className="text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <XIcon className="size-4" />
          </button>
        </div>
        {error && (
          <p role="alert" className="text-destructive mt-1 text-xs">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleApply} className="flex items-start gap-2">
      <div className="flex-1">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t("placeholder")}
          disabled={isPending}
          aria-invalid={error ? true : undefined}
          // Discount codes are always plain Latin/numeric strings — pinning
          // ltr keeps typing/cursor behavior predictable inside an RTL page.
          dir="ltr"
        />
        {error && (
          <p role="alert" className="text-destructive mt-1 text-xs">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" variant="outline" disabled={isPending || !code.trim()}>
        {t("apply")}
      </Button>
    </form>
  );
}
