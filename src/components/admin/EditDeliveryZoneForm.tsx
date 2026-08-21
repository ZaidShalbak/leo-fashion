"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDeliveryZone } from "@/server/actions/admin/deliveryZones";

type DeliveryZone = {
  id: string;
  name: string;
  feeCents: number;
  isActive: boolean;
  position: number;
};

export function EditDeliveryZoneForm({ deliveryZone }: { deliveryZone: DeliveryZone }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isActive, setIsActive] = useState(deliveryZone.isActive);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    const feeInput = String(formData.get("fee") ?? "0").trim();
    const feeCents = Math.round(parseFloat(feeInput || "0") * 100);
    const positionInput = String(formData.get("position") ?? "").trim();

    startTransition(async () => {
      const result = await updateDeliveryZone({
        id: deliveryZone.id,
        name: String(formData.get("name") ?? ""),
        feeCents,
        isActive,
        position: positionInput ? parseInt(positionInput, 10) : 0,
      });
      if (result.success) {
        router.push("/admin/delivery-zones");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name (Arabic)</Label>
        <Input id="name" name="name" dir="rtl" defaultValue={deliveryZone.name} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fee">Delivery fee</Label>
        <Input
          id="fee"
          name="fee"
          type="number"
          min={0}
          step="0.01"
          defaultValue={(deliveryZone.feeCents / 100).toFixed(2)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="position">Display order</Label>
        <Input id="position" name="position" type="number" step={1} defaultValue={deliveryZone.position} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        Active
      </label>
      <p className="text-muted-foreground text-xs">
        Inactive areas stop showing up as a choice at checkout, but stay on
        past orders that already used them.
      </p>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/delivery-zones")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
