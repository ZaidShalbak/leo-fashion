import "server-only";

import { db } from "@/server/db";

export const STORE_SETTINGS_ID = "singleton";

export type StoreSettings = {
  salesPageVisible: boolean;
};

const DEFAULT_SETTINGS: StoreSettings = {
  salesPageVisible: true,
};

/**
 * Reads the single StoreSettings row, defaulting in memory when it
 * doesn't exist yet (a fresh database, or one that hasn't had a setting
 * changed since this table was added) — deliberately never writes on a
 * plain read, so an ordinary storefront page view can't trigger a write.
 * The row only actually gets created by updateStoreSettings (see
 * src/server/actions/admin/settings.ts), the first time an admin changes
 * something. Not cached (unlike src/server/queries.ts's catalog reads) —
 * a single-row primary-key lookup is already cheap, and a store owner
 * flipping this expects the storefront to reflect it immediately, not up
 * to 60s later.
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  const row = await db.storeSettings.findUnique({ where: { id: STORE_SETTINGS_ID } });
  return row ? { salesPageVisible: row.salesPageVisible } : DEFAULT_SETTINGS;
}
