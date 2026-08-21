import { z } from "zod";

// Trimmed, capped, and requires at least one real character — an empty or
// whitespace-only query would otherwise turn into a `contains: ""` filter
// that matches every row.
export const searchQuerySchema = z.string().trim().min(1).max(100);
