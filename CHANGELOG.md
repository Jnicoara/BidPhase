# Changelog

Plain-English record of what changed and when. Newest first.

This is the human-readable companion to the git history — read this to see what happened, read the commits for the technical detail.

## [2026-08-11]

- Planned out three ways to speed up counting items on a plan: a stamp tool that lets you pick an assembly once and click to drop it as many times as needed, AI that can drop those same pins for you automatically, and the ability to click a symbol in the legend to load its assembly instead of searching by name. Planning only — none of it is built yet.
- The Materials library now has a real screen, reachable from the sidebar. It lists the 28 starter materials with their prices, lets you search by trade slang ("recep" finds receptacles), add your own, and edit any of them inline. Editing a starter material quietly hands you your own copy, marked "Your copy", with an undo button that puts the original back.
- Fixed `pnpm dev` on Windows — it was failing immediately with a "NODE_ENV is not recognized" error, so the app could not be started at all.
- Connected the new Materials library to the app. Editing one of the shipped starter materials now quietly gives you your own copy to change, leaving the original intact for everyone else, and you can undo back to the original at any time. Duplicate material names are refused, and prices are checked before saving. Still no screen — that's the last piece.
- Started building the new Materials library. This is the behind-the-scenes half: the app now ships with the 28 starter materials pre-loaded, and there's a working system for a contractor to take one of those shipped materials, make their own edited copy of it, and later undo their edits back to the original. Materials that are in use get hidden rather than deleted, so nothing an assembly points at can disappear. No screen for any of this yet — that comes next.
- Wrote out the parts list for all 27 first-tier starter assemblies — what materials go into a receptacle, a 3-way switch, an EV charger circuit, and so on. Labor hours are deliberately left blank; those come from the NECA manual. Also flagged 36 materials the assemblies need that aren't in the starter materials list yet, so they can be added with real supplier pricing.

## [2026-08-10]

- Fixed a real access-control security gap on project line items, assemblies, and bid summary settings
- Removed ~2,600 lines of dead code (unused Civil/Commercial/Residential calculator screens)
- Set up local development database, fixed a hidden bug in the test setup along the way
- Built and tested the Foundation: Materials, Labor Rates, Modifiers, and Assemblies data model, plus the pricing engine (44 tests passing), including a fix for a subtle money-rounding bug
- Documented the full estimating system plan (ASSEMBLIES_PLAN.md) and a starter content library (STARTER_LIBRARY.md)
