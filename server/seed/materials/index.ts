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
};

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
