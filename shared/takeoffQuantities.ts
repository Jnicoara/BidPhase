/**
 * What a traced run becomes on a bill of materials.
 *
 * ── The distinction this module exists for ───────────────────────────────────
 * A conduit run and the wire inside it are two different quantities measured
 * along the same line, and conflating them is a real, costly estimating error
 * in both directions:
 *
 *   CONDUIT is counted ONCE per physical run. Three circuits sharing one pipe
 *           still need one pipe. Counting it per circuit triples the pipe,
 *           the fittings and the labour to bend it.
 *
 *   WIRE    is counted PER CIRCUIT, and within a circuit per conductor. Three
 *           circuits of 3 conductors each in one 100ft run is 900 feet of
 *           wire, not 100 and not 300. Undercounting here is money the
 *           contractor spends and never quoted for.
 *
 * They are computed by separate functions taking separate inputs so there is
 * no path where one silently becomes the other.
 *
 * ── Cable runs are a different shape, not a special case ─────────────────────
 * Romex and MC are their own raceway: the cable IS the run. There is no
 * conduit line, and asking for one would put a phantom pipe on the bid. So
 * `cableFootage` exists and `conduitFootage` refuses a cable run rather than
 * returning zero — zero would flow into a total as if it had been considered.
 */
import { isUsableScaleRatio, pathRealInches, toBillableFeet, type PagePoint } from "./takeoffGeometry";

/** What kind of raceway a traced run represents. */
export const RUN_PATH_TYPES = ["conduit", "cable"] as const;
export type RunPathType = (typeof RUN_PATH_TYPES)[number];

/** One circuit pulled through a run. */
export type RunCircuit = {
  /** What the estimator calls it — "Ckt 12", "Panel A-3". Display only. */
  name: string;
  /**
   * How many conductors this circuit pulls through the run.
   *
   * Counted, not derived. A 3-wire circuit might be 2 + ground, or 2 hots and
   * a neutral, and deriving it from a voltage or a breaker size would be the
   * app guessing at something the estimator knows.
   */
  conductorCount: number;
};

/**
 * Whether a sheet can be measured against at all.
 *
 * The hard gate for this phase. Every path out of it that is not `ok` must
 * stop the UI from producing a distance — not show a greyed-out number, not
 * show zero, not show a guess.
 */
export type MeasurabilityBlock =
  | { ok: false; reason: "no-scale"; message: string }
  | { ok: false; reason: "not-to-scale"; message: string };
export type Measurability = { ok: true; ratio: number } | MeasurabilityBlock;

/**
 * Can this sheet be measured?
 *
 * Two ways to be blocked, deliberately distinguished because the fix differs:
 *
 *   no-scale      nothing is set. Set one.
 *   not-to-scale  the sheet SAYS it is not to scale, and no human has
 *                 overridden that. A detected or absent scale on a sheet
 *                 marked N.T.S. is not evidence of anything — the drawing is
 *                 telling you its geometry is not trustworthy. Only an
 *                 explicit manual scale clears this, because only a person can
 *                 decide that measuring anyway is reasonable.
 */
export function measurabilityOf(sheet: {
  scaleRatio: number | null;
  scaleSource: "detected" | "manual" | "none";
  notToScale: boolean;
}): Measurability {
  if (sheet.notToScale && sheet.scaleSource !== "manual") {
    return {
      ok: false,
      reason: "not-to-scale",
      message:
        "This sheet is marked not to scale, so measuring it would produce a number the drawing " +
        "does not support. Set a scale by hand if you know what it should be.",
    };
  }

  if (!isUsableScaleRatio(sheet.scaleRatio)) {
    return {
      ok: false,
      reason: "no-scale",
      message: "This sheet has no scale set. Set one before tracing — nothing can be measured without it.",
    };
  }

  return { ok: true, ratio: sheet.scaleRatio };
}

/** A traced run, as the quantity functions need it. */
export type TracedRun = {
  pathType: RunPathType;
  points: PagePoint[];
};

/**
 * The measured length of a run in billable feet, or null if it cannot be
 * measured. Shared by both raceway types — the length is the length.
 */
export function runFeet(run: TracedRun, ratio: number | null | undefined): number | null {
  const inches = pathRealInches(run.points, ratio);
  if (inches === null) return null;
  return toBillableFeet(inches);
}

/**
 * Conduit footage for a run: the traced length, ONCE.
 *
 * Takes no circuits argument, and that is the safeguard rather than an
 * oversight — there is no way to accidentally multiply this by anything,
 * because the number of circuits is not in scope.
 *
 * Refuses a cable run: a cable is its own raceway, and returning 0 would let a
 * phantom conduit line reach a bid as a considered zero rather than as the
 * "not applicable" it actually is.
 */
