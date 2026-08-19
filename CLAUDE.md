# CLAUDE.md — Clothing Store

## 1. What this project is

A single Next.js app: a customer-facing storefront (catalog, cart, address-based checkout — no
payment processing) and an admin dashboard (product, inventory, and order management), sharing one
PostgreSQL database via Prisma. There is currently no mobile app and no payment integration — orders
are placed with a shipping address and enter the fulfillment queue directly.

## 2. Architecture principles

- **Business logic lives in `src/server/actions` only.** Cart totals, order creation, inventory
  decrement, and order-status transitions belong here — never inline in a page, component, or route
  handler.
- **Validation shapes live in `src/lib/validators` only.** Add or edit a Zod schema there first, then
  wire it into the Prisma model and the relevant server action. Don't redefine shapes inline.
- **No direct Prisma calls from client components.** Client components call server actions; server
  components may read via Prisma directly for simple page data fetches.
- **The admin section (`src/app/admin`) is gated by `requireAdmin()`** in every layout/page that
  needs it — never assume a route is protected just because it's under `/admin`; the check must be
  explicit in code.
- **Orders have no payment status.** The `Order` model tracks fulfillment status only (see enum
  below). Do not add payment fields unless we explicitly decide to add payment processing later.
- **Order shipping address is snapshotted as inline fields on `Order`** (not a separate address
  table) — there's no billing address and no reuse case, so a dedicated snapshot model would just be
  an extra join. Decided in Phase 1; revisit only if a real reuse case shows up.

## 3. Coding guidelines

- **TypeScript strict mode is mandatory** (`strict: true`). No `any`, no `@ts-ignore` — use
  `unknown` and narrow, or stop and ask.
- **All form/server-action input is parsed through a Zod schema before use.** Never trust
  `FormData` or a client payload directly.
- **Styling is Tailwind utility classes** (plus shadcn/ui components) — no new CSS files, no inline
  `style={{}}` except for runtime-computed values.
- **Prefer Server Components for data display; use Client Components only where interactivity is
  required** (forms, filters, cart controls), and keep them as small/leaf as possible.
- **Money is stored and computed as integer cents**, formatted for display only at the UI edge.
- **Order status enum:** `pending → processing → shipped → delivered`, plus `cancelled`. Only valid
  forward transitions (or a transition to `cancelled` from `pending`/`processing`) are allowed —
  enforce this in the server action, not just in the UI. See `ORDER_STATUS_TRANSITIONS` in
  `src/lib/validators/order.ts`.
- **Server actions never trust client-supplied prices, stock, or ownership.** Re-read the
  authoritative row from the database inside the action (see the Data Security guidance linked from
  `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`), and derive identity from the
  session, not from request payload fields.
