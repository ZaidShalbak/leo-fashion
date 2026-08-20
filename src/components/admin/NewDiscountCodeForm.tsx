"use client";

import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDiscountCode } from "@/server/actions/admin/discountCodes";

export function NewDiscountCodeForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    const minOrderInput = String(formData.get("minOrderAmount") ?? "").trim();
    const minSubtotalCents = minOrderInput
      ? Math.round(parseFloat(minOrderInput) * 100)
      : undefined;
    const maxRedemptionsInput = String(formData.get("maxRedemptions") ?? "").trim();
    const maxRedemptions = maxRedemptionsInput
      ? parseInt(maxRedemptionsInput, 10)
      : undefined;

    startTransition(async () => {
      const result = await createDiscountCode({
        code: String(formData.get("code") ?? ""),
        percentOff: parseInt(String(formData.get("percentOff") ?? "0"), 10),
        isActive: true,
        expiresAt: String(formData.get("expiresAt") ?? "") || undefined,
        minSubtotalCents,
        maxRedemptions,
      });
      if (result.success) {
        formRef.current?.reset();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="code">Code</Label>
        <Input id="code" name="code" placeholder="SUMMER20" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="percentOff">Percent off</Label>
        <Input
          id="percentOff"
          name="percentOff"
          type="number"
          min={1}
          max={100}
          step={1}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="expiresAt">Expires on (optional)</Label>
        <Input id="expiresAt" name="expiresAt" type="date" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="minOrderAmount">Minimum order amount (optional)</Label>
        <Input
          id="minOrderAmount"
          name="minOrderAmount"
          type="number"
          min={0}
          step="0.01"
          placeholder="0.00"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="maxRedemptions">Max total redemptions (optional)</Label>
        <Input id="maxRedemptions" name="maxRedemptions" type="number" min={1} step={1} />
      </div>
      <p className="text-muted-foreground text-xs">
        Each customer can use a code once, regardless of these limits.
      </p>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Adding…" : "Add discount code"}
      </Button>
    </form>
  );
}
