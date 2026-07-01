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

## v4.7 — UI Polish + Run Workflow Improvements

- [x] Remove lightning bolt icon from CategoryLanding homepage (keep text-only Electrical card)
- [x] Hide Estimate Engine tab from left sidebar (treat like hidden categories, keep backend)
- [x] Replace electrical sidebar bolt icon with a minimalist electrical panel / breaker box icon
- [x] Show current page scale (e.g. "1 in = 20 ft") in PlanPanel toolbar at a glance
- [x] Right-click context menu on canvas: "Continue run from here" option to resume/extend the active run from any clicked point; easy dismiss (click elsewhere or press Escape)
- [x] Auto-pause active run measurement when user switches to Unit Count tab; auto-resume when switching back to Runs tab (unless they explicitly selected a different run)

## v4.8 — UX Polish Round 2

- [x] Double-right-click (not single) to open "Continue run from here" context menu
- [x] Fix delete run confirmation: only mention the run being deleted, not "all items"
- [x] Scale badge: show both ref footage (e.g. "50 ft ref") and computed ratio (e.g. "1 in ≈ 20 ft")
- [x] Remove scale prompt on page open; only show it when user clicks Measure or Add Run
- [x] Unit Count: simplify shape labels to just shape name (no size suffix)
- [x] Unit Count: remove "Start Counting" step — pressing a shape immediately starts counting
- [x] Unit Count: add collapsible dropdown per shape (expand/collapse on click)
- [x] Fix material search bar (hidden/not working in Unit Count section)
- [x] Make Unit Count tab itself collapsible (click tab to collapse/expand the whole panel)

## v4.9 — Backend Cleanup

- [x] Remove unused DB tables: count_sessions, estimate_sessions, material_rows, plan_images, user_api_connectors, user_assemblies, user_labor_standards
- [x] Remove dead router procedures: laborStandards, apiConnectors from dataRouter
- [x] Remove dead DB helper functions for all removed tables from server/db.ts
- [x] Clean up DataConnectorsPanel: remove LaborStandardsTab and ApiConnectorsTab, keep only MaterialsTab
- [x] Fix projectsRouter: remove old 4-category enum, hardcode "electrical" category
- [x] Push DB migration (0002_chunky_adam_warlock.sql) — 7 tables dropped
- [x] Schema now has 3 tables: users, projects, user_materials_db

## v5.0 — UI Polish Round 3

- [x] Remove Unit Count button from top toolbar (redundant with right panel)
- [x] Fix Set Scale toggle: yellow = scale mode active/editable, dark = locked; clicking again saves previous scale (no toggle off)
- [x] Scale pin shape numbers with shape size (larger shapes get larger font numbers)
- [x] Harmonize run colors and pin colors to vibe with app dark palette while staying distinguishable
- [x] Rename "Electrical" sidebar entry to "Projects" with a new clean icon matching early-phase icon style
- [x] Homepage improvement suggestions delivered to user

## v5.1 — Homepage Merge, Run Workflow, Cursor & UX Polish

- [x] Merge homepage with project list: branded BidPhase header + project cards below on same screen
- [x] BP logo/icon in sidebar always navigates back to home/project list
- [x] Set Scale button changes to "Reset Scale" after scale is set; clicking Reset Scale asks for confirmation before clearing
- [x] Cursor: dot with crosshair lines (not plus shape) — color-matched to active run or yellow in scale mode
- [x] Condensed pin color picker: small swatch popup grid instead of expanded inline picker
- [x] Run cards in right panel: collapsible (click to expand/collapse like Unit Count)
- [x] Run cards: replace minimize button with X button; X asks before deleting
- [x] Deleting a run from right panel also removes it from toolbar strip; remaining runs re-number sequentially
- [x] Run workflow: Pause button (saves progress, exits measure mode), Resume button (re-enters measure mode for that run), Finish button (completes/locks the run)
- [x] Clicking a run in the toolbar strip or right panel re-enters measure mode for that run (resume)

## v5.2 — Homepage/Projects Merge + Scoped Delete/Clear/Reset

