/**
 * Baseline kits — starter bundles of assemblies, shipped with the app.
 *
 * A kit is a shortcut: "Bedroom package" saves counting four receptacles, a
 * switch and a light one at a time, every bedroom, on every job.
 *
 * ── Quantities here are judgement, not calculation ───────────────────────────
 * Four receptacles in a bedroom is a conventional starting point, not a code
 * requirement derived from wall length or spacing. Nothing in this system
 * computes counts from dimensions, and these numbers are meant to be edited
 * per job like every other starter figure.
 *
 * Assemblies are matched BY NAME against the seeded baseline catalog, so this
 * file never hardcodes an id. A kit whose assemblies are not all present is
 * skipped rather than half-built — the same rule the assembly seeder follows.
 */
export type BaselineKitItem = {
  /** Must match a BASELINE_ASSEMBLIES name exactly. */
  assembly: string;
  qty: number;
};

export type BaselineKit = {
  name: string;
  description: string;
  items: BaselineKitItem[];
};

export const BASELINE_KITS: BaselineKit[] = [
  {
    name: "Bedroom package",
    description:
      "Typical bedroom rough-in — receptacles, switching and a ceiling light.",
    items: [
      { assembly: "Duplex receptacle standard", qty: 4 },
      { assembly: "Single-pole switch", qty: 1 },
      { assembly: "Surface-mount ceiling fixture", qty: 1 },
    ],
  },
  {
    name: "Bathroom package",
    description:
      "GFCI-protected bathroom — vanity receptacle, switching and a fixture.",
    items: [
      { assembly: "GFCI receptacle", qty: 1 },
      { assembly: "Single-pole switch", qty: 2 },
      { assembly: "Surface-mount ceiling fixture", qty: 1 },
    ],
  },
  {
    name: "Living room package",
    description: "Living space with a ceiling fan and switched receptacle.",
    items: [
      { assembly: "Duplex receptacle standard", qty: 6 },
      { assembly: "Single-pole switch", qty: 2 },
      { assembly: "Dimmer switch", qty: 1 },
      { assembly: "Ceiling fan standard", qty: 1 },
    ],
  },
];
