/**
 * Breakers, panels, disconnects and the commercial distribution gear.
 *
 * ── Breaker naming follows the trade, not the catalog ────────────────────────
 * A two-pole 20 amp breaker is a "20/2" out loud and on a takeoff sheet, and
 * that is the name used here — the shipped catalog already had "20/2 breaker"
 * and the rest of the range simply extends it. Single-pole keeps the "20A
 * breaker" form for the same reason: it is what the existing rows are called
 * and what the starter assemblies reference.
 */
import { aliases, UNPRICED, type BaselineMaterial } from "./types";

const gear = (category: "Panels & Breakers" | "Distribution Equipment") => ({
  unitOfSale: "each" as const,
  costPerUnit: UNPRICED,
  category,
});

const BREAKER_SLANG = "circuit cb ocpd bolt on plug in load center";

const singlePole: BaselineMaterial[] = ["15", "20", "30"].map(amps => ({
  ...gear("Panels & Breakers"),
  name: `${amps}A breaker`,
  searchAliases: aliases(
    `${amps} amp`,
    "single pole one pole 1p sp",
    BREAKER_SLANG
  ),
}));

const doublePole: BaselineMaterial[] = [
  "20",
  "30",
  "40",
  "50",
  "60",
  "70",
  "100",
].map(amps => ({
  ...gear("Panels & Breakers"),
  name: `${amps}/2 breaker`,
  searchAliases: aliases(
    `${amps} amp ${amps}a`,
    "2 pole double pole two pole dp 240 volt 240v",
    BREAKER_SLANG
  ),
}));

const combos: BaselineMaterial[] = ["15", "20"].map(amps => ({
  ...gear("Panels & Breakers"),
  name: `${amps}A AFCI/GFCI combo breaker`,
  searchAliases: aliases(
    `${amps} amp`,
    "arc fault ground dual function combination gfi afi bedroom kitchen",
    BREAKER_SLANG
  ),
}));

/**
 * Tandems fit two circuits in one slot. Named by both halves because that is
 * how they are ordered — a "15/20 tandem" is not a 15A or a 20A breaker.
 */
const tandems: BaselineMaterial[] = ["15/15", "20/20", "15/20"].map(config => ({
  ...gear("Panels & Breakers"),
  name: `${config} tandem breaker`,
  searchAliases: aliases(
    config.replace("/", " "),
    "twin duplex half slim skinny cheater two circuits one space",
    BREAKER_SLANG
  ),
}));

const PANEL_AMPS = ["100", "125", "150", "200", "400"];

const mainPanels: BaselineMaterial[] = PANEL_AMPS.map(amps => ({
  ...gear("Panels & Breakers"),
  name: `${amps}A main panel`,
  searchAliases: aliases(
    `${amps} amp`,
    "load center loadcenter breaker box service panelboard distribution main breaker"
  ),
}));

const subPanels: BaselineMaterial[] = PANEL_AMPS.map(amps => ({
  ...gear("Panels & Breakers"),
  name: `${amps}A main-lug sub-panel`,
  searchAliases: aliases(
    `${amps} amp`,
    "mlo subpanel load center loadcenter panelboard remote distribution no main"
  ),
  description:
    "Main-lug only — fed from an upstream breaker, with no main of its own.",
}));

const meterBases: BaselineMaterial[] = ["100", "200", "400"].map(amps => ({
  ...gear("Panels & Breakers"),
  name: `${amps}A meter base`,
  searchAliases: aliases(
    `${amps} amp`,
    "socket can meter main utility service ringless"
  ),
}));

/**
 * Disconnects come fused and non-fused at every size and the two are NOT
 * interchangeable — a fused switch needs fuses bought with it and a non-fused
 * one will not provide the branch protection a spec may be calling for. Both
 * variants ship at every amperage rather than leaving the estimator to assume.
 */
const disconnects: BaselineMaterial[] = ["30", "60", "100", "200"].flatMap(
  amps => [
    {
      ...gear("Panels & Breakers"),
      name: `${amps}A fused disconnect`,
      searchAliases: aliases(
        `${amps} amp`,
        "safety switch service ac unit nema 3r outdoor fusible"
      ),
    },
    {
      ...gear("Panels & Breakers"),
      name: `${amps}A non-fused disconnect`,
      searchAliases: aliases(
        `${amps} amp`,
        "safety switch service ac unit nema 3r outdoor unfused"
      ),
    },
  ]
);

