# Changelog

Plain-English record of what changed and when. Newest first.

This is the human-readable companion to the git history — read this to see what happened, read the commits for the technical detail.

## [2026-08-11]

- Planned out three ways to speed up counting items on a plan: a stamp tool that lets you pick an assembly once and click to drop it as many times as needed, AI that can drop those same pins for you automatically, and the ability to click a symbol in the legend to load its assembly instead of searching by name. Planning only — none of it is built yet.

## [2026-08-10]

- Fixed a real access-control security gap on project line items, assemblies, and bid summary settings
- Removed ~2,600 lines of dead code (unused Civil/Commercial/Residential calculator screens)
- Set up local development database, fixed a hidden bug in the test setup along the way
- Built and tested the Foundation: Materials, Labor Rates, Modifiers, and Assemblies data model, plus the pricing engine (44 tests passing), including a fix for a subtle money-rounding bug
- Documented the full estimating system plan (ASSEMBLIES_PLAN.md) and a starter content library (STARTER_LIBRARY.md)
