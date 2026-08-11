# Changelog

Plain-English record of what changed and when. Newest first.

This is the human-readable companion to the git history — read this to see what happened, read the commits for the technical detail.

## [2026-08-11]

- Materials can now be found by what electricians actually call them. Every starter material carries trade slang alongside its catalog name, so "1900" finds the 4" square box, "gem box" finds the single-gang, "romex" finds NM-B cable, "plug" finds the duplex receptacle, and "load center" or "breaker box" finds the main panel. Twelve common terms that previously returned nothing now work. Also fixed two ways search could return the wrong item: a two-letter manufacturer code was matching in the middle of unrelated words (searching "breaker" returned a single-gang box, because "ch" is inside "switch"), and searching a category name was pulling in everything filed under it.
- Fixed search ranking so the word you typed wins. Searching "recep" was putting "Wall plate" at the top, above "Duplex receptacle" — the search knows that outlet covers and wall plates are related, and that association was outranking the item you were actually looking for. Search still finds things by trade slang ("romex" finds NM-B cable), but those now sort below anything that genuinely matches what you typed. This affects every search box in the app, not just Materials.
- Materials now have a category, and the Materials screen is shelved by it — Wire & Cable, Conduit, Conduit Fittings, Boxes, Receptacles, Switches, Wall Plates & Misc, Panels & Breakers, Lighting Hardware — so you scroll to the section you want instead of hunting one long alphabetical list. All 28 starter materials were sorted into the right section automatically, including copies you had already edited. Searching still looks across every category at once and lists the best matches first, with each result showing which section it came from. New materials you add can be filed on any shelf, or left unfiled.
- Planned out three ways to speed up counting items on a plan: a stamp tool that lets you pick an assembly once and click to drop it as many times as needed, AI that can drop those same pins for you automatically, and the ability to click a symbol in the legend to load its assembly instead of searching by name. Planning only — none of it is built yet.
- Decided how labor hours will work: they come from your own field experience with the NECA manual as background reading, and the existing Modifiers (height, outdoor, retrofit and so on) already cover what NECA handles with its Normal/Difficult/Very Difficult columns — so the app will not get a separate difficulty setting that asks the same question twice.
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
