# Assemblies Plan

Planning document for the assemblies/estimating rebuild. No code changes — this captures the intended data model, pricing behavior, screens, and build order.

## DATA MODEL

- **Materials** — name, unit of sale (each / foot / box), cost per unit.
- **Labor Rates** — hourly cost per role (apprentice / journeyman / foreman). Fully separate from assemblies.
- **Modifiers** — adjust labor hours. Two kinds:
  - A shared **global list** usable by most assemblies (height, outdoor, existing/retrofit, etc.).
  - **Assembly-specific one-off modifiers** (e.g. isolated ground for register/computer circuits).
  - Multiple modifiers on one line item **ADD together** — they do not compound/multiply.
- **Assemblies** — bundle materials + base labor hours + applicable modifiers into a reusable recipe. Each assembly belongs to:
  - A **Category**: Devices, Lighting, Panels, Equipment Connections, Low Voltage/EMS.
  - A **Trade** field, for future multi-trade expansion.

## CUSTOMIZATION MODEL

- Users get a personal **fork/copy** of baseline library items and can edit freely.
- Forked items **track which baseline item they came from**.
- Baseline updates **never auto-overwrite** a user's personalized copy — surfaced as "update available" instead.
- Users can create fully **custom** materials / labor rates / assemblies with no baseline link.
- **"Revert to Original"** — discards a user's personal changes and restores the current baseline version.
- **Category is NOT user-extendable.** It stays a small, deliberately curated list — users pick from it when building a custom assembly but cannot add new entries to it. This keeps the category-as-layer reuse (see [LAYERS](#layers)) safe from clutter: no user action can silently add a new layer to every takeoff sheet.

## PRICING FLOW

1. **Direct Cost** = Materials + (Labor hours × modifiers, summed not compounded) × Labor Rate
2. **+ Overhead** — optional, on/off, percentage or flat amount. Applied *before* profit.
3. **+ Profit** — explicit choice between:
   - **Markup %** → `price = cost × (1 + markup%)`
   - **Target Margin %** → `price = cost / (1 - margin%)`
   - Never assumed silently — the user picks.
4. **= Final Bid Price**

Settings exist at two levels:
- **Company-default level** — auto-fills new estimates.
- **Per-project override level.**

## PROJECT ESTIMATES

- When an assembly is added to a project, **snapshot its current costs into the project record** rather than linking live to master pricing — so a submitted bid never silently changes if master rates update later.
- **Snapshot timing is unconditional.** Costs snapshot the moment an assembly is added to *any* bid, regardless of that bid's status. There is no live-linked mode.
- **The "update available" nudge is status-gated.** It appears only on bids still in **Draft**. Once a bid is **Submitted**, it is fully frozen — no nudge at all, even if the underlying baseline or the user's own library item changes.
  - Corollary: the nudge is a Draft-only affordance. Won / Lost / Complete bids inherit Submitted's frozen behavior.

## CONDUIT & WIRE CALCULATION

- Trace conduit runs on the plan; **length calculates automatically including offsets**.
- **Wire footage auto-calculates** from conduit length + termination allowance (2–3 ft at panel, 6–12 inches per device) × number of conductors — built into the calculation directly.
- **Shared conduit runs** — trace the physical path once, assign multiple circuits to it. Conduit counted once; wire multiplies correctly by total conductors sharing it.
- **AI-suggested home run routing** — proposes a starting path from device to panel. Always editable/draggable, never a locked black-box number.
- **Live running tally** of footage by conduit size and wire type as runs are traced.
- **Conduit fill** — soft reference warning only, *not* a certified code-compliance guarantee.
- **Adjustable waste factor %** per material/job.

## APP LAYOUT

Four main areas:
- **Dashboard** — active bids, due dates, win rate, business overview.
- **Bids** — list of all projects.
- **Library** — Materials / Labor Rates / Assemblies.
- **Settings** — company info, default overhead/margin, team.

Inside a bid: **Overview → Takeoff → Pricing → Proposal** (running total always visible everywhere).

Design principles:
- New estimates pre-fill from saved defaults.
- Search beats browsing.
- Advanced options hidden behind a toggle by default.
- One clear primary action per screen.

## DASHBOARD

**Top** — four numbers: Active bids, Win rate, Outstanding bid value, Average margin.

**Below** — Due soon list, Recent activity list.

No charts on the default view — deeper trends live in a separate **Reports** section.

**Bid status flow** (foundational — powers win rate and future labor-unit learning):

`Draft → Submitted → Won or Lost → (if Won) Complete`

Soft dashboard reminder for old bids without a final status.

## TAKEOFF PAGE REDESIGN

Underlying PDF rendering engine **stays as-is**. This redesigns the surrounding workflow:

1. **Sheet index** — auto-detected real sheet names from title blocks, clickable sidebar.
2. **Split-screen** — two independently navigable panels side by side.
3. **Auto scale detection** — reads stated scale/page size, pre-fills calibration.
4. **Persistent legend panel** — extracted symbol legend stays visible while working elsewhere.
5. **Live synced running list** — counted/measured items appear instantly; clicking highlights location on drawing.
6. **Visual marking of already-counted items** — avoids double-counts or misses.

**Priority order:**
1. Sheet index + split-screen
2. Auto scale + legend panel
3. Live list + visual marking
4. AI-assisted detection with review-queue pattern

## LAYERS

- Reuse the existing assembly **Category** field as the default layer grouping — a toggleable, color-coded checklist.
- Affects **both** the drawing view and the live counted-items list.
- Optional **custom tags** (e.g. "underground") for extra grouping beyond category.
- Scales to multi-trade later via the **Trade** field.
- Default: **all layers on** when a sheet is first opened.

## MULTI-TRADE STRUCTURE

**Trade-gated per unlock:**
- Baseline assembly library
- Symbol recognition on takeoff

**Shared across all trades regardless of unlock:**
- Dashboard, Bids, Settings
- Takeoff page tools
- Labor rate structure
- Proposal generator
- Pricing engine

A single bid can include line items from **any trade the user currently has unlocked**.

Future trade expansion (plumbing, HVAC, etc.) will involve **real trade experts** building those baseline libraries — not internal guesswork.

## PROPOSAL & BUSINESS SCOPE

- The app **fully owns the estimate/proposal document end-to-end**, including a reusable exclusion/qualification language library and branded output.
- Invoicing, billing, and accounting are **NOT** being built in-house — instead the app will **export/connect to existing tools** (e.g. QuickBooks) once a bid is won.
- **Estimating is the focused product for now.**

## AI CO-PILOT (plan interpretation assistant)

Chat panel on the takeoff page. Helps interpret dense/confusing plan sheets:
- Explains what a sheet shows
- Decodes symbols/abbreviations
- Answers questions about notes
- Flags related details on other sheets

**Core rule:** every answer must **cite exactly which sheet/note/text it came from**, grounded in the actual uploaded document — never from general knowledge alone.

**Boundary:** answers questions only. Never silently adds a count/measurement to the actual estimate.

**Cost:** AI usage has a real per-use cost that should be **tracked internally from the start**, even before a pricing model is public.

**Build timing:** after the core foundation is complete and proven.

## ADDITIONAL FOUNDATIONAL NOTES

- Ship with a **real starter library** of common electrical materials/assemblies, not an empty catalog — so first use feels functional immediately.
- Include a **simple data export** option from day one, for user trust.
- Every AI-assisted or pricing-related feature gets **real tests before shipping** — same discipline used on the security fix.

## BUILD ORDER (foundation-first rubric)

1. **Foundation** — data model, customization model, pricing math. *This must exist before anything else can be built or shown.*
2. **Library screens** — immediately after Foundation, so the data becomes visible/usable right away.
3. **Bid/Project structure** — status flow, cost-snapshot behavior.
4. **Quick-bid (no plans) flow** — fast quantity-based bidding on top of Foundation + Library. Useful for smaller/residential jobs.
5. **Dashboard**
6. **Takeoff page redesign**
7. **Proposal generator**
8. **AI co-pilot and AI-assisted takeoff features** — last, built on a proven-stable foundation.
