/**
 * Baseline material library — the starter catalog shipped with the app.
 *
 * These become rows in `materials` with `userId = NULL`, meaning they belong to
 * nobody and are read-only. A user who edits one gets their own forked copy.
 *
 * Source of truth for this content is STARTER_LIBRARY.md § Materials. Prices are
 * deliberately placeholder starting estimates, not quotes — users replace them
 * with their own supplier pricing.
 *
 * `category` is persisted to the `materials.category` column, and this file
 * stays the authority for baseline rows: seedBaselineMaterials() re-stamps it on
 * every startup, so re-shelving a material here corrects existing databases with
 * no migration. Names, by contrast, are the match key — renaming one here
 * inserts a new row rather than renaming the old.
 */
import type { MATERIAL_UNITS_OF_SALE, MaterialCategory } from "../../drizzle/schema";

type UnitOfSale = (typeof MATERIAL_UNITS_OF_SALE)[number];

export type BaselineMaterial = {
  name: string;
  unitOfSale: UnitOfSale;
  /** Decimal column — kept as a string so no float rounding happens on the way in. */
  costPerUnit: string;
  category: MaterialCategory;
  /**
   * Space-separated trade slang for what an electrician actually types.
   *
   * Rules of thumb used below:
   *  - Only terms NOT already in the name. "Dimmer" needs no "dimmer" alias.
   *  - Include the spellings people type: "12/2" as well as "12-2", "gfi" as
   *    well as "gfci", "grey" as well as "gray".
   *  - Include what the thing is called on site, not just in the catalog:
   *    a 4" square box is a "1900 box", a single-gang box is a "gem box".
   *  - Do NOT alias one material to a different material. "Wall plate" is not
   *    an alias for a receptacle; that is what caused the "recep" mis-ranking.
   */
  searchAliases: string;
  /**
   * Suggested quantity when this material is added to an assembly. Omitted = 1.
   *
   * Only for consumables nobody fits one of — you do not put a single wire nut
   * on a device. Kept deliberately short: four entries, easy to extend, and the
   * builder treats every one as an editable suggestion rather than a rule.
   */
  defaultQty?: number;
};