export function conduitFeet(run: TracedRun, ratio: number | null | undefined): number | null {
  if (run.pathType !== "conduit") return null;
  return runFeet(run, ratio);
}

/**
 * Cable footage for a run: the traced length, once. No conduit alongside it.
 *
 * Refuses a conduit run for the mirror-image reason.
 */
export function cableFeet(run: TracedRun, ratio: number | null | undefined): number | null {
  if (run.pathType !== "cable") return null;
  return runFeet(run, ratio);
}

/** Wire for one circuit: the full run length once per conductor. */
export type CircuitWire = { name: string; conductorCount: number; feet: number };

/**
 * Wire footage per circuit, and the total, for a conduit run.
 *
 * Each circuit gets the FULL run length times its own conductor count. A
 * circuit sharing the pipe does not share the wire — its conductors run the
 * whole way alongside the others.
 *
 * Returns null when the run cannot be measured, and an empty breakdown with a
 * zero total when there are simply no circuits yet — those are different
 * situations and the caller can tell them apart.
 */
export function wireFeetByCircuit(
  run: TracedRun,
  circuits: RunCircuit[],
  ratio: number | null | undefined
): { perCircuit: CircuitWire[]; totalFeet: number } | null {
  if (run.pathType !== "conduit") return null;
  const length = runFeet(run, ratio);
  if (length === null) return null;

  const perCircuit = circuits.map(circuit => {
    // A non-positive or non-finite conductor count contributes nothing rather
    // than NaN — one bad row must not poison the whole total.
    const conductors = Number.isFinite(circuit.conductorCount) && circuit.conductorCount > 0
      ? Math.floor(circuit.conductorCount)
      : 0;
    return {
      name: circuit.name,
      conductorCount: conductors,
      feet: Math.round(length * conductors * 100) / 100,
    };
  });

  const totalFeet = Math.round(perCircuit.reduce((sum, c) => sum + c.feet, 0) * 100) / 100;
  return { perCircuit, totalFeet };
}

/** Everything a run contributes to a bill of materials. */
export type RunQuantities = {
  pathType: RunPathType;
  /** The traced length itself, in feet. */
  runFeet: number;
  /** Pipe to buy. Null for a cable run — not zero. */
  conduitFeet: number | null;
  /** Cable to buy. Null for a conduit run — not zero. */
  cableFeet: number | null;
  /** Wire per circuit. Empty for a cable run. */
  wireByCircuit: CircuitWire[];
  /** All conductors, all circuits. 0 for a cable run. */
  totalWireFeet: number;
};

/**
 * The full quantity breakdown for one run.
 *
 * Returns null when the sheet is not measurable, so a caller cannot get a
 * partial answer out of it and show that as a total.
 */
export function quantitiesForRun(
  run: TracedRun,
  circuits: RunCircuit[],
  ratio: number | null | undefined
): RunQuantities | null {
  const length = runFeet(run, ratio);
  if (length === null) return null;

  if (run.pathType === "cable") {
    return {
      pathType: "cable",
      runFeet: length,
      conduitFeet: null,
      cableFeet: length,
      wireByCircuit: [],
      totalWireFeet: 0,
    };
  }

  const wire = wireFeetByCircuit(run, circuits, ratio);
  return {
    pathType: "conduit",
    runFeet: length,
    conduitFeet: length,
    cableFeet: null,
    wireByCircuit: wire?.perCircuit ?? [],
    totalWireFeet: wire?.totalFeet ?? 0,
  };
}

/**
 * Roll several runs into one bill of materials.
 *
 * The shared-run rule made explicit: conduit is summed once per RUN, wire is
 * summed across every circuit of every run. Runs that cannot be measured are
 * reported separately rather than contributing zero, because a total that
 * silently excludes an unmeasurable run reads as complete when it is not.
 */
export function totalQuantities(
  runs: { run: TracedRun; circuits: RunCircuit[]; ratio: number | null | undefined }[]
): {
  conduitFeet: number;
  cableFeet: number;
  wireFeet: number;
  /** How many runs could not be measured, and so are NOT in the totals above. */
  unmeasurableCount: number;
} {
  let conduit = 0;
  let cable = 0;
  let wire = 0;
  let unmeasurable = 0;

  for (const entry of runs) {
    const quantities = quantitiesForRun(entry.run, entry.circuits, entry.ratio);
    if (!quantities) { unmeasurable++; continue; }
    conduit += quantities.conduitFeet ?? 0;
    cable += quantities.cableFeet ?? 0;
    wire += quantities.totalWireFeet;
  }

  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    conduitFeet: round(conduit),
    cableFeet: round(cable),
    wireFeet: round(wire),
    unmeasurableCount: unmeasurable,
  };
}
