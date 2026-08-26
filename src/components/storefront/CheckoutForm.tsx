"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { placeOrder } from "@/server/actions/order";
import type { PlaceOrderInput } from "@/lib/validators/order";
import { useConfirm } from "@/components/providers/ConfirmDialogProvider";
import { formatPriceCents } from "./PriceDisplay";
import { PhoneInput } from "./PhoneInput";
import { RollingText } from "./RollingText";

type SavedAddress = {
  id: string;
  label: string | null;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
  isDefault: boolean;
};

export type DeliveryZoneOption = { id: string; name: string; feeCents: number };

export function CheckoutForm({
  addresses,
  items,
  zones,
  selectedZoneId,
  onZoneChange,
}: {
  addresses: SavedAddress[];
  items: PlaceOrderInput["items"];
  zones: DeliveryZoneOption[];
  // Delivery zone selection is lifted to a shared parent (see
  // CheckoutClient) so the order summary sidebar can react to it too and
  // show the right fee/total — same lifted-state pattern ProductDetail
  // uses to share color selection with both the gallery and the variant
  // picker.
  selectedZoneId: string;
  onZoneChange: (zoneId: string) => void;
}) {
  const t = useTranslations("CheckoutForm");
  const confirm = useConfirm();
  const defaultAddress =
    addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
  const [selected, setSelected] = useState<string>(defaultAddress?.id ?? "new");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isHovering, setIsHovering] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    let address: PlaceOrderInput["address"];
    if (selected === "new") {
      address = {
        newAddress: {
          fullName: String(formData.get("fullName") ?? ""),
          line1: String(formData.get("line1") ?? ""),
          city: String(formData.get("city") ?? ""),
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

    const confirmed = await confirm({
      title: t("confirmPlaceOrderTitle"),
      description: t("confirmPlaceOrderDescription"),
      confirmLabel: t("placeOrder"),
      cancelLabel: t("cancel"),
    });
    if (!confirmed) return;

    startTransition(async () => {
      const result = await placeOrder({
        address,
        items,
        notes,
        deliveryZoneId: selectedZoneId,
      });
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
            <Label htmlFor="line1">{t("street")}</Label>
            <Input id="line1" name="line1" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">{t("city")}</Label>
            <Input id="city" name="city" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("phone")}</Label>
            <PhoneInput id="phone" name="phone" />
          </div>
        </div>
      )}

      {/* Order-level, independent of the address mode above — required
          regardless of which address mode is selected. Names are always
          Arabic literal text (see DeliveryZone's comment in schema.prisma),
          not translated per locale, so each label gets an explicit dir
          regardless of the page's own direction. */}
      <div className="space-y-2">
        <p className="text-sm font-medium">{t("deliveryZone")}</p>
        {zones.map((zone) => (
          <label
            key={zone.id}
            className="border-input has-[:checked]:border-primary flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 text-sm"
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="deliveryZone"
                value={zone.id}
                checked={selectedZoneId === zone.id}
                onChange={() => onZoneChange(zone.id)}
                required
              />
              <span dir="rtl">{zone.name}</span>
            </span>
            <span className="text-muted-foreground">
              {formatPriceCents(zone.feeCents)}
            </span>
          </label>
        ))}
        {zones.length === 0 && (
          <p className="text-destructive text-sm">{t("noDeliveryZones")}</p>
        )}
      </div>

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

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isPending}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {isPending ? (
          t("placingOrder")
        ) : (
          <RollingText active={isHovering}>{t("placeOrder")}</RollingText>
        )}
      </Button>
    </form>
  );
}
