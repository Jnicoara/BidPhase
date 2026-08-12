/**
 * Baseline material library — the starter catalog shipped with the app.
 *
 * These become rows in `materials` with `userId = NULL`, meaning they belong to
 * nobody and are read-only. A user who edits one gets their own forked copy.
 *
 * ── The content moved; this file is the front door ───────────────────────────
 * The catalog outgrew a single array when it went from 29 rows to roughly 600.
 * It now lives in ./materials/, one module per family, and this file re-exports
 * it so every existing importer keeps working unchanged. New content goes in
 * the category module it belongs to, not here.
 *
 * `category` is persisted to the `materials.category` column, and these modules
 * stay the authority for baseline rows: seedBaselineMaterials() re-stamps
 * category, aliases, description, trade and price on every startup, so
 * re-shelving a material corrects existing databases with no migration. Names,
 * by contrast, are the match key — see RENAMED_BASELINE_MATERIALS before
 * changing one.
 *
 * Prices are all zero, deliberately. See UNPRICED in ./materials/types.ts.
 */
export {
  BASELINE_MATERIALS,
  RENAMED_BASELINE_MATERIALS,
  type BaselineMaterial,
} from "./materials/index";
