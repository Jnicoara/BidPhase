/**
 * Turning stamps and traced runs into one list an estimator can read.
 *
 * ── Why counts are derived, never stored ─────────────────────────────────────
 * A stamp is one row per drop, so the quantity of an assembly is simply how
 * many rows there are. Storing a count alongside would give two sources of
 * truth for the same fact, and the moment a stamp is deleted from the drawing
 * without the count following, the list and the plan disagree — with nothing on
 * screen to say which is right. Counting here means they cannot diverge.
 *
 * ── One list, two kinds of thing ─────────────────────────────────────────────
 * Stamps are counted (12 receptacles) and runs are measured (30 ft of conduit).
 * They are genuinely different quantities and are kept as distinct entry types
 * rather than flattened into a single "amount" column, because a number without
 * its unit is how a footage ends up being ordered as a piece count.
 *
 * Both carry a location, which is what lets clicking a list row jump the viewer
 * to the mark on the drawing.
 */
import type { PagePoint } from "./takeoffGeometry";

/** A stamp as the counter needs it. */
export type StampRecord = {
  id: number;
  sheetId: number;
  assemblyId: number | null;
  assemblyName: string;
  x: number;
  y: number;
};

/** A traced run as the counter needs it. */
export type RunRecord = {
  id: number;
  sheetId: number;
  name: string;
  pathType: "conduit" | "cable";
  points: PagePoint[];
  /** Null when the sheet could not be measured — see takeoffQuantities. */
  runFeet: number | null;
};

/** Many stamps of one assembly, gathered. */
export type CountedAssembly = {
  kind: "assembly";
  /** Null for an assembly deleted from the library since it was stamped. */
  assemblyId: number | null;
  name: string;
  /** How many were dropped. Derived from the stamps themselves. */
  count: number;
  /** Every instance, so the list can walk through them one at a time. */
  stamps: StampRecord[];
};

/** One traced run. */
export type CountedRun = {
  kind: "run";
  runId: number;
  name: string;
  pathType: "conduit" | "cable";
  /** Null when unmeasurable — shown as such, never as 0. */
  feet: number | null;
  /** Where to jump to: the run's first vertex. */
  at: PagePoint | null;
  sheetId: number;
};

export type CountedItem = CountedAssembly | CountedRun;

/**
 * Group stamps by the assembly they placed.
 *
 * Keyed by assemblyId where there is one, and by NAME where there is not: a
 * stamp whose library assembly has since been deleted keeps its snapshot name,
 * and two such orphans of the same name are the same thing to a person reading
 * the list. Keying orphans by their null id would collapse every deleted
 * assembly into one meaningless row.
 *
 * Order is by first appearance, so the list does not reshuffle as more stamps
 * land — a list that reorders itself while you are clicking is a list you
 * cannot keep your place in.
 */
export function groupStamps(stamps: StampRecord[]): CountedAssembly[] {
  const groups = new Map<string, CountedAssembly>();

  for (const stamp of stamps) {
    const key = stamp.assemblyId !== null
      ? `id:${stamp.assemblyId}`
      : `name:${stamp.assemblyName.trim().toLowerCase()}`;

    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.stamps.push(stamp);
      continue;
    }
    groups.set(key, {
      kind: "assembly",
      assemblyId: stamp.assemblyId,
      name: stamp.assemblyName,
      count: 1,
      stamps: [stamp],
    });
  }

  return Array.from(groups.values());
}

/** Runs as list entries, each pointing at its first vertex. */
export function runEntries(runs: RunRecord[]): CountedRun[] {
  return runs.map(run => ({
    kind: "run" as const,
    runId: run.id,
    name: run.name,
    pathType: run.pathType,
    feet: run.runFeet,
    at: run.points.length > 0 ? run.points[0] : null,
    sheetId: run.sheetId,
  }));
}

/**
 * The whole counted-items list: stamped assemblies first, then traced runs.
 *
 * Stamps lead because they are the higher-frequency action — an estimator
 * drops dozens per sheet and traces a handful of runs — so the thing they are
 * actively adding to stays at the top where they can watch it climb.
 */
export function buildCountedItems(
  stamps: StampRecord[],
  runs: RunRecord[]
): CountedItem[] {
  return [...groupStamps(stamps), ...runEntries(runs)];
}

/** Total pieces stamped, across every assembly. */
export function totalStampCount(stamps: StampRecord[]): number {
  return stamps.length;
}

/**
 * Where a stamp sits, as a point.
 *
 * Trivial, but it keeps the string→number conversion in one place: stamp
 * coordinates arrive from the database as decimal strings, and a `+` on one of
 * those concatenates rather than adds.
 */
export function stampPoint(stamp: { x: number | string; y: number | string }): PagePoint {
  return { x: Number(stamp.x), y: Number(stamp.y) };
}

/**
 * Which stamps sit within a boxed region — the legend-capture selection.
 *
 * Inclusive of the edges, and tolerant of a box dragged in any direction: a
 * user dragging up-and-left produces a negative width, and refusing that would
 * mean the tool only worked one way round.
 */
export function stampsInRegion(
  stamps: StampRecord[],
  region: { x: number; y: number; width: number; height: number }
): StampRecord[] {
  const left = Math.min(region.x, region.x + region.width);
  const right = Math.max(region.x, region.x + region.width);
  const top = Math.min(region.y, region.y + region.height);
  const bottom = Math.max(region.y, region.y + region.height);

  return stamps.filter(s => s.x >= left && s.x <= right && s.y >= top && s.y <= bottom);
}

/** Normalise a symbol label into the key its uniqueness is judged on. */
export function symbolLookupKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}