export const BASELINE_MATERIALS: BaselineMaterial[] = [
  // ── Wire & Cable ──
  // THHN sizes: people type the gauge every possible way, and THWN is the same
  // wire under a wet-location rating — the spool is dual-rated THHN/THWN-2.
  { name: "#14 THHN", unitOfSale: "foot", costPerUnit: "0.4000", category: "Wire & Cable",
    searchAliases: "14 awg 14 gauge 14ga thwn thwn-2 building wire pipe wire single conductor stranded solid" },
  { name: "#12 THHN", unitOfSale: "foot", costPerUnit: "0.5500", category: "Wire & Cable",
    searchAliases: "12 awg 12 gauge 12ga thwn thwn-2 building wire pipe wire single conductor stranded solid" },
  { name: "#10 THHN", unitOfSale: "foot", costPerUnit: "0.8500", category: "Wire & Cable",
    searchAliases: "10 awg 10 gauge 10ga thwn thwn-2 building wire pipe wire single conductor stranded solid" },
  { name: "#8 THHN", unitOfSale: "foot", costPerUnit: "1.3500", category: "Wire & Cable",
    searchAliases: "8 awg 8 gauge 8ga thwn thwn-2 building wire pipe wire single conductor stranded" },
  // NM-B is universally "Romex" (a Southwire brand name). Jacket colour is how
  // it gets called out on site: 14-2 is white, 12-2 is yellow.
  { name: "14-2 NM-B", unitOfSale: "foot", costPerUnit: "0.6500", category: "Wire & Cable",
    searchAliases: "romex 14/2 14 2 nm nm-b nonmetallic sheathed house wire white romex 14-2 with ground" },
  { name: "12-2 NM-B", unitOfSale: "foot", costPerUnit: "0.9000", category: "Wire & Cable",
    searchAliases: "romex 12/2 12 2 nm nm-b nonmetallic sheathed house wire yellow romex 12-2 with ground" },

  // ── Conduit ──
  // EMT is "thinwall" or just "pipe"; PVC is called by its schedule and colour.
  { name: '1/2" EMT', unitOfSale: "foot", costPerUnit: "0.9000", category: "Conduit",
    searchAliases: "thinwall thin wall half inch pipe tube tubing electrical metallic conduit" },
  { name: '3/4" EMT', unitOfSale: "foot", costPerUnit: "1.2000", category: "Conduit",
    searchAliases: "thinwall thin wall three quarter pipe tube tubing electrical metallic conduit" },
  { name: '1" EMT', unitOfSale: "foot", costPerUnit: "1.8000", category: "Conduit",
    searchAliases: "thinwall thin wall one inch pipe tube tubing electrical metallic conduit" },
  { name: '1/2" PVC', unitOfSale: "foot", costPerUnit: "0.4500", category: "Conduit",
    searchAliases: "schedule 40 sch 40 grey gray plastic conduit poly pipe underground direct burial" },

  // ── Conduit Fittings ──
  // Connectors are named by how they grip: set-screw (indoor) vs compression
  // (wet). A single strap is a "one-hole" or, by brand, a Minerallac.
  { name: 'EMT connector 1/2"', unitOfSale: "each", costPerUnit: "0.6000", category: "Conduit Fittings",
    searchAliases: "set screw compression rain tight steel die cast half inch box fitting",
    defaultQty: 2 },
  { name: 'EMT connector 3/4"', unitOfSale: "each", costPerUnit: "0.8500", category: "Conduit Fittings",
    searchAliases: "set screw compression rain tight steel die cast three quarter box fitting",
    defaultQty: 2 },
  { name: "EMT strap", unitOfSale: "each", costPerUnit: "0.3500", category: "Conduit Fittings",
    searchAliases: "one hole 1 hole two hole 2 hole conduit pipe clamp minerallac hanger",
    defaultQty: 3 },
  // Asked for at the counter as a "spring nut" far more often than a "channel
  // nut". Only "spring" is aliased, not "spring nut": the name already carries
  // "nut", so a search for "spring nut" matches "spring" here and "nut" there
  // — and repeating a name word is the dead weight the alias rules forbid.
  // Unistrut/Kindorf/Superstrut are brand names used generically, the way
  // Marrette is for a wire nut.
  { name: "Strut channel nut", unitOfSale: "each", costPerUnit: "0.7500", category: "Conduit Fittings",
    searchAliases: "spring unistrut kindorf superstrut b-line square 1/4-20 3/8-16",
    defaultQty: 4 },

  // ── Boxes ──
  // Trade names run deep here: a single-gang is a "gem box" or "switch box",
  // and a 4" square is universally a "1900 box".
  { name: "Single-gang box", unitOfSale: "each", costPerUnit: "1.2500", category: "Boxes",
    searchAliases: "gem switch device nail on new work rough in old work 1g one" },
  { name: '4" square box', unitOfSale: "each", costPerUnit: "1.7500", category: "Boxes",
    searchAliases: "1900 nineteen hundred 4s four junction jbox pull" },
  { name: "Fan-rated ceiling box", unitOfSale: "each", costPerUnit: "6.5000", category: "Boxes",
    searchAliases: "brace octagon oct round light pancake saf-t-brace support" },

  // ── Receptacles ──
  // Nobody says "duplex receptacle" on a job — it is an outlet or a plug.
  { name: "Duplex receptacle", unitOfSale: "each", costPerUnit: "1.5000", category: "Receptacles",
    searchAliases: "outlet plug recep wall 15 amp 5-15r nema device tamper resistant tr" },
  { name: "GFCI receptacle", unitOfSale: "each", costPerUnit: "16.0000", category: "Receptacles",
    searchAliases: "gfi ground fault interrupter outlet bathroom kitchen wet location protected" },

  // ── Switches ──
  { name: "Single-pole switch", unitOfSale: "each", costPerUnit: "1.7500", category: "Switches",
    searchAliases: "light toggle sp 1p one 15 amp device rocker decora" },
  { name: "3-way switch", unitOfSale: "each", costPerUnit: "4.5000", category: "Switches",
    searchAliases: "three 3way traveler stair hall two location" },
  { name: "Dimmer", unitOfSale: "each", costPerUnit: "22.0000", category: "Switches",
    searchAliases: "switch rheostat slide light dimming decora rocker" },

  // ── Wall Plates & Misc ──
  // Deliberately NOT aliased to receptacles or switches: a cover is its own
  // item, and cross-aliasing devices is what caused the "recep" mis-ranking.
  { name: "Wall plate", unitOfSale: "each", costPerUnit: "1.2500", category: "Wall Plates & Misc",
    searchAliases: "cover faceplate face switch device trim midway blank decora" },
  { name: "Wire nuts", unitOfSale: "each", costPerUnit: "0.0800", category: "Wall Plates & Misc",
    searchAliases: "nut connector marrette marette twist on twister splice cap winged",
    defaultQty: 3 },

  // ── Panels & Breakers ──
  // "20/2" is trade shorthand for two-pole; the panel is a load center or,
  // to a homeowner-facing tech, the breaker box.
  { name: "20A breaker", unitOfSale: "each", costPerUnit: "9.0000", category: "Panels & Breakers",
    searchAliases: "20 amp single pole one pole 1p sp circuit cb ocpd" },
  { name: "20/2 breaker", unitOfSale: "each", costPerUnit: "28.0000", category: "Panels & Breakers",
    searchAliases: "20 amp 2 pole double pole two pole dp 240 volt 240v" },
  { name: "200A main panel", unitOfSale: "each", costPerUnit: "285.0000", category: "Panels & Breakers",
    searchAliases: "load center loadcenter breaker box service panelboard distribution 200 amp" },

  // ── Lighting Hardware ──
  { name: "6ft MC whip", unitOfSale: "each", costPerUnit: "12.0000", category: "Lighting Hardware",
    searchAliases: "fixture light 6 foot flex armored metal clad pigtail greenfield" },
  { name: "Fixture mounting bracket", unitOfSale: "each", costPerUnit: "4.0000", category: "Lighting Hardware",
    searchAliases: "bar hanger crossbar cross strap stud hickey saddle" },
];
