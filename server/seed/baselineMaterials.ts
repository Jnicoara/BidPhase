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
};

export const BASELINE_MATERIALS: BaselineMaterial[] = [
  // ── Wire & Cable ──
  { name: "#14 THHN", unitOfSale: "foot", costPerUnit: "0.4000", category: "Wire & Cable" },
  { name: "#12 THHN", unitOfSale: "foot", costPerUnit: "0.5500", category: "Wire & Cable" },
  { name: "#10 THHN", unitOfSale: "foot", costPerUnit: "0.8500", category: "Wire & Cable" },
  { name: "#8 THHN", unitOfSale: "foot", costPerUnit: "1.3500", category: "Wire & Cable" },
  { name: "14-2 NM-B", unitOfSale: "foot", costPerUnit: "0.6500", category: "Wire & Cable" },
  { name: "12-2 NM-B", unitOfSale: "foot", costPerUnit: "0.9000", category: "Wire & Cable" },

  // ── Conduit ──
  { name: '1/2" EMT', unitOfSale: "foot", costPerUnit: "0.9000", category: "Conduit" },
  { name: '3/4" EMT', unitOfSale: "foot", costPerUnit: "1.2000", category: "Conduit" },
  { name: '1" EMT', unitOfSale: "foot", costPerUnit: "1.8000", category: "Conduit" },
  { name: '1/2" PVC', unitOfSale: "foot", costPerUnit: "0.4500", category: "Conduit" },

  // ── Conduit Fittings ──
  { name: 'EMT connector 1/2"', unitOfSale: "each", costPerUnit: "0.6000", category: "Conduit Fittings" },
  { name: 'EMT connector 3/4"', unitOfSale: "each", costPerUnit: "0.8500", category: "Conduit Fittings" },
  { name: "EMT strap", unitOfSale: "each", costPerUnit: "0.3500", category: "Conduit Fittings" },

  // ── Boxes ──
  { name: "Single-gang box", unitOfSale: "each", costPerUnit: "1.2500", category: "Boxes" },
  { name: '4" square box', unitOfSale: "each", costPerUnit: "1.7500", category: "Boxes" },
  { name: "Fan-rated ceiling box", unitOfSale: "each", costPerUnit: "6.5000", category: "Boxes" },

  // ── Receptacles ──
  { name: "Duplex receptacle", unitOfSale: "each", costPerUnit: "1.5000", category: "Receptacles" },
  { name: "GFCI receptacle", unitOfSale: "each", costPerUnit: "16.0000", category: "Receptacles" },

  // ── Switches ──
  // A dimmer is a switch device, not a lighting part — it goes here, not under
  // Lighting Hardware, which is fixture-mounting hardware only.
  { name: "Single-pole switch", unitOfSale: "each", costPerUnit: "1.7500", category: "Switches" },
  { name: "3-way switch", unitOfSale: "each", costPerUnit: "4.5000", category: "Switches" },
  { name: "Dimmer", unitOfSale: "each", costPerUnit: "22.0000", category: "Switches" },

  // ── Wall Plates & Misc ──
  // The catch-all shelf: trim and consumables that belong to no single system.
  { name: "Wall plate", unitOfSale: "each", costPerUnit: "1.2500", category: "Wall Plates & Misc" },
  { name: "Wire nuts", unitOfSale: "each", costPerUnit: "0.0800", category: "Wall Plates & Misc" },

  // ── Panels & Breakers ──
  { name: "20A breaker", unitOfSale: "each", costPerUnit: "9.0000", category: "Panels & Breakers" },
  { name: "20/2 breaker", unitOfSale: "each", costPerUnit: "28.0000", category: "Panels & Breakers" },
  { name: "200A main panel", unitOfSale: "each", costPerUnit: "285.0000", category: "Panels & Breakers" },

  // ── Lighting Hardware ──
  { name: "6ft MC whip", unitOfSale: "each", costPerUnit: "12.0000", category: "Lighting Hardware" },
  { name: "Fixture mounting bracket", unitOfSale: "each", costPerUnit: "4.0000", category: "Lighting Hardware" },
];
