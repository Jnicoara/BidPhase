/**
 * The shipped material catalog, assembled from the per-category modules.
 *
 * ── Names are the match key, which makes renaming dangerous ──────────────────
 * `seedBaselineMaterials` matches existing rows to this list BY NAME. That is
 * what makes the seed re-runnable, and it is also the trap: change a name here
 * and the seeder sees a material it has never met, inserts a second row, and
 * leaves the original behind as an orphan the backfill then skips. The user
 * gets two of everything and no explanation.
 *
 * So a rename is not a text edit — it is an entry in RENAMED below, which is
 * applied to the table before matching. That preserves the row's id, which
 * matters more than the name does: assemblies, kits, project items and takeoff
 * stamps all point at material ids, and re-creating a row would silently detach
 * every one of them.
 */
import { CONDUIT } from "./conduit";
import { BOXES } from "./boxes";
import { COVER_PLATES, RECEPTACLES, SWITCHES } from "./devices";
import { CONNECTORS, CONSUMABLES } from "./connectors";
import { DISTRIBUTION, PANELS_AND_BREAKERS } from "./power";
import { LIGHTING } from "./lighting";
import { LOW_VOLTAGE } from "./lowVoltage";
import {
  EQUIPMENT,
  FASTENERS,
  GROUNDING,
  LIFE_SAFETY,
} from "./safetyAndSupport";
import { STRUT } from "./strut";
import { WIRE_AND_CABLE } from "./wireAndCable";
import { dropRestatedWords, type BaselineMaterial } from "./types";

export type { BaselineMaterial } from "./types";

/**
 * Baseline rows to rename in place, old name -> new name.
 *
 * Every entry here is a row the shipped catalog already had under a name that
 * no longer fits the family it turned out to belong to. `1/2" PVC` was fine
 * when it was the only PVC in the catalog and ambiguous the moment Schedule 80
 * arrived; the two EMT connectors were named backwards relative to the 224
 * fittings that now surround them.
 *
 * Entries are safe to keep forever — renaming a row that has already been
 * renamed is a no-op, because nothing matches the old name any more. Do not
 * delete one to tidy up: a database that has not booted since before the rename
 * still needs it.
 */
export const RENAMED_BASELINE_MATERIALS: Record<string, string> = {
  '1/2" PVC': '1/2" PVC Sch 40',
  'EMT connector 1/2"': '1/2" EMT connector',
  'EMT connector 3/4"': '3/4" EMT connector',
  // Written 5"/6" so the leading measurement is a real 5 inches. "5/6" reads
  // as the fraction five-sixths to anything parsing sizes, which sorted the
  // wafer below the 4" one.
  '5/6" wafer LED downlight': '5"/6" wafer LED downlight',
  // "light" -> "light bar", now that tape light shares the heading and the two
  // are bought completely differently — per fixture against per foot.
  '18" under-cabinet light': '18" under-cabinet light bar',
  '24" under-cabinet light': '24" under-cabinet light bar',
  '36" under-cabinet light': '36" under-cabinet light bar',
};

/**
 * Baseline rows the catalog no longer ships.
 *
 * ── Retired, not deleted ─────────────────────────────────────────────────────
 * A shipped row cannot simply vanish from this file: assemblies, kits, project
 * items and takeoff stamps point at material ids, and a bid priced last month
 * has to keep resolving the parts it was priced from. So retiring sets
 * `isActive = false` — the row stops appearing in every list, including the
 * archive, but keeps its id and everything referencing it keeps working. A user
 * who had forked one keeps their own copy; that is theirs, not the catalog's.
 *
 * Use this only when a row is genuinely gone. When it has merely been renamed,
 * use RENAMED_BASELINE_MATERIALS instead — that preserves the row AND keeps it
 * in the catalog, which is almost always what a "removal" actually is.
 */
export const RETIRED_BASELINE_MATERIALS: string[] = [
  // Duplicated 5"/6", which already covers the 6" trim opening. Two rows for
  // one part is a choice between a thing and itself.
  '6" wafer LED downlight',
  // Lugs are sold by conductor RANGE, not per gauge — replaced by the five
  // range-named rows in connectors.ts. The per-gauge names invented parts
  // nobody can order.
  "#6 crimp lug",
  "#4 crimp lug",
  "#2 crimp lug",
  "#1/0 crimp lug",
  "#2/0 crimp lug",
  "#4/0 crimp lug",
  "250 kcmil crimp lug",
  "350 kcmil crimp lug",
  "500 kcmil crimp lug",
];

/**
 * The catalog, with each row's aliases stripped of anything its own name
 * already says. See dropRestatedWords for why that is a pass rather than a
 * rule each module is trusted to follow.
 */
export const BASELINE_MATERIALS: BaselineMaterial[] = (
  [
    ...WIRE_AND_CABLE,
    ...CONDUIT,
    ...STRUT,
    ...BOXES,
    ...RECEPTACLES,
    ...SWITCHES,
    ...COVER_PLATES,
    ...PANELS_AND_BREAKERS,
    ...LIGHTING,
    ...GROUNDING,
    ...LIFE_SAFETY,
    ...LOW_VOLTAGE,
    ...CONNECTORS,
    ...FASTENERS,
    ...EQUIPMENT,
    ...DISTRIBUTION,
    ...CONSUMABLES,
  ] as BaselineMaterial[]
).map(dropRestatedWords);
