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

Current phase: **Brand management + catalog cleanup tooling — complete.** Requested outside the
Phase 1–5 roadmap, following up on the multi-brand marketplace work: brand editing was missing
(`/admin/brands` only supported list + create), and there was no way to remove dummy/placeholder
catalog rows short of Prisma Studio. Full check command passes. Decisions worth knowing about:

- **`updateBrand`/`deleteBrand` added to `src/server/actions/admin/brands.ts`**, using the
  `brandUpdateSchema` that already existed in `src/lib/validators/brand.ts` but had no caller yet.
  `/admin/brands/[brandId]/edit` (`EditBrandForm`) mirrors the product edit page's shape. Brand names
  are now links to their edit page from `/admin/brands`.
- **Brand deletion is unconditionally safe and doesn't warn-block**: `Product.brandId` is `ON DELETE
  SET NULL` (confirmed in the `add_brand` migration SQL), so deleting a brand just un-brands its
  products rather than touching them. `DeleteBrandButton` still shows the affected product count in
  its confirm prompt so an admin isn't surprised, but there's no server-side guard preventing deletion
  of a brand that still has products — that's intentional.
- **Product deletion (`deleteProduct` in `src/server/actions/admin/products.ts`) is a genuine hard
  delete**, added alongside archive (archive already existed via `setProductStatus`; delete didn't).
  `ProductVariant`/`ProductImage`/`ProductCollection` all cascade automatically. `OrderItem` is `ON
  DELETE SET NULL`, so past orders keep their `titleSnapshot`/price/etc. and are unaffected.
  `CartItem` has no cascade — `ON DELETE RESTRICT` — so deleting a product currently sitting in
  *any* cart (including an abandoned guest cart) fails; `friendlyDbError`'s existing P2003/P2014
  handling already covers this with a clear message, no new code needed there. If that guard is ever
  in the way for real cleanup, the fix is deleting the blocking `CartItem` rows first in the same
  action — not relaxing the FK, since that guard is what stops a customer's cart from silently losing
  a line item.
- **Both delete buttons use `window.confirm`, not a dialog component.** `src/components/ui/dialog.tsx`
  exists (shadcn) but nothing in the app used it yet; a native confirm was simpler and consistent with
  the app's existing "no confirm dialogs anywhere yet" baseline. Revisit if a second destructive action
  needs a richer confirmation UI (e.g. "type the name to confirm").
- **Real product/brand data entry (replacing the seeded placeholders) is a data-entry task, not a
  code task** — it goes through the now-complete admin UI (`/admin/brands`, `/admin/products/new`)
  directly rather than a one-off script, since (unlike the Phase-4-era backfill scripts) there's no
  bulk transformation of existing rows involved, just new rows an admin enters by hand or a script the
  admin runs against their own real product photos/copy.
- **A one-off script, `prisma/add-real-brands.ts`, was added and run against the real database** to
  create the store's actual brands (Jack & Jones, Wrangler, American Eagle, Lee), sourcing logos from
  Wikimedia Commons via its `Special:FilePath` hotlink convention — freely licensed, no scraping. The
  5 seed-era placeholder brands and all 15 placeholder products were then deleted directly through the
  admin UI built here (not scripted), confirming the delete flows work end-to-end against production
  data, not just against local dev/test data.

Current phase: **Category (Collection) management — complete.** Follow-up to brand management: same
gap, different model. `/admin/collections` (list, create, edit, delete) and
`src/server/actions/admin/collections.ts` (`createCollection`/`updateCollection`/`deleteCollection`)
were built from scratch — unlike brands, there was no create action or admin page for `Collection` at
all before this, only a `db.collection.findMany()` picklist inside the product form. Full check
command passes. Decisions worth knowing about:

- **The Zod schemas already existed** (`collectionSchema`/`collectionUpdateSchema` in
  `src/lib/validators/product.ts`) but had never been wired to a server action — same situation as
  `brandUpdateSchema` was before the brand-management work. `createCollection`/`updateCollection`
  just needed to call them.
- **Collection deletion is unconditionally safe, mirroring brand deletion**:
  `ProductCollection.collectionId` is `ON DELETE CASCADE`, so deleting a category only removes the
  join-table rows — the products themselves are never touched, they just stop being grouped under
  that category (and drop out of the homepage hero/category-tile rotation if it was their only one,
  same graceful-skip behavior as an emptied-out collection always had).
  `DeleteCollectionButton` shows the affected product count in its confirm prompt for the same reason
  `DeleteBrandButton` does, with no server-side block.
- **The admin UI is labeled "Categories," not "Collections"** — matches how the storefront already
  talks about this concept ("Shop by category" on the homepage) even though the underlying model,
  routes (`/collections/[handle]`), and action names stay `Collection`/`collection*` for consistency
  with the schema. Same pattern as `Brand`'s admin/storefront wording never diverging, just inverted:
  here the *model* name and the *user-facing* name differ on purpose.
- **Found and fixed a real duplicate-JSX-prop bug while starting this work** (`npm run lint` failed
  immediately on `git checkout main` before any collection code was written): both
  `BrandsSection.tsx` and `brands/page.tsx` had two separate `unoptimized` props (each with its own
  explanatory comment) on the same `<Image>` — an artifact of the `fix/brand-logo-unoptimized-image`
  branch's fix and a later re-application of that same fix landing on `main` through two different
  merge paths (see git history around PRs #6/#7) without either merge flagging it as a conflict, since
  JSX doesn't reject duplicate props at the git level, only at lint/compile time. Fixed by keeping one
  copy of the prop and comment in each file. Worth remembering: a duplicate-prop bug like this can
  merge cleanly and only surface later, so it's worth running `npm run lint` right after any merge
  that touches the same lines from two directions, not just after your own edits.
- **Adding real categories is, like brands, a data-entry task** — the three seed-era placeholder
  categories (Everyday Essentials, Outerwear, Weekend) don't reflect the real catalog (currently
  Jack & Jones / Wrangler / American Eagle / Lee — denim- and casualwear-leaning), so the actual
  category list is a business decision for the store owner, entered through `/admin/collections`
  once decided rather than guessed here.

Current phase: **Storefront header icons — complete.** The "Cart (N)" text link and the separate
"Orders" / "Admin" / "Sign out" text links in the desktop nav are replaced with a bag icon (badge for
count) and a single user-icon dropdown. Full check command passes. Decisions worth knowing about:

- **`lucide-react` was already a dependency** (used by `src/components/ui/dialog.tsx` and
  `select.tsx`) but nothing storefront-facing used it yet — `CartIconLink.tsx` (`ShoppingBagIcon` +
  count badge, capped display at "9+") and `UserMenu.tsx` (`UserIcon` trigger, dropdown with
  `PackageIcon` Orders / `ShieldIcon` Admin / `LogOutIcon` Sign out) both follow the codebase's
  existing `*Icon`-suffix import convention.
- **`UserMenu` consolidates what used to be three separate nav links into one dropdown** — closes on
  outside click or Escape (plain `useRef` + a `mousedown`/`keydown` document listener, no dependency
  added; same class of interaction `MobileNav`'s hamburger already had, just with the close-on-outside
  behavior added on top since a dropdown that only closes via its own toggle button feels broken).
- **`MobileNav`'s hamburger panel was deliberately left as plain text links** (Orders/Admin/Sign out
  still spelled out inside it) — it's already a single consolidated menu behind one icon (the
  hamburger), so nesting another icon-triggered dropdown inside it would add a layer of indirection
  without removing any nav clutter. The always-visible mobile top bar did get the same cart-icon
  treatment as desktop, via the same shared `CartIconLink` component, since that one *is* directly
  parallel to its desktop counterpart.
- **Verified visually** (Playwright, local dev, guest cart) that the bag icon renders and the count
  badge appears correctly after an add-to-cart. The signed-in `UserMenu` dropdown itself couldn't be
  exercised the same way — this sandbox's local dev environment runs on placeholder Supabase Auth
  credentials (see CLAUDE.md section 6), so sign-in doesn't work end-to-end here regardless of this
  change. Worth a manual click-through on a real signed-in session after this ships.
- **This branch forked from `main` before `feat/collection-management` merged**, so it independently
  hit and re-fixed the same duplicate-`unoptimized`-prop bug in `BrandsSection.tsx`/`brands/page.tsx`
  documented above — resolved as a normal merge conflict (both sides had already converged on
  functionally the same fix, just slightly different comment wording) when this branch merged back
  into `main`, not a new bug.

Current phase: **Fixed the size/color picker for partial variant matrices — complete.** Real-catalog
bug, found via a live admin adding "American Eagle T-shirt" with two variants — M/Black (10 in stock)
and L/Navy (10 in stock), no M/Navy or L/Black — and seeing M and Black both render disabled on the
product page even though both had stock. Root cause and fix:

- **`VariantSelector.tsx` used to disable a size button whenever `size + selectedColor` had no
  matching variant**, and disable a color button whenever `selectedSize + color` had no match. That's
  correct for a full size×color grid, but a real product doesn't have to sell every size in every
  color — this product only ever had two variants total, on the diagonal, not four. With Navy
  selected, M got disabled (there's no M/Navy) even though M/Black exists and has stock; the shopper
  had no way to reach it.
- **Fixed by decoupling "is this size/color selectable at all" from "does it match what's currently
  selected."** A size button is now disabled only if *no* variant of that size, in *any* color, has
  stock (`sizeHasAnyStock`); same idea for color (`colorHasAnyStock`). Clicking a size or color that
  doesn't match the other current selection now auto-corrects the other dimension to whichever value
  actually pairs with it and has stock (`handleSelectSize`/`handleSelectColor`), instead of leaving
  the shopper stuck on a combination that doesn't exist.
- **No schema or server-action change** — this was entirely a client-side selection-logic bug, not a
  data or inventory-decrement issue. `matched`/`isOutOfStock`/`priceCents` (what actually gets added
  to cart) were already correctly derived from `selectedSize + selectedColor`; only which buttons were
  clickable, and what selecting one did to the other, needed fixing.
- **Verified with a temporary local product** (two variants, same diagonal pattern as the real bug
  report) via Playwright screenshots: initial state showed L/Navy selected with M and Black both
  enabled (not struck through); clicking M auto-switched color to Black; clicking Navy from there
  auto-switched size back to L. Test product and its throwaway brand were deleted after verifying —
  this fix needs no seed/backfill script since it only touches component logic.
- **No admin-side change needed** for this bug specifically — an admin can keep entering a partial
  matrix (e.g. one variant per size, different colors) exactly as they already were; the storefront
  now handles it correctly rather than requiring every size×color combination to exist just to make
  the picker usable.

Current phase: **Discount / promo codes — complete.** Requested outside the Phase 1–5 roadmap.
Scope was explicitly narrowed by the store owner up front: **percentage-off only** (no fixed-amount
codes), **whole-order only** (no per-product/brand/category codes), with all four common limit types —
expiration date, minimum order amount, one use per customer, and a max total redemption count. Full
check command passes, including new unit tests for the pure validation logic and new integration
tests covering every rejection path inside `placeOrder`. Decisions worth knowing about:

- **A new `DiscountCode` model** (`code`, `percentOff`, `isActive`, `expiresAt`, `minSubtotalCents`,
  `maxRedemptions`, `redemptionCount`) plus a nullable `Cart.appliedDiscountCode` string and four new
  nullable/defaulted fields on `Order` (`discountCodeId`, `discountCodeSnapshot`,
  `discountPercentSnapshot`, `discountCents`). See the field-level comments in `prisma/schema.prisma`
  for the full reasoning; the short version is in the next few bullets.
- **One use per customer per code is enforced at the database level**, not with a separate redemption
  table: `Order` has `@@unique([discountCodeId, userId])`. This works because Postgres treats every
  row with a NULL in a unique-index column as distinct from every other such row — the vast majority
  of orders have `discountCodeId = null` and are never constrained by this index at all; it only ever
  bites a real second order from the same user with the same non-null code.
- **Applying a code to the cart (`src/server/actions/discount.ts`) is a non-authoritative preview
  only.** It validates the code against the live subtotal and, if it checks out, just stores the code
  string on the cart — it never touches `DiscountCode.redemptionCount` and never permanently reserves
  anything. Only `placeOrder`'s transaction (`src/server/actions/order.ts`) does the real, final
  validation and redemption, re-running the exact same pure `validateDiscountCode` check
  (`src/lib/discount.ts`) from scratch rather than trusting whatever the cart page last showed —
  same "never trust pre-computed client/cart state" posture as the rest of this codebase.
- **Redemption-limit enforcement mirrors the existing inventory-decrement pattern**: advancing
  `redemptionCount` is a conditional `updateMany` (`WHERE redemptionCount < maxRedemptions`, or
  unconditional when there's no limit) inside `placeOrder`'s transaction, not a read-then-write — so
  two concurrent checkouts racing for the last redemption slot can't both succeed. Covered by the same
  style of real concurrency reasoning already used for stock (though the discount tests here cover
  each rejection path individually rather than a race test, since the redemption-limit race is
  structurally identical to the already-tested inventory race).
- **No separate `Order.totalCents` column was added.** The amount actually owed is always computed at
  display time as `subtotalCents - discountCents` (`calculateTotalCents` in
  `src/lib/cart-totals.ts`) rather than stored — avoids any backfill question for existing orders,
  which all default to `discountCents = 0` and so already compute the right total for free.
- **Order history is snapshotted, not live-linked**, the same philosophy `OrderItem.titleSnapshot`
  already established: `discountCodeSnapshot`/`discountPercentSnapshot`/`discountCents` are frozen at
  order time and never recomputed from the live `DiscountCode` row, which can later be edited or even
  deleted (`discountCodeId` is `ON DELETE SET NULL`) without changing what a past order displays.
- **Admin discount-code management (`/admin/discount-codes`) follows the same full-resend edit-form
  pattern as brands/categories** — the edit form is always pre-filled with the complete current row
  and resubmits every field, so a blank `expiresAt`/`minSubtotalCents`/`maxRedemptions` on save means
  "clear it," not "leave unchanged." `redemptionCount` is deliberately not editable through the form
  at all — it only ever advances inside `placeOrder`'s transaction.
- **The cart page (`/cart`) is the only place a code can be applied or removed** — `PromoCodeForm`, a
  small client component, calls `applyDiscountCode`/`removeDiscountCode` and then
  `router.refresh()`s so the discount line and total always reflect a fresh server read, not local
  component state. Checkout, order confirmation, account order history, and the admin order list/detail
  views all just *display* the resulting discount/total (`OrderDetail.tsx`'s shared component covers
  three of those four); none of them offer an input.
- **Verified with Playwright against local dev**: added an item to a guest cart, applied a made-up
  code (correct rejection message), then applied a real 10%-off code seeded directly into the local
  DB and confirmed the subtotal/discount/total math rendered correctly. The admin `/admin/discount-codes`
  route was only confirmed to redirect cleanly to `/login` rather than crash — this sandbox's
  placeholder Supabase Auth credentials mean a real signed-in admin session can't be exercised here
  (same limitation noted for `UserMenu` in the header-icons phase above).
- **The real Supabase Postgres database still needs this migration applied** — same as every schema
  change in this project, `prisma/migrations/20260820120316_add_discount_codes/migration.sql` was
  generated and applied against local dev Postgres only (this sandbox can't reach the real database —
  see section 6); running the equivalent `prisma migrate deploy` against the real project has to
  happen from the user's own machine before this feature works end-to-end in production.

Current phase: **Per-variant (per-color) product images — complete.** Closes a gap flagged during the
variant-model discussion above: `ProductImage` used to belong only to the whole product, so a shirt
in Black and Navy showed the exact same photo no matter which color a shopper picked. Full check
command passes. Decisions worth knowing about:

- **Images are tagged by color, not by full size+color variant.** Added a single nullable
  `ProductImage.color String?` column (matched against `ProductVariant.color` by exact string, not a
  foreign key — see the field's comment in `schema.prisma`) rather than a variant-level association.
  The reasoning: a photo of a black t-shirt is the same photo regardless of which size someone's
  looking at, so tying it to a specific `(size, color)` variant would just mean re-uploading the same
  picture once per size for no benefit. `color: null` means a general/all-colors photo — every
  existing product's images default to this, so nothing regresses until an admin actually tags
  something.
- **Gallery fallback is three levels, in `ProductDetail.tsx`'s `imagesForColor`**: exact color match
  first; if none, the product's untagged/general photos; if there are none of *those* either (a
  product that hasn't had any photos tagged yet), every photo it has — so a product with zero color
  tagging behaves exactly like the gallery always did, and partial tagging (some colors done, some
  not) degrades gracefully instead of showing a blank gallery for an untouched color.
- **Color selection was lifted out of `VariantSelector` into a new parent, `ProductDetail.tsx`**,
  since the gallery needs to react to it too. `VariantSelector` now takes `selectedColor`/
  `onColorChange` as controlled props instead of owning that piece of state itself; `selectedSize`
  and all the existing fallback-pairing logic (auto-correcting to a valid combination when a shopper
  picks a size/color that doesn't pair with the current selection) stayed put, since size doesn't
  affect which photos show. `ProductDetail` renders both `ProductGallery` and `VariantSelector` as
  fragment siblings (no wrapping element) so they still land as direct children of the page's
  existing two-column CSS grid.
- **The storefront product page (`page.tsx`) got thinner, not thicker** — it used to inline the
  brand/title/description JSX around `VariantSelector`; that all moved into `ProductDetail` too,
  since it needed to sit inside the same lifted-state component regardless. No behavior change there,
  just relocated.
- **Admin tagging happens in `ImageManager`** (`/admin/products/[id]/edit`): a color `<select>` next
  to the upload button (defaulting to "General") tags a new photo on upload, and each existing
  thumbnail gets its own small color `<select>` to retag it after the fact — added specifically so
  photos uploaded *before* this feature existed (all currently `color: null`) can be tagged without
  re-uploading. Both go through server-side validation (`uploadProductImage`/
  `updateProductImageColor` in `src/server/actions/admin/images.ts`) that checks the submitted color
  against the product's actual variant colors — a typo'd color can't silently create a tag that never
  matches anything in the storefront gallery. The color dropdowns only render at all when a product
  has more than one variant color; a single-color product has nothing worth tagging.
- **Verified with Playwright against local dev**: tagged a real product's two existing placeholder
  photos as "Black" and "White," confirmed the gallery's image `src` actually swaps when clicking
  those color buttons, and confirmed picking the product's third (untagged) color falls back to
  showing everything rather than a blank gallery. The admin image-tagging UI itself could only be
  confirmed to redirect cleanly to `/login` rather than crash — same placeholder-Supabase-Auth
  limitation as every other admin UI verified in this sandbox (see the discount-codes and
  header-icons phases above).
- **This branch was rebranched partway through**: it was originally cut from `main` before the
  discount-codes PR merged; once the user merged that PR mid-session, `main` was re-synced and this
  branch rebased onto the new tip (clean rebase, one straightforward conflict-free auto-merge in
  `schema.prisma`) rather than left to diverge and produce a messier merge later.
- **No new migration risk beyond the usual**: this is a single additive, nullable column
  (`prisma/migrations/20260821090000_add_product_image_color/migration.sql`) — applied to local dev
  Postgres only, same as every schema change in this project (see section 6). The equivalent
  `prisma migrate deploy` still needs to run against the real Supabase database from the user's own
  machine before this feature is live in production.
