# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

HelixBid — an electrical-contractor bid/estimating tool. Users build a personal catalog of materials and labor rates, assemble them into reusable assemblies, attach them to project bids, and upload plan PDFs to take off quantities against a live crosshair viewer.

The project was called **BidPhase** until v5.75, and the GitHub repo was renamed to match on 2026-08-12. Only the local checkout directory still carries the old name. Anywhere else, "BidPhase" is either stale or a historical record — `todo.md` entries below v5.75 are the latter and stay as written.

## Commands

```bash
pnpm dev              # start dev server (tsx watch, Vite middleware) — NODE_ENV=development
pnpm build            # vite build (client) + esbuild bundle (server) -> dist/
pnpm start            # run production build (NODE_ENV=production)
pnpm check            # tsc --noEmit — run after any nontrivial change
pnpm test             # vitest run (server/**/*.test.ts only — see vitest.config.ts)
pnpm format           # prettier --write .
pnpm db:push          # drizzle-kit generate then migrate, against DATABASE_URL
```

Run a single test file: `pnpm vitest run server/materials.test.ts`. Tests use `appRouter.createCaller(ctx)` to call tRPC procedures directly (no HTTP) — see `server/v545.test.ts` for the pattern of building a fake `TrpcContext` with an admin/user role.

There is no separate lint script; `pnpm check` (TypeScript strict mode) is the correctness gate.

## Changelog — do this on every meaningful commit

Whenever you commit a meaningful change, **also add a one-or-two-line plain-English entry to `CHANGELOG.md`** describing what changed, in addition to the normal commit message. Do this automatically, as part of the same commit — do not wait to be asked.

- Group entries under a `## [YYYY-MM-DD]` heading, newest date first. Add to today's heading if it already exists; create it if it doesn't.
- Write for a non-programmer reading it months later: what changed and why it matters, not which functions moved. "Fixed a security gap that let any logged-in user read another contractor's bid pricing" beats "added ownership checks to projectItemsRouter".
- Skip it for trivial changes — typo fixes, formatting, comment-only edits.

## Materials — always ship trade slang with a new material

Every material added to the catalog gets `searchAliases` populated with the
terms an electrician would actually type, not just its formal catalog name. This
is not optional polish: a material nobody can find is a material nobody uses. An
estimator searches "1900", "romex", "gem box", "plug" — never "4\" square box",
"12-2 NM-B", "Single-gang box", "Duplex receptacle".

Applies to `BASELINE_MATERIALS` (`server/seed/baselineMaterials.ts`) and to any
other catalog seeded into `materials`. When adding one, ask what it is called on
a job site, at the counter, and by the size or colour people call out — then
write those down. Guidance and worked examples are in that file's header.

Rules that keep the aliases useful rather than noisy:

- **Only what the name does not already contain.** "Dimmer" needs no "dimmer".
- **Include the spellings people type**: "12/2" as well as "12-2", "gfi" as well
  as "gfci", "grey" as well as "gray", "jbox"/"j box".
- **Never alias one material to a different material.** A wall plate is not an
  alias for a receptacle. Cross-aliasing devices is exactly what made searching
  "recep" rank "Wall plate" first (fixed in `3ad4db9`); aliases must surface a
  material, never outrank one the query genuinely names.

The global `ALIAS_MAP` in `client/src/lib/smartSearch.ts` is a *query-side*
synonym table shared by every search box, and is the wrong place for facts about
one material. Put per-material vocabulary on the material.

## Editing fields — standing rules for every input

Accuracy is this app's whole value. A contractor who cannot tell whether a
number saved will stop trusting the total, and a wrong total loses a job. So
every field follows the same five rules, without being asked:

**1. A numeric field selects its value on focus.** Click or tab into a rate,
percentage, quantity or hour count and the existing text is selected, so the
first keystroke replaces it. Nobody should have to clear a field by hand before
typing. Use `onFocus={selectOnFocus}` from `@/lib/selectOnFocus`.

**2. A self-saving field commits on Enter and on blur.** Both, not one, and
both must reach the *same end state* — see rule 5, which is the half of this
that is easy to miss. In a row or form that stays put, Enter keeps focus and
re-selects, so a column of figures can be typed straight down.

