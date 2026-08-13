/**
 * Receptacles, switches and cover plates.
 *
 * ── The one rule this file exists to keep ────────────────────────────────────
 * A cover plate is NOT aliased to the device it covers, and a device is not
 * aliased to its plate. Cross-aliasing these two is the specific mistake that
 * once made searching "recep" rank "Wall plate" first. Everything in the plates
 * section below is aliased by what it *is* — cover, faceplate, blank — never by
 * what goes behind it.
 */
import { aliases, UNPRICED, type BaselineMaterial } from "./types";

const device = (
  category: "Receptacles" | "Switches" | "Wall Plates & Misc"
) => ({
  unitOfSale: "each" as const,
  costPerUnit: UNPRICED,
  category,
});

// ─── Receptacles ──────────────────────────────────────────────────────────────

/** Nobody says "duplex receptacle" on a job — it is an outlet or a plug. */
const RECEP_SLANG = "outlet plug recep wall device nema";

export const RECEPTACLES: BaselineMaterial[] = [
  {
    ...device("Receptacles"),
    name: "Duplex receptacle",
    searchAliases: aliases(
      RECEP_SLANG,
      "15 amp 5-15r tamper resistant tr standard"
    ),
    description: "15A standard. The 20A version is a separate item.",
  },
  {
    ...device("Receptacles"),
    name: "20A duplex receptacle",
    searchAliases: aliases(
      RECEP_SLANG,
      "5-20r tamper resistant tr t-slot kitchen"
    ),
    description: "20A, T-slot. The 15A version is a separate item.",
  },
  {
    ...device("Receptacles"),
    name: "GFCI receptacle",
    searchAliases: aliases(
      "gfi ground fault interrupter",
      RECEP_SLANG,
      "bathroom kitchen wet location protected self test"
    ),
  },
  {
    ...device("Receptacles"),
    name: "AFCI receptacle",
    searchAliases: aliases(
      "arc fault",
      RECEP_SLANG,
      "bedroom branch feed through"
    ),
  },
  {
    ...device("Receptacles"),
    name: "Twist-lock receptacle",
    searchAliases: aliases(
      "twistlock locking turn",
      RECEP_SLANG,
      "l5-30r l14-30r generator"
    ),
  },
  {
    ...device("Receptacles"),
    name: "50A range receptacle",
    searchAliases: aliases(
      "stove oven cooktop",
      RECEP_SLANG,
      "14-50r 6-50 four prong surface"
    ),
  },
  {
    ...device("Receptacles"),
    name: "30A dryer receptacle",
    searchAliases: aliases(
      "laundry",
      RECEP_SLANG,
      "14-30r 10-30 four prong three prong"
    ),
  },
  {
    ...device("Receptacles"),
    name: "USB combo receptacle",
    searchAliases: aliases(
      "charger charging type c type-a",
      RECEP_SLANG,
      "port bedroom"
    ),
  },
  {
    ...device("Receptacles"),
    name: "Switch/receptacle combo device",
    searchAliases: aliases(
      "combination",
      RECEP_SLANG,
      "garage single gang two function"
    ),
  },
];

// ─── Switches ─────────────────────────────────────────────────────────────────

const SWITCH_SLANG = "light toggle device rocker decora 15 amp";

export const SWITCHES: BaselineMaterial[] = [
  {
    ...device("Switches"),
    name: "Single-pole switch",
    searchAliases: aliases("sp 1p one", SWITCH_SLANG),
  },
  {
    ...device("Switches"),
    name: "3-way switch",
    searchAliases: aliases(
      "three 3way traveler stair hall two location",
      SWITCH_SLANG
    ),
  },
  {
    ...device("Switches"),
    name: "4-way switch",
    searchAliases: aliases(
      "four 4way traveler middle three location",
      SWITCH_SLANG
    ),
  },
  {
    ...device("Switches"),
    name: "Dimmer",
    searchAliases: aliases(
      "switch rheostat slide light dimming decora rocker led compatible"
    ),
  },
  {
    ...device("Switches"),
    name: "Smart switch",
    searchAliases: aliases(
      "wifi wi-fi zwave z-wave app connected",
      SWITCH_SLANG
    ),
  },
  {
    ...device("Switches"),
    name: "Occupancy sensor switch",
    searchAliases: aliases("motion pir auto on vacancy detector", SWITCH_SLANG),
    description: "Turns on automatically. The vacancy version is manual-on.",
  },
  {
    ...device("Switches"),
    name: "Vacancy sensor switch",
    searchAliases: aliases(
      "motion pir manual on detector title 24",
      SWITCH_SLANG
    ),
    description:
      "Manual-on, auto-off. The occupancy version turns on by itself.",
  },
  {
    ...device("Switches"),
    name: "Photocell",
    searchAliases: aliases(
      "photo eye cell dusk dawn daylight sensor outdoor lighting control"
    ),
  },
  {
    ...device("Switches"),
    name: "Timer switch",
    // Deliberately NOT aliased "time clock": that is the name of a different
    // material in this catalog, and aliasing to it would make this outrank the
    // thing a "time clock" query actually names.
    searchAliases: aliases(
      "countdown spring wound programmable bath fan control interval"
    ),
  },
];

// ─── Cover plates ─────────────────────────────────────────────────────────────

/** What a plate IS. Never what sits behind it — see the file header. */
const PLATE_SLANG = "cover faceplate face trim midway";

export const COVER_PLATES: BaselineMaterial[] = [
  {
    ...device("Wall Plates & Misc"),
    name: "Wall plate",
    searchAliases: aliases(
      PLATE_SLANG,
      "1g one gang single decora toggle standard"
    ),
    description: "1-gang. The 2- and 3-gang plates are separate items.",
  },
  {
    ...device("Wall Plates & Misc"),
    name: "2-gang wall plate",
    searchAliases: aliases(PLATE_SLANG, "two gang 2g double decora toggle"),
  },
  {
    ...device("Wall Plates & Misc"),
    name: "3-gang wall plate",
    searchAliases: aliases(PLATE_SLANG, "three gang 3g triple decora toggle"),
  },
  {
    ...device("Wall Plates & Misc"),
    name: "1-gang blank plate",
    searchAliases: aliases(PLATE_SLANG, "one gang 1g solid no hole abandoned"),
  },
  {
    ...device("Wall Plates & Misc"),
    name: "2-gang blank plate",
    searchAliases: aliases(PLATE_SLANG, "two gang 2g solid no hole abandoned"),
  },
  {
    ...device("Wall Plates & Misc"),
    name: "3-gang blank plate",
    searchAliases: aliases(
      PLATE_SLANG,
      "three gang 3g solid no hole abandoned"
    ),
  },
  {
    ...device("Wall Plates & Misc"),
    name: "Weatherproof in-use cover",
    searchAliases: aliases(
      "wp bubble while while-in-use outdoor exterior flip lid rain tight"
    ),
  },
  {
    ...device("Wall Plates & Misc"),
    name: "Panel filler plate",
    searchAliases: aliases(
      "blank breaker space knockout twist out load center filler strip"
    ),
    defaultQty: 4,
  },
];
