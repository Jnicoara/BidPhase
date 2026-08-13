/**
 * The one order the materials catalog is displayed in, everywhere.
 *
 * ── Category, then Type, then Size ───────────────────────────────────────────
 * Size alone was not enough. Sorting Conduit purely by size interleaves the
 * five families — 1/2" EMT, 1/2" PVC, 1/2" rigid, 3/4" EMT — so pricing "all
 * the PVC" means picking it out of four other products at every size. An
 * estimator works a takeoff one PRODUCT at a time and walks its sizes, so the
 * family is the outer key and size the inner one.
 *
 * Size ordering itself is not re-derived here: it stays in
 * @shared/materialSizeOrder, which knows that AWG counts backwards, inverts at
 * 1/0 and becomes kcmil. This module decides what to group before handing two
 * names to that comparison.
 *
 * ── One module because it used to be one per screen ──────────────────────────
 * The category order lived as a hand-copied array inside the Materials screen,
 * with a comment asking the next person to keep it in step with the schema by
 * hand. Supplier Pricing did not sort by size at all. Two screens listing the
 * same catalog in two orders is the same class of bug as two catalogs: the
 * answer depends on where you looked. Everything imports from here now, and
 * `server/materialOrder.test.ts` asserts this list still matches the schema
 * enum — the drift is caught rather than hoped against.
 */
import { compareBySize } from "./materialSizeOrder";

/**
 * Display order of the shelves. Mirrors MATERIAL_CATEGORIES in drizzle/schema,
 * which stays the source of truth for what is VALID; this is the order they are
 * shown in, and a test pins the two together.
 *
 * The client cannot import drizzle at runtime (it would pull the ORM into the
 * bundle), which is why this is a plain array rather than a re-export.
 */
export const MATERIAL_CATEGORY_ORDER = [
  "Wire & Cable",
  "Conduit",
  "Conduit Fittings",
  "Boxes",
  "Receptacles",
  "Switches",
  "Wall Plates & Misc",
  "Panels",
  "Breakers",
  "Lighting Hardware",
  "Grounding & Bonding",
  "Life Safety",
  "Low Voltage",
  "Connectors & Terminations",
  "Strut & Supports",
  "Fasteners & Anchors",
  "Equipment & Appliances",
  "Distribution Equipment",
  "Consumables",
] as const;

export type MaterialCategoryName = (typeof MATERIAL_CATEGORY_ORDER)[number];

/** Where a category sits. Unknown or null categories sort to the end. */
export function categoryRank(category: string | null | undefined): number {
  if (!category) return MATERIAL_CATEGORY_ORDER.length + 1;
  const index = (MATERIAL_CATEGORY_ORDER as readonly string[]).indexOf(
    category
  );
  return index === -1 ? MATERIAL_CATEGORY_ORDER.length : index;
}

/**
 * Raceway families, in the order a supply house shelves them.
 *
 * Matched longest-first so "PVC Sch 80" is not swallowed by "PVC", and so
 * "rigid conduit" beats a bare "conduit". Order in this array IS the display
 * order, which is why it is a list rather than a set.
 */
const CONDUIT_FAMILIES: string[] = [
  "EMT",
  "PVC Sch 40",
  "PVC Sch 80",
  "rigid conduit",
  "IMC",
  "liquidtight",
  "flex",
];

/**
 * Breaker classes, in the order asked for: the half-size tandems first, then
 * ordinary single-pole, then everything two-pole.
 *
 * Protected types (AFCI/GFCI/combo) sort within their pole count rather than
 * forming their own block — a 20A AFCI is a single-pole breaker, and an
 * estimator looking for "the 20 amp singles" wants them together.
 */
const BREAKER_CLASSES: Array<{
  rank: number;
  test: (name: string) => boolean;
}> = [
  // "15/15 tandem" — two circuits in one slot. Called peanut or half-size.
  { rank: 0, test: n => /tandem|peanut|half[- ]size/i.test(n) },
  // Anything explicitly two-pole.
  { rank: 2, test: n => /\b2-pole\b|\b\d+\/2\b|double pole|two pole/i.test(n) },
];

/** Everything not matched above is an ordinary single-pole breaker. */
const SINGLE_POLE_RANK = 1;

function breakerClassRank(name: string): number {
  for (const cls of BREAKER_CLASSES) if (cls.test(name)) return cls.rank;
  return SINGLE_POLE_RANK;
}

/**
 * The Type/System bucket a material belongs to within its category.
 *
 * Returns a [rank, label] pair: the rank orders known families explicitly, and
 * the label keeps everything else grouped by its own name so an unrecognised
 * product still clusters rather than scattering through the sizes.
 */
export function materialTypeKey(
  name: string,
  category: string | null | undefined
): [number, string] {
  const trimmed = name.trim();

  if (category === "Conduit" || category === "Conduit Fittings") {
    const found = CONDUIT_FAMILIES.findIndex(family =>
      trimmed.toLowerCase().includes(family.toLowerCase())
    );
    // Unrecognised raceway sorts after the known families, grouped by name.
    return found === -1
      ? [CONDUIT_FAMILIES.length, trimmed.toLowerCase()]
      : [found, CONDUIT_FAMILIES[found].toLowerCase()];
  }

  if (category === "Breakers") {
    const rank = breakerClassRank(trimmed);
    return [rank, String(rank)];
  }

  // Everywhere else, Type is not a meaningful axis and size carries the order.
  return [0, ""];
}

/**
 * Category → Type → Size. The comparison every list of materials uses.
 *
 * Takes the fields rather than a row type so the server, the client and a test
 * can all call it without agreeing on a shape first.
 */
export function compareMaterials(
  a: { name: string; category?: string | null },
  b: { name: string; category?: string | null }
): number {
  const catDiff = categoryRank(a.category) - categoryRank(b.category);
  if (catDiff !== 0) return catDiff;

  // Two unknown categories still need to be told apart, by name.
  if (categoryRank(a.category) >= MATERIAL_CATEGORY_ORDER.length) {
    const an = (a.category ?? "").toLowerCase();
    const bn = (b.category ?? "").toLowerCase();
    if (an !== bn) return an < bn ? -1 : 1;
  }

  const [aRank, aLabel] = materialTypeKey(a.name, a.category);
  const [bRank, bLabel] = materialTypeKey(b.name, b.category);
  if (aRank !== bRank) return aRank - bRank;
  if (aLabel !== bLabel) return aLabel < bLabel ? -1 : 1;

  return compareBySize(a.name, b.name);
}

/** Sort a list of materials into display order. Does not mutate the input. */
export function sortMaterialsForDisplay<
  T extends { name: string; category?: string | null },
>(rows: readonly T[]): T[] {
  return [...rows].sort(compareMaterials);
}

/**
 * Materials grouped into their shelves, in display order, with empty shelves
 * dropped. Rows in an unknown category collect under "Uncategorized".
 */
export function groupMaterialsByCategory<
  T extends { name: string; category?: string | null },
>(rows: readonly T[]): Array<{ label: string; items: T[] }> {
  const buckets = new Map<string, T[]>();
  for (const row of rows) {
    const known =
      row.category &&
      (MATERIAL_CATEGORY_ORDER as readonly string[]).includes(row.category);
    const label = known ? row.category! : "Uncategorized";
    const bucket = buckets.get(label);
    if (bucket) bucket.push(row);
    else buckets.set(label, [row]);
  }

  return [...MATERIAL_CATEGORY_ORDER, "Uncategorized"]
    .map(label => ({
      label,
      items: (buckets.get(label) ?? []).sort(compareMaterials),
    }))
    .filter(group => group.items.length > 0);
}
