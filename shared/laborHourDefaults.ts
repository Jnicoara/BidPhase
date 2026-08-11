/**
 * Placeholder labor hours, matched by assembly name.
 *
 * ── Read this before using any number here ───────────────────────────────────
 * These are PLACEHOLDERS so a new assembly opens with a plausible, obviously
 * editable figure instead of a blank or a zero — a zero prices the work at
 * nothing and is far more dangerous than a wrong-but-visible guess.
 *
 * They are NOT verified labor units. STARTER_LIBRARY.md § Important Notes is
 * explicit: real labor units come from the user's own field experience and the
 * NECA Manual of Labor Units, and an AI-produced unit must never be treated as
 * fact. That is why the shipped starter assemblies in STARTER_LIBRARY.md carry
 * no hours at all, and why every surface that shows one of these must label it
 * as a starting point. See isPlaceholderHours() and its callers.
 *
 * Shared (not server-only) because the builder screen needs the same number the
 * moment a name is typed, with no round trip.
 */

/** Used when nothing matches. Never zero, never blank — see the note above. */
export const FALLBACK_LABOR_HOURS = 0.5;

/**
 * Longest key wins, so "duplex receptacle retrofit" beats "duplex receptacle".
 * Keys are matched case-insensitively as substrings of the assembly name.
 *
 * `perUnit` marks rates expressed per unit of measure rather than per assembly
 * — conduit is quoted per foot, so the number here is hours PER FOOT and the UI
 * says so rather than showing 0.06 as if it were a whole task.
 */
export type LaborHourDefault = {
  match: string;
  hours: number;
  perUnit?: "ft";
  /** Shown in the UI so the user can judge the guess instead of trusting it. */
  basis: string;
};

