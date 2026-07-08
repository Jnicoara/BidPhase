/**
 * BidPhase — Master Electrical Material Catalog
 *
 * 1,000-item master catalog covering:
 *   - Distribution (panels, breakers, disconnects, meter bases) — ~250 items
 *   - Conduit & Fittings (EMT, RMC, PVC, FMC/LFMC) — ~250 items
 *   - Wire & Cable (THHN, NM-B, MC, URD/SE) — ~150 items
 *   - Rough-in & Support (boxes, mud rings, wire nuts, strut, hardware) — ~200 items
 *   - Devices & Trim (receptacles, switches, GFCI, USB, plates, LED wafers) — ~100 items
 *   - Civil & Misc (ground rods, clamps, marking tape, site materials) — ~50 items
 *
 * Prices are typical US distributor list prices (2025).
 * These are the DEFAULT prices — users override them via the Material Database page.
 *
 * IDs use a structured prefix:
 *   dist-  = Distribution
 *   cnd-   = Conduit
 *   fit-   = Conduit Fittings
 *   wir-   = Wire & Cable
 *   box-   = Boxes & Enclosures
 *   sup-   = Supports & Fasteners
 *   dev-   = Devices & Trim
 *   civ-   = Civil & Misc
 */

export interface CatalogItem {
  id: string;
  category: string;
  description: string;
  unit: string;
  unitPrice: number;   // USD list price
  notes?: string;
}

export const CATALOG_CATEGORIES = [
  "Distribution",
  "Conduit",
  "Conduit Fittings",
  "Wire & Cable",
  "Boxes & Enclosures",
  "Supports & Fasteners",
  "Devices & Trim",
  "Civil & Misc",
] as const;

export type CatalogCategory = typeof CATALOG_CATEGORIES[number];

