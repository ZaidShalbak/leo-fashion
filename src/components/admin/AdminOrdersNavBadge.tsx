/**
 * Small count badge for the admin nav's "Orders" link, showing how many
 * orders haven't been opened yet (Order.viewedByAdminAt === null). Plain
 * Server Component, not client — the count is computed once per page load
 * (see admin/layout.tsx) and the user explicitly chose "badge only,
 * updates on page load" over any live/polling notification, so there's no
 * client-side state to manage here. Same small circular badge look
 * CartIconLink already established, capped display at "9+".
 */
export function AdminOrdersNavBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span
      aria-label={`${count} new order${count === 1 ? "" : "s"}`}
      className="bg-destructive absolute -top-2 -end-3 flex size-4 items-center justify-center rounded-full text-[10px] leading-none font-medium text-white"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