export const LABOR_HOUR_DEFAULTS: LaborHourDefault[] = [
  // ── Devices ──
  { match: "duplex receptacle retrofit", hours: 1.0, basis: "old-work box, cut-in and fish" },
  { match: "duplex receptacle", hours: 0.75, basis: "rough-in and trim" },
  { match: "dedicated 20a receptacle", hours: 1.25, basis: "rough-in, trim and home run" },
  { match: "gfci receptacle", hours: 0.9, basis: "rough-in and trim" },
  { match: "range receptacle", hours: 1.75, basis: "50A device, heavy cable" },
  { match: "dryer receptacle", hours: 1.5, basis: "30A device, heavy cable" },
  { match: "ev charger circuit", hours: 3.5, basis: "home run, breaker, EVSE connection" },
  { match: "3-way switch", hours: 1.5, basis: "the pair, plus traveler run" },
  { match: "three-way switch", hours: 1.5, basis: "the pair, plus traveler run" },
  { match: "4-way switch", hours: 2.0, basis: "three-location switching" },
  { match: "single-pole switch", hours: 0.6, basis: "rough-in and trim" },
  { match: "dimmer switch", hours: 0.7, basis: "rough-in and trim" },
  { match: "dimmer", hours: 0.7, basis: "rough-in and trim" },
  { match: "switch", hours: 0.6, basis: "rough-in and trim" },
  { match: "receptacle", hours: 0.75, basis: "rough-in and trim" },

  // ── Lighting ──
  { match: "recessed can retrofit", hours: 0.85, basis: "cut-in to existing ceiling" },
  { match: "recessed can", hours: 0.65, basis: "new construction, open ceiling" },
  { match: "surface-mount ceiling fixture", hours: 0.6, basis: "box, whip and hang" },
  { match: "ceiling fan", hours: 1.5, basis: "fan-rated box and balance" },
  { match: "exit sign", hours: 0.75, basis: "mount and connect" },
  { match: "emergency light", hours: 0.85, basis: "mount and connect" },
  { match: "occupancy sensor", hours: 0.6, basis: "swap and commission" },
  { match: "troffer", hours: 0.9, basis: "grid-mount and whip" },
  { match: "high bay", hours: 1.25, basis: "elevated mount and whip" },
  { match: "fixture", hours: 0.6, basis: "box, whip and hang" },

  // ── Panels ──
  { match: "panel", hours: 8.0, basis: "furnish and install" },
  { match: "load center", hours: 8.0, basis: "furnish and install" },
  { match: "sub panel", hours: 5.0, basis: "furnish, install and feed" },
  { match: "subpanel", hours: 5.0, basis: "furnish, install and feed" },
  { match: "meter", hours: 4.0, basis: "socket set and terminate" },
  { match: "disconnect", hours: 2.0, basis: "mount and terminate" },
  { match: "breaker", hours: 0.35, basis: "install in existing panel" },

  // ── Equipment connections ──
  { match: "ev charger", hours: 3.5, basis: "home run, breaker, connection" },
  { match: "water heater", hours: 2.5, basis: "circuit and connection" },
  { match: "hvac", hours: 3.0, basis: "disconnect, whip and connection" },
  { match: "motor connection", hours: 2.5, basis: "disconnect and termination" },
  { match: "appliance", hours: 1.5, basis: "circuit and connection" },

  // ── Low voltage ──
  { match: "smoke detector", hours: 0.75, basis: "interconnected device" },
  { match: "thermostat", hours: 1.0, basis: "control wire and mount" },
  { match: "data drop", hours: 0.75, basis: "pull, terminate and test" },
  { match: "low voltage", hours: 0.75, basis: "pull and terminate" },

  // ── Linear runs — hours PER FOOT ──
  // Conduit and wire are conventionally quoted per 100 ft; expressed per foot
  // here so the number multiplies straight through a footage takeoff.
  { match: '1/2" emt', hours: 0.06, perUnit: "ft", basis: "per foot, run and strap" },
  { match: '3/4" emt', hours: 0.07, perUnit: "ft", basis: "per foot, run and strap" },
  { match: '1" emt', hours: 0.09, perUnit: "ft", basis: "per foot, run and strap" },
  { match: "emt", hours: 0.06, perUnit: "ft", basis: "per foot, run and strap" },
  { match: "pvc", hours: 0.05, perUnit: "ft", basis: "per foot, run and strap" },
  { match: "conduit", hours: 0.06, perUnit: "ft", basis: "per foot, run and strap" },
  { match: "nm-b", hours: 0.02, perUnit: "ft", basis: "per foot, pull" },
  { match: "romex", hours: 0.02, perUnit: "ft", basis: "per foot, pull" },
  { match: "thhn", hours: 0.015, perUnit: "ft", basis: "per foot, per conductor pulled" },
];

/**
 * Best placeholder for an assembly name.
 *
 * Longest match wins so a specific entry beats a generic one — "duplex
 * receptacle retrofit" must not be answered by the bare "receptacle" rule.
 * Returns the fallback (never zero) when nothing matches.
 */
export function defaultLaborHoursFor(name: string): LaborHourDefault {
  const needle = name.trim().toLowerCase();
  if (!needle) {
    return { match: "", hours: FALLBACK_LABOR_HOURS, basis: "generic placeholder" };
  }

  let best: LaborHourDefault | null = null;
  for (const candidate of LABOR_HOUR_DEFAULTS) {
    if (!needle.includes(candidate.match)) continue;
    if (!best || candidate.match.length > best.match.length) best = candidate;
  }

  return best ?? { match: "", hours: FALLBACK_LABOR_HOURS, basis: "generic placeholder" };
}

/**
 * True when `hours` is still exactly what the placeholder table suggested for
 * this name — i.e. the user has not confirmed or changed it.
 *
 * Drives the "starting point, not a verified figure" caption. Once the number
 * is edited to anything else the caption goes away, because at that point it is
 * the user's own number and labelling it a guess would be wrong.
 */
export function isPlaceholderHours(name: string, hours: number): boolean {
  return Math.abs(defaultLaborHoursFor(name).hours - hours) < 1e-9;
}
