# BidPhase TODO

## SaaS Multi-User Upgrade (v4.0)

- [x] Upgrade project to full-stack (database + auth + backend server)
- [x] Design and implement 10-table database schema for multi-user isolation
- [x] Add passwordHash and emailVerified fields to users table
- [x] Build email/password signup procedure (bcrypt, session cookie)
- [x] Build email/password login procedure (timing-safe comparison)
- [x] Build logout procedure
- [x] Build change-password procedure
- [x] Wire all feature routers (auth, projects, data) into main appRouter
- [x] Build server-side db.ts helpers for all 10 tables
- [x] Build AuthGuard component (shows LoginPage when unauthenticated)
- [x] Build LoginPage with email/password form, signup/login toggle, show/hide password
- [x] Build DataConnectorsPanel with 3 tabs: Materials DB, Labor Standards, API Connectors
- [x] Materials DB tab: CSV/JSON upload, column normalization, bulk import, clear all, preview table
- [x] Labor Standards tab: JSON-based profile editor, create/edit/delete profiles, default flag
- [x] API Connectors tab: Platt/Rexel/WESCO/generic REST, API key storage, connection test
- [x] Add AccountSection to SettingsTab (signed-in user display + sign out button)
- [x] Copyright audit: update electricalDatabase.ts header to clarify original authorship
- [x] Remove all NECA Column 1 inline comments, replace with "original estimate"
- [x] Write vitest tests for email/password auth (signup, login, logout) — 7 tests pass
- [x] Dual-mode Assembly/Item estimate engine (from previous session)
- [x] 28 pre-built electrical assemblies seeded into electricalDatabase.ts

## Pending / Future

- [ ] Replace fractional resize recentering with true page-box centering in the PDF viewer
- [ ] Ensure the PDF canvas stays fully within the left pane as the divider moves
- [ ] Connect estimate engine to user's custom materials DB (fall back to built-in DB)
- [ ] Connect estimate engine to user's active labor standard profile
- [ ] Save estimate sessions to DB (currently frontend-only)
- [ ] Project management UI (create/rename/archive projects from the sidebar)
- [ ] Stripe subscription billing (free trial → paid tier)
- [ ] Email verification flow
- [ ] Password reset via email
- [ ] Admin dashboard for user management

## Bug Fixes & UI Polish (v4.1)

- [x] Login page: clean up clunky layout, fix overlapping lines, polish visual design
- [x] Login page: remove lightning bolt icon, show only "BidPhase" text
- [x] Login page: enforce strong password requirements (min 8 chars, uppercase, number, special char) with visual indicator
- [x] Default project state: remove pre-seeded jobs, show "New Project" placeholder when no projects exist
- [x] Projects: always allow deleting down to zero (no minimum project count enforced)
- [x] Sidebar navigation: allow toggling between Residential/Commercial/Industrial/Infrastructure from inside a workspace
- [x] Scale enforcement: require scale to be set before any measuring is allowed
- [x] Scale display: fix false "Scale set" message showing before scale is actually configured
- [x] Measure/Run sync: synchronize the measure and run controls at the top of the page
- [x] Unit count dropdown (right panel): fix so it works independently — should not require clicking the top toolbar button

## PDF Workspace Improvements (v4.2)

- [x] Scale: prompt to set scale on first entry if not previously set (modal/overlay)
- [x] Scale: reset clears the input field so user types a fresh value (no stale previous value)
- [x] Scale: draggable scale points — click a placed dot to reposition it before confirming
- [x] Scale: "Reset Scale" button always visible in toolbar
- [x] Runs: click any line segment to activate that run (no need to use top toolbar)
- [x] Runs: draggable run points — click any placed dot to drag and reposition it
- [x] Delete-all: confirm dialog when deleting 3+ items; also clears count pins for active session
- [x] Pin shapes: add 2 larger square sizes, 1 larger circle, 2 smaller dot sizes
- [x] Pin shapes: add 3 triangle sizes (small, medium, large)
- [x] Wire types: replace conduit size picker with 50-entry wire type list (Romex, SER, SEU, THHN, low-voltage, etc.)
- [x] Wire types: stranded/solid selector on applicable wire types
- [x] Default conduit/conductor: start with 1/2" EMT + #12 copper (not 3/4" EMT)
- [x] Labor/material tab: entire tab row is tappable (not just the text label)
- [x] Empty state copy: update "No runs yet" message to mention materials broadly
- [x] Right panel: auto-expand when a run is pushed so the new run is visible

## v4.3 — Crosshair, Pin Shapes, App Audit

- [x] Remove floating crosshair from run/measure mode (revert to default cursor behavior)
- [x] Add XL size to all 4 pin shape families (dot, square, circle, triangle)
- [x] Standardize pin shape names and sizes across CountIcons.ts and canvas draw code
- [x] App audit: verify all toolbar buttons interact correctly with each other
- [x] App audit: verify all delete/trash tools work as expected
- [x] App audit: document any issues or suggestions found

## v4.5 — Color-Matched Dots & Professional Calc Terminology

- [x] Color-matched run dots: endpoint dots use the active run's color instead of red
- [x] Color-matched cursor: crosshair is yellow when measuring, run-color when dropping run points
- [x] Jacketed/Romex module: add Measured Takeoff, Makeup Allowance, Service Loop, Waste Factor, Terminations, Runs inputs
- [x] Jacketed/Romex module: implement Net Length and Total Billable Wire calculation
- [x] Conduit module: add Measured Takeoff, Conduit Waste Factor, Wire Makeup Allowance, Wire Waste Factor, Terminations inputs
- [x] Conduit module: implement Total Billable Conduit, Net Wire Length per conductor, Total Billable Wire calculation
- [x] Update AppContext RunItem data model with all new professional estimating fields
- [x] Remove old wireSlackPct/conduitSlackPct (replaced by Waste Factor terminology)

## v4.6 — Crosshair Overlay, Scale Prompt, Electrical Category

- [x] Restore full-screen spanning crosshair lines overlay (vertical + horizontal lines to canvas edges) while keeping current + cursor shape
- [x] Add per-page scale verification prompt: show modal/overlay whenever user navigates to a page without a scale set, before they can measure or add runs
- [x] Combine Residential/Commercial/Industrial/Infrastructure into single "Electrical" category on homepage cards
- [x] Combine 4 category icons into single "Electrical" icon in left sidebar
