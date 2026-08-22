"use client";

import { useState } from "react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { RollingText } from "./RollingText";

/**
 * Just the "Proceed to checkout" CTA, split out of the (Server Component)
 * cart page — RollingText needs a controlled hover boolean, and a plain
 * onMouseEnter/Leave handler can't live directly in a Server Component's
 * JSX.
 */
export function ProceedToCheckoutButton({ label }: { label: string }) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <Button
      asChild
      size="lg"
      className="w-full sm:w-auto"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Link href="/checkout">
        <RollingText active={isHovering}>{label}</RollingText>
      </Link>
    </Button>
  );
}
