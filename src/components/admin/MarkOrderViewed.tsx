"use client";

import { useEffect } from "react";

import { markOrderViewed } from "@/server/actions/admin/orders";

/**
 * Fires markOrderViewed once on mount for a not-yet-viewed order. Renders
 * nothing — this exists purely to trigger the server action from real
 * client code, since revalidatePath (which markOrderViewed calls) only
 * works from a Server Function or Route Handler, not during a Server
 * Component's render.
 */
export function MarkOrderViewed({
  orderId,
  alreadyViewed,
}: {
  orderId: string;
  alreadyViewed: boolean;
}) {
  useEffect(() => {
    if (!alreadyViewed) void markOrderViewed(orderId);
  }, [orderId, alreadyViewed]);

  return null;
}