- [x] Merge homepage and projects page: project list cards appear directly on the home screen (no separate Projects page)
- [x] Remove the Projects tab from the left sidebar
- [x] Remove the yellow "New Project" button from the top-right (redundant with Create your first project / inline add)
- [x] Add a small "New Project" action inline on the home screen (e.g. a card or row at the bottom of the project list)
- [x] Scope toolbar trash button: only deletes the active run (in Runs mode) or clears pins for the active count session on the current page (in Unit Count mode) — not everything
- [x] Add page-scoped "Clear page runs" button: removes all runs on the current page with a confirmation dialog
- [x] Add page-scoped "Clear page counts" button: removes all count pins on the current page with a confirmation dialog
- [x] Add "Total Reset" button: clears all runs and count pins across all pages; requires confirmation dialog; provides undo (restore previous state)

## v5.3 — Card/Panel Polish

- [x] Project cards: remove folder icon, make project name text larger, make cards taller/bigger
- [x] Right panel: collapsible with intuitive expand/collapse toggle (chevron or drag handle)
- [x] Right panel header: remove "Infrastructure" category label, replace yellow icon with BP logo
- [x] Material/labor summary: replace the weird symbol with the BP logo

## v5.5 — Right Panel & Unit Count Redesign

- [x] Move "Clear page counts" button from right panel to top toolbar (next to existing clear controls)
- [x] Unit Count tab: accordion pin shape selector — all shapes shown side-by-side as small icons; clicking one expands it inline to show size variants; clicking another collapses the previous
- [x] Unit Count tab: condense color picker to a small swatch row (no labels, no expanded grid)
- [x] Right panel: collapsible/minimizable with an easy expand button
- [x] v5.4 cursor fixes: smooth overlay cursor (no lag), count mode dot cursor, count cursor color matches session, Reset Scale returns to dark inactive state

## v5.6 — Unit Count UX & Panel Polish

- [x] Allow unit counting before scale is set (remove scale gate from count mode)
- [x] Remove "Save to Labor & Materials" button from Unit Count tab (redundant)
- [x] Redesign shape + color selector: single compact inline row, less space
- [x] Right panel: fully collapsible to a thin strip (like left sidebar), easy expand button
- [x] Toolbar Runs button: switches right panel to Runs tab, collapses Unit Count tab
- [x] Toolbar Unit Count button: switches right panel to Unit Count tab, starts counting immediately

## v5.7 — Trash/Clear/Panel/PDF UX

- [x] Trash button: delete active pins (count mode) OR active run points (measure mode) — whichever is active
- [x] Clear All: clears both pins AND runs on the current page (not separate buttons)
- [x] Remove the weird square/swatch preview to the right of the color swatches in Unit Count
- [x] Runs list: always visible (remove the collapsible dropdown, show runs directly)
- [x] Right panel: collapse to a very thin strip like the left sidebar, expand back with a button
- [x] PDF upload: ask user to confirm before loading a new PDF; warn that all pins/runs/scale will be cleared

## v5.8 — Right Panel Accordion Fix

- [x] Material search bar: restore visibility under Unit Count section
- [x] Right panel sections: mutually exclusive accordions (Runs / Unit Count / Materials) — clicking one collapses the others
- [x] Right panel collapse/expand: fix so the panel actually collapses to a thin strip and expands back reliably

## v5.9 — Panel & Cursor Polish