**3. Escape abandons the edit.** The field snaps back to the last *saved* value
and writes nothing. Escape reverts to what is stored now — not to the text the
edit started from, which goes stale the moment anything saves.

**4. A successful save shows a brief confirmation.** The field itself flashes
green for about a second — border, tint and text together — plus an `aria-live`
announcement for anyone who cannot see colour. The cue lives ON the field rather
than as a floating tick beside it, so a scrolling row cannot clip it and nothing
shifts. Only on a real write: an unchanged value or a reverted one must NOT
flash, because a confirmation for a save that did not happen is worse than no
confirmation at all.

**5. A field inside a panel closes it on Enter.** Rules 2 and 3 were written
with a field sitting in a row, where committing and leaving are the same thing.
They are not the same thing in a popover, dropdown or flyout, which has an
explicit dismiss step — and there, an Enter that saves but leaves the panel open
has done only half of what clicking away does, so the user still has to dismiss
it by hand. That is the exact friction rule 2 exists to remove. So on a panel,
Enter commits **and** closes, and Escape reverts **and** closes. Pass
`onDismiss` to `InlineNumberField` and it does both; the surface it is on is the
only thing that changes. On a panel with several fields, pass `onDismiss` to the
**last** one only — closing after the first of two strands the user outside a
panel they had not finished filling in.

Invalid input reverts rather than erroring — an inline field has nowhere to put
a message, and leaving a bad draft on screen is how someone comes to believe
they saved something they did not. Blank never silently becomes zero unless the
field opts in with `allowEmpty`: a zero quantity prices work at nothing.

**Do not hand-roll this.** `InlineNumberField` (`@/components/InlineNumberField`)
implements all five for self-saving numbers; the decisions live in
`@/lib/inlineEdit` and are tested there — `planFieldKey` is the one that knows
what Enter and Escape mean on each surface. For a numeric input inside an
explicit Save/Cancel form, rules 2–4 belong to the form's buttons, but rule 1
still applies — attach `selectOnFocus`.

## Responsiveness — standing rules for new screens

The app is used on a laptop in a truck, one-handed, against a supply-house
deadline. It should feel like a native tool, not a web form. Apply these to any
screen or list you build without being asked:

**1. Edits apply instantly and save in the background.** A simple change — a
price, a name, a quantity, a category — updates the UI the moment the user
commits it, and the mutation goes out behind that. Do not `await` a mutation and
then `await refetch()` before showing the result; that turns a 1-character edit
into a visible stall. Use the React Query optimistic path (`onMutate` writes the
new value into the cache via `utils.<router>.<proc>.setData`, `onError` restores
the snapshot it returned, `onSettled` invalidates). Reserve blocking saves for
operations that genuinely cannot be predicted client-side.

**2. Lists load a window, never the whole table.** Anything that grows with the
user's business — materials, takeoff items, project items, assemblies, plan
pages — is paginated at the query (cursor-based `useInfiniteQuery`, not
`.slice()` on a full fetch) and virtualised in the DOM if it renders long. A
screen that is fine at 28 rows and unusable at 5,000 is a bug, not a future
optimisation. Search and filtering belong server-side for the same reason.

**3. Only genuinely slow work gets a loading indicator.** Spinners on fast
operations read as the app being slow. The bar is roughly: under ~300ms show
nothing, and let the optimistic result stand in. Real work — PDF page rendering
(0.5–13s), plan uploads, bulk imports — gets an honest indicator, ideally with
progress rather than an indeterminate spinner. Prefer skeletons over spinners
for a first load, and never replace already-rendered content with a spinner on
refetch.

These are forward-looking. Screens built before this section predate the rules —
do not retrofit them as a side effect of unrelated work; that is its own task and
its own commit.

## Architecture

**Stack:** Express + tRPC (v11, superjson transformer) on the server, React 19 + Vite + Wouter (hash-based routing) on the client, Drizzle ORM against MySQL. Single dev process — Vite runs as Express middleware in development (`server/_core/vite.ts`), and the client is served statically in production.

