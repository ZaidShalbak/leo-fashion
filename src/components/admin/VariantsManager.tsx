"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addProductVariant,
  updateProductVariant,
  removeProductVariant,
} from "@/server/actions/admin/products";

type Variant = {
  id: string;
  sku: string;
  size: string;
  color: string;
  priceOverrideCents: number | null;
  costCents: number | null;
  inventoryQuantity: number;
};

function VariantRow({ variant }: { variant: Variant }) {
  const t = useTranslations("AdminProducts");
  const [sku, setSku] = useState(variant.sku);
  const [size, setSize] = useState(variant.size);
  const [color, setColor] = useState(variant.color);
  const [priceOverride, setPriceOverride] = useState(
    variant.priceOverrideCents != null ? (variant.priceOverrideCents / 100).toFixed(2) : ""
  );
  const [cost, setCost] = useState(
    variant.costCents != null ? (variant.costCents / 100).toFixed(2) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateProductVariant({
        variantId: variant.id,
        sku,
        size,
        color,
        priceOverrideCents: priceOverride.trim()
          ? Math.round(parseFloat(priceOverride) * 100)
          : undefined,
        costCents: cost.trim() ? Math.round(parseFloat(cost) * 100) : undefined,
      });
      if (!result.success) setError(result.error);
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeProductVariant({ variantId: variant.id });
      if (!result.success) setError(result.error);
    });
  }

  return (
    <TableRow>
      <TableCell>
        <Input value={sku} onChange={(e) => setSku(e.target.value)} className="h-8" />
      </TableCell>
      <TableCell>
        <Input value={size} onChange={(e) => setSize(e.target.value)} className="h-8 w-16" />
      </TableCell>
      <TableCell>
        <Input value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-28" />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="—"
          value={priceOverride}
          onChange={(e) => setPriceOverride(e.target.value)}
          className="h-8 w-24"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="—"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className="h-8 w-24"
        />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {variant.inventoryQuantity}{" "}
        <Link href="/admin/inventory" className="underline">
          {t("adjustLink")}
        </Link>
      </TableCell>
      <TableCell className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={handleSave}>
          {t("save")}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={handleRemove}>
          {t("remove")}
        </Button>
        {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
      </TableCell>
    </TableRow>
  );
}

function AddVariantRow({ productId }: { productId: string }) {
  const t = useTranslations("AdminProducts");
  const [sku, setSku] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [priceOverride, setPriceOverride] = useState("");
  const [cost, setCost] = useState("");
  const [inventoryQuantity, setInventoryQuantity] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = await addProductVariant({
        productId,
        sku,
        size,
        color,
        priceOverrideCents: priceOverride.trim()
          ? Math.round(parseFloat(priceOverride) * 100)
          : undefined,
        costCents: cost.trim() ? Math.round(parseFloat(cost) * 100) : undefined,
        inventoryQuantity: parseInt(inventoryQuantity || "0", 10),
      });
      if (result.success) {
        setSku("");
        setSize("");
        setColor("");
        setPriceOverride("");
        setCost("");
        setInventoryQuantity("0");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <TableRow>
      <TableCell>
        <Input
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder={t("newSkuPlaceholder")}
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Input value={size} onChange={(e) => setSize(e.target.value)} className="h-8 w-16" />
      </TableCell>
      <TableCell>
        <Input value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-28" />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="—"
          value={priceOverride}
          onChange={(e) => setPriceOverride(e.target.value)}
          className="h-8 w-24"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="—"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className="h-8 w-24"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min="0"
          value={inventoryQuantity}
          onChange={(e) => setInventoryQuantity(e.target.value)}
          className="h-8 w-20"
        />
      </TableCell>
      <TableCell>
        <Button type="button" size="sm" disabled={isPending || !sku || !size || !color} onClick={handleAdd}>
          {t("addVariant")}
        </Button>
        {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
      </TableCell>
    </TableRow>
  );
}

export function VariantsManager({
  productId,
  variants,
}: {
  productId: string;
  variants: Variant[];
}) {
  const t = useTranslations("AdminProducts");
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("skuLabel")}</TableHead>
          <TableHead>{t("sizeLabel")}</TableHead>
          <TableHead>{t("colorLabel")}</TableHead>
          <TableHead>{t("priceOverrideLabel")}</TableHead>
          <TableHead>{t("costLabel")}</TableHead>
          <TableHead>{t("stockLabel")}</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {variants.map((v) => (
          <VariantRow key={v.id} variant={v} />
        ))}
        <AddVariantRow productId={productId} />
      </TableBody>
    </Table>
  );
}
