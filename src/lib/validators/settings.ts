import { z } from "zod";

export const storeSettingsUpdateSchema = z.object({
  salesPageVisible: z.boolean(),
});

export type StoreSettingsUpdateInput = z.infer<typeof storeSettingsUpdateSchema>;