- [x] Right panel thin strip: add a visible expand button/chevron so user can click anywhere on the strip to restore the panel
- [x] Right panel header: add a reset-size button to snap the panel back to default 40% width after user drags the divider
- [x] Runs accordion: make it collapsible — clicking the header when Runs is already open should collapse it (not just stay open)
- [x] Cursor: always yellow (#F5C518) in both count mode and measure mode — no run-color matching for the dot or crosshair lines

## v5.10 — Right Panel Layout Reorder

- [x] Right panel: move Unit Count accordion to the top (above Runs)
- [x] Right panel: move Runs accordion below Unit Count
- [x] Right panel: rename "Materials" section to "Material Summary" and make it always-visible (non-collapsible), showing live totals

## v5.11 — Material Summary Reposition & PDF Tool Bug

- [x] Material Summary: remove the "Material Summary" heading, move the section inline below Runs in the scrollable area (grows with content, not pinned to bottom)
- [x] Fix: toolbar/tools disappear after loading a new PDF into an existing project

## v5.13 — Panel Expand Arrow & Toolbar Wrap

- [x] Fix: expand arrow (ChevronLeft) not visible on the collapsed right panel thin strip
- [x] Toolbar: when panel is narrow or collapsed, toolbar buttons/shapes wrap to next line so all tools remain accessible

## v5.14 — Run Continuity & Panel Toggle

- [x] Delete run: auto-create a replacement run (same number/color) so measuring can continue immediately without interruption
- [x] Right panel: replace separate collapse/expand arrows with a single toggle button that works in both states

## v5.16 — Clear Page & Single Toggle

- [x] Fix: "Clear Page" does not remove all pins and runs on the current page
- [x] Fix: two collapse/expand buttons still visible in the right panel (strip + header)

## v5.17 — Header Arrows, Page Label, PDF Tool Fix
- [x] Right panel header: add a left-pointing arrow (expand) next to the right-pointing arrow (collapse) so both directions are always available in the header
- [x] Right panel header: change "Pg N" badge to "Page N" (spell out "Page")
- [x] Fix: tools and cursor do not appear after replacing a PDF in the viewer (z-index / overlay not cleared properly)

## v5.18 — Panel Controls & Pin Size Fix
- [x] Remove Total Reset button from under the material summary section in the right panel
- [x] Add reset-to-default-size button in the right panel header (next to the toggle arrow) to snap panel back to 40% width
- [x] Dot shape: when panel collapses, the dot should drop into the shape list (not stay in header)
- [x] Pin shapes: scale with zoom — shrink as user zooms out so they don't clutter the drawing

## v5.19 — Measurement & UX Polish
- [x] Double-left-click on canvas in measure mode: drop a disconnected start point (lifts the pen) so user can start a new segment on the same run without connecting to the last endpoint
- [x] Remove Pause and Finish buttons from the measuring toolbar
- [x] Unit count sessions: remove the pencil rename button; make the session name label itself inline-editable on click

## v5.20 — UX Simplification & Feature Polish

- [x] Right-click pen-lift: right-click in measure mode lifts the pen (disconnects next segment); remove old right-click context menu
- [x] Run name inline edit: click run name in right panel to rename it directly (same as session rename)
- [x] Keyboard shortcut hints: small key labels on toolbar buttons (M=Measure, C=Count, Esc=exit, U=undo)
- [x] Empty state canvas: when no PDF loaded, show a clear upload prompt in the canvas area
- [x] Scale indicator: always show current scale ratio as a persistent badge in the toolbar
- [x] Contextual toolbar: show only relevant tools per mode (Measure mode / Count mode / Neutral)
- [x] Run list as compact table: Name | Length | Type columns, easier to scan (compact table with inline rename)
- [x] Material Summary highlight: briefly animate the row that changed when a run/pin is added (num-flash on totals)
- [x] Page thumbnails strip: horizontal strip of page thumbnails below hint bar for multi-page PDFs
- [x] Export button: CSV export of all runs + count sessions in right panel header (Download icon)

## v5.21 — Toolbar & PDF UX Fixes

- [x] Remove PDF thumbnail strip (too messy)
- [x] Clarify page number chips in toolbar (add "Pg" prefix so numbers are clearly page numbers)
- [x] Remove "Stop Measurement" and "Stop Count" buttons from the two top toolbar tools
- [x] Restore Upload PDF button in measure and count mode toolbars (always accessible); keep confirmation dialog
- [x] Fix undo glitch: PEN_LIFT sentinel now removed atomically with its paired point
- [x] Fix Clear Page cursor glitch: reset dragRef, isPanning, mousePos, crosshair on all Clear Page confirms
