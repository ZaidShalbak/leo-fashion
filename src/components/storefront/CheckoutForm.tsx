"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { placeOrder } from "@/server/actions/order";
import type { PlaceOrderInput } from "@/lib/validators/order";

type SavedAddress = {
  id: string;
  label: string | null;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
};

export function CheckoutForm({
  addresses,
  items,
}: {
  addresses: SavedAddress[];
  items: PlaceOrderInput["items"];
}) {
  const t = useTranslations("CheckoutForm");
  const defaultAddress =
    addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
  const [selected, setSelected] = useState<string>(defaultAddress?.id ?? "new");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    let address: PlaceOrderInput["address"];
    if (selected === "new") {
      address = {
        newAddress: {
          fullName: String(formData.get("fullName") ?? ""),
          line1: String(formData.get("line1") ?? ""),
          line2: (formData.get("line2") as string) || undefined,
          city: String(formData.get("city") ?? ""),
          state: (formData.get("state") as string) || undefined,
          postalCode: String(formData.get("postalCode") ?? ""),
          country: String(formData.get("country") ?? ""),
          phone: (formData.get("phone") as string) || undefined,
        },
      };
    } else {
      address = { savedAddressId: selected };
    }

    // Order-level, not part of either address shape — read regardless of
    // which address mode is selected (the notes field itself always
    // renders, see below).
    const notes = (formData.get("notes") as string) || undefined;

    startTransition(async () => {
      const result = await placeOrder({ address, items, notes });
      // On success the action redirects and never resolves here.
      if (!result.success) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {addresses.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("shippingAddress")}</p>
          {addresses.map((addr) => (
            <label
              key={addr.id}
              className="border-input has-[:checked]:border-primary flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm"
            >
              <input
                type="radio"
                name="addressChoice"
                value={addr.id}
                checked={selected === addr.id}
                onChange={() => setSelected(addr.id)}
                className="mt-1"
              />
              <span>
                <span className="block font-medium">
                  {addr.label ? `${addr.label} — ` : ""}
                  {addr.fullName}
                </span>
                <span className="text-muted-foreground block">
                  {addr.line1}
                  {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}
                  {addr.state ? `, ${addr.state}` : ""} {addr.postalCode},{" "}
                  {addr.country}
                </span>
              </span>
            </label>
          ))}
          <label className="border-input has-[:checked]:border-primary flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm">
            <input
              type="radio"
              name="addressChoice"
              value="new"
              checked={selected === "new"}
              onChange={() => setSelected("new")}
            />
            {t("useNewAddress")}
          </label>
        </div>
      )}

      {selected === "new" && (
        <div className="space-y-4">
          {addresses.length === 0 && (
            <p className="text-sm font-medium">{t("shippingAddress")}</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="fullName">{t("fullName")}</Label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="line1">{t("addressLine1")}</Label>
            <Input id="line1" name="line1" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="line2">{t("addressLine2")}</Label>
            <Input id="line2" name="line2" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="city">{t("city")}</Label>
              <Input id="city" name="city" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">{t("state")}</Label>
              <Input id="state" name="state" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="postalCode">{t("postalCode")}</Label>
              <Input id="postalCode" name="postalCode" required dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">{t("country")}</Label>
              <Input id="country" name="country" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("phone")}</Label>
            <Input id="phone" name="phone" type="tel" dir="ltr" />
          </div>
        </div>
      )}

      {/* Order-level, independent of the address mode above — always
          rendered regardless of whether "selected" is a saved address or
          "new". See the checkout-notes migration/comment in schema.prisma
          for why this lives on Order directly. */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea id="notes" name="notes" maxLength={500} placeholder={t("notesPlaceholder")} />
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? t("placingOrder") : t("placeOrder")}
      </Button>
    </form>
  );
}