export const CATALOG: CatalogItem[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // DISTRIBUTION — Load Centers, Breakers, Disconnects, Meter Bases (~250)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Square D Load Centers ─────────────────────────────────────────────────
  { id: "dist-sqd-lc-100a-12sp",  category: "Distribution", description: "Square D QO 100A 12-Space Load Center",       unit: "EA", unitPrice: 89.00 },
  { id: "dist-sqd-lc-100a-20sp",  category: "Distribution", description: "Square D QO 100A 20-Space Load Center",       unit: "EA", unitPrice: 109.00 },
  { id: "dist-sqd-lc-100a-24sp",  category: "Distribution", description: "Square D QO 100A 24-Space Load Center",       unit: "EA", unitPrice: 129.00 },
  { id: "dist-sqd-lc-150a-24sp",  category: "Distribution", description: "Square D QO 150A 24-Space Load Center",       unit: "EA", unitPrice: 159.00 },
  { id: "dist-sqd-lc-200a-24sp",  category: "Distribution", description: "Square D QO 200A 24-Space Load Center",       unit: "EA", unitPrice: 189.00 },
  { id: "dist-sqd-lc-200a-30sp",  category: "Distribution", description: "Square D QO 200A 30-Space Load Center",       unit: "EA", unitPrice: 219.00 },
  { id: "dist-sqd-lc-200a-40sp",  category: "Distribution", description: "Square D QO 200A 40-Space Load Center",       unit: "EA", unitPrice: 259.00 },
  { id: "dist-sqd-lc-200a-42sp",  category: "Distribution", description: "Square D QO 200A 42-Space Load Center",       unit: "EA", unitPrice: 279.00 },
  { id: "dist-sqd-lc-200a-60sp",  category: "Distribution", description: "Square D QO 200A 60-Space Load Center",       unit: "EA", unitPrice: 349.00 },
  { id: "dist-sqd-lc-400a-42sp",  category: "Distribution", description: "Square D QO 400A 42-Space Load Center",       unit: "EA", unitPrice: 549.00 },

  // ── Eaton Load Centers ────────────────────────────────────────────────────
  { id: "dist-eat-lc-100a-12sp",  category: "Distribution", description: "Eaton BR 100A 12-Space Load Center",          unit: "EA", unitPrice: 82.00 },
  { id: "dist-eat-lc-100a-20sp",  category: "Distribution", description: "Eaton BR 100A 20-Space Load Center",          unit: "EA", unitPrice: 99.00 },
  { id: "dist-eat-lc-100a-24sp",  category: "Distribution", description: "Eaton BR 100A 24-Space Load Center",          unit: "EA", unitPrice: 119.00 },
  { id: "dist-eat-lc-150a-24sp",  category: "Distribution", description: "Eaton BR 150A 24-Space Load Center",          unit: "EA", unitPrice: 149.00 },
  { id: "dist-eat-lc-200a-24sp",  category: "Distribution", description: "Eaton BR 200A 24-Space Load Center",          unit: "EA", unitPrice: 179.00 },
  { id: "dist-eat-lc-200a-30sp",  category: "Distribution", description: "Eaton BR 200A 30-Space Load Center",          unit: "EA", unitPrice: 209.00 },
  { id: "dist-eat-lc-200a-40sp",  category: "Distribution", description: "Eaton BR 200A 40-Space Load Center",          unit: "EA", unitPrice: 249.00 },
  { id: "dist-eat-lc-200a-42sp",  category: "Distribution", description: "Eaton BR 200A 42-Space Load Center",          unit: "EA", unitPrice: 269.00 },
  { id: "dist-eat-lc-400a-42sp",  category: "Distribution", description: "Eaton BR 400A 42-Space Load Center",          unit: "EA", unitPrice: 529.00 },

  // ── Siemens Load Centers ──────────────────────────────────────────────────
  { id: "dist-sie-lc-100a-12sp",  category: "Distribution", description: "Siemens PL 100A 12-Space Load Center",        unit: "EA", unitPrice: 79.00 },
  { id: "dist-sie-lc-100a-20sp",  category: "Distribution", description: "Siemens PL 100A 20-Space Load Center",        unit: "EA", unitPrice: 95.00 },
  { id: "dist-sie-lc-100a-24sp",  category: "Distribution", description: "Siemens PL 100A 24-Space Load Center",        unit: "EA", unitPrice: 115.00 },
  { id: "dist-sie-lc-150a-24sp",  category: "Distribution", description: "Siemens PL 150A 24-Space Load Center",        unit: "EA", unitPrice: 145.00 },
  { id: "dist-sie-lc-200a-24sp",  category: "Distribution", description: "Siemens PL 200A 24-Space Load Center",        unit: "EA", unitPrice: 175.00 },
  { id: "dist-sie-lc-200a-30sp",  category: "Distribution", description: "Siemens PL 200A 30-Space Load Center",        unit: "EA", unitPrice: 205.00 },
  { id: "dist-sie-lc-200a-40sp",  category: "Distribution", description: "Siemens PL 200A 40-Space Load Center",        unit: "EA", unitPrice: 245.00 },
  { id: "dist-sie-lc-200a-42sp",  category: "Distribution", description: "Siemens PL 200A 42-Space Load Center",        unit: "EA", unitPrice: 265.00 },
  { id: "dist-sie-lc-400a-42sp",  category: "Distribution", description: "Siemens PL 400A 42-Space Load Center",        unit: "EA", unitPrice: 519.00 },

  // ── Square D QO Breakers — 1-Pole Standard ───────────────────────────────
  { id: "dist-sqd-br-1p-15a",     category: "Distribution", description: "Square D QO 1-Pole 15A Breaker",              unit: "EA", unitPrice: 8.50 },
  { id: "dist-sqd-br-1p-20a",     category: "Distribution", description: "Square D QO 1-Pole 20A Breaker",              unit: "EA", unitPrice: 8.50 },
  { id: "dist-sqd-br-1p-25a",     category: "Distribution", description: "Square D QO 1-Pole 25A Breaker",              unit: "EA", unitPrice: 9.00 },
  { id: "dist-sqd-br-1p-30a",     category: "Distribution", description: "Square D QO 1-Pole 30A Breaker",              unit: "EA", unitPrice: 9.00 },
  { id: "dist-sqd-br-1p-40a",     category: "Distribution", description: "Square D QO 1-Pole 40A Breaker",              unit: "EA", unitPrice: 9.50 },
  { id: "dist-sqd-br-1p-50a",     category: "Distribution", description: "Square D QO 1-Pole 50A Breaker",              unit: "EA", unitPrice: 10.00 },
  { id: "dist-sqd-br-1p-60a",     category: "Distribution", description: "Square D QO 1-Pole 60A Breaker",              unit: "EA", unitPrice: 11.00 },

  // ── Square D QO Breakers — 2-Pole Standard ───────────────────────────────
  { id: "dist-sqd-br-2p-15a",     category: "Distribution", description: "Square D QO 2-Pole 15A Breaker",              unit: "EA", unitPrice: 14.00 },
  { id: "dist-sqd-br-2p-20a",     category: "Distribution", description: "Square D QO 2-Pole 20A Breaker",              unit: "EA", unitPrice: 14.00 },
  { id: "dist-sqd-br-2p-30a",     category: "Distribution", description: "Square D QO 2-Pole 30A Breaker",              unit: "EA", unitPrice: 15.00 },
  { id: "dist-sqd-br-2p-40a",     category: "Distribution", description: "Square D QO 2-Pole 40A Breaker",              unit: "EA", unitPrice: 16.00 },
  { id: "dist-sqd-br-2p-50a",     category: "Distribution", description: "Square D QO 2-Pole 50A Breaker",              unit: "EA", unitPrice: 17.00 },
  { id: "dist-sqd-br-2p-60a",     category: "Distribution", description: "Square D QO 2-Pole 60A Breaker",              unit: "EA", unitPrice: 18.00 },
  { id: "dist-sqd-br-2p-70a",     category: "Distribution", description: "Square D QO 2-Pole 70A Breaker",              unit: "EA", unitPrice: 20.00 },
  { id: "dist-sqd-br-2p-100a",    category: "Distribution", description: "Square D QO 2-Pole 100A Breaker",             unit: "EA", unitPrice: 28.00 },
  { id: "dist-sqd-br-2p-125a",    category: "Distribution", description: "Square D QO 2-Pole 125A Breaker",             unit: "EA", unitPrice: 38.00 },
  { id: "dist-sqd-br-2p-150a",    category: "Distribution", description: "Square D QO 2-Pole 150A Breaker",             unit: "EA", unitPrice: 48.00 },
  { id: "dist-sqd-br-2p-200a",    category: "Distribution", description: "Square D QO 2-Pole 200A Breaker",             unit: "EA", unitPrice: 65.00 },

  // ── Square D QO Breakers — GFCI ──────────────────────────────────────────
  { id: "dist-sqd-gfci-1p-15a",   category: "Distribution", description: "Square D QO 1-Pole 15A GFCI Breaker",         unit: "EA", unitPrice: 42.00 },
  { id: "dist-sqd-gfci-1p-20a",   category: "Distribution", description: "Square D QO 1-Pole 20A GFCI Breaker",         unit: "EA", unitPrice: 42.00 },
  { id: "dist-sqd-gfci-1p-30a",   category: "Distribution", description: "Square D QO 1-Pole 30A GFCI Breaker",         unit: "EA", unitPrice: 48.00 },
  { id: "dist-sqd-gfci-2p-20a",   category: "Distribution", description: "Square D QO 2-Pole 20A GFCI Breaker",         unit: "EA", unitPrice: 68.00 },
  { id: "dist-sqd-gfci-2p-30a",   category: "Distribution", description: "Square D QO 2-Pole 30A GFCI Breaker",         unit: "EA", unitPrice: 72.00 },
  { id: "dist-sqd-gfci-2p-50a",   category: "Distribution", description: "Square D QO 2-Pole 50A GFCI Breaker",         unit: "EA", unitPrice: 85.00 },

  // ── Square D QO Breakers — AFCI ──────────────────────────────────────────
  { id: "dist-sqd-afci-1p-15a",   category: "Distribution", description: "Square D QO 1-Pole 15A AFCI Breaker",         unit: "EA", unitPrice: 38.00 },
  { id: "dist-sqd-afci-1p-20a",   category: "Distribution", description: "Square D QO 1-Pole 20A AFCI Breaker",         unit: "EA", unitPrice: 38.00 },
  { id: "dist-sqd-afci-1p-30a",   category: "Distribution", description: "Square D QO 1-Pole 30A AFCI Breaker",         unit: "EA", unitPrice: 44.00 },
  { id: "dist-sqd-afci-2p-20a",   category: "Distribution", description: "Square D QO 2-Pole 20A AFCI Breaker",         unit: "EA", unitPrice: 62.00 },
  { id: "dist-sqd-afci-2p-30a",   category: "Distribution", description: "Square D QO 2-Pole 30A AFCI Breaker",         unit: "EA", unitPrice: 68.00 },

  // ── Square D QO Breakers — Dual Function (AFCI+GFCI) ─────────────────────
  { id: "dist-sqd-df-1p-15a",     category: "Distribution", description: "Square D QO 1-Pole 15A Dual Function Breaker", unit: "EA", unitPrice: 55.00 },
  { id: "dist-sqd-df-1p-20a",     category: "Distribution", description: "Square D QO 1-Pole 20A Dual Function Breaker", unit: "EA", unitPrice: 55.00 },
  { id: "dist-sqd-df-2p-20a",     category: "Distribution", description: "Square D QO 2-Pole 20A Dual Function Breaker", unit: "EA", unitPrice: 88.00 },
  { id: "dist-sqd-df-2p-30a",     category: "Distribution", description: "Square D QO 2-Pole 30A Dual Function Breaker", unit: "EA", unitPrice: 95.00 },

  // ── Eaton BR Breakers — 1-Pole Standard ──────────────────────────────────
  { id: "dist-eat-br-1p-15a",     category: "Distribution", description: "Eaton BR 1-Pole 15A Breaker",                 unit: "EA", unitPrice: 7.50 },
  { id: "dist-eat-br-1p-20a",     category: "Distribution", description: "Eaton BR 1-Pole 20A Breaker",                 unit: "EA", unitPrice: 7.50 },
  { id: "dist-eat-br-1p-25a",     category: "Distribution", description: "Eaton BR 1-Pole 25A Breaker",                 unit: "EA", unitPrice: 8.00 },
  { id: "dist-eat-br-1p-30a",     category: "Distribution", description: "Eaton BR 1-Pole 30A Breaker",                 unit: "EA", unitPrice: 8.00 },
  { id: "dist-eat-br-1p-40a",     category: "Distribution", description: "Eaton BR 1-Pole 40A Breaker",                 unit: "EA", unitPrice: 8.50 },
  { id: "dist-eat-br-1p-50a",     category: "Distribution", description: "Eaton BR 1-Pole 50A Breaker",                 unit: "EA", unitPrice: 9.00 },
  { id: "dist-eat-br-1p-60a",     category: "Distribution", description: "Eaton BR 1-Pole 60A Breaker",                 unit: "EA", unitPrice: 10.00 },

  // ── Eaton BR Breakers — 2-Pole Standard ──────────────────────────────────
  { id: "dist-eat-br-2p-15a",     category: "Distribution", description: "Eaton BR 2-Pole 15A Breaker",                 unit: "EA", unitPrice: 13.00 },
  { id: "dist-eat-br-2p-20a",     category: "Distribution", description: "Eaton BR 2-Pole 20A Breaker",                 unit: "EA", unitPrice: 13.00 },
  { id: "dist-eat-br-2p-30a",     category: "Distribution", description: "Eaton BR 2-Pole 30A Breaker",                 unit: "EA", unitPrice: 14.00 },
  { id: "dist-eat-br-2p-40a",     category: "Distribution", description: "Eaton BR 2-Pole 40A Breaker",                 unit: "EA", unitPrice: 15.00 },
  { id: "dist-eat-br-2p-50a",     category: "Distribution", description: "Eaton BR 2-Pole 50A Breaker",                 unit: "EA", unitPrice: 16.00 },
  { id: "dist-eat-br-2p-60a",     category: "Distribution", description: "Eaton BR 2-Pole 60A Breaker",                 unit: "EA", unitPrice: 17.00 },
  { id: "dist-eat-br-2p-70a",     category: "Distribution", description: "Eaton BR 2-Pole 70A Breaker",                 unit: "EA", unitPrice: 19.00 },
  { id: "dist-eat-br-2p-100a",    category: "Distribution", description: "Eaton BR 2-Pole 100A Breaker",                unit: "EA", unitPrice: 26.00 },
  { id: "dist-eat-br-2p-150a",    category: "Distribution", description: "Eaton BR 2-Pole 150A Breaker",                unit: "EA", unitPrice: 45.00 },
  { id: "dist-eat-br-2p-200a",    category: "Distribution", description: "Eaton BR 2-Pole 200A Breaker",                unit: "EA", unitPrice: 62.00 },

  // ── Eaton Breakers — GFCI ─────────────────────────────────────────────────
  { id: "dist-eat-gfci-1p-15a",   category: "Distribution", description: "Eaton BR 1-Pole 15A GFCI Breaker",            unit: "EA", unitPrice: 40.00 },
  { id: "dist-eat-gfci-1p-20a",   category: "Distribution", description: "Eaton BR 1-Pole 20A GFCI Breaker",            unit: "EA", unitPrice: 40.00 },
  { id: "dist-eat-gfci-2p-20a",   category: "Distribution", description: "Eaton BR 2-Pole 20A GFCI Breaker",            unit: "EA", unitPrice: 65.00 },
  { id: "dist-eat-gfci-2p-30a",   category: "Distribution", description: "Eaton BR 2-Pole 30A GFCI Breaker",            unit: "EA", unitPrice: 70.00 },
  { id: "dist-eat-gfci-2p-50a",   category: "Distribution", description: "Eaton BR 2-Pole 50A GFCI Breaker",            unit: "EA", unitPrice: 82.00 },

  // ── Eaton Breakers — AFCI ─────────────────────────────────────────────────
  { id: "dist-eat-afci-1p-15a",   category: "Distribution", description: "Eaton BR 1-Pole 15A AFCI Breaker",            unit: "EA", unitPrice: 36.00 },
  { id: "dist-eat-afci-1p-20a",   category: "Distribution", description: "Eaton BR 1-Pole 20A AFCI Breaker",            unit: "EA", unitPrice: 36.00 },
  { id: "dist-eat-afci-2p-20a",   category: "Distribution", description: "Eaton BR 2-Pole 20A AFCI Breaker",            unit: "EA", unitPrice: 60.00 },

  // ── Eaton Breakers — Dual Function ────────────────────────────────────────
  { id: "dist-eat-df-1p-15a",     category: "Distribution", description: "Eaton BR 1-Pole 15A Dual Function Breaker",   unit: "EA", unitPrice: 52.00 },
  { id: "dist-eat-df-1p-20a",     category: "Distribution", description: "Eaton BR 1-Pole 20A Dual Function Breaker",   unit: "EA", unitPrice: 52.00 },
  { id: "dist-eat-df-2p-20a",     category: "Distribution", description: "Eaton BR 2-Pole 20A Dual Function Breaker",   unit: "EA", unitPrice: 85.00 },
  { id: "dist-eat-df-2p-30a",     category: "Distribution", description: "Eaton BR 2-Pole 30A Dual Function Breaker",   unit: "EA", unitPrice: 92.00 },

  // ── Siemens Breakers — 1-Pole Standard ───────────────────────────────────
  { id: "dist-sie-br-1p-15a",     category: "Distribution", description: "Siemens Q 1-Pole 15A Breaker",                unit: "EA", unitPrice: 7.00 },
  { id: "dist-sie-br-1p-20a",     category: "Distribution", description: "Siemens Q 1-Pole 20A Breaker",                unit: "EA", unitPrice: 7.00 },
  { id: "dist-sie-br-1p-25a",     category: "Distribution", description: "Siemens Q 1-Pole 25A Breaker",                unit: "EA", unitPrice: 7.50 },
  { id: "dist-sie-br-1p-30a",     category: "Distribution", description: "Siemens Q 1-Pole 30A Breaker",                unit: "EA", unitPrice: 7.50 },
  { id: "dist-sie-br-1p-40a",     category: "Distribution", description: "Siemens Q 1-Pole 40A Breaker",                unit: "EA", unitPrice: 8.00 },
  { id: "dist-sie-br-1p-50a",     category: "Distribution", description: "Siemens Q 1-Pole 50A Breaker",                unit: "EA", unitPrice: 8.50 },
  { id: "dist-sie-br-1p-60a",     category: "Distribution", description: "Siemens Q 1-Pole 60A Breaker",                unit: "EA", unitPrice: 9.50 },

  // ── Siemens Breakers — 2-Pole Standard ───────────────────────────────────
  { id: "dist-sie-br-2p-15a",     category: "Distribution", description: "Siemens Q 2-Pole 15A Breaker",                unit: "EA", unitPrice: 12.00 },
  { id: "dist-sie-br-2p-20a",     category: "Distribution", description: "Siemens Q 2-Pole 20A Breaker",                unit: "EA", unitPrice: 12.00 },
  { id: "dist-sie-br-2p-30a",     category: "Distribution", description: "Siemens Q 2-Pole 30A Breaker",                unit: "EA", unitPrice: 13.00 },
  { id: "dist-sie-br-2p-40a",     category: "Distribution", description: "Siemens Q 2-Pole 40A Breaker",                unit: "EA", unitPrice: 14.00 },
  { id: "dist-sie-br-2p-50a",     category: "Distribution", description: "Siemens Q 2-Pole 50A Breaker",                unit: "EA", unitPrice: 15.00 },
  { id: "dist-sie-br-2p-60a",     category: "Distribution", description: "Siemens Q 2-Pole 60A Breaker",                unit: "EA", unitPrice: 16.00 },
  { id: "dist-sie-br-2p-70a",     category: "Distribution", description: "Siemens Q 2-Pole 70A Breaker",                unit: "EA", unitPrice: 18.00 },
  { id: "dist-sie-br-2p-100a",    category: "Distribution", description: "Siemens Q 2-Pole 100A Breaker",               unit: "EA", unitPrice: 25.00 },
  { id: "dist-sie-br-2p-150a",    category: "Distribution", description: "Siemens Q 2-Pole 150A Breaker",               unit: "EA", unitPrice: 43.00 },
  { id: "dist-sie-br-2p-200a",    category: "Distribution", description: "Siemens Q 2-Pole 200A Breaker",               unit: "EA", unitPrice: 60.00 },

  // ── Siemens Breakers — GFCI ───────────────────────────────────────────────
  { id: "dist-sie-gfci-1p-15a",   category: "Distribution", description: "Siemens Q 1-Pole 15A GFCI Breaker",           unit: "EA", unitPrice: 38.00 },
  { id: "dist-sie-gfci-1p-20a",   category: "Distribution", description: "Siemens Q 1-Pole 20A GFCI Breaker",           unit: "EA", unitPrice: 38.00 },
  { id: "dist-sie-gfci-2p-20a",   category: "Distribution", description: "Siemens Q 2-Pole 20A GFCI Breaker",           unit: "EA", unitPrice: 63.00 },
  { id: "dist-sie-gfci-2p-30a",   category: "Distribution", description: "Siemens Q 2-Pole 30A GFCI Breaker",           unit: "EA", unitPrice: 68.00 },

  // ── Siemens Breakers — AFCI ───────────────────────────────────────────────
  { id: "dist-sie-afci-1p-15a",   category: "Distribution", description: "Siemens Q 1-Pole 15A AFCI Breaker",           unit: "EA", unitPrice: 35.00 },
  { id: "dist-sie-afci-1p-20a",   category: "Distribution", description: "Siemens Q 1-Pole 20A AFCI Breaker",           unit: "EA", unitPrice: 35.00 },
  { id: "dist-sie-afci-2p-20a",   category: "Distribution", description: "Siemens Q 2-Pole 20A AFCI Breaker",           unit: "EA", unitPrice: 58.00 },

  // ── Siemens Breakers — Dual Function ─────────────────────────────────────
  { id: "dist-sie-df-1p-15a",     category: "Distribution", description: "Siemens Q 1-Pole 15A Dual Function Breaker",  unit: "EA", unitPrice: 50.00 },
  { id: "dist-sie-df-1p-20a",     category: "Distribution", description: "Siemens Q 1-Pole 20A Dual Function Breaker",  unit: "EA", unitPrice: 50.00 },
  { id: "dist-sie-df-2p-20a",     category: "Distribution", description: "Siemens Q 2-Pole 20A Dual Function Breaker",  unit: "EA", unitPrice: 82.00 },
  { id: "dist-sie-df-2p-30a",     category: "Distribution", description: "Siemens Q 2-Pole 30A Dual Function Breaker",  unit: "EA", unitPrice: 89.00 },

  // ── Schneider Electric (Homeline) Breakers ────────────────────────────────
  { id: "dist-sch-br-1p-15a",     category: "Distribution", description: "Schneider HOM 1-Pole 15A Breaker",            unit: "EA", unitPrice: 7.00 },
  { id: "dist-sch-br-1p-20a",     category: "Distribution", description: "Schneider HOM 1-Pole 20A Breaker",            unit: "EA", unitPrice: 7.00 },
  { id: "dist-sch-br-1p-30a",     category: "Distribution", description: "Schneider HOM 1-Pole 30A Breaker",            unit: "EA", unitPrice: 7.50 },
  { id: "dist-sch-br-2p-20a",     category: "Distribution", description: "Schneider HOM 2-Pole 20A Breaker",            unit: "EA", unitPrice: 12.00 },
  { id: "dist-sch-br-2p-30a",     category: "Distribution", description: "Schneider HOM 2-Pole 30A Breaker",            unit: "EA", unitPrice: 13.00 },
  { id: "dist-sch-br-2p-50a",     category: "Distribution", description: "Schneider HOM 2-Pole 50A Breaker",            unit: "EA", unitPrice: 15.00 },
  { id: "dist-sch-gfci-1p-20a",   category: "Distribution", description: "Schneider HOM 1-Pole 20A GFCI Breaker",       unit: "EA", unitPrice: 39.00 },
  { id: "dist-sch-afci-1p-20a",   category: "Distribution", description: "Schneider HOM 1-Pole 20A AFCI Breaker",       unit: "EA", unitPrice: 36.00 },
  { id: "dist-sch-df-1p-20a",     category: "Distribution", description: "Schneider HOM 1-Pole 20A Dual Function Breaker", unit: "EA", unitPrice: 51.00 },

  // ── Disconnects ───────────────────────────────────────────────────────────
  { id: "dist-disc-30a-1p-nf",    category: "Distribution", description: "30A 1-Pole Non-Fusible Disconnect",           unit: "EA", unitPrice: 38.00 },
  { id: "dist-disc-30a-2p-nf",    category: "Distribution", description: "30A 2-Pole Non-Fusible Disconnect",           unit: "EA", unitPrice: 45.00 },
  { id: "dist-disc-60a-2p-nf",    category: "Distribution", description: "60A 2-Pole Non-Fusible Disconnect",           unit: "EA", unitPrice: 62.00 },
  { id: "dist-disc-100a-2p-nf",   category: "Distribution", description: "100A 2-Pole Non-Fusible Disconnect",          unit: "EA", unitPrice: 89.00 },
  { id: "dist-disc-200a-2p-nf",   category: "Distribution", description: "200A 2-Pole Non-Fusible Disconnect",          unit: "EA", unitPrice: 145.00 },
  { id: "dist-disc-30a-2p-fus",   category: "Distribution", description: "30A 2-Pole Fusible Disconnect",               unit: "EA", unitPrice: 52.00 },
  { id: "dist-disc-60a-2p-fus",   category: "Distribution", description: "60A 2-Pole Fusible Disconnect",               unit: "EA", unitPrice: 75.00 },
  { id: "dist-disc-100a-2p-fus",  category: "Distribution", description: "100A 2-Pole Fusible Disconnect",              unit: "EA", unitPrice: 109.00 },
  { id: "dist-disc-200a-2p-fus",  category: "Distribution", description: "200A 2-Pole Fusible Disconnect",              unit: "EA", unitPrice: 179.00 },
  { id: "dist-disc-400a-3p-fus",  category: "Distribution", description: "400A 3-Pole Fusible Disconnect",              unit: "EA", unitPrice: 389.00 },
  { id: "dist-disc-600a-3p-fus",  category: "Distribution", description: "600A 3-Pole Fusible Disconnect",              unit: "EA", unitPrice: 649.00 },

  // ── Meter Bases ───────────────────────────────────────────────────────────
  { id: "dist-meter-100a-1ph",    category: "Distribution", description: "100A 1-Phase Meter Base Ringless",            unit: "EA", unitPrice: 65.00 },
  { id: "dist-meter-150a-1ph",    category: "Distribution", description: "150A 1-Phase Meter Base Ringless",            unit: "EA", unitPrice: 79.00 },
  { id: "dist-meter-200a-1ph",    category: "Distribution", description: "200A 1-Phase Meter Base Ringless",            unit: "EA", unitPrice: 95.00 },
  { id: "dist-meter-320a-1ph",    category: "Distribution", description: "320A 1-Phase Meter Base Ringless",            unit: "EA", unitPrice: 145.00 },
  { id: "dist-meter-200a-3ph",    category: "Distribution", description: "200A 3-Phase Meter Base Ringless",            unit: "EA", unitPrice: 165.00 },
  { id: "dist-meter-400a-3ph",    category: "Distribution", description: "400A 3-Phase Meter Base Ringless",            unit: "EA", unitPrice: 249.00 },
  { id: "dist-meter-combo-200a",  category: "Distribution", description: "200A Meter-Main Combo (Meter + Main Breaker)", unit: "EA", unitPrice: 289.00 },
  { id: "dist-meter-combo-320a",  category: "Distribution", description: "320A Meter-Main Combo (Meter + Main Breaker)", unit: "EA", unitPrice: 389.00 },

  // ── Fuses ─────────────────────────────────────────────────────────────────
  { id: "dist-fuse-30a-class-r",  category: "Distribution", description: "30A Class RK5 Fuse (pair)",                  unit: "EA", unitPrice: 12.00 },
  { id: "dist-fuse-60a-class-r",  category: "Distribution", description: "60A Class RK5 Fuse (pair)",                  unit: "EA", unitPrice: 18.00 },
  { id: "dist-fuse-100a-class-r", category: "Distribution", description: "100A Class RK5 Fuse (pair)",                 unit: "EA", unitPrice: 28.00 },
  { id: "dist-fuse-200a-class-l", category: "Distribution", description: "200A Class L Fuse (pair)",                   unit: "EA", unitPrice: 55.00 },
  { id: "dist-fuse-400a-class-l", category: "Distribution", description: "400A Class L Fuse (pair)",                   unit: "EA", unitPrice: 95.00 },
  { id: "dist-fuse-600a-class-l", category: "Distribution", description: "600A Class L Fuse (pair)",                   unit: "EA", unitPrice: 149.00 },

  // ── Surge Protection ──────────────────────────────────────────────────────
  { id: "dist-spd-120-240v",      category: "Distribution", description: "Whole House Surge Protector 120/240V",       unit: "EA", unitPrice: 89.00 },
  { id: "dist-spd-commercial",    category: "Distribution", description: "Commercial Surge Protector 480V 3-Phase",    unit: "EA", unitPrice: 249.00 },

  // ── Transfer Switches ─────────────────────────────────────────────────────
  { id: "dist-xfer-30a-manual",   category: "Distribution", description: "30A Manual Transfer Switch 10-Circuit",      unit: "EA", unitPrice: 189.00 },
  { id: "dist-xfer-100a-manual",  category: "Distribution", description: "100A Manual Transfer Switch",                unit: "EA", unitPrice: 289.00 },
  { id: "dist-xfer-200a-auto",    category: "Distribution", description: "200A Automatic Transfer Switch",             unit: "EA", unitPrice: 1250.00 },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONDUIT — EMT, RMC, PVC Sch 40/80, FMC, LFMC (~130 items)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── EMT (Electrical Metallic Tubing) ─────────────────────────────────────
  { id: "cnd-emt-1/2",            category: "Conduit", description: "1/2\" EMT Conduit 10ft stick",                    unit: "EA", unitPrice: 4.20,  notes: "~$0.42/ft" },
  { id: "cnd-emt-3/4",            category: "Conduit", description: "3/4\" EMT Conduit 10ft stick",                    unit: "EA", unitPrice: 5.80,  notes: "~$0.58/ft" },
  { id: "cnd-emt-1",              category: "Conduit", description: "1\" EMT Conduit 10ft stick",                      unit: "EA", unitPrice: 8.50,  notes: "~$0.85/ft" },
  { id: "cnd-emt-1-1/4",         category: "Conduit", description: "1-1/4\" EMT Conduit 10ft stick",                  unit: "EA", unitPrice: 11.50, notes: "~$1.15/ft" },
  { id: "cnd-emt-1-1/2",         category: "Conduit", description: "1-1/2\" EMT Conduit 10ft stick",                  unit: "EA", unitPrice: 14.00, notes: "~$1.40/ft" },
  { id: "cnd-emt-2",              category: "Conduit", description: "2\" EMT Conduit 10ft stick",                      unit: "EA", unitPrice: 20.00, notes: "~$2.00/ft" },
  { id: "cnd-emt-2-1/2",         category: "Conduit", description: "2-1/2\" EMT Conduit 10ft stick",                  unit: "EA", unitPrice: 35.00, notes: "~$3.50/ft" },
  { id: "cnd-emt-3",              category: "Conduit", description: "3\" EMT Conduit 10ft stick",                      unit: "EA", unitPrice: 52.00, notes: "~$5.20/ft" },
  { id: "cnd-emt-3-1/2",         category: "Conduit", description: "3-1/2\" EMT Conduit 10ft stick",                  unit: "EA", unitPrice: 68.00, notes: "~$6.80/ft" },
  { id: "cnd-emt-4",              category: "Conduit", description: "4\" EMT Conduit 10ft stick",                      unit: "EA", unitPrice: 85.00, notes: "~$8.50/ft" },

  // ── EMT per-foot (for run cost calculations) ──────────────────────────────
  { id: "cnd-emt-1/2-ft",         category: "Conduit", description: "1/2\" EMT Conduit (per foot)",                   unit: "FT", unitPrice: 0.42 },
  { id: "cnd-emt-3/4-ft",         category: "Conduit", description: "3/4\" EMT Conduit (per foot)",                   unit: "FT", unitPrice: 0.58 },
  { id: "cnd-emt-1-ft",           category: "Conduit", description: "1\" EMT Conduit (per foot)",                     unit: "FT", unitPrice: 0.85 },
  { id: "cnd-emt-1-1/4-ft",      category: "Conduit", description: "1-1/4\" EMT Conduit (per foot)",                 unit: "FT", unitPrice: 1.15 },
  { id: "cnd-emt-1-1/2-ft",      category: "Conduit", description: "1-1/2\" EMT Conduit (per foot)",                 unit: "FT", unitPrice: 1.40 },
  { id: "cnd-emt-2-ft",           category: "Conduit", description: "2\" EMT Conduit (per foot)",                     unit: "FT", unitPrice: 2.00 },
  { id: "cnd-emt-2-1/2-ft",      category: "Conduit", description: "2-1/2\" EMT Conduit (per foot)",                 unit: "FT", unitPrice: 3.50 },
  { id: "cnd-emt-3-ft",           category: "Conduit", description: "3\" EMT Conduit (per foot)",                     unit: "FT", unitPrice: 5.20 },
  { id: "cnd-emt-4-ft",           category: "Conduit", description: "4\" EMT Conduit (per foot)",                     unit: "FT", unitPrice: 8.50 },

  // ── Rigid Metal Conduit (RMC/GRC) ─────────────────────────────────────────
  { id: "cnd-rmc-1/2",            category: "Conduit", description: "1/2\" Rigid Metal Conduit (RMC) 10ft",           unit: "EA", unitPrice: 9.50,  notes: "~$0.95/ft" },
  { id: "cnd-rmc-3/4",            category: "Conduit", description: "3/4\" Rigid Metal Conduit (RMC) 10ft",           unit: "EA", unitPrice: 13.50, notes: "~$1.35/ft" },
  { id: "cnd-rmc-1",              category: "Conduit", description: "1\" Rigid Metal Conduit (RMC) 10ft",             unit: "EA", unitPrice: 19.00, notes: "~$1.90/ft" },
  { id: "cnd-rmc-1-1/4",         category: "Conduit", description: "1-1/4\" Rigid Metal Conduit (RMC) 10ft",         unit: "EA", unitPrice: 26.00, notes: "~$2.60/ft" },
  { id: "cnd-rmc-1-1/2",         category: "Conduit", description: "1-1/2\" Rigid Metal Conduit (RMC) 10ft",         unit: "EA", unitPrice: 32.00, notes: "~$3.20/ft" },
  { id: "cnd-rmc-2",              category: "Conduit", description: "2\" Rigid Metal Conduit (RMC) 10ft",             unit: "EA", unitPrice: 45.00, notes: "~$4.50/ft" },
  { id: "cnd-rmc-2-1/2",         category: "Conduit", description: "2-1/2\" Rigid Metal Conduit (RMC) 10ft",         unit: "EA", unitPrice: 72.00, notes: "~$7.20/ft" },
  { id: "cnd-rmc-3",              category: "Conduit", description: "3\" Rigid Metal Conduit (RMC) 10ft",             unit: "EA", unitPrice: 105.00, notes: "~$10.50/ft" },
  { id: "cnd-rmc-4",              category: "Conduit", description: "4\" Rigid Metal Conduit (RMC) 10ft",             unit: "EA", unitPrice: 165.00, notes: "~$16.50/ft" },

  // ── RMC per-foot ──────────────────────────────────────────────────────────
  { id: "cnd-rmc-1/2-ft",         category: "Conduit", description: "1/2\" Rigid Metal Conduit (per foot)",           unit: "FT", unitPrice: 0.95 },
  { id: "cnd-rmc-3/4-ft",         category: "Conduit", description: "3/4\" Rigid Metal Conduit (per foot)",           unit: "FT", unitPrice: 1.35 },
  { id: "cnd-rmc-1-ft",           category: "Conduit", description: "1\" Rigid Metal Conduit (per foot)",             unit: "FT", unitPrice: 1.90 },
  { id: "cnd-rmc-1-1/2-ft",      category: "Conduit", description: "1-1/2\" Rigid Metal Conduit (per foot)",         unit: "FT", unitPrice: 3.20 },
  { id: "cnd-rmc-2-ft",           category: "Conduit", description: "2\" Rigid Metal Conduit (per foot)",             unit: "FT", unitPrice: 4.50 },
  { id: "cnd-rmc-3-ft",           category: "Conduit", description: "3\" Rigid Metal Conduit (per foot)",             unit: "FT", unitPrice: 10.50 },
  { id: "cnd-rmc-4-ft",           category: "Conduit", description: "4\" Rigid Metal Conduit (per foot)",             unit: "FT", unitPrice: 16.50 },

  // ── PVC Schedule 40 ───────────────────────────────────────────────────────
  { id: "cnd-pvc40-1/2",          category: "Conduit", description: "1/2\" PVC Schedule 40 Conduit 10ft",             unit: "EA", unitPrice: 2.20,  notes: "~$0.22/ft" },
  { id: "cnd-pvc40-3/4",          category: "Conduit", description: "3/4\" PVC Schedule 40 Conduit 10ft",             unit: "EA", unitPrice: 2.80,  notes: "~$0.28/ft" },
  { id: "cnd-pvc40-1",            category: "Conduit", description: "1\" PVC Schedule 40 Conduit 10ft",               unit: "EA", unitPrice: 3.80,  notes: "~$0.38/ft" },
  { id: "cnd-pvc40-1-1/4",       category: "Conduit", description: "1-1/4\" PVC Schedule 40 Conduit 10ft",           unit: "EA", unitPrice: 5.20,  notes: "~$0.52/ft" },
  { id: "cnd-pvc40-1-1/2",       category: "Conduit", description: "1-1/2\" PVC Schedule 40 Conduit 10ft",           unit: "EA", unitPrice: 6.50,  notes: "~$0.65/ft" },
  { id: "cnd-pvc40-2",            category: "Conduit", description: "2\" PVC Schedule 40 Conduit 10ft",               unit: "EA", unitPrice: 8.50,  notes: "~$0.85/ft" },
  { id: "cnd-pvc40-2-1/2",       category: "Conduit", description: "2-1/2\" PVC Schedule 40 Conduit 10ft",           unit: "EA", unitPrice: 13.00, notes: "~$1.30/ft" },
  { id: "cnd-pvc40-3",            category: "Conduit", description: "3\" PVC Schedule 40 Conduit 10ft",               unit: "EA", unitPrice: 18.00, notes: "~$1.80/ft" },
  { id: "cnd-pvc40-4",            category: "Conduit", description: "4\" PVC Schedule 40 Conduit 10ft",               unit: "EA", unitPrice: 28.00, notes: "~$2.80/ft" },

  // ── PVC Sch 40 per-foot ───────────────────────────────────────────────────
  { id: "cnd-pvc40-1/2-ft",       category: "Conduit", description: "1/2\" PVC Sch 40 Conduit (per foot)",            unit: "FT", unitPrice: 0.22 },
  { id: "cnd-pvc40-3/4-ft",       category: "Conduit", description: "3/4\" PVC Sch 40 Conduit (per foot)",            unit: "FT", unitPrice: 0.28 },
  { id: "cnd-pvc40-1-ft",         category: "Conduit", description: "1\" PVC Sch 40 Conduit (per foot)",              unit: "FT", unitPrice: 0.38 },
  { id: "cnd-pvc40-1-1/2-ft",    category: "Conduit", description: "1-1/2\" PVC Sch 40 Conduit (per foot)",          unit: "FT", unitPrice: 0.65 },
  { id: "cnd-pvc40-2-ft",         category: "Conduit", description: "2\" PVC Sch 40 Conduit (per foot)",              unit: "FT", unitPrice: 0.85 },
  { id: "cnd-pvc40-3-ft",         category: "Conduit", description: "3\" PVC Sch 40 Conduit (per foot)",              unit: "FT", unitPrice: 1.80 },
  { id: "cnd-pvc40-4-ft",         category: "Conduit", description: "4\" PVC Sch 40 Conduit (per foot)",              unit: "FT", unitPrice: 2.80 },

  // ── PVC Schedule 80 ───────────────────────────────────────────────────────
  { id: "cnd-pvc80-1/2",          category: "Conduit", description: "1/2\" PVC Schedule 80 Conduit 10ft",             unit: "EA", unitPrice: 4.50,  notes: "~$0.45/ft" },
  { id: "cnd-pvc80-3/4",          category: "Conduit", description: "3/4\" PVC Schedule 80 Conduit 10ft",             unit: "EA", unitPrice: 5.80,  notes: "~$0.58/ft" },
  { id: "cnd-pvc80-1",            category: "Conduit", description: "1\" PVC Schedule 80 Conduit 10ft",               unit: "EA", unitPrice: 8.00,  notes: "~$0.80/ft" },
  { id: "cnd-pvc80-1-1/2",       category: "Conduit", description: "1-1/2\" PVC Schedule 80 Conduit 10ft",           unit: "EA", unitPrice: 12.50, notes: "~$1.25/ft" },
  { id: "cnd-pvc80-2",            category: "Conduit", description: "2\" PVC Schedule 80 Conduit 10ft",               unit: "EA", unitPrice: 16.50, notes: "~$1.65/ft" },
  { id: "cnd-pvc80-3",            category: "Conduit", description: "3\" PVC Schedule 80 Conduit 10ft",               unit: "EA", unitPrice: 32.00, notes: "~$3.20/ft" },
  { id: "cnd-pvc80-4",            category: "Conduit", description: "4\" PVC Schedule 80 Conduit 10ft",               unit: "EA", unitPrice: 49.00, notes: "~$4.90/ft" },

  // ── Flexible Metal Conduit (FMC) ──────────────────────────────────────────
  { id: "cnd-fmc-3/8",            category: "Conduit", description: "3/8\" FMC Flexible Metal Conduit (per foot)",    unit: "FT", unitPrice: 0.45 },
  { id: "cnd-fmc-1/2",            category: "Conduit", description: "1/2\" FMC Flexible Metal Conduit (per foot)",    unit: "FT", unitPrice: 0.55 },
  { id: "cnd-fmc-3/4",            category: "Conduit", description: "3/4\" FMC Flexible Metal Conduit (per foot)",    unit: "FT", unitPrice: 0.75 },
  { id: "cnd-fmc-1",              category: "Conduit", description: "1\" FMC Flexible Metal Conduit (per foot)",      unit: "FT", unitPrice: 1.10 },
  { id: "cnd-fmc-1-1/4",         category: "Conduit", description: "1-1/4\" FMC Flexible Metal Conduit (per foot)",  unit: "FT", unitPrice: 1.55 },
  { id: "cnd-fmc-1-1/2",         category: "Conduit", description: "1-1/2\" FMC Flexible Metal Conduit (per foot)",  unit: "FT", unitPrice: 1.90 },
  { id: "cnd-fmc-2",              category: "Conduit", description: "2\" FMC Flexible Metal Conduit (per foot)",      unit: "FT", unitPrice: 2.80 },

  // ── Liquid-Tight Flexible Metal Conduit (LFMC) ────────────────────────────
  { id: "cnd-lfmc-3/8",           category: "Conduit", description: "3/8\" LFMC Liquid-Tight Flex Conduit (per foot)", unit: "FT", unitPrice: 0.65 },
  { id: "cnd-lfmc-1/2",           category: "Conduit", description: "1/2\" LFMC Liquid-Tight Flex Conduit (per foot)", unit: "FT", unitPrice: 0.80 },
  { id: "cnd-lfmc-3/4",           category: "Conduit", description: "3/4\" LFMC Liquid-Tight Flex Conduit (per foot)", unit: "FT", unitPrice: 1.10 },
  { id: "cnd-lfmc-1",             category: "Conduit", description: "1\" LFMC Liquid-Tight Flex Conduit (per foot)",   unit: "FT", unitPrice: 1.65 },
  { id: "cnd-lfmc-1-1/4",        category: "Conduit", description: "1-1/4\" LFMC Liquid-Tight Flex Conduit (per foot)", unit: "FT", unitPrice: 2.20 },
  { id: "cnd-lfmc-1-1/2",        category: "Conduit", description: "1-1/2\" LFMC Liquid-Tight Flex Conduit (per foot)", unit: "FT", unitPrice: 2.75 },
  { id: "cnd-lfmc-2",             category: "Conduit", description: "2\" LFMC Liquid-Tight Flex Conduit (per foot)",    unit: "FT", unitPrice: 3.90 },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONDUIT FITTINGS (~120 items)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── EMT Set-Screw Connectors ──────────────────────────────────────────────
  { id: "fit-emt-ss-conn-1/2",    category: "Conduit Fittings", description: "1/2\" EMT Set-Screw Connector",          unit: "EA", unitPrice: 0.55 },
  { id: "fit-emt-ss-conn-3/4",    category: "Conduit Fittings", description: "3/4\" EMT Set-Screw Connector",          unit: "EA", unitPrice: 0.75 },
  { id: "fit-emt-ss-conn-1",      category: "Conduit Fittings", description: "1\" EMT Set-Screw Connector",            unit: "EA", unitPrice: 1.10 },
  { id: "fit-emt-ss-conn-1-1/4", category: "Conduit Fittings", description: "1-1/4\" EMT Set-Screw Connector",        unit: "EA", unitPrice: 1.65 },
  { id: "fit-emt-ss-conn-1-1/2", category: "Conduit Fittings", description: "1-1/2\" EMT Set-Screw Connector",        unit: "EA", unitPrice: 2.10 },
  { id: "fit-emt-ss-conn-2",      category: "Conduit Fittings", description: "2\" EMT Set-Screw Connector",            unit: "EA", unitPrice: 3.20 },
  { id: "fit-emt-ss-conn-2-1/2", category: "Conduit Fittings", description: "2-1/2\" EMT Set-Screw Connector",        unit: "EA", unitPrice: 6.50 },
  { id: "fit-emt-ss-conn-3",      category: "Conduit Fittings", description: "3\" EMT Set-Screw Connector",            unit: "EA", unitPrice: 9.50 },
  { id: "fit-emt-ss-conn-4",      category: "Conduit Fittings", description: "4\" EMT Set-Screw Connector",            unit: "EA", unitPrice: 14.00 },

  // ── EMT Compression Connectors ────────────────────────────────────────────
  { id: "fit-emt-cp-conn-1/2",    category: "Conduit Fittings", description: "1/2\" EMT Compression Connector",        unit: "EA", unitPrice: 0.85 },
  { id: "fit-emt-cp-conn-3/4",    category: "Conduit Fittings", description: "3/4\" EMT Compression Connector",        unit: "EA", unitPrice: 1.10 },
  { id: "fit-emt-cp-conn-1",      category: "Conduit Fittings", description: "1\" EMT Compression Connector",          unit: "EA", unitPrice: 1.65 },
  { id: "fit-emt-cp-conn-1-1/4", category: "Conduit Fittings", description: "1-1/4\" EMT Compression Connector",      unit: "EA", unitPrice: 2.50 },
  { id: "fit-emt-cp-conn-1-1/2", category: "Conduit Fittings", description: "1-1/2\" EMT Compression Connector",      unit: "EA", unitPrice: 3.20 },
  { id: "fit-emt-cp-conn-2",      category: "Conduit Fittings", description: "2\" EMT Compression Connector",          unit: "EA", unitPrice: 4.80 },
  { id: "fit-emt-cp-conn-3",      category: "Conduit Fittings", description: "3\" EMT Compression Connector",          unit: "EA", unitPrice: 14.00 },
  { id: "fit-emt-cp-conn-4",      category: "Conduit Fittings", description: "4\" EMT Compression Connector",          unit: "EA", unitPrice: 22.00 },

  // ── EMT Set-Screw Couplings ───────────────────────────────────────────────
  { id: "fit-emt-ss-coup-1/2",    category: "Conduit Fittings", description: "1/2\" EMT Set-Screw Coupling",           unit: "EA", unitPrice: 0.45 },
  { id: "fit-emt-ss-coup-3/4",    category: "Conduit Fittings", description: "3/4\" EMT Set-Screw Coupling",           unit: "EA", unitPrice: 0.60 },
  { id: "fit-emt-ss-coup-1",      category: "Conduit Fittings", description: "1\" EMT Set-Screw Coupling",             unit: "EA", unitPrice: 0.90 },
  { id: "fit-emt-ss-coup-1-1/4", category: "Conduit Fittings", description: "1-1/4\" EMT Set-Screw Coupling",         unit: "EA", unitPrice: 1.35 },
  { id: "fit-emt-ss-coup-1-1/2", category: "Conduit Fittings", description: "1-1/2\" EMT Set-Screw Coupling",         unit: "EA", unitPrice: 1.75 },
  { id: "fit-emt-ss-coup-2",      category: "Conduit Fittings", description: "2\" EMT Set-Screw Coupling",             unit: "EA", unitPrice: 2.60 },
  { id: "fit-emt-ss-coup-3",      category: "Conduit Fittings", description: "3\" EMT Set-Screw Coupling",             unit: "EA", unitPrice: 7.50 },
  { id: "fit-emt-ss-coup-4",      category: "Conduit Fittings", description: "4\" EMT Set-Screw Coupling",             unit: "EA", unitPrice: 11.50 },

  // ── EMT 90° Sweeps ────────────────────────────────────────────────────────
  { id: "fit-emt-90-1/2",         category: "Conduit Fittings", description: "1/2\" EMT 90° Sweep",                   unit: "EA", unitPrice: 1.80 },
  { id: "fit-emt-90-3/4",         category: "Conduit Fittings", description: "3/4\" EMT 90° Sweep",                   unit: "EA", unitPrice: 2.50 },
  { id: "fit-emt-90-1",           category: "Conduit Fittings", description: "1\" EMT 90° Sweep",                     unit: "EA", unitPrice: 4.20 },
  { id: "fit-emt-90-1-1/4",      category: "Conduit Fittings", description: "1-1/4\" EMT 90° Sweep",                 unit: "EA", unitPrice: 6.50 },
  { id: "fit-emt-90-1-1/2",      category: "Conduit Fittings", description: "1-1/2\" EMT 90° Sweep",                 unit: "EA", unitPrice: 8.50 },
  { id: "fit-emt-90-2",           category: "Conduit Fittings", description: "2\" EMT 90° Sweep",                     unit: "EA", unitPrice: 14.00 },
  { id: "fit-emt-90-3",           category: "Conduit Fittings", description: "3\" EMT 90° Sweep",                     unit: "EA", unitPrice: 38.00 },
  { id: "fit-emt-90-4",           category: "Conduit Fittings", description: "4\" EMT 90° Sweep",                     unit: "EA", unitPrice: 65.00 },

  // ── RMC Fittings ─────────────────────────────────────────────────────────
  { id: "fit-rmc-coup-1/2",       category: "Conduit Fittings", description: "1/2\" RMC Threaded Coupling",            unit: "EA", unitPrice: 1.20 },
  { id: "fit-rmc-coup-3/4",       category: "Conduit Fittings", description: "3/4\" RMC Threaded Coupling",            unit: "EA", unitPrice: 1.60 },
  { id: "fit-rmc-coup-1",         category: "Conduit Fittings", description: "1\" RMC Threaded Coupling",              unit: "EA", unitPrice: 2.40 },
  { id: "fit-rmc-coup-1-1/2",    category: "Conduit Fittings", description: "1-1/2\" RMC Threaded Coupling",          unit: "EA", unitPrice: 4.20 },
  { id: "fit-rmc-coup-2",         category: "Conduit Fittings", description: "2\" RMC Threaded Coupling",              unit: "EA", unitPrice: 6.50 },
  { id: "fit-rmc-coup-3",         category: "Conduit Fittings", description: "3\" RMC Threaded Coupling",              unit: "EA", unitPrice: 15.00 },
  { id: "fit-rmc-coup-4",         category: "Conduit Fittings", description: "4\" RMC Threaded Coupling",              unit: "EA", unitPrice: 24.00 },
  { id: "fit-rmc-90-1/2",         category: "Conduit Fittings", description: "1/2\" RMC 90° Elbow",                   unit: "EA", unitPrice: 3.50 },
  { id: "fit-rmc-90-3/4",         category: "Conduit Fittings", description: "3/4\" RMC 90° Elbow",                   unit: "EA", unitPrice: 4.80 },
  { id: "fit-rmc-90-1",           category: "Conduit Fittings", description: "1\" RMC 90° Elbow",                     unit: "EA", unitPrice: 7.50 },
  { id: "fit-rmc-90-1-1/2",      category: "Conduit Fittings", description: "1-1/2\" RMC 90° Elbow",                 unit: "EA", unitPrice: 15.00 },
  { id: "fit-rmc-90-2",           category: "Conduit Fittings", description: "2\" RMC 90° Elbow",                     unit: "EA", unitPrice: 22.00 },
  { id: "fit-rmc-90-3",           category: "Conduit Fittings", description: "3\" RMC 90° Elbow",                     unit: "EA", unitPrice: 55.00 },
  { id: "fit-rmc-90-4",           category: "Conduit Fittings", description: "4\" RMC 90° Elbow",                     unit: "EA", unitPrice: 95.00 },

  // ── PVC Fittings ─────────────────────────────────────────────────────────
  { id: "fit-pvc-coup-1/2",       category: "Conduit Fittings", description: "1/2\" PVC Sch 40 Coupling",              unit: "EA", unitPrice: 0.35 },
  { id: "fit-pvc-coup-3/4",       category: "Conduit Fittings", description: "3/4\" PVC Sch 40 Coupling",              unit: "EA", unitPrice: 0.45 },
  { id: "fit-pvc-coup-1",         category: "Conduit Fittings", description: "1\" PVC Sch 40 Coupling",                unit: "EA", unitPrice: 0.65 },
  { id: "fit-pvc-coup-1-1/2",    category: "Conduit Fittings", description: "1-1/2\" PVC Sch 40 Coupling",            unit: "EA", unitPrice: 1.10 },
  { id: "fit-pvc-coup-2",         category: "Conduit Fittings", description: "2\" PVC Sch 40 Coupling",                unit: "EA", unitPrice: 1.50 },
  { id: "fit-pvc-coup-3",         category: "Conduit Fittings", description: "3\" PVC Sch 40 Coupling",                unit: "EA", unitPrice: 3.20 },
  { id: "fit-pvc-coup-4",         category: "Conduit Fittings", description: "4\" PVC Sch 40 Coupling",                unit: "EA", unitPrice: 5.50 },
  { id: "fit-pvc-90-1/2",         category: "Conduit Fittings", description: "1/2\" PVC Sch 40 90° Elbow",            unit: "EA", unitPrice: 0.55 },
  { id: "fit-pvc-90-3/4",         category: "Conduit Fittings", description: "3/4\" PVC Sch 40 90° Elbow",            unit: "EA", unitPrice: 0.75 },
  { id: "fit-pvc-90-1",           category: "Conduit Fittings", description: "1\" PVC Sch 40 90° Elbow",              unit: "EA", unitPrice: 1.10 },
  { id: "fit-pvc-90-1-1/2",      category: "Conduit Fittings", description: "1-1/2\" PVC Sch 40 90° Elbow",          unit: "EA", unitPrice: 1.90 },
  { id: "fit-pvc-90-2",           category: "Conduit Fittings", description: "2\" PVC Sch 40 90° Elbow",              unit: "EA", unitPrice: 2.80 },
  { id: "fit-pvc-90-3",           category: "Conduit Fittings", description: "3\" PVC Sch 40 90° Elbow",              unit: "EA", unitPrice: 6.50 },
  { id: "fit-pvc-90-4",           category: "Conduit Fittings", description: "4\" PVC Sch 40 90° Elbow",              unit: "EA", unitPrice: 11.00 },
  { id: "fit-pvc-bell-1/2",       category: "Conduit Fittings", description: "1/2\" PVC Bell End Cap",                 unit: "EA", unitPrice: 0.30 },
  { id: "fit-pvc-bell-3/4",       category: "Conduit Fittings", description: "3/4\" PVC Bell End Cap",                 unit: "EA", unitPrice: 0.40 },
  { id: "fit-pvc-bell-1",         category: "Conduit Fittings", description: "1\" PVC Bell End Cap",                   unit: "EA", unitPrice: 0.55 },
  { id: "fit-pvc-bell-2",         category: "Conduit Fittings", description: "2\" PVC Bell End Cap",                   unit: "EA", unitPrice: 0.95 },
  { id: "fit-pvc-bell-4",         category: "Conduit Fittings", description: "4\" PVC Bell End Cap",                   unit: "EA", unitPrice: 2.20 },
  { id: "fit-pvc-glue-sm",        category: "Conduit Fittings", description: "PVC Conduit Cement (small, 4oz)",        unit: "EA", unitPrice: 4.50 },
  { id: "fit-pvc-glue-lg",        category: "Conduit Fittings", description: "PVC Conduit Cement (large, 16oz)",       unit: "EA", unitPrice: 12.00 },

  // ── FMC/LFMC Connectors ───────────────────────────────────────────────────
  { id: "fit-fmc-conn-3/8",       category: "Conduit Fittings", description: "3/8\" FMC Connector",                   unit: "EA", unitPrice: 1.20 },
  { id: "fit-fmc-conn-1/2",       category: "Conduit Fittings", description: "1/2\" FMC Connector",                   unit: "EA", unitPrice: 1.45 },
  { id: "fit-fmc-conn-3/4",       category: "Conduit Fittings", description: "3/4\" FMC Connector",                   unit: "EA", unitPrice: 1.90 },
  { id: "fit-fmc-conn-1",         category: "Conduit Fittings", description: "1\" FMC Connector",                     unit: "EA", unitPrice: 2.80 },
  { id: "fit-fmc-conn-1-1/2",    category: "Conduit Fittings", description: "1-1/2\" FMC Connector",                 unit: "EA", unitPrice: 4.50 },
  { id: "fit-fmc-conn-2",         category: "Conduit Fittings", description: "2\" FMC Connector",                     unit: "EA", unitPrice: 6.80 },
  { id: "fit-lfmc-conn-3/8",      category: "Conduit Fittings", description: "3/8\" LFMC Connector",                  unit: "EA", unitPrice: 1.80 },
  { id: "fit-lfmc-conn-1/2",      category: "Conduit Fittings", description: "1/2\" LFMC Connector",                  unit: "EA", unitPrice: 2.10 },
  { id: "fit-lfmc-conn-3/4",      category: "Conduit Fittings", description: "3/4\" LFMC Connector",                  unit: "EA", unitPrice: 2.80 },
  { id: "fit-lfmc-conn-1",        category: "Conduit Fittings", description: "1\" LFMC Connector",                    unit: "EA", unitPrice: 4.20 },
  { id: "fit-lfmc-conn-1-1/2",   category: "Conduit Fittings", description: "1-1/2\" LFMC Connector",                unit: "EA", unitPrice: 6.50 },
  { id: "fit-lfmc-conn-2",        category: "Conduit Fittings", description: "2\" LFMC Connector",                    unit: "EA", unitPrice: 9.50 },

  // ── Locknuts & Bushings ───────────────────────────────────────────────────
  { id: "fit-locknut-1/2",        category: "Conduit Fittings", description: "1/2\" Steel Locknut",                   unit: "EA", unitPrice: 0.25 },
  { id: "fit-locknut-3/4",        category: "Conduit Fittings", description: "3/4\" Steel Locknut",                   unit: "EA", unitPrice: 0.32 },
  { id: "fit-locknut-1",          category: "Conduit Fittings", description: "1\" Steel Locknut",                     unit: "EA", unitPrice: 0.45 },
  { id: "fit-locknut-1-1/2",     category: "Conduit Fittings", description: "1-1/2\" Steel Locknut",                 unit: "EA", unitPrice: 0.75 },
  { id: "fit-locknut-2",          category: "Conduit Fittings", description: "2\" Steel Locknut",                     unit: "EA", unitPrice: 1.10 },
  { id: "fit-bushing-1/2",        category: "Conduit Fittings", description: "1/2\" Insulated Bushing",               unit: "EA", unitPrice: 0.35 },
  { id: "fit-bushing-3/4",        category: "Conduit Fittings", description: "3/4\" Insulated Bushing",               unit: "EA", unitPrice: 0.45 },
  { id: "fit-bushing-1",          category: "Conduit Fittings", description: "1\" Insulated Bushing",                 unit: "EA", unitPrice: 0.65 },
  { id: "fit-bushing-1-1/2",     category: "Conduit Fittings", description: "1-1/2\" Insulated Bushing",             unit: "EA", unitPrice: 1.10 },
  { id: "fit-bushing-2",          category: "Conduit Fittings", description: "2\" Insulated Bushing",                 unit: "EA", unitPrice: 1.60 },
  { id: "fit-bushing-3",          category: "Conduit Fittings", description: "3\" Insulated Bushing",                 unit: "EA", unitPrice: 3.50 },
  { id: "fit-bushing-4",          category: "Conduit Fittings", description: "4\" Insulated Bushing",                 unit: "EA", unitPrice: 5.80 },

  // ═══════════════════════════════════════════════════════════════════════════
  // WIRE & CABLE (~150 items)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── THHN/THWN-2 Copper — per foot ────────────────────────────────────────
  { id: "wir-thhn-14cu",          category: "Wire & Cable", description: "THHN/THWN-2 #14 AWG Copper (per foot)",      unit: "FT", unitPrice: 0.18 },
  { id: "wir-thhn-12cu",          category: "Wire & Cable", description: "THHN/THWN-2 #12 AWG Copper (per foot)",      unit: "FT", unitPrice: 0.28 },
  { id: "wir-thhn-10cu",          category: "Wire & Cable", description: "THHN/THWN-2 #10 AWG Copper (per foot)",      unit: "FT", unitPrice: 0.44 },
  { id: "wir-thhn-8cu",           category: "Wire & Cable", description: "THHN/THWN-2 #8 AWG Copper (per foot)",       unit: "FT", unitPrice: 0.72 },
  { id: "wir-thhn-6cu",           category: "Wire & Cable", description: "THHN/THWN-2 #6 AWG Copper (per foot)",       unit: "FT", unitPrice: 1.10 },
  { id: "wir-thhn-4cu",           category: "Wire & Cable", description: "THHN/THWN-2 #4 AWG Copper (per foot)",       unit: "FT", unitPrice: 1.65 },
  { id: "wir-thhn-3cu",           category: "Wire & Cable", description: "THHN/THWN-2 #3 AWG Copper (per foot)",       unit: "FT", unitPrice: 2.05 },
  { id: "wir-thhn-2cu",           category: "Wire & Cable", description: "THHN/THWN-2 #2 AWG Copper (per foot)",       unit: "FT", unitPrice: 2.40 },
  { id: "wir-thhn-1cu",           category: "Wire & Cable", description: "THHN/THWN-2 #1 AWG Copper (per foot)",       unit: "FT", unitPrice: 3.20 },
  { id: "wir-thhn-1/0cu",         category: "Wire & Cable", description: "THHN/THWN-2 1/0 AWG Copper (per foot)",      unit: "FT", unitPrice: 4.10 },
  { id: "wir-thhn-2/0cu",         category: "Wire & Cable", description: "THHN/THWN-2 2/0 AWG Copper (per foot)",      unit: "FT", unitPrice: 5.20 },
  { id: "wir-thhn-3/0cu",         category: "Wire & Cable", description: "THHN/THWN-2 3/0 AWG Copper (per foot)",      unit: "FT", unitPrice: 6.50 },
  { id: "wir-thhn-4/0cu",         category: "Wire & Cable", description: "THHN/THWN-2 4/0 AWG Copper (per foot)",      unit: "FT", unitPrice: 8.20 },
  { id: "wir-thhn-250cu",         category: "Wire & Cable", description: "THHN/THWN-2 250 kcmil Copper (per foot)",    unit: "FT", unitPrice: 10.50 },
  { id: "wir-thhn-300cu",         category: "Wire & Cable", description: "THHN/THWN-2 300 kcmil Copper (per foot)",    unit: "FT", unitPrice: 12.50 },
  { id: "wir-thhn-350cu",         category: "Wire & Cable", description: "THHN/THWN-2 350 kcmil Copper (per foot)",    unit: "FT", unitPrice: 14.20 },
  { id: "wir-thhn-400cu",         category: "Wire & Cable", description: "THHN/THWN-2 400 kcmil Copper (per foot)",    unit: "FT", unitPrice: 16.50 },
  { id: "wir-thhn-500cu",         category: "Wire & Cable", description: "THHN/THWN-2 500 kcmil Copper (per foot)",    unit: "FT", unitPrice: 19.80 },

  // ── THHN/THWN-2 Aluminum — per foot ──────────────────────────────────────
  { id: "wir-thhn-2al",           category: "Wire & Cable", description: "THHN/THWN-2 #2 AWG Aluminum (per foot)",     unit: "FT", unitPrice: 0.55 },
  { id: "wir-thhn-1al",           category: "Wire & Cable", description: "THHN/THWN-2 #1 AWG Aluminum (per foot)",     unit: "FT", unitPrice: 0.70 },
  { id: "wir-thhn-1/0al",         category: "Wire & Cable", description: "THHN/THWN-2 1/0 AWG Aluminum (per foot)",    unit: "FT", unitPrice: 0.90 },
  { id: "wir-thhn-2/0al",         category: "Wire & Cable", description: "THHN/THWN-2 2/0 AWG Aluminum (per foot)",    unit: "FT", unitPrice: 1.15 },
  { id: "wir-thhn-3/0al",         category: "Wire & Cable", description: "THHN/THWN-2 3/0 AWG Aluminum (per foot)",    unit: "FT", unitPrice: 1.45 },
  { id: "wir-thhn-4/0al",         category: "Wire & Cable", description: "THHN/THWN-2 4/0 AWG Aluminum (per foot)",    unit: "FT", unitPrice: 1.80 },
  { id: "wir-thhn-250al",         category: "Wire & Cable", description: "THHN/THWN-2 250 kcmil Aluminum (per foot)",  unit: "FT", unitPrice: 2.25 },
  { id: "wir-thhn-350al",         category: "Wire & Cable", description: "THHN/THWN-2 350 kcmil Aluminum (per foot)",  unit: "FT", unitPrice: 3.20 },
  { id: "wir-thhn-500al",         category: "Wire & Cable", description: "THHN/THWN-2 500 kcmil Aluminum (per foot)",  unit: "FT", unitPrice: 4.50 },

  // ── NM-B (Romex) ─────────────────────────────────────────────────────────
  { id: "wir-nmb-14-2",           category: "Wire & Cable", description: "NM-B 14/2 w/Ground (per foot)",              unit: "FT", unitPrice: 0.55 },
  { id: "wir-nmb-14-3",           category: "Wire & Cable", description: "NM-B 14/3 w/Ground (per foot)",              unit: "FT", unitPrice: 0.75 },
  { id: "wir-nmb-12-2",           category: "Wire & Cable", description: "NM-B 12/2 w/Ground (per foot)",              unit: "FT", unitPrice: 0.72 },
  { id: "wir-nmb-12-3",           category: "Wire & Cable", description: "NM-B 12/3 w/Ground (per foot)",              unit: "FT", unitPrice: 0.98 },
  { id: "wir-nmb-10-2",           category: "Wire & Cable", description: "NM-B 10/2 w/Ground (per foot)",              unit: "FT", unitPrice: 1.10 },
  { id: "wir-nmb-10-3",           category: "Wire & Cable", description: "NM-B 10/3 w/Ground (per foot)",              unit: "FT", unitPrice: 1.45 },
  { id: "wir-nmb-8-2",            category: "Wire & Cable", description: "NM-B 8/2 w/Ground (per foot)",               unit: "FT", unitPrice: 1.80 },
  { id: "wir-nmb-8-3",            category: "Wire & Cable", description: "NM-B 8/3 w/Ground (per foot)",               unit: "FT", unitPrice: 2.40 },
  { id: "wir-nmb-6-2",            category: "Wire & Cable", description: "NM-B 6/2 w/Ground (per foot)",               unit: "FT", unitPrice: 2.80 },
  { id: "wir-nmb-6-3",            category: "Wire & Cable", description: "NM-B 6/3 w/Ground (per foot)",               unit: "FT", unitPrice: 3.60 },

  // ── MC Cable ──────────────────────────────────────────────────────────────
  { id: "wir-mc-12-2",            category: "Wire & Cable", description: "MC Cable 12/2 w/Ground (per foot)",          unit: "FT", unitPrice: 0.95 },
  { id: "wir-mc-12-3",            category: "Wire & Cable", description: "MC Cable 12/3 w/Ground (per foot)",          unit: "FT", unitPrice: 1.25 },
  { id: "wir-mc-10-2",            category: "Wire & Cable", description: "MC Cable 10/2 w/Ground (per foot)",          unit: "FT", unitPrice: 1.35 },
  { id: "wir-mc-10-3",            category: "Wire & Cable", description: "MC Cable 10/3 w/Ground (per foot)",          unit: "FT", unitPrice: 1.75 },
  { id: "wir-mc-8-2",             category: "Wire & Cable", description: "MC Cable 8/2 w/Ground (per foot)",           unit: "FT", unitPrice: 2.10 },
  { id: "wir-mc-8-3",             category: "Wire & Cable", description: "MC Cable 8/3 w/Ground (per foot)",           unit: "FT", unitPrice: 2.80 },
  { id: "wir-mc-6-2",             category: "Wire & Cable", description: "MC Cable 6/2 w/Ground (per foot)",           unit: "FT", unitPrice: 3.20 },
  { id: "wir-mc-6-3",             category: "Wire & Cable", description: "MC Cable 6/3 w/Ground (per foot)",           unit: "FT", unitPrice: 4.20 },
  { id: "wir-mc-4-3",             category: "Wire & Cable", description: "MC Cable 4/3 w/Ground (per foot)",           unit: "FT", unitPrice: 5.80 },
  { id: "wir-mc-2-3",             category: "Wire & Cable", description: "MC Cable 2/3 w/Ground (per foot)",           unit: "FT", unitPrice: 8.50 },
  { id: "wir-mc-2-4",             category: "Wire & Cable", description: "MC Cable 2/4 w/Ground (per foot)",           unit: "FT", unitPrice: 10.50 },

  // ── MC Cable Connectors ───────────────────────────────────────────────────
  { id: "wir-mc-conn-3/8",        category: "Wire & Cable", description: "MC Cable Connector 3/8\" KO",               unit: "EA", unitPrice: 1.20 },
  { id: "wir-mc-conn-1/2",        category: "Wire & Cable", description: "MC Cable Connector 1/2\" KO",               unit: "EA", unitPrice: 1.40 },
  { id: "wir-mc-conn-3/4",        category: "Wire & Cable", description: "MC Cable Connector 3/4\" KO",               unit: "EA", unitPrice: 1.80 },
  { id: "wir-mc-conn-1",          category: "Wire & Cable", description: "MC Cable Connector 1\" KO",                 unit: "EA", unitPrice: 2.60 },

  // ── URD / Service Entrance Cable ──────────────────────────────────────────
  { id: "wir-ser-2-2-2-4",        category: "Wire & Cable", description: "SER 2-2-2-4 AWG Service Entrance Cable (per foot)", unit: "FT", unitPrice: 3.80 },
  { id: "wir-ser-4-4-4-6",        category: "Wire & Cable", description: "SER 4-4-4-6 AWG Service Entrance Cable (per foot)", unit: "FT", unitPrice: 2.60 },
  { id: "wir-ser-1/0-1/0-2",     category: "Wire & Cable", description: "SER 1/0-1/0-2 AWG Service Entrance Cable (per foot)", unit: "FT", unitPrice: 5.50 },
  { id: "wir-ser-2/0-2/0-4",     category: "Wire & Cable", description: "SER 2/0-2/0-4 AWG Service Entrance Cable (per foot)", unit: "FT", unitPrice: 7.20 },
  { id: "wir-seu-2-2-4",          category: "Wire & Cable", description: "SEU 2-2-4 AWG Service Entrance Unarmored (per foot)", unit: "FT", unitPrice: 2.90 },
  { id: "wir-seu-1/0-1/0-2",     category: "Wire & Cable", description: "SEU 1/0-1/0-2 AWG Service Entrance Unarmored (per foot)", unit: "FT", unitPrice: 4.80 },
  { id: "wir-urd-2cu",            category: "Wire & Cable", description: "URD #2 AWG Copper Direct Burial (per foot)",  unit: "FT", unitPrice: 2.20 },
  { id: "wir-urd-1/0cu",          category: "Wire & Cable", description: "URD 1/0 AWG Copper Direct Burial (per foot)", unit: "FT", unitPrice: 3.80 },
  { id: "wir-urd-2/0al",          category: "Wire & Cable", description: "URD 2/0 AWG Aluminum Direct Burial (per foot)", unit: "FT", unitPrice: 1.20 },
  { id: "wir-urd-4/0al",          category: "Wire & Cable", description: "URD 4/0 AWG Aluminum Direct Burial (per foot)", unit: "FT", unitPrice: 1.90 },
  { id: "wir-urd-350al",          category: "Wire & Cable", description: "URD 350 kcmil Aluminum Direct Burial (per foot)", unit: "FT", unitPrice: 3.20 },

  // ── Low Voltage / Control Wire ────────────────────────────────────────────
  { id: "wir-lv-18-2",            category: "Wire & Cable", description: "18/2 Thermostat Wire (per foot)",            unit: "FT", unitPrice: 0.12 },
  { id: "wir-lv-18-4",            category: "Wire & Cable", description: "18/4 Thermostat Wire (per foot)",            unit: "FT", unitPrice: 0.18 },
  { id: "wir-lv-18-8",            category: "Wire & Cable", description: "18/8 Control Wire (per foot)",               unit: "FT", unitPrice: 0.28 },
  { id: "wir-lv-cat6",            category: "Wire & Cable", description: "Cat6 Ethernet Cable (per foot)",             unit: "FT", unitPrice: 0.22 },
  { id: "wir-lv-coax-rg6",        category: "Wire & Cable", description: "RG6 Coaxial Cable (per foot)",               unit: "FT", unitPrice: 0.18 },
  { id: "wir-lv-speaker-16-2",    category: "Wire & Cable", description: "16/2 Speaker Wire (per foot)",               unit: "FT", unitPrice: 0.15 },

  // ═══════════════════════════════════════════════════════════════════════════
  // BOXES & ENCLOSURES (~80 items)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Single-Gang Boxes ─────────────────────────────────────────────────────
  { id: "box-sg-1900-sw",         category: "Boxes & Enclosures", description: "1-Gang Switch Box (18 cu in) Plastic",  unit: "EA", unitPrice: 0.55 },
  { id: "box-sg-1900-sw-metal",   category: "Boxes & Enclosures", description: "1-Gang Switch Box (18 cu in) Metal",    unit: "EA", unitPrice: 1.20 },
  { id: "box-sg-old-work",        category: "Boxes & Enclosures", description: "1-Gang Old-Work Plastic Box",           unit: "EA", unitPrice: 0.85 },
  { id: "box-sg-new-work-nail",   category: "Boxes & Enclosures", description: "1-Gang New-Work Nail-On Plastic Box",   unit: "EA", unitPrice: 0.65 },
  { id: "box-sg-metal-ko",        category: "Boxes & Enclosures", description: "1-Gang Metal Box w/KOs 2\" deep",       unit: "EA", unitPrice: 1.35 },

  // ── Two-Gang Boxes ────────────────────────────────────────────────────────
  { id: "box-2g-plastic",         category: "Boxes & Enclosures", description: "2-Gang Plastic Box",                    unit: "EA", unitPrice: 0.85 },
  { id: "box-2g-metal",           category: "Boxes & Enclosures", description: "2-Gang Metal Box",                      unit: "EA", unitPrice: 1.80 },
  { id: "box-2g-old-work",        category: "Boxes & Enclosures", description: "2-Gang Old-Work Plastic Box",           unit: "EA", unitPrice: 1.20 },

  // ── Three/Four-Gang Boxes ─────────────────────────────────────────────────
  { id: "box-3g-plastic",         category: "Boxes & Enclosures", description: "3-Gang Plastic Box",                    unit: "EA", unitPrice: 1.20 },
  { id: "box-3g-metal",           category: "Boxes & Enclosures", description: "3-Gang Metal Box",                      unit: "EA", unitPrice: 2.50 },
  { id: "box-4g-plastic",         category: "Boxes & Enclosures", description: "4-Gang Plastic Box",                    unit: "EA", unitPrice: 1.65 },
  { id: "box-4g-metal",           category: "Boxes & Enclosures", description: "4-Gang Metal Box",                      unit: "EA", unitPrice: 3.20 },

  // ── 4\" Square Boxes ──────────────────────────────────────────────────────
  { id: "box-4sq-1-1/2",          category: "Boxes & Enclosures", description: "4\" Square Box 1-1/2\" deep",           unit: "EA", unitPrice: 1.80 },
  { id: "box-4sq-2-1/8",          category: "Boxes & Enclosures", description: "4\" Square Box 2-1/8\" deep",           unit: "EA", unitPrice: 2.10 },
  { id: "box-4sq-ext-1-1/2",      category: "Boxes & Enclosures", description: "4\" Square Box Extension Ring 1-1/2\"", unit: "EA", unitPrice: 1.20 },
  { id: "box-4sq-ext-2-1/8",      category: "Boxes & Enclosures", description: "4\" Square Box Extension Ring 2-1/8\"", unit: "EA", unitPrice: 1.45 },
  { id: "box-4sq-sg-mud",         category: "Boxes & Enclosures", description: "4\" Square 1-Gang Mud Ring",            unit: "EA", unitPrice: 0.85 },
  { id: "box-4sq-2g-mud",         category: "Boxes & Enclosures", description: "4\" Square 2-Gang Mud Ring",            unit: "EA", unitPrice: 0.95 },
  { id: "box-4sq-round-mud",      category: "Boxes & Enclosures", description: "4\" Square Round Mud Ring",             unit: "EA", unitPrice: 0.90 },

  // ── 4-11/16\" (4-9/16\") Square Boxes ────────────────────────────────────
  { id: "box-4-11-1-1/2",         category: "Boxes & Enclosures", description: "4-11/16\" Square Box 1-1/2\" deep",     unit: "EA", unitPrice: 2.80 },
  { id: "box-4-11-2-1/8",         category: "Boxes & Enclosures", description: "4-11/16\" Square Box 2-1/8\" deep",     unit: "EA", unitPrice: 3.20 },
  { id: "box-4-11-sg-mud",        category: "Boxes & Enclosures", description: "4-11/16\" Square 1-Gang Mud Ring",      unit: "EA", unitPrice: 1.10 },
  { id: "box-4-11-2g-mud",        category: "Boxes & Enclosures", description: "4-11/16\" Square 2-Gang Mud Ring",      unit: "EA", unitPrice: 1.20 },

  // ── Round/Octagon Boxes ───────────────────────────────────────────────────
  { id: "box-oct-4-1/2",          category: "Boxes & Enclosures", description: "4\" Octagon Box 1/2\" deep",            unit: "EA", unitPrice: 1.20 },
  { id: "box-oct-4-1-1/2",        category: "Boxes & Enclosures", description: "4\" Octagon Box 1-1/2\" deep",          unit: "EA", unitPrice: 1.50 },
  { id: "box-oct-4-ext",          category: "Boxes & Enclosures", description: "4\" Octagon Extension Ring",            unit: "EA", unitPrice: 0.95 },
  { id: "box-round-old-work",     category: "Boxes & Enclosures", description: "Round Old-Work Ceiling Box 1-1/2\"",    unit: "EA", unitPrice: 1.80 },
  { id: "box-round-fan-brace",    category: "Boxes & Enclosures", description: "Ceiling Fan Brace Box (adjustable)",    unit: "EA", unitPrice: 8.50 },
  { id: "box-round-fan-new",      category: "Boxes & Enclosures", description: "Ceiling Fan Box New Construction",      unit: "EA", unitPrice: 4.50 },

  // ── Weatherproof / Outdoor Boxes ─────────────────────────────────────────
  { id: "box-wp-1g-in-use",       category: "Boxes & Enclosures", description: "1-Gang In-Use Weatherproof Cover",      unit: "EA", unitPrice: 4.50 },
  { id: "box-wp-2g-in-use",       category: "Boxes & Enclosures", description: "2-Gang In-Use Weatherproof Cover",      unit: "EA", unitPrice: 5.80 },
  { id: "box-wp-1g-box",          category: "Boxes & Enclosures", description: "1-Gang Weatherproof Box",               unit: "EA", unitPrice: 3.20 },
  { id: "box-wp-2g-box",          category: "Boxes & Enclosures", description: "2-Gang Weatherproof Box",               unit: "EA", unitPrice: 4.50 },
  { id: "box-wp-blank-cover",     category: "Boxes & Enclosures", description: "Weatherproof Blank Cover",              unit: "EA", unitPrice: 2.20 },
  { id: "box-wp-duplex-cover",    category: "Boxes & Enclosures", description: "Weatherproof Duplex Receptacle Cover",  unit: "EA", unitPrice: 3.50 },

  // ── Pull Boxes / Junction Boxes ───────────────────────────────────────────
  { id: "box-pull-4x4x4",         category: "Boxes & Enclosures", description: "4\"x4\"x4\" Steel Pull Box",            unit: "EA", unitPrice: 8.50 },
  { id: "box-pull-6x6x4",         category: "Boxes & Enclosures", description: "6\"x6\"x4\" Steel Pull Box",            unit: "EA", unitPrice: 12.00 },
  { id: "box-pull-8x8x4",         category: "Boxes & Enclosures", description: "8\"x8\"x4\" Steel Pull Box",            unit: "EA", unitPrice: 18.00 },
  { id: "box-pull-12x12x6",       category: "Boxes & Enclosures", description: "12\"x12\"x6\" Steel Pull Box",          unit: "EA", unitPrice: 35.00 },
  { id: "box-pull-24x24x8",       category: "Boxes & Enclosures", description: "24\"x24\"x8\" Steel Pull Box",          unit: "EA", unitPrice: 85.00 },
  { id: "box-pull-36x36x12",      category: "Boxes & Enclosures", description: "36\"x36\"x12\" Steel Pull Box",         unit: "EA", unitPrice: 165.00 },

  // ── NEMA 3R Enclosures ────────────────────────────────────────────────────
  { id: "box-3r-8x6x4",           category: "Boxes & Enclosures", description: "NEMA 3R 8\"x6\"x4\" Enclosure",         unit: "EA", unitPrice: 22.00 },
  { id: "box-3r-12x10x4",         category: "Boxes & Enclosures", description: "NEMA 3R 12\"x10\"x4\" Enclosure",       unit: "EA", unitPrice: 38.00 },
  { id: "box-3r-16x14x6",         category: "Boxes & Enclosures", description: "NEMA 3R 16\"x14\"x6\" Enclosure",       unit: "EA", unitPrice: 65.00 },

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPPORTS & FASTENERS (~120 items)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Wire Nuts ─────────────────────────────────────────────────────────────
  { id: "sup-wn-yellow",          category: "Supports & Fasteners", description: "Wire Nut Yellow (22-14 AWG) 100-pack",  unit: "BX", unitPrice: 6.50 },
  { id: "sup-wn-orange",          category: "Supports & Fasteners", description: "Wire Nut Orange (18-12 AWG) 100-pack",  unit: "BX", unitPrice: 7.00 },
  { id: "sup-wn-red",             category: "Supports & Fasteners", description: "Wire Nut Red (16-10 AWG) 100-pack",     unit: "BX", unitPrice: 8.00 },
  { id: "sup-wn-tan",             category: "Supports & Fasteners", description: "Wire Nut Tan (14-8 AWG) 100-pack",      unit: "BX", unitPrice: 9.50 },
  { id: "sup-wn-gray",            category: "Supports & Fasteners", description: "Wire Nut Gray (12-6 AWG) 100-pack",     unit: "BX", unitPrice: 12.00 },
  { id: "sup-wn-blue",            category: "Supports & Fasteners", description: "Wire Nut Blue (22-16 AWG) 100-pack",    unit: "BX", unitPrice: 6.00 },
  { id: "sup-wago-221-3",         category: "Supports & Fasteners", description: "WAGO 221-413 3-Port Lever Connector (10-pack)", unit: "PK", unitPrice: 8.50 },
  { id: "sup-wago-221-5",         category: "Supports & Fasteners", description: "WAGO 221-415 5-Port Lever Connector (10-pack)", unit: "PK", unitPrice: 12.00 },

  // ── Cable Staples / Clips ─────────────────────────────────────────────────
  { id: "sup-staple-nmb-1/2",     category: "Supports & Fasteners", description: "1/2\" NM-B Cable Staples (100-pack)",   unit: "BX", unitPrice: 4.50 },
  { id: "sup-staple-nmb-3/4",     category: "Supports & Fasteners", description: "3/4\" NM-B Cable Staples (100-pack)",   unit: "BX", unitPrice: 5.00 },
  { id: "sup-clip-mc-3/8",        category: "Supports & Fasteners", description: "3/8\" MC Cable Clip (100-pack)",        unit: "BX", unitPrice: 9.00 },
  { id: "sup-clip-mc-1/2",        category: "Supports & Fasteners", description: "1/2\" MC Cable Clip (100-pack)",        unit: "BX", unitPrice: 10.00 },
  { id: "sup-clip-mc-3/4",        category: "Supports & Fasteners", description: "3/4\" MC Cable Clip (100-pack)",        unit: "BX", unitPrice: 12.00 },
  { id: "sup-clip-mc-1",          category: "Supports & Fasteners", description: "1\" MC Cable Clip (100-pack)",          unit: "BX", unitPrice: 15.00 },

  // ── EMT Straps / Hangers ──────────────────────────────────────────────────
  { id: "sup-strap-emt-1/2",      category: "Supports & Fasteners", description: "1/2\" EMT 1-Hole Strap (100-pack)",     unit: "BX", unitPrice: 8.00 },
  { id: "sup-strap-emt-3/4",      category: "Supports & Fasteners", description: "3/4\" EMT 1-Hole Strap (100-pack)",     unit: "BX", unitPrice: 9.50 },
  { id: "sup-strap-emt-1",        category: "Supports & Fasteners", description: "1\" EMT 1-Hole Strap (100-pack)",       unit: "BX", unitPrice: 12.00 },
  { id: "sup-strap-emt-1-1/2",   category: "Supports & Fasteners", description: "1-1/2\" EMT 1-Hole Strap (50-pack)",    unit: "BX", unitPrice: 12.00 },
  { id: "sup-strap-emt-2",        category: "Supports & Fasteners", description: "2\" EMT 1-Hole Strap (50-pack)",        unit: "BX", unitPrice: 15.00 },
  { id: "sup-strap-emt-3",        category: "Supports & Fasteners", description: "3\" EMT 1-Hole Strap (25-pack)",        unit: "BX", unitPrice: 18.00 },
  { id: "sup-strap-emt-4",        category: "Supports & Fasteners", description: "4\" EMT 1-Hole Strap (25-pack)",        unit: "BX", unitPrice: 22.00 },
  { id: "sup-strap-emt-2h-1/2",  category: "Supports & Fasteners", description: "1/2\" EMT 2-Hole Strap (100-pack)",     unit: "BX", unitPrice: 9.00 },
  { id: "sup-strap-emt-2h-3/4",  category: "Supports & Fasteners", description: "3/4\" EMT 2-Hole Strap (100-pack)",     unit: "BX", unitPrice: 10.50 },
  { id: "sup-strap-emt-2h-1",    category: "Supports & Fasteners", description: "1\" EMT 2-Hole Strap (100-pack)",       unit: "BX", unitPrice: 14.00 },

  // ── Conduit Clamps (Beam Clamps / Pipe Straps) ────────────────────────────
  { id: "sup-clamp-1/2",          category: "Supports & Fasteners", description: "1/2\" Conduit Pipe Clamp",              unit: "EA", unitPrice: 0.35 },
  { id: "sup-clamp-3/4",          category: "Supports & Fasteners", description: "3/4\" Conduit Pipe Clamp",              unit: "EA", unitPrice: 0.42 },
  { id: "sup-clamp-1",            category: "Supports & Fasteners", description: "1\" Conduit Pipe Clamp",                unit: "EA", unitPrice: 0.58 },
  { id: "sup-clamp-1-1/2",       category: "Supports & Fasteners", description: "1-1/2\" Conduit Pipe Clamp",            unit: "EA", unitPrice: 0.85 },
  { id: "sup-clamp-2",            category: "Supports & Fasteners", description: "2\" Conduit Pipe Clamp",                unit: "EA", unitPrice: 1.20 },
  { id: "sup-clamp-3",            category: "Supports & Fasteners", description: "3\" Conduit Pipe Clamp",                unit: "EA", unitPrice: 2.20 },
  { id: "sup-clamp-4",            category: "Supports & Fasteners", description: "4\" Conduit Pipe Clamp",                unit: "EA", unitPrice: 3.50 },

  // ── Strut (Unistrut) ──────────────────────────────────────────────────────
  { id: "sup-strut-1-5/8-12ga",   category: "Supports & Fasteners", description: "1-5/8\" Strut Channel 12 Gauge 10ft",   unit: "EA", unitPrice: 18.00 },
  { id: "sup-strut-1-5/8-14ga",   category: "Supports & Fasteners", description: "1-5/8\" Strut Channel 14 Gauge 10ft",   unit: "EA", unitPrice: 14.00 },
  { id: "sup-strut-1-5/8-ss",     category: "Supports & Fasteners", description: "1-5/8\" Strut Channel Stainless 10ft",  unit: "EA", unitPrice: 45.00 },
  { id: "sup-strut-3-1/4",        category: "Supports & Fasteners", description: "3-1/4\" Deep Strut Channel 10ft",       unit: "EA", unitPrice: 28.00 },
  { id: "sup-strut-nut-3/8",      category: "Supports & Fasteners", description: "3/8\" Strut Nut (Spring Nut) 100-pack", unit: "BX", unitPrice: 18.00 },
  { id: "sup-strut-nut-1/2",      category: "Supports & Fasteners", description: "1/2\" Strut Nut (Spring Nut) 100-pack", unit: "BX", unitPrice: 22.00 },
  { id: "sup-strut-clamp-1/2",    category: "Supports & Fasteners", description: "1/2\" Strut Conduit Clamp",             unit: "EA", unitPrice: 0.95 },
  { id: "sup-strut-clamp-3/4",    category: "Supports & Fasteners", description: "3/4\" Strut Conduit Clamp",             unit: "EA", unitPrice: 1.10 },
  { id: "sup-strut-clamp-1",      category: "Supports & Fasteners", description: "1\" Strut Conduit Clamp",               unit: "EA", unitPrice: 1.45 },
  { id: "sup-strut-clamp-1-1/2", category: "Supports & Fasteners", description: "1-1/2\" Strut Conduit Clamp",           unit: "EA", unitPrice: 2.10 },
  { id: "sup-strut-clamp-2",      category: "Supports & Fasteners", description: "2\" Strut Conduit Clamp",               unit: "EA", unitPrice: 2.80 },
  { id: "sup-strut-clamp-3",      category: "Supports & Fasteners", description: "3\" Strut Conduit Clamp",               unit: "EA", unitPrice: 4.50 },
  { id: "sup-strut-clamp-4",      category: "Supports & Fasteners", description: "4\" Strut Conduit Clamp",               unit: "EA", unitPrice: 6.50 },
  { id: "sup-strut-angle-90",     category: "Supports & Fasteners", description: "Strut 90° Angle Bracket",               unit: "EA", unitPrice: 3.50 },
  { id: "sup-strut-flat-plate",   category: "Supports & Fasteners", description: "Strut Flat Plate Connector",            unit: "EA", unitPrice: 2.80 },
  { id: "sup-strut-beam-clamp",   category: "Supports & Fasteners", description: "Strut Beam Clamp",                      unit: "EA", unitPrice: 4.20 },

  // ── Threaded Rod ──────────────────────────────────────────────────────────
  { id: "sup-rod-3/8-10ft",       category: "Supports & Fasteners", description: "3/8\" Threaded Rod 10ft",               unit: "EA", unitPrice: 8.50 },
  { id: "sup-rod-1/2-10ft",       category: "Supports & Fasteners", description: "1/2\" Threaded Rod 10ft",               unit: "EA", unitPrice: 12.00 },
  { id: "sup-rod-5/8-10ft",       category: "Supports & Fasteners", description: "5/8\" Threaded Rod 10ft",               unit: "EA", unitPrice: 18.00 },
  { id: "sup-rod-nut-3/8",        category: "Supports & Fasteners", description: "3/8\" Hex Nut (100-pack)",              unit: "BX", unitPrice: 6.00 },
  { id: "sup-rod-nut-1/2",        category: "Supports & Fasteners", description: "1/2\" Hex Nut (100-pack)",              unit: "BX", unitPrice: 8.50 },
  { id: "sup-rod-washer-3/8",     category: "Supports & Fasteners", description: "3/8\" Flat Washer (100-pack)",          unit: "BX", unitPrice: 5.00 },
  { id: "sup-rod-coupler-3/8",    category: "Supports & Fasteners", description: "3/8\" Rod Coupling Nut",                unit: "EA", unitPrice: 0.65 },
  { id: "sup-rod-coupler-1/2",    category: "Supports & Fasteners", description: "1/2\" Rod Coupling Nut",                unit: "EA", unitPrice: 0.90 },

  // ── Anchors & Fasteners ───────────────────────────────────────────────────
  { id: "sup-anchor-3/8-wedge",   category: "Supports & Fasteners", description: "3/8\" Wedge Anchor (50-pack)",          unit: "BX", unitPrice: 22.00 },
  { id: "sup-anchor-1/2-wedge",   category: "Supports & Fasteners", description: "1/2\" Wedge Anchor (25-pack)",          unit: "BX", unitPrice: 22.00 },
  { id: "sup-anchor-3/8-drop-in", category: "Supports & Fasteners", description: "3/8\" Drop-In Anchor (50-pack)",        unit: "BX", unitPrice: 18.00 },
  { id: "sup-anchor-1/2-drop-in", category: "Supports & Fasteners", description: "1/2\" Drop-In Anchor (25-pack)",        unit: "BX", unitPrice: 18.00 },
  { id: "sup-anchor-toggle-1/4",  category: "Supports & Fasteners", description: "1/4\" Toggle Bolt (50-pack)",           unit: "BX", unitPrice: 12.00 },
  { id: "sup-screw-8x1-1/4",     category: "Supports & Fasteners", description: "#8x1-1/4\" Pan Head Screw (100-pack)",  unit: "BX", unitPrice: 5.00 },
  { id: "sup-screw-10x1-1/2",    category: "Supports & Fasteners", description: "#10x1-1/2\" Pan Head Screw (100-pack)", unit: "BX", unitPrice: 6.00 },
  { id: "sup-screw-10x3/4-hex",  category: "Supports & Fasteners", description: "#10x3/4\" Hex Head Sheet Metal Screw (100-pack)", unit: "BX", unitPrice: 5.50 },
  { id: "sup-screw-lag-3/8",      category: "Supports & Fasteners", description: "3/8\" Lag Screw 2\" (50-pack)",          unit: "BX", unitPrice: 8.00 },
  { id: "sup-tape-elec-black",    category: "Supports & Fasteners", description: "Electrical Tape Black 3/4\" (10-pack)",   unit: "PK", unitPrice: 12.00 },
  { id: "sup-tape-elec-color",    category: "Supports & Fasteners", description: "Electrical Tape Color-Coded Set (6-pack)", unit: "PK", unitPrice: 9.50 },
  { id: "sup-tape-pull",          category: "Supports & Fasteners", description: "Fish Tape 100ft Steel",                   unit: "EA", unitPrice: 35.00 },
  { id: "sup-pull-string",        category: "Supports & Fasteners", description: "Pull String/Mule Tape 500ft",             unit: "EA", unitPrice: 18.00 },
  { id: "sup-lube-wire",          category: "Supports & Fasteners", description: "Wire Pulling Lubricant 1 Gallon",         unit: "EA", unitPrice: 22.00 },
  { id: "sup-lube-wire-qt",       category: "Supports & Fasteners", description: "Wire Pulling Lubricant 1 Quart",          unit: "EA", unitPrice: 8.50 },

  // ── Cable Ties ────────────────────────────────────────────────────────────
  { id: "sup-tie-4in-100",        category: "Supports & Fasteners", description: "4\" Cable Ties (100-pack)",               unit: "BX", unitPrice: 3.50 },
  { id: "sup-tie-8in-100",        category: "Supports & Fasteners", description: "8\" Cable Ties (100-pack)",               unit: "BX", unitPrice: 4.50 },
  { id: "sup-tie-11in-100",       category: "Supports & Fasteners", description: "11\" Cable Ties (100-pack)",              unit: "BX", unitPrice: 6.00 },
  { id: "sup-tie-uv-8in",         category: "Supports & Fasteners", description: "8\" UV-Resistant Cable Ties (100-pack)",  unit: "BX", unitPrice: 7.50 },

  // ── Conduit Bodies ────────────────────────────────────────────────────────
  { id: "sup-body-c-1/2",         category: "Supports & Fasteners", description: "1/2\" EMT C Conduit Body",                unit: "EA", unitPrice: 3.50 },
  { id: "sup-body-c-3/4",         category: "Supports & Fasteners", description: "3/4\" EMT C Conduit Body",                unit: "EA", unitPrice: 4.80 },
  { id: "sup-body-c-1",           category: "Supports & Fasteners", description: "1\" EMT C Conduit Body",                  unit: "EA", unitPrice: 7.50 },
  { id: "sup-body-c-1-1/2",      category: "Supports & Fasteners", description: "1-1/2\" EMT C Conduit Body",              unit: "EA", unitPrice: 14.00 },
  { id: "sup-body-c-2",           category: "Supports & Fasteners", description: "2\" EMT C Conduit Body",                  unit: "EA", unitPrice: 22.00 },
  { id: "sup-body-lb-1/2",        category: "Supports & Fasteners", description: "1/2\" EMT LB Conduit Body",               unit: "EA", unitPrice: 3.80 },
  { id: "sup-body-lb-3/4",        category: "Supports & Fasteners", description: "3/4\" EMT LB Conduit Body",               unit: "EA", unitPrice: 5.20 },
  { id: "sup-body-lb-1",          category: "Supports & Fasteners", description: "1\" EMT LB Conduit Body",                 unit: "EA", unitPrice: 8.00 },
  { id: "sup-body-lb-1-1/2",     category: "Supports & Fasteners", description: "1-1/2\" EMT LB Conduit Body",             unit: "EA", unitPrice: 15.00 },
  { id: "sup-body-lb-2",          category: "Supports & Fasteners", description: "2\" EMT LB Conduit Body",                 unit: "EA", unitPrice: 24.00 },
  { id: "sup-body-t-1/2",         category: "Supports & Fasteners", description: "1/2\" EMT T Conduit Body",                unit: "EA", unitPrice: 4.20 },
  { id: "sup-body-t-3/4",         category: "Supports & Fasteners", description: "3/4\" EMT T Conduit Body",                unit: "EA", unitPrice: 5.80 },
  { id: "sup-body-t-1",           category: "Supports & Fasteners", description: "1\" EMT T Conduit Body",                  unit: "EA", unitPrice: 9.00 },

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVICES & TRIM (~100 items)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Receptacles ───────────────────────────────────────────────────────────
  { id: "dev-rec-15a-duplex",     category: "Devices & Trim", description: "15A 125V Duplex Receptacle White",           unit: "EA", unitPrice: 1.50 },
  { id: "dev-rec-20a-duplex",     category: "Devices & Trim", description: "20A 125V Duplex Receptacle White",           unit: "EA", unitPrice: 2.20 },
  { id: "dev-rec-15a-tamper",     category: "Devices & Trim", description: "15A TR Tamper-Resistant Receptacle White",   unit: "EA", unitPrice: 2.80 },
  { id: "dev-rec-20a-tamper",     category: "Devices & Trim", description: "20A TR Tamper-Resistant Receptacle White",   unit: "EA", unitPrice: 3.50 },
  { id: "dev-rec-15a-dec",        category: "Devices & Trim", description: "15A Decorator Receptacle White",             unit: "EA", unitPrice: 2.00 },
  { id: "dev-rec-20a-dec",        category: "Devices & Trim", description: "20A Decorator Receptacle White",             unit: "EA", unitPrice: 2.80 },
  { id: "dev-rec-20a-dec-tr",     category: "Devices & Trim", description: "20A TR Decorator Receptacle White",          unit: "EA", unitPrice: 3.80 },
  { id: "dev-rec-gfci-15a",       category: "Devices & Trim", description: "15A GFCI Receptacle White",                  unit: "EA", unitPrice: 12.00 },
  { id: "dev-rec-gfci-20a",       category: "Devices & Trim", description: "20A GFCI Receptacle White",                  unit: "EA", unitPrice: 14.00 },
  { id: "dev-rec-gfci-15a-dec",   category: "Devices & Trim", description: "15A GFCI Decorator Receptacle White",        unit: "EA", unitPrice: 14.00 },
  { id: "dev-rec-gfci-20a-dec",   category: "Devices & Trim", description: "20A GFCI Decorator Receptacle White",        unit: "EA", unitPrice: 16.00 },
  { id: "dev-rec-usb-c-15a",      category: "Devices & Trim", description: "15A USB-C Charging Receptacle White",        unit: "EA", unitPrice: 22.00 },
  { id: "dev-rec-usb-c-20a",      category: "Devices & Trim", description: "20A USB-C Charging Receptacle White",        unit: "EA", unitPrice: 26.00 },
  { id: "dev-rec-usb-ac-15a",     category: "Devices & Trim", description: "15A USB-A/C Combo Receptacle White",         unit: "EA", unitPrice: 18.00 },
  { id: "dev-rec-30a-dryer",      category: "Devices & Trim", description: "30A 250V Dryer Receptacle (3-wire)",         unit: "EA", unitPrice: 8.50 },
  { id: "dev-rec-30a-dryer-4w",   category: "Devices & Trim", description: "30A 250V Dryer Receptacle (4-wire)",         unit: "EA", unitPrice: 9.50 },
  { id: "dev-rec-50a-range",      category: "Devices & Trim", description: "50A 250V Range Receptacle (4-wire)",         unit: "EA", unitPrice: 12.00 },
  { id: "dev-rec-20a-twist",      category: "Devices & Trim", description: "20A 125V Twist-Lock Receptacle",             unit: "EA", unitPrice: 18.00 },
  { id: "dev-rec-30a-twist",      category: "Devices & Trim", description: "30A 250V Twist-Lock Receptacle",             unit: "EA", unitPrice: 22.00 },
  { id: "dev-rec-ev-50a",         category: "Devices & Trim", description: "50A 250V EV Charging Receptacle NEMA 14-50", unit: "EA", unitPrice: 18.00 },

  // ── Switches ──────────────────────────────────────────────────────────────
  { id: "dev-sw-sp-15a",          category: "Devices & Trim", description: "15A Single-Pole Switch White",               unit: "EA", unitPrice: 1.80 },
  { id: "dev-sw-sp-20a",          category: "Devices & Trim", description: "20A Single-Pole Switch White",               unit: "EA", unitPrice: 2.50 },
  { id: "dev-sw-3way-15a",        category: "Devices & Trim", description: "15A 3-Way Switch White",                     unit: "EA", unitPrice: 2.80 },
  { id: "dev-sw-3way-20a",        category: "Devices & Trim", description: "20A 3-Way Switch White",                     unit: "EA", unitPrice: 3.80 },
  { id: "dev-sw-4way-15a",        category: "Devices & Trim", description: "15A 4-Way Switch White",                     unit: "EA", unitPrice: 5.50 },
  { id: "dev-sw-sp-dec",          category: "Devices & Trim", description: "15A Single-Pole Decorator Switch White",     unit: "EA", unitPrice: 2.50 },
  { id: "dev-sw-3way-dec",        category: "Devices & Trim", description: "15A 3-Way Decorator Switch White",           unit: "EA", unitPrice: 3.50 },
  { id: "dev-sw-dimmer-sp",       category: "Devices & Trim", description: "Single-Pole LED Dimmer Switch White",        unit: "EA", unitPrice: 18.00 },
  { id: "dev-sw-dimmer-3way",     category: "Devices & Trim", description: "3-Way LED Dimmer Switch White",              unit: "EA", unitPrice: 22.00 },
  { id: "dev-sw-fan-speed",       category: "Devices & Trim", description: "Ceiling Fan Speed Control White",            unit: "EA", unitPrice: 14.00 },
  { id: "dev-sw-motion-sp",       category: "Devices & Trim", description: "Single-Pole Motion Sensor Switch White",     unit: "EA", unitPrice: 22.00 },
  { id: "dev-sw-timer",           category: "Devices & Trim", description: "In-Wall Digital Timer Switch White",         unit: "EA", unitPrice: 28.00 },

  // ── Wall Plates / Covers ──────────────────────────────────────────────────
  { id: "dev-plate-1g-blank",     category: "Devices & Trim", description: "1-Gang Blank Wall Plate White",              unit: "EA", unitPrice: 0.55 },
  { id: "dev-plate-1g-sw",        category: "Devices & Trim", description: "1-Gang Switch Wall Plate White",             unit: "EA", unitPrice: 0.55 },
  { id: "dev-plate-1g-dup",       category: "Devices & Trim", description: "1-Gang Duplex Receptacle Wall Plate White",  unit: "EA", unitPrice: 0.55 },
  { id: "dev-plate-1g-dec",       category: "Devices & Trim", description: "1-Gang Decorator Wall Plate White",          unit: "EA", unitPrice: 0.65 },
  { id: "dev-plate-2g-blank",     category: "Devices & Trim", description: "2-Gang Blank Wall Plate White",              unit: "EA", unitPrice: 0.85 },
  { id: "dev-plate-2g-sw",        category: "Devices & Trim", description: "2-Gang Switch Wall Plate White",             unit: "EA", unitPrice: 0.85 },
  { id: "dev-plate-2g-dup",       category: "Devices & Trim", description: "2-Gang Duplex Receptacle Wall Plate White",  unit: "EA", unitPrice: 0.85 },
  { id: "dev-plate-2g-dec",       category: "Devices & Trim", description: "2-Gang Decorator Wall Plate White",          unit: "EA", unitPrice: 0.95 },
  { id: "dev-plate-3g-dec",       category: "Devices & Trim", description: "3-Gang Decorator Wall Plate White",          unit: "EA", unitPrice: 1.20 },
  { id: "dev-plate-4g-dec",       category: "Devices & Trim", description: "4-Gang Decorator Wall Plate White",          unit: "EA", unitPrice: 1.65 },
  { id: "dev-plate-1g-screwless", category: "Devices & Trim", description: "1-Gang Screwless Decorator Wall Plate White", unit: "EA", unitPrice: 1.80 },
  { id: "dev-plate-2g-screwless", category: "Devices & Trim", description: "2-Gang Screwless Decorator Wall Plate White", unit: "EA", unitPrice: 2.50 },

  // ── LED Lighting ──────────────────────────────────────────────────────────
  { id: "dev-led-wafer-4in",      category: "Devices & Trim", description: "4\" LED Wafer Light 9W 650lm",               unit: "EA", unitPrice: 12.00 },
  { id: "dev-led-wafer-6in",      category: "Devices & Trim", description: "6\" LED Wafer Light 12W 900lm",              unit: "EA", unitPrice: 14.00 },
  { id: "dev-led-wafer-4in-cct",  category: "Devices & Trim", description: "4\" LED Wafer Light CCT Selectable 9W",      unit: "EA", unitPrice: 16.00 },
  { id: "dev-led-wafer-6in-cct",  category: "Devices & Trim", description: "6\" LED Wafer Light CCT Selectable 12W",     unit: "EA", unitPrice: 18.00 },
  { id: "dev-led-can-4in",        category: "Devices & Trim", description: "4\" LED Recessed Can Retrofit Kit",          unit: "EA", unitPrice: 18.00 },
  { id: "dev-led-can-6in",        category: "Devices & Trim", description: "6\" LED Recessed Can Retrofit Kit",          unit: "EA", unitPrice: 22.00 },
  { id: "dev-led-strip-12v",      category: "Devices & Trim", description: "LED Strip Light 12V 16ft Roll",              unit: "EA", unitPrice: 22.00 },
  { id: "dev-led-exit",           category: "Devices & Trim", description: "LED Exit Sign Red Letters",                  unit: "EA", unitPrice: 28.00 },
  { id: "dev-led-emerg",          category: "Devices & Trim", description: "LED Emergency Light Twin Head",              unit: "EA", unitPrice: 38.00 },
  { id: "dev-led-vapor-2ft",      category: "Devices & Trim", description: "2ft LED Vapor Tight Fixture 20W",            unit: "EA", unitPrice: 32.00 },
  { id: "dev-led-vapor-4ft",      category: "Devices & Trim", description: "4ft LED Vapor Tight Fixture 40W",            unit: "EA", unitPrice: 48.00 },
  { id: "dev-led-shoplight-4ft",  category: "Devices & Trim", description: "4ft LED Shop Light 40W Linkable",            unit: "EA", unitPrice: 28.00 },
  { id: "dev-led-highbay-100w",   category: "Devices & Trim", description: "100W LED High Bay Light",                    unit: "EA", unitPrice: 65.00 },
  { id: "dev-led-highbay-150w",   category: "Devices & Trim", description: "150W LED High Bay Light",                    unit: "EA", unitPrice: 85.00 },
  { id: "dev-led-highbay-200w",   category: "Devices & Trim", description: "200W LED High Bay Light",                    unit: "EA", unitPrice: 110.00 },
  { id: "dev-led-flood-50w",      category: "Devices & Trim", description: "50W LED Flood Light Outdoor",                unit: "EA", unitPrice: 38.00 },
  { id: "dev-led-flood-100w",     category: "Devices & Trim", description: "100W LED Flood Light Outdoor",               unit: "EA", unitPrice: 55.00 },

  // ═══════════════════════════════════════════════════════════════════════════
  // CIVIL & MISC (~50 items)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Grounding ─────────────────────────────────────────────────────────────
  { id: "civ-gnd-rod-5/8-8ft",    category: "Civil & Misc", description: "5/8\" x 8ft Copper-Clad Ground Rod",           unit: "EA", unitPrice: 18.00 },
  { id: "civ-gnd-rod-5/8-10ft",   category: "Civil & Misc", description: "5/8\" x 10ft Copper-Clad Ground Rod",          unit: "EA", unitPrice: 22.00 },
  { id: "civ-gnd-rod-3/4-10ft",   category: "Civil & Misc", description: "3/4\" x 10ft Copper-Clad Ground Rod",          unit: "EA", unitPrice: 28.00 },
  { id: "civ-gnd-clamp-5/8",      category: "Civil & Misc", description: "5/8\" Ground Rod Clamp",                       unit: "EA", unitPrice: 2.80 },
  { id: "civ-gnd-clamp-3/4",      category: "Civil & Misc", description: "3/4\" Ground Rod Clamp",                       unit: "EA", unitPrice: 3.50 },
  { id: "civ-gnd-clamp-water",    category: "Civil & Misc", description: "Water Pipe Ground Clamp 1\" Pipe",              unit: "EA", unitPrice: 4.50 },
  { id: "civ-gnd-clamp-water-2",  category: "Civil & Misc", description: "Water Pipe Ground Clamp 2\" Pipe",              unit: "EA", unitPrice: 6.50 },
  { id: "civ-gnd-acorn-6",        category: "Civil & Misc", description: "Acorn Ground Clamp #6 AWG",                    unit: "EA", unitPrice: 1.80 },
  { id: "civ-gnd-acorn-2",        category: "Civil & Misc", description: "Acorn Ground Clamp #2 AWG",                    unit: "EA", unitPrice: 2.50 },
  { id: "civ-gnd-lug-4/0",        category: "Civil & Misc", description: "4/0 AWG Ground Lug",                           unit: "EA", unitPrice: 4.50 },
  { id: "civ-gnd-bar",            category: "Civil & Misc", description: "Ground Bar 14-Position",                       unit: "EA", unitPrice: 12.00 },
  { id: "civ-gnd-irreversible",   category: "Civil & Misc", description: "Irreversible Compression Lug 2/0 AWG",         unit: "EA", unitPrice: 3.80 },

  // ── Marking & Identification ──────────────────────────────────────────────
  { id: "civ-tape-caution",       category: "Civil & Misc", description: "Caution Tape Yellow/Black 1000ft",              unit: "RL", unitPrice: 12.00 },
  { id: "civ-tape-warning-elec",  category: "Civil & Misc", description: "Underground Electrical Warning Tape 1000ft",   unit: "RL", unitPrice: 18.00 },
  { id: "civ-tape-warning-gas",   category: "Civil & Misc", description: "Underground Gas Warning Tape 1000ft",          unit: "RL", unitPrice: 18.00 },
  { id: "civ-marker-conduit",     category: "Civil & Misc", description: "Conduit Marker Labels (100-pack)",             unit: "PK", unitPrice: 8.00 },
  { id: "civ-marker-panel",       category: "Civil & Misc", description: "Panel Directory Label Cards (10-pack)",        unit: "PK", unitPrice: 5.00 },
  { id: "civ-label-wire-14",      category: "Civil & Misc", description: "Wire Marker Labels #14 AWG (100-pack)",        unit: "PK", unitPrice: 6.50 },
  { id: "civ-label-wire-12",      category: "Civil & Misc", description: "Wire Marker Labels #12 AWG (100-pack)",        unit: "PK", unitPrice: 6.50 },
  { id: "civ-label-wire-10",      category: "Civil & Misc", description: "Wire Marker Labels #10 AWG (100-pack)",        unit: "PK", unitPrice: 6.50 },
  { id: "civ-lockout-hasp",       category: "Civil & Misc", description: "Lockout/Tagout Hasp",                          unit: "EA", unitPrice: 8.50 },
  { id: "civ-lockout-tag",        category: "Civil & Misc", description: "Lockout/Tagout Tag (25-pack)",                 unit: "PK", unitPrice: 9.00 },

  // ── Site Materials ────────────────────────────────────────────────────────
  { id: "civ-conduit-seal",       category: "Civil & Misc", description: "Conduit Sealing Compound 1 Quart",             unit: "EA", unitPrice: 18.00 },
  { id: "civ-duct-seal",          category: "Civil & Misc", description: "Duct Seal Compound 1 lb",                      unit: "EA", unitPrice: 4.50 },
  { id: "civ-duct-seal-5lb",      category: "Civil & Misc", description: "Duct Seal Compound 5 lb",                      unit: "EA", unitPrice: 14.00 },
  { id: "civ-foam-fire",          category: "Civil & Misc", description: "Firestop Foam Sealant 12oz",                   unit: "EA", unitPrice: 12.00 },
  { id: "civ-foam-fire-putty",    category: "Civil & Misc", description: "Firestop Putty Pad (10-pack)",                 unit: "PK", unitPrice: 22.00 },
  { id: "civ-sand-bag",           category: "Civil & Misc", description: "Sand Bag for Trench Backfill (50 lb)",         unit: "EA", unitPrice: 6.00 },
  { id: "civ-concrete-mix",       category: "Civil & Misc", description: "Concrete Mix 80 lb Bag",                       unit: "EA", unitPrice: 8.50 },
  { id: "civ-pvc-primer",         category: "Civil & Misc", description: "PVC Primer 1/4 Pint",                          unit: "EA", unitPrice: 3.50 },
  { id: "civ-anti-ox",            category: "Civil & Misc", description: "Anti-Oxidant Compound 8oz (aluminum connections)", unit: "EA", unitPrice: 6.50 },
  { id: "civ-penetration-seal",   category: "Civil & Misc", description: "Conduit Penetration Seal 1/2\" (10-pack)",     unit: "PK", unitPrice: 12.00 },
  { id: "civ-junction-cover",     category: "Civil & Misc", description: "Junction Box Blank Cover 4\"",                 unit: "EA", unitPrice: 1.20 },
  { id: "civ-knockout-plug-1/2",  category: "Civil & Misc", description: "1/2\" Knockout Plug (100-pack)",               unit: "BX", unitPrice: 6.00 },
  { id: "civ-knockout-plug-3/4",  category: "Civil & Misc", description: "3/4\" Knockout Plug (100-pack)",               unit: "BX", unitPrice: 7.00 },
  { id: "civ-knockout-plug-1",    category: "Civil & Misc", description: "1\" Knockout Plug (50-pack)",                  unit: "BX", unitPrice: 7.50 },
  { id: "civ-knockout-plug-2",    category: "Civil & Misc", description: "2\" Knockout Plug (25-pack)",                  unit: "BX", unitPrice: 8.00 },
  { id: "civ-reducing-washer",    category: "Civil & Misc", description: "Reducing Washer 1\" to 1/2\" (25-pack)",       unit: "BX", unitPrice: 5.00 },
  { id: "civ-cord-grip-1/2",      category: "Civil & Misc", description: "1/2\" Strain Relief Cord Grip",                unit: "EA", unitPrice: 1.80 },
  { id: "civ-cord-grip-3/4",      category: "Civil & Misc", description: "3/4\" Strain Relief Cord Grip",                unit: "EA", unitPrice: 2.20 },
  { id: "civ-cord-grip-1",        category: "Civil & Misc", description: "1\" Strain Relief Cord Grip",                  unit: "EA", unitPrice: 3.20 },
];