/**
 * Fuses are their own line, not a variant of the switch.
 *
 * A fused disconnect ships empty: the fuses are a separate purchase, at a real
 * per-job cost, and they are also the part that gets replaced later. Folding
 * them into the switch as an option would hide them from the takeoff entirely
 * — the classic way a panel schedule prices out light.
 *
 * The amperages mirror the fused disconnects one for one, INCLUDING the 400A
 * and 600A commercial ones further down this file. A fused switch with no fuse
 * to go in it is the same omission wearing a different hat, so the rule is
 * "every fused disconnect has a fuse" rather than a fixed list — and there is a
 * test asserting exactly that, because the two lists are far apart on screen.
 */
const fuses: BaselineMaterial[] = ["30", "60", "100", "200", "400", "600"].map(
  amps => ({
    ...gear("Panels & Breakers"),
    name: `${amps}A cartridge fuse`,
    searchAliases: aliases(
      `${amps} amp`,
      "class rk5 rk1 j t time delay dual element one time ferrule knife blade buss"
    ),
    // Fuses go in per pole, and nobody buys one.
    defaultQty: 3,
  })
);

const spaDisconnects: BaselineMaterial[] = ["50", "60"].map(amps => ({
  ...gear("Panels & Breakers"),
  name: `${amps}A spa disconnect`,
  searchAliases: aliases(
    `${amps} amp`,
    "hot tub pool gfci gfi outdoor panel gfci breaker included all in one"
  ),
  description: "All-in-one enclosure with the GFCI breaker built in.",
}));

// ─── Commercial distribution ──────────────────────────────────────────────────

/**
 * Placeholders, and honestly so: these are single generic rows standing in for
 * families that are specified per job by kVA, ampacity and enclosure. They earn
 * their place because a commercial bid that silently omits its transformer is
 * wrong by five figures, and a row the estimator prices by hand is a far better
 * failure than no row at all.
 */
const COMMERCIAL_NOTE =
  "Generic placeholder — size and price it per the job's schedule.";

export const DISTRIBUTION: BaselineMaterial[] = [
  {
    ...gear("Distribution Equipment"),
    name: "Dry-type transformer",
    searchAliases: aliases(
      "xfmr kva step down 480 208 120 240 buck boost isolation"
    ),
    description: COMMERCIAL_NOTE,
  },
  {
    ...gear("Distribution Equipment"),
    name: "Busway",
    unitOfSale: "foot",
    searchAliases: aliases("bus duct plug in feeder run overhead"),
    description: COMMERCIAL_NOTE,
  },
  {
    ...gear("Distribution Equipment"),
    name: "Cable tray",
    unitOfSale: "foot",
    searchAliases: aliases("ladder basket rack runway support wire mesh"),
    description: COMMERCIAL_NOTE,
  },
  {
    ...gear("Distribution Equipment"),
    name: "Automatic transfer switch",
    searchAliases: aliases("ats generator standby emergency backup switchover"),
    description: COMMERCIAL_NOTE,
  },
  {
    ...gear("Distribution Equipment"),
    name: "Surge protective device",
    searchAliases: aliases(
      "spd tvss suppressor lightning protection panel mounted transient"
    ),
    description: COMMERCIAL_NOTE,
  },
  {
    ...gear("Distribution Equipment"),
    name: "400A fused disconnect",
    searchAliases: aliases("400 amp safety switch service fusible large nema"),
  },
  {
    ...gear("Distribution Equipment"),
    name: "600A fused disconnect",
    searchAliases: aliases("600 amp safety switch service fusible large nema"),
  },
  {
    ...gear("Distribution Equipment"),
    name: "Lighting contactor",
    searchAliases: aliases(
      "relay coil mechanically held electrically parking lot control panel"
    ),
    description: COMMERCIAL_NOTE,
  },
  {
    ...gear("Distribution Equipment"),
    name: "Time clock",
    searchAliases: aliases(
      "astronomic timer programmable lighting control 7 day"
    ),
    description: COMMERCIAL_NOTE,
  },
];

export const PANELS_AND_BREAKERS: BaselineMaterial[] = [
  ...singlePole,
  ...doublePole,
  ...combos,
  ...tandems,
  ...mainPanels,
  ...subPanels,
  ...meterBases,
  ...disconnects,
  ...fuses,
  ...spaDisconnects,
];