**`_core/` directories are platform scaffolding**, generated by the Manus WebDev template — `server/_core/`, `client/src/_core/`. They handle OAuth login, JWT session cookies, tRPC boilerplate (`trpc.ts`, `context.ts`), S3-backed file storage via a Forge presign proxy (`storage.ts`, `storageProxy.ts`), and scheduled/cron callback wiring. Prefer extending app-level code over rewriting `_core` internals; `references/periodic-updates.md` documents the cron system in detail if that's ever needed.

**Auth:** OAuth-only (no local password flow is wired up despite `passwordHash` existing on the `users` schema). `sdk.authenticateRequest` (`server/_core/sdk.ts`) resolves the session cookie (or `Authorization: Bearer` fallback) to a `User` row, auto-provisioning on first login. tRPC procedures come in three tiers (`server/_core/trpc.ts`): `publicProcedure`, `protectedProcedure` (any logged-in user), `adminProcedure` (`user.role === "admin"`). Client-side gate is `AuthGuard` in `App.tsx`.

**Data model** (`drizzle/schema.ts`) — everything is scoped by `userId` with cascade deletes:
- `masterItems` / `masterAssemblies` / `masterAssemblyItems` / `masterLaborRates` — the user's reusable catalog (a "master assembly" is a named group of master items with quantities).
- `projects` — one bid. Carries its own PDF plan reference (`pdfUrl`/`pdfKey`/`pdfFilename`, uploaded to S3) alongside bid metadata (customer, address, status).
- `projectAssemblies` / `projectAssemblyItems` — master assemblies *copied* into a project as a snapshot (`masterMaterialCost`/`masterLaborHours` frozen at add-time) plus separate `override*` fields the user edits per-bid. Never mutate the snapshot fields after creation; write to the override fields instead.
- `projectItems` — standalone items added directly to a project outside any assembly, same override pattern.
- `bidSummary` — one row per project holding global labor/markup multipliers (`percentageLaborFactor`, `lumpSumHours`, `markupPct`) and the default labor rate to price against.
- `featureFlags` — admin-toggleable flags gating features for the `contractor` role (`useFeatureFlag` hook client-side).

tRPC routers live in `server/routers/*Router.ts` and are composed in `server/routers.ts`; DB access goes through query functions in `server/db.ts` (no ORM calls directly inside routers).

**Client structure:** `client/src/pages/HelixBidShell.tsx` is the app shell — a hand-rolled hash router (`pathToRoute`/`getCurrentRouteState`) rather than using Wouter's route matching directly, because navigation state also drives sidebar/tab UI. Global app state (active tab/category, UI scale, etc.) lives in `contexts/AppContext.tsx`; theme in `contexts/ThemeContext.tsx`. `components/tabs/` holds per-workspace views (Residential/Commercial/Civil/Industrial estimating, PlanViewer). tRPC client setup is in `lib/trpc.ts`.

**PDF plan viewer pipeline** (the most performance-sensitive part of the client):
- Rendering happens in `client/src/workers/pdfRenderer.worker.ts` — a dedicated Web Worker that owns the pdfjs instance, so `page.render()` (0.5–13s on dense drawings) never blocks the main thread. ImageBitmaps transfer back zero-copy.
- Large PDF binaries are cached client-side in IndexedDB (`hooks/useIndexedDB.ts`, bypasses the 5MB localStorage cap) and mirrored to S3 (`projects.pdfUrl`) so a project's plan follows the user across devices — IndexedDB is just the fast local cache, S3 is the source of truth.
- Page thumbnails/overview render progressively in the background as bitmaps arrive; don't reintroduce synchronous/ref-callback thumbnail generation.

**Path aliases** (`@` → `client/src`, `@shared` → `shared`) are declared in three places that must stay in sync: `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`.

**Conventions:** Prettier enforced (double quotes, semicolons, 2-space indent — see `.prettierrc`); TypeScript strict mode; no ESLint. Commit messages in this repo are versioned checkpoints (`vX.YY`) summarizing what shipped and which GitHub issues they close — follow that style when asked to commit.
