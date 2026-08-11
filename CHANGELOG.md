# Changelog

Plain-English record of what changed and when. Newest first.

This is the human-readable companion to the git history — read this to see what happened, read the commits for the technical detail.

## [2026-08-11]

- Planned out three ways to speed up counting items on a plan: a stamp tool that lets you pick an assembly once and click to drop it as many times as needed, AI that can drop those same pins for you automatically, and the ability to click a symbol in the legend to load its assembly instead of searching by name. Planning only — none of it is built yet.
- Wrote out the parts list for all 27 first-tier starter assemblies — what materials go into a receptacle, a 3-way switch, an EV charger circuit, and so on. Labor hours are deliberately left blank; those come from the NECA manual. Also flagged 36 materials the assemblies need that aren't in the starter materials list yet, so they can be added with real supplier pricing.

## [2026-08-10]

- Fixed a real access-control security gap on project line items, assemblies, and bid summary settings
- Removed ~2,600 lines of dead code (unused Civil/Commercial/Residential calculator screens)
- Set up local development database, fixed a hidden bug in the test setup along the way
- Built and tested the Foundation: Materials, Labor Rates, Modifiers, and Assemblies data model, plus the pricing engine (44 tests passing), including a fix for a subtle money-rounding bug
- Documented the full estimating system plan (ASSEMBLIES_PLAN.md) and a starter content library (STARTER_LIBRARY.md)
