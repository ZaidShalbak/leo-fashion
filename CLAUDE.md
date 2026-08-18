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

## 7. Current phase

_(Update as the project progresses.)_

Current phase: **Phase 1 — Project Setup, Database Schema & Auth — complete.** Scaffold, Prisma
schema/migration/seed, Zod validators, and Supabase Auth helpers are all in place and the full check
command passes. Next: Phase 2 — Storefront (Catalog, Product Pages, Filtering).