// ─── Lookup helpers ────────────────────────────────────────────────────────────

export function searchCatalog(query: string, limit = 20): CatalogItem[] {
  const q = query.toLowerCase();
  return CATALOG.filter(
    (i) =>
      i.description.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      i.id.toLowerCase().includes(q)
  ).slice(0, limit);
}

export function getCatalogItem(id: string): CatalogItem | undefined {
  return CATALOG.find((i) => i.id === id);
}

/**
 * Look up the per-foot price for a conduit type + size combination.
 * Returns null if no matching item is found.
 */
export function getConduitPricePerFoot(
  conduitType: string,
  conduitSize: string
): number | null {
  // Normalize conduit type to a catalog prefix
  const typeMap: Record<string, string> = {
    EMT: "cnd-emt",
    RMC: "cnd-rmc",
    GRC: "cnd-rmc",
    "PVC-40": "cnd-pvc40",
    "PVC-80": "cnd-pvc80",
    PVC: "cnd-pvc40",
    FMC: "cnd-fmc",
    LFMC: "cnd-lfmc",
  };
  const prefix = typeMap[conduitType.toUpperCase()] ?? `cnd-${conduitType.toLowerCase()}`;
  const sizeNorm = conduitSize.replace(/"/g, "").trim();
  const id = `${prefix}-${sizeNorm}-ft`;
  const item = getCatalogItem(id);
  return item ? item.unitPrice : null;
}

/**
 * Look up the per-foot price for a wire type + AWG combination.
 * Returns null if no matching item is found.
 */
export function getWirePricePerFoot(
  wireType: string,
  conductorSize: string,
  conductorMaterial: string = "CU"
): number | null {
  const mat = conductorMaterial.toUpperCase() === "AL" ? "al" : "cu";
  const sizeNorm = conductorSize.replace(/\s/g, "").toLowerCase();

  // THHN/THWN
  if (wireType.toUpperCase().includes("THHN") || wireType.toUpperCase().includes("THWN")) {
    const id = `wir-thhn-${sizeNorm}${mat}`;
    const item = getCatalogItem(id);
    return item ? item.unitPrice : null;
  }
  // NM-B (Romex) — sizeNorm should be like "14-2", "12-3"
  if (wireType.toUpperCase().includes("NM") || wireType.toUpperCase().includes("ROMEX")) {
    const id = `wir-nmb-${sizeNorm}`;
    const item = getCatalogItem(id);
    return item ? item.unitPrice : null;
  }
  // MC Cable
  if (wireType.toUpperCase().includes("MC")) {
    const id = `wir-mc-${sizeNorm}`;
    const item = getCatalogItem(id);
    return item ? item.unitPrice : null;
  }
  return null;
}
