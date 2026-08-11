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
 * The `group` field is documentation only; there is no category column on
 * `materials` yet. It preserves STARTER_LIBRARY.md's grouping so it can be
 * mapped onto a real column later without re-deriving it by hand.
 */
import type { MATERIAL_UNITS_OF_SALE } from "../../drizzle/schema";

type UnitOfSale = (typeof MATERIAL_UNITS_OF_SALE)[number];

export type BaselineMaterial = {
  name: string;
  unitOfSale: UnitOfSale;
  /** Decimal column — kept as a string so no float rounding happens on the way in. */
  costPerUnit: string;
  /** Documentation only. Not persisted. */
  group: string;
};

export const BASELINE_MATERIALS: BaselineMaterial[] = [
  // ── Wire & Cable ──
  { name: "#14 THHN", unitOfSale: "foot", costPerUnit: "0.4000", group: "Wire & Cable" },
  { name: "#12 THHN", unitOfSale: "foot", costPerUnit: "0.5500", group: "Wire & Cable" },
  { name: "#10 THHN", unitOfSale: "foot", costPerUnit: "0.8500", group: "Wire & Cable" },
  { name: "#8 THHN", unitOfSale: "foot", costPerUnit: "1.3500", group: "Wire & Cable" },
  { name: "14-2 NM-B", unitOfSale: "foot", costPerUnit: "0.6500", group: "Wire & Cable" },
  { name: "12-2 NM-B", unitOfSale: "foot", costPerUnit: "0.9000", group: "Wire & Cable" },

  // ── Conduit & Fittings ──
  { name: '1/2" EMT', unitOfSale: "foot", costPerUnit: "0.9000", group: "Conduit & Fittings" },
  { name: '3/4" EMT', unitOfSale: "foot", costPerUnit: "1.2000", group: "Conduit & Fittings" },
  { name: '1" EMT', unitOfSale: "foot", costPerUnit: "1.8000", group: "Conduit & Fittings" },
  { name: '1/2" PVC', unitOfSale: "foot", costPerUnit: "0.4500", group: "Conduit & Fittings" },
  { name: 'EMT connector 1/2"', unitOfSale: "each", costPerUnit: "0.6000", group: "Conduit & Fittings" },
  { name: 'EMT connector 3/4"', unitOfSale: "each", costPerUnit: "0.8500", group: "Conduit & Fittings" },
  { name: "EMT strap", unitOfSale: "each", costPerUnit: "0.3500", group: "Conduit & Fittings" },

  // ── Boxes & Devices ──
  { name: "Single-gang box", unitOfSale: "each", costPerUnit: "1.2500", group: "Boxes & Devices" },
  { name: '4" square box', unitOfSale: "each", costPerUnit: "1.7500", group: "Boxes & Devices" },
  { name: "Fan-rated ceiling box", unitOfSale: "each", costPerUnit: "6.5000", group: "Boxes & Devices" },
  { name: "Duplex receptacle", unitOfSale: "each", costPerUnit: "1.5000", group: "Boxes & Devices" },
  { name: "GFCI receptacle", unitOfSale: "each", costPerUnit: "16.0000", group: "Boxes & Devices" },
  { name: "Single-pole switch", unitOfSale: "each", costPerUnit: "1.7500", group: "Boxes & Devices" },
  { name: "3-way switch", unitOfSale: "each", costPerUnit: "4.5000", group: "Boxes & Devices" },
  { name: "Dimmer", unitOfSale: "each", costPerUnit: "22.0000", group: "Boxes & Devices" },
  { name: "Wall plate", unitOfSale: "each", costPerUnit: "1.2500", group: "Boxes & Devices" },
  { name: "Wire nuts", unitOfSale: "each", costPerUnit: "0.0800", group: "Boxes & Devices" },

  // ── Panels & Breakers ──
  { name: "20A breaker", unitOfSale: "each", costPerUnit: "9.0000", group: "Panels & Breakers" },
  { name: "20/2 breaker", unitOfSale: "each", costPerUnit: "28.0000", group: "Panels & Breakers" },
  { name: "200A main panel", unitOfSale: "each", costPerUnit: "285.0000", group: "Panels & Breakers" },

  // ── Lighting Hardware ──
  { name: "6ft MC whip", unitOfSale: "each", costPerUnit: "12.0000", group: "Lighting Hardware" },
  { name: "Fixture mounting bracket", unitOfSale: "each", costPerUnit: "4.0000", group: "Lighting Hardware" },
];
