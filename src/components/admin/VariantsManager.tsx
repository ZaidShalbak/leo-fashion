"use client";

import { useState, useTransition } from "react";

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
  inventoryQuantity: number;
};

function VariantRow({ variant }: { variant: Variant }) {
  const [sku, setSku] = useState(variant.sku);
  const [size, setSize] = useState(variant.size);
  const [color, setColor] = useState(variant.color);
  const [priceOverride, setPriceOverride] = useState(
    variant.priceOverrideCents != null ? (variant.priceOverrideCents / 100).toFixed(2) : ""
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
      <TableCell className="text-muted-foreground">
        {variant.inventoryQuantity}{" "}
        <Link href="/admin/inventory" className="underline">
          adjust
        </Link>
      </TableCell>
      <TableCell className="space-x-2">
        <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={handleSave}>
          Save
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={handleRemove}>
          Remove
        </Button>
        {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
      </TableCell>
    </TableRow>
  );
}

function AddVariantRow({ productId }: { productId: string }) {
  const [sku, setSku] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [priceOverride, setPriceOverride] = useState("");
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
        inventoryQuantity: parseInt(inventoryQuantity || "0", 10),
      });
      if (result.success) {
        setSku("");
        setSize("");
        setColor("");
        setPriceOverride("");
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
          placeholder="New SKU"
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
          min="0"
          value={inventoryQuantity}
          onChange={(e) => setInventoryQuantity(e.target.value)}
          className="h-8 w-20"
        />
      </TableCell>
      <TableCell>
        <Button type="button" size="sm" disabled={isPending || !sku || !size || !color} onClick={handleAdd}>
          Add variant
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
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Color</TableHead>
          <TableHead>Price override</TableHead>
          <TableHead>Stock</TableHead>
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
