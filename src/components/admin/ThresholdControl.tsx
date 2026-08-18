"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ThresholdControl({ defaultThreshold }: { defaultThreshold: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setThreshold(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const n = parseInt(value, 10);
    if (!value || Number.isNaN(n) || n === defaultThreshold) {
      params.delete("threshold");
    } else {
      params.set("threshold", String(n));
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="threshold" className="text-muted-foreground text-sm font-normal">
        Low-stock threshold
      </Label>
      <Input
        id="threshold"
        type="number"
        min={0}
        defaultValue={searchParams.get("threshold") ?? String(defaultThreshold)}
        onBlur={(e) => setThreshold(e.target.value)}
        className="h-8 w-20"
      />
    </div>
  );
}
