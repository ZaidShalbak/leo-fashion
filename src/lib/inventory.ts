// Shared default so the storefront's "only X left" urgency badges and the
// admin inventory page's low-stock highlight agree on what "low" means.
// Admin can still override its own view via the `?threshold=` URL param
// (see src/app/admin/inventory/page.tsx) — this is just the default both
// start from, not a synced live setting.
export const LOW_STOCK_THRESHOLD = 5;