- **Commit messages follow Conventional Commits** (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`).
- **This Next.js install may be ahead of your training data.** Before writing App Router code
  (layouts, route handlers, server actions, caching/revalidation), skim the bundled docs at
  `node_modules/next/dist/docs/01-app/` — `next dev`/`next build` regenerate a warning in
  `AGENTS.md` about this for the same reason.

## 4. Standard commands

| Purpose | Command |
|---|---|
| Install dependencies | `npm install` |
| Run dev server | `npm run dev` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Unit tests | `npm run test` |
| E2E tests | `npm run test:e2e` |
| Build | `npm run build` |
| Run all checks (use before finishing any task) | `npm run lint && npm run typecheck && npm run test && npm run build` |
| Create a DB migration | `npx prisma migrate dev --name <description>` |
| Open Prisma Studio | `npx prisma studio` |
| Seed the database | `npm run db:seed` |

**Before declaring any task complete, run the full check command above and confirm it passes.** If it
fails, fix the failure rather than describing it as pre-existing.

## 5. Workflow rules

- **Never work directly on `main`.** Branch as `feat/<short-description>`, `fix/<...>`, or
  `chore/<...>`.
- **One logical change per branch/PR.**
- **Any new server action or order-status transition needs a test** before it's considered done.
- **Don't merge if the full check command fails.**
- **Migrations are additive by default** — avoid destructive column drops/renames without a
  two-step migration (add → backfill → remove in a later PR).
- **Secrets never get committed.** Real values go in `.env` (gitignored); add a placeholder to
  `.env.example` for anything new.
- **When a decision has a real tradeoff** (schema design, how strict an inventory check should be,
  etc.), stop and ask rather than guessing.

## 6. Local dev environment notes

- **Database:** a local Postgres instance (not Supabase-hosted) is used for local dev, per
  `DATABASE_URL`/`DIRECT_URL` in `.env`. Swapping in real Supabase Postgres credentials later needs
  no code changes beyond updating `.env`.
- **Auth/Storage:** `.env` currently holds placeholder Supabase project values
  (`NEXT_PUBLIC_SUPABASE_URL` etc.) — sign-in/sign-up will not work end-to-end until real Supabase
  project credentials are added. The `User.supabaseId` field is how an app `User` row links to a real
  Supabase Auth identity; the seeded admin user uses a placeholder value until then (see
  `prisma/seed.ts`).
- **Prisma 7 requires a driver adapter — there's no more standalone `new PrismaClient()`.**
  Connection config is split: `prisma.config.ts` (`datasource.url`, from `DIRECT_URL`) is what
  `prisma migrate`/`generate` use; `src/server/db.ts` and `prisma/seed.ts` each construct their own
  `PrismaPg` adapter from `DATABASE_URL` for runtime queries. `directUrl`/`url` in `schema.prisma`'s
  `datasource` block are no longer valid — Prisma will refuse to generate if they're present. If you
  add a second place that instantiates `PrismaClient`, it needs the same adapter pattern.
- **Prisma engines:** `prisma generate`/`migrate`/`db seed` download engine binaries from
  `binaries.prisma.sh` on first use — a different host than the npm registry, so it can be blocked
  independently by a network egress allowlist even when the registry itself works.
- **Playwright:** this sandbox has Chromium pre-installed at `/opt/pw-browsers/chromium`, which may
  not match the browser build `@playwright/test` wants to download from `cdn.playwright.dev` (also
  usually blocked). `playwright.config.ts` points `executablePath` at the pre-installed binary
  instead of downloading — don't run `playwright install` here.
- **`notFound()` returns HTTP 200, not 404, on routes with a `loading.tsx`.** In this Next.js
  version, `loading.tsx` wraps the route in a Suspense boundary, so the response has already started
  streaming as a 200 by the time an async page component's `notFound()` call resolves — the status
  can't change after that. Next.js still renders the custom `not-found.tsx` UI and injects
  `<meta name="robots" content="noindex">`, so it's a correct "soft 404" for SEO purposes, just not a
  literal 404 status. `/collections/[handle]` and `/products/[slug]` both hit this. A real 404 status
  would mean checking existence in `proxy` (this version's renamed middleware) before the response
  streams — out of scope for Phase 2; worth a look in Phase 5 if strict 404 status codes matter.
- **`ProductImage` model added in Phase 2** — Phase 1's schema had no image field at all, which
  Phase 2's gallery/grid work surfaced. Seed data points at local placeholder SVGs under
  `public/products/`; swap for real Supabase Storage URLs (the `remotePatterns` config in
  `next.config.ts` is already set up for that) whenever real product photography exists.
- **This sandbox cannot reach the real Supabase Postgres database at all.** Its network egress is
  proxied and allowlists only specific hosts over HTTPS (npm registry, GitHub, a few others) — raw
  Postgres wire protocol (ports 5432/6543) is blocked to *any* host, not just Supabase-specific ones
  (confirmed: `/dev/tcp` to an unrelated host on port 5432 also fails), and arbitrary non-allowlisted
  HTTPS hosts get a 403 from the egress proxy too. So `prisma migrate deploy`/`db seed` against the
  real project has to be run from the user's own machine (their actual Terminal app — not
  `device_bash`, which is intentionally network-isolated and can't do it either). Local dev/testing in
  *this* sandbox keeps using local Postgres (`clothing_store`/`clothing_store_dev`) and placeholder
  Supabase env values — `.env` here is deliberately left on local placeholders even though the real
  project exists, so `npm run test`/`npm run dev` here keep working. The real Supabase credentials
  were handed directly to the user (not committed anywhere — `.env` is gitignored) for them to run
  against on their own machine.

## 7. Current phase

_(Update as the project progresses.)_

Current phase: **Phase 3 — Cart & Address-Based Checkout (No Payment) — complete.** Cart page with
quantity/remove controls, email/password auth (sign up, sign in, sign out), checkout with saved or
new shipping address, an inventory-safe `placeOrder` server action, order confirmation, and account
order history are all in place; full check command passes, including a real concurrency test for
`placeOrder`. Decisions made along the way, worth knowing about:

- **Auth wasn't built in Phase 1 beyond the `auth.ts` helpers** — Phase 1's prompt only asked for
  session/`requireAdmin()` plumbing, not UI. Since `Order.userId` is required (a Phase 1 decision —
  see section 2), checkout can't work without real sign-up/sign-in, so `/login` and `/signup` pages
  and `src/server/actions/auth.ts` were built now as a Phase 3 prerequisite.
- **Sign-up auto-confirms the email** via the Supabase admin API (`admin.createUser({ email_confirm:
  true })`, using the service role key in `createSupabaseAdminClient()`) instead of Supabase's default
  confirmation-email flow — there's no transactional email set up, and requiring a click-through
  wasn't worth the friction yet. Revisit if real email verification becomes a requirement.
- **`placeOrder` ignores the price/quantity numbers in its own input** beyond using them to fail fast
  on an empty cart at the validation layer. The actual order is built from the caller's *live* cart,
  re-read from the database inside the transaction — a deliberately stronger reading of "never trust
  client payload" than the schema alone implies. See the comment in `src/server/actions/order.ts`.
- **Stock safety uses a conditional `updateMany` per line** (`WHERE inventoryQuantity >= quantity`)
  rather than read-then-write, so two concurrent checkouts racing for the same low-stock variant can't
  oversell — Postgres re-evaluates that `WHERE` against the latest committed row, so at most one
  succeeds. Covered by a real concurrency test in `src/server/actions/order.test.ts` (two users, one
  unit of stock, asserts exactly one order and zero negative inventory).
- **A "new address" entered at checkout is also saved to the user's address book** (`Address` table),
  since there's no separate account/address-management UI yet — without this, "select a saved
  address" would never have anything to select on a second order. Revisit if/when a dedicated address
  book page gets built.
- **The seeded admin user (`admin@clothing-store.test`) still has a placeholder `supabaseId`** — it
  was seeded before real Supabase Auth existed, so it can't actually sign in yet. Fixing this is
  Phase 4 work (giving it a real Supabase Auth identity, e.g. via the same admin-create-user approach
  sign-up uses), not done here since Phase 3 didn't need admin login.
- **Real Supabase Postgres migration/seed had to run from the user's own machine, not this sandbox**
  — see section 6's new entry below.

Next: Phase 4 — Admin Dashboard (Products, Inventory, Orders).

Current phase: **Phase 4 — Admin Dashboard (Products, Inventory, Orders) — complete.** Admin section
at `src/app/admin`, every layout/page gated by `requireAdmin()`. Products: list, create (with initial
variants), edit, archive. Variants: add/edit/remove via their own server actions rather than through
`updateProduct` — see the note below. Real image upload to Supabase Storage. Inventory: all variants
in one table, a configurable low-stock highlight, and manual stock adjustment with a required reason.
Orders: filterable list, detail view, status transitions enforced server-side (not just hidden in the
UI) with an optional tracking number once shipped. An `AuditLog` table records every admin mutation.
Full check command passes, including tests that `requireAdmin()` actually redirects non-admins (not
just that it's *called*) and that invalid order-status transitions are rejected even when
`updateOrderStatus` is called directly with a skip-ahead status. Decisions worth knowing about:

- **Variant edits after product creation go through dedicated actions** (`addProductVariant`,
  `updateProductVariant`, `removeProductVariant` in `src/server/actions/admin/products.ts`), not
  through `updateProduct` with a resent variants array. Reconciling "here's the full variant list
  now" against what's in the database (matching by SKU? by position?) was a real modeling question
  with no clean answer, so it seemed better to sidestep it — each variant has a stable id once it
  exists, so per-variant actions are simpler and less error-prone than array-diffing. `updateProduct`
  still accepts the schema's `variants` field (for backward compatibility with `productUpdateSchema`)
  but ignores it.
- **Stock (`inventoryQuantity`) is only ever changed through Inventory's `adjustInventory`**, never
  through the product/variant edit form — the edit form shows current stock as read-only with a link
  over to Inventory. This keeps every stock change going through one path that requires a reason and
  writes an audit log entry, rather than two paths where only one asks why.
- **Real product images require a Supabase Storage bucket named `product-images`, set to public** —
  this app can't create that bucket for itself (no admin API call for it from inside a server action
  in a reasonable way), so it has to be created once by hand: Supabase dashboard → Storage → New
  bucket → name `product-images` → toggle Public on. Until that bucket exists, image upload will fail
  with a clear error from `src/server/storage.ts`; the rest of the admin dashboard doesn't depend on
  it.
- **Server Actions default to a 1MB request body limit**, which a real product photo blows past well
  before hitting `uploadProductImage`'s own 5MB check — `next.config.ts` raises this to 6MB via
  `experimental.serverActions.bodySizeLimit`. If image uploads ever need to go bigger, raise both
  numbers together, not just one.
- **The seeded admin account's Supabase Auth identity gets fixed by a one-off script**
  (`prisma/fix-admin-auth.ts`), not by re-running the seed script — the seed script wipes all data
  (see its own comments), which would destroy any real orders/accounts created since Phase 3 went
  live. Run `npx tsx prisma/fix-admin-auth.ts [password]` from a machine with real Supabase network
  access (not this sandbox — see section 6).
- **Low-stock threshold is a URL param (`?threshold=`), not a stored setting** — "configurable"
  didn't need a database column and a settings page; a query param editable from the Inventory page
  is simpler and just as real a configuration point.
- **No dedicated AuditLog *viewer* page** — the spec asked to log admin mutations, not to build a UI
  for browsing them. The table exists and every admin action writes to it; a viewer is easy to add
  later (Prisma Studio already works for ad hoc inspection in the meantime).

Current phase: **Homepage merchandising + multi-brand marketplace + mobile responsiveness —
complete.** Requested outside the Phase 1–5 roadmap: a homepage hero carousel, a category section, a
brand section, and a full mobile-responsiveness pass. Answering two open design questions up front
changed the scope: Leo Fashion is a **multi-brand marketplace** (not a single in-house label), and the
hero carousel is **collection-driven** (one slide per collection, using that collection's oldest active
product's primary image). Full check command passes. Decisions worth knowing about:

- **A real `Brand` model was added**, related to `Product` via a nullable `brandId` (`ON DELETE SET
  NULL`) — nullable at the database level so the migration is safe against existing rows, but
  **required** at the Zod layer (`productSchema.brandId`) for every product created from here on.
  Existing pre-Brand products get assigned a brand by a one-off, non-destructive script —
  `prisma/backfill-brands.ts` — matched by product title against the same brand list `seed.ts` uses,
  falling back to the house brand ("Leo Fashion") for anything unrecognized. Run it the same way as
  `fix-admin-auth.ts`: `npx tsx prisma/backfill-brands.ts` from a machine with real Supabase network
  access (not this sandbox — see section 6). It's idempotent (brands are upserted by slug).
- **Minimal admin brand management was built as a side effect, not a separate ask** — `brandId`
  becoming required on `productSchema` meant `NewProductForm`/`EditProductForm` needed a brand to
  submit, which meant admins needed a way to create one. `/admin/brands` (list + create only, no
  edit/delete yet) and `createBrand` in `src/server/actions/admin/brands.ts` exist for that reason.
  Extend this the same way products/variants were extended in Phase 4 if brand editing is ever needed.
- **The storefront gained `/brands` (grid) and `/brands/[slug]` (filtered product listing, same
  filter/sort pattern as `/collections/[handle]`)**, plus brand name/link on `ProductCard` and the
  product detail page. `ProductCardData`/`ProductDetailData` (`src/types/product.ts`) now both include
  `brand`, so any new query building one of those shapes must add `brand: true` to its `include` or it
  won't typecheck.
- **The hero carousel and the "shop by category" tiles share one representative image per
  collection** — the oldest active product in that collection, ordered by `createdAt`, image at
  `position: 0`. There's no "featured image" field on `Collection`; this was simpler than adding one
  and works fine as long as every collection has at least one active product. If a collection is ever
  emptied out, its hero slide/category tile is skipped (filtered out), not shown broken.
- **`HeroCarousel` (`src/components/storefront/HeroCarousel.tsx`) is a small hand-rolled client
  component** (transform-based slide track, auto-advance every 6s, pauses on hover/focus, arrow + dot
  controls) rather than a carousel library — with ~3 slides (one per collection) a dependency wasn't
  worth it. If the slide count grows a lot, revisit.
- **Mobile nav is a separate `MobileNav` client component**, not a responsive rework of the existing
  `nav` — the desktop header's inline link list is hidden below `sm` and swapped for a hamburger
  button + slide-down panel (`src/components/storefront/MobileNav.tsx`); the Cart link stays visible
  at all screen sizes since it's the single most-used link. Admin (`src/app/admin`) was **not** put
  through a mobile pass — it's an internal dashboard tool, out of scope for "mobile responsiveness" as
  the user meant it (the storefront).
- **Placeholder brand-logo SVGs live at `public/brands/*.svg`**, generated the same way the
  placeholder product-photo SVGs under `public/products/` were — swap for real logos whenever they
  exist, same as product photography. One of these (`harbor-co.svg`, for "Harbor & Co.") originally had
  a literal unescaped `&` in its `<text>` content, which is invalid XML and made the image fail to
  render (blank/broken image icon) — fixed by using `&amp;`. Worth remembering if more placeholder SVGs
  ever get hand-written with brand/product names containing `&`, quotes, or angle brackets.
- **Fixed a real pre-existing bug in `prisma/seed.ts` while re-seeding to test brands**:
  `db.user.deleteMany()` was failing with a `P2003` foreign key violation on `AuditLog.actorUserId`
  (no `onDelete` was specified on that relation, so it defaults to `Restrict`) once Phase 4 admin
  testing had left real `AuditLog` rows referencing the seeded admin user. Fixed by adding
  `await db.auditLog.deleteMany();` as the very first statement in the wipe sequence. This bug existed
  since Phase 4's `AuditLog` model was added but went unnoticed because the seed script hadn't been
  re-run since — worth remembering next time a new model with a required FK to `User` gets added: the
  wipe sequence needs a line for it too.

Next: Phase 5 — Testing, Performance, & Deployment (or Arabic/bilingual localization, per the earlier
open decision — see git history / conversation for which one comes first).
