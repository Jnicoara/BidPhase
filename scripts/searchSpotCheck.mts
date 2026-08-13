/**
 * Print what the catalog returns for the queries an estimator actually types.
 *
 * ── Why this is a script and not only tests ──────────────────────────────────
 * server/materialsCatalog.test.ts pins the searches that must never regress.
 * This is the other half: a way to LOOK at ranking across a broad sweep of
 * queries after changing catalog content, because most search problems are not
 * "the right row is missing" — they are "the right row is fourth, behind three
 * fittings that share a word with it", which no assertion thought to check.
 *
 *   pnpm tsx scripts/searchSpotCheck.mts            # the standard sweep
 *   pnpm tsx scripts/searchSpotCheck.mts romex 1900 # ad-hoc queries
 */
import { BASELINE_MATERIALS } from "../server/seed/baselineMaterials";
import { smartSearch } from "../client/src/lib/smartSearch";

const index = BASELINE_MATERIALS.map((m, i) => ({
  id: String(i),
  description: m.name,
  unit: m.unitOfSale,
  searchAliases: m.searchAliases,
}));

/**
 * A sweep across every family, weighted toward the queries most likely to go
 * wrong: bare slang, sizes typed three different ways, and words that several
 * families legitimately share.
 */
const SWEEP = [
  // Slang that must beat the formal name
  "romex",
  "1900",
  "gem box",
  "plug",
  "recep",
  "gfi",
  "marrette",
  "spring nut",
  "thinwall",
  "greenfield",
  "sealtite",
  "condulet",
  "bx",
  "mcm",
  "wafer",
  "acorn",
  "wago",
  "tapcon",
  "evse",
  "minerallac",
  "red head",
  "j box",
  // Sizes, typed the ways people type them
  "1/2 emt",
  "3/4 pvc",
  "1-1/4 rigid",
  "1 1/4 rigid",
  "1.25 rigid",
  "2 inch imc",
  "4 pvc 80",
  // Words several families share — the ranking traps
  "connector",
  "coupling",
  "elbow",
  "strap",
  "bushing",
  "box",
  "breaker",
  "panel",
  "switch",
  "cover",
  "ground",
  "transformer",
  "whip",
  "nut",
  // Wire, where solid/stranded/aluminum all collide
  "12-2",
  "12/2",
  "10 thhn",
  "4/0",
  "500",
  "ser",
  "aluminum feeder",
  "bare copper",
  // Equipment
  "smoke",
  "exit",
  "high bay",
  "ceiling fan",
  "disconnect",
  "meter",
  "spa",
];

const queries = process.argv.slice(2).length ? process.argv.slice(2) : SWEEP;

for (const query of queries) {
  const hits = smartSearch(index, query, 5);
  console.log(`\n"${query}"`);
  if (hits.length === 0) {
    console.log("   (nothing)");
    continue;
  }
  hits.forEach((hit, i) => {
    console.log(`   ${i + 1}. ${BASELINE_MATERIALS[Number(hit.id)].name}`);
  });
}
