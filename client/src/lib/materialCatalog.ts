/**
 * BidPhase — Master Electrical Material Catalog
 *
 * 1,000+ item master catalog covering commercial, residential, and civil:
 *   - Distribution (panels, breakers, disconnects, meter bases, transfer switches)
 *   - Conduit & Fittings (EMT, RMC/GRC, PVC Sch40/80, FMC, LFMC, LFNC, ENT)
 *   - Wire & Cable (THHN/THWN-2, NM-B, MC, SE/SER, URD, USE-2, low-voltage)
 *   - Boxes & Enclosures (outlet, junction, pull, weatherproof, handy, FS/FD)
 *   - Supports & Fasteners (strut, threaded rod, clamps, staples, wire nuts, tape)
 *   - Devices & Trim (receptacles, switches, GFCI, AFCI, USB, dimmers, plates)
 *   - Lighting (LED wafers, vapor tights, exit/emergency, outdoor, commercial)
 *   - Low Voltage & Data (conduit, boxes, patch panels, structured wiring)
 *   - Civil & Misc (ground rods, clamps, marking tape, duct seal, site materials)
 *
 * Prices are typical US distributor list prices (2025).
 * These are DEFAULT prices — users override them via the Material Database page.
 *
 * ID prefixes:
 *   dist-  = Distribution
 *   cnd-   = Conduit
 *   fit-   = Conduit Fittings
 *   wir-   = Wire & Cable
 *   box-   = Boxes & Enclosures
 *   sup-   = Supports & Fasteners
 *   dev-   = Devices & Trim
 *   lgt-   = Lighting
 *   lv-    = Low Voltage & Data
 *   civ-   = Civil & Misc
 */

export interface CatalogItem {
  id: string;
  category: string;
  description: string;
  unit: string;
  unitPrice: number;
  /** Optional trade slang / brand aliases for smart search */
  searchAliases?: string;
}

export const CATALOG: CatalogItem[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // DISTRIBUTION — Load Centers, Panels, Breakers, Disconnects, Meter Bases
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Square D QO Load Centers ─────────────────────────────────────────────
  { id: "dist-sqd-qo-100a-20sp",   category: "Distribution", description: "Square D QO 100A 20-Space 40-Circuit Indoor Load Center",      unit: "EA", unitPrice: 89.00, searchAliases: "panel breaker panel load center 100 amp QO" },
  { id: "dist-sqd-qo-100a-24sp",   category: "Distribution", description: "Square D QO 100A 24-Space 48-Circuit Indoor Load Center",      unit: "EA", unitPrice: 105.00 },
  { id: "dist-sqd-qo-150a-30sp",   category: "Distribution", description: "Square D QO 150A 30-Space 60-Circuit Indoor Load Center",      unit: "EA", unitPrice: 145.00 },
  { id: "dist-sqd-qo-200a-40sp",   category: "Distribution", description: "Square D QO 200A 40-Space 80-Circuit Indoor Load Center",      unit: "EA", unitPrice: 185.00, searchAliases: "panel breaker panel load center 200 amp QO main panel" },
  { id: "dist-sqd-qo-200a-42sp",   category: "Distribution", description: "Square D QO 200A 42-Space 84-Circuit Indoor Load Center",      unit: "EA", unitPrice: 210.00 },
  { id: "dist-sqd-qo-200a-54sp",   category: "Distribution", description: "Square D QO 200A 54-Space Indoor Load Center",                 unit: "EA", unitPrice: 265.00 },
  { id: "dist-sqd-qo-100a-20sp-oh",category: "Distribution", description: "Square D QO 100A 20-Space Overhead/Underground Load Center",   unit: "EA", unitPrice: 115.00 },
  { id: "dist-sqd-qo-200a-40sp-oh",category: "Distribution", description: "Square D QO 200A 40-Space Overhead/Underground Load Center",   unit: "EA", unitPrice: 235.00 },
  { id: "dist-sqd-qo-200a-40sp-nema3r", category: "Distribution", description: "Square D QO 200A 40-Space NEMA 3R Outdoor Load Center",   unit: "EA", unitPrice: 295.00 },

  // ── Square D Homeline Load Centers ───────────────────────────────────────
  { id: "dist-sqd-hom-100a-20sp",  category: "Distribution", description: "Square D Homeline 100A 20-Space Indoor Load Center",           unit: "EA", unitPrice: 72.00 },
  { id: "dist-sqd-hom-100a-24sp",  category: "Distribution", description: "Square D Homeline 100A 24-Space Indoor Load Center",           unit: "EA", unitPrice: 85.00 },
  { id: "dist-sqd-hom-150a-30sp",  category: "Distribution", description: "Square D Homeline 150A 30-Space Indoor Load Center",           unit: "EA", unitPrice: 115.00 },
  { id: "dist-sqd-hom-200a-40sp",  category: "Distribution", description: "Square D Homeline 200A 40-Space Indoor Load Center",           unit: "EA", unitPrice: 155.00 },
  { id: "dist-sqd-hom-200a-40sp-oh",category: "Distribution", description: "Square D Homeline 200A 40-Space OH/UG Load Center",           unit: "EA", unitPrice: 195.00 },

  // ── Square D QO Breakers — 1-Pole Standard ───────────────────────────────
  { id: "dist-sqd-qo-1p-15a",      category: "Distribution", description: "Square D QO 15A 1-Pole Circuit Breaker",                      unit: "EA", unitPrice: 8.50 },
  { id: "dist-sqd-qo-1p-20a",      category: "Distribution", description: "Square D QO 20A 1-Pole Circuit Breaker",                      unit: "EA", unitPrice: 8.50 },
  { id: "dist-sqd-qo-1p-25a",      category: "Distribution", description: "Square D QO 25A 1-Pole Circuit Breaker",                      unit: "EA", unitPrice: 9.00 },
  { id: "dist-sqd-qo-1p-30a",      category: "Distribution", description: "Square D QO 30A 1-Pole Circuit Breaker",                      unit: "EA", unitPrice: 9.00 },
  { id: "dist-sqd-qo-1p-40a",      category: "Distribution", description: "Square D QO 40A 1-Pole Circuit Breaker",                      unit: "EA", unitPrice: 10.00 },
  { id: "dist-sqd-qo-1p-50a",      category: "Distribution", description: "Square D QO 50A 1-Pole Circuit Breaker",                      unit: "EA", unitPrice: 11.00 },
  { id: "dist-sqd-qo-1p-60a",      category: "Distribution", description: "Square D QO 60A 1-Pole Circuit Breaker",                      unit: "EA", unitPrice: 12.00 },

  // ── Square D QO Breakers — 2-Pole Standard ───────────────────────────────
  { id: "dist-sqd-qo-2p-15a",      category: "Distribution", description: "Square D QO 15A 2-Pole Circuit Breaker",                      unit: "EA", unitPrice: 14.00 },
  { id: "dist-sqd-qo-2p-20a",      category: "Distribution", description: "Square D QO 20A 2-Pole Circuit Breaker",                      unit: "EA", unitPrice: 14.00 },
  { id: "dist-sqd-qo-2p-30a",      category: "Distribution", description: "Square D QO 30A 2-Pole Circuit Breaker",                      unit: "EA", unitPrice: 15.00 },
  { id: "dist-sqd-qo-2p-40a",      category: "Distribution", description: "Square D QO 40A 2-Pole Circuit Breaker",                      unit: "EA", unitPrice: 16.00 },
  { id: "dist-sqd-qo-2p-50a",      category: "Distribution", description: "Square D QO 50A 2-Pole Circuit Breaker",                      unit: "EA", unitPrice: 18.00 },
  { id: "dist-sqd-qo-2p-60a",      category: "Distribution", description: "Square D QO 60A 2-Pole Circuit Breaker",                      unit: "EA", unitPrice: 20.00 },
  { id: "dist-sqd-qo-2p-70a",      category: "Distribution", description: "Square D QO 70A 2-Pole Circuit Breaker",                      unit: "EA", unitPrice: 22.00 },
  { id: "dist-sqd-qo-2p-100a",     category: "Distribution", description: "Square D QO 100A 2-Pole Circuit Breaker",                     unit: "EA", unitPrice: 32.00 },
  { id: "dist-sqd-qo-2p-125a",     category: "Distribution", description: "Square D QO 125A 2-Pole Circuit Breaker",                     unit: "EA", unitPrice: 48.00 },
  { id: "dist-sqd-qo-2p-150a",     category: "Distribution", description: "Square D QO 150A 2-Pole Circuit Breaker",                     unit: "EA", unitPrice: 58.00 },
  { id: "dist-sqd-qo-2p-200a",     category: "Distribution", description: "Square D QO 200A 2-Pole Circuit Breaker",                     unit: "EA", unitPrice: 75.00 },

  // ── Square D QO GFCI Breakers ────────────────────────────────────────────
  { id: "dist-sqd-qo-1p-15a-gfci", category: "Distribution", description: "Square D QO 15A 1-Pole GFCI Breaker",                        unit: "EA", unitPrice: 42.00 },
  { id: "dist-sqd-qo-1p-20a-gfci", category: "Distribution", description: "Square D QO 20A 1-Pole GFCI Breaker",                        unit: "EA", unitPrice: 42.00 },
  { id: "dist-sqd-qo-2p-20a-gfci", category: "Distribution", description: "Square D QO 20A 2-Pole GFCI Breaker",                        unit: "EA", unitPrice: 68.00 },
  { id: "dist-sqd-qo-2p-30a-gfci", category: "Distribution", description: "Square D QO 30A 2-Pole GFCI Breaker",                        unit: "EA", unitPrice: 72.00 },
  { id: "dist-sqd-qo-2p-50a-gfci", category: "Distribution", description: "Square D QO 50A 2-Pole GFCI Breaker",                        unit: "EA", unitPrice: 95.00 },
  { id: "dist-sqd-qo-2p-60a-gfci", category: "Distribution", description: "Square D QO 60A 2-Pole GFCI Breaker",                        unit: "EA", unitPrice: 110.00 },

  // ── Square D QO AFCI Breakers ────────────────────────────────────────────
  { id: "dist-sqd-qo-1p-15a-afci", category: "Distribution", description: "Square D QO 15A 1-Pole AFCI Breaker",                        unit: "EA", unitPrice: 38.00 },
  { id: "dist-sqd-qo-1p-20a-afci", category: "Distribution", description: "Square D QO 20A 1-Pole AFCI Breaker",                        unit: "EA", unitPrice: 38.00 },
  { id: "dist-sqd-qo-2p-15a-afci", category: "Distribution", description: "Square D QO 15A 2-Pole AFCI Breaker",                        unit: "EA", unitPrice: 62.00 },
  { id: "dist-sqd-qo-2p-20a-afci", category: "Distribution", description: "Square D QO 20A 2-Pole AFCI Breaker",                        unit: "EA", unitPrice: 62.00 },

  // ── Square D QO Dual Function (AFCI+GFCI) ────────────────────────────────
  { id: "dist-sqd-qo-1p-15a-df",   category: "Distribution", description: "Square D QO 15A 1-Pole Dual Function AFCI+GFCI Breaker",     unit: "EA", unitPrice: 55.00 },
  { id: "dist-sqd-qo-1p-20a-df",   category: "Distribution", description: "Square D QO 20A 1-Pole Dual Function AFCI+GFCI Breaker",     unit: "EA", unitPrice: 55.00 },
  { id: "dist-sqd-qo-2p-20a-df",   category: "Distribution", description: "Square D QO 20A 2-Pole Dual Function AFCI+GFCI Breaker",     unit: "EA", unitPrice: 88.00 },

  // ── Square D Homeline Breakers ────────────────────────────────────────────
  { id: "dist-sqd-hom-1p-15a",     category: "Distribution", description: "Square D Homeline 15A 1-Pole Breaker",                       unit: "EA", unitPrice: 6.50 },
  { id: "dist-sqd-hom-1p-20a",     category: "Distribution", description: "Square D Homeline 20A 1-Pole Breaker",                       unit: "EA", unitPrice: 6.50 },
  { id: "dist-sqd-hom-1p-30a",     category: "Distribution", description: "Square D Homeline 30A 1-Pole Breaker",                       unit: "EA", unitPrice: 7.50 },
  { id: "dist-sqd-hom-2p-20a",     category: "Distribution", description: "Square D Homeline 20A 2-Pole Breaker",                       unit: "EA", unitPrice: 12.00 },
  { id: "dist-sqd-hom-2p-30a",     category: "Distribution", description: "Square D Homeline 30A 2-Pole Breaker",                       unit: "EA", unitPrice: 12.00 },
  { id: "dist-sqd-hom-2p-40a",     category: "Distribution", description: "Square D Homeline 40A 2-Pole Breaker",                       unit: "EA", unitPrice: 14.00 },
  { id: "dist-sqd-hom-2p-50a",     category: "Distribution", description: "Square D Homeline 50A 2-Pole Breaker",                       unit: "EA", unitPrice: 15.00 },
  { id: "dist-sqd-hom-2p-60a",     category: "Distribution", description: "Square D Homeline 60A 2-Pole Breaker",                       unit: "EA", unitPrice: 17.00 },
  { id: "dist-sqd-hom-2p-100a",    category: "Distribution", description: "Square D Homeline 100A 2-Pole Breaker",                      unit: "EA", unitPrice: 28.00 },
  { id: "dist-sqd-hom-1p-20a-gfci",category: "Distribution", description: "Square D Homeline 20A 1-Pole GFCI Breaker",                  unit: "EA", unitPrice: 38.00 },
  { id: "dist-sqd-hom-1p-20a-afci",category: "Distribution", description: "Square D Homeline 20A 1-Pole AFCI Breaker",                  unit: "EA", unitPrice: 35.00 },
  { id: "dist-sqd-hom-1p-20a-df",  category: "Distribution", description: "Square D Homeline 20A 1-Pole Dual Function Breaker",         unit: "EA", unitPrice: 52.00 },

  // ── Eaton BR Load Centers ─────────────────────────────────────────────────
  { id: "dist-eat-br-100a-20sp",   category: "Distribution", description: "Eaton BR 100A 20-Space Indoor Load Center",                   unit: "EA", unitPrice: 82.00 },
  { id: "dist-eat-br-100a-24sp",   category: "Distribution", description: "Eaton BR 100A 24-Space Indoor Load Center",                   unit: "EA", unitPrice: 98.00 },
  { id: "dist-eat-br-150a-30sp",   category: "Distribution", description: "Eaton BR 150A 30-Space Indoor Load Center",                   unit: "EA", unitPrice: 138.00 },
  { id: "dist-eat-br-200a-40sp",   category: "Distribution", description: "Eaton BR 200A 40-Space Indoor Load Center",                   unit: "EA", unitPrice: 175.00 },
  { id: "dist-eat-br-200a-40sp-nema3r", category: "Distribution", description: "Eaton BR 200A 40-Space NEMA 3R Outdoor Load Center",     unit: "EA", unitPrice: 285.00 },

  // ── Eaton BR Breakers ─────────────────────────────────────────────────────
  { id: "dist-eat-br-1p-15a",      category: "Distribution", description: "Eaton BR 15A 1-Pole Breaker",                                 unit: "EA", unitPrice: 7.00 },
  { id: "dist-eat-br-1p-20a",      category: "Distribution", description: "Eaton BR 20A 1-Pole Breaker",                                 unit: "EA", unitPrice: 7.00 },
  { id: "dist-eat-br-1p-30a",      category: "Distribution", description: "Eaton BR 30A 1-Pole Breaker",                                 unit: "EA", unitPrice: 8.00 },
  { id: "dist-eat-br-2p-20a",      category: "Distribution", description: "Eaton BR 20A 2-Pole Breaker",                                 unit: "EA", unitPrice: 13.00 },
  { id: "dist-eat-br-2p-30a",      category: "Distribution", description: "Eaton BR 30A 2-Pole Breaker",                                 unit: "EA", unitPrice: 13.00 },
  { id: "dist-eat-br-2p-40a",      category: "Distribution", description: "Eaton BR 40A 2-Pole Breaker",                                 unit: "EA", unitPrice: 15.00 },
  { id: "dist-eat-br-2p-50a",      category: "Distribution", description: "Eaton BR 50A 2-Pole Breaker",                                 unit: "EA", unitPrice: 17.00 },
  { id: "dist-eat-br-2p-60a",      category: "Distribution", description: "Eaton BR 60A 2-Pole Breaker",                                 unit: "EA", unitPrice: 19.00 },
  { id: "dist-eat-br-2p-100a",     category: "Distribution", description: "Eaton BR 100A 2-Pole Breaker",                                unit: "EA", unitPrice: 30.00 },
  { id: "dist-eat-br-1p-20a-gfci", category: "Distribution", description: "Eaton BR 20A 1-Pole GFCI Breaker",                           unit: "EA", unitPrice: 40.00 },
  { id: "dist-eat-br-2p-30a-gfci", category: "Distribution", description: "Eaton BR 30A 2-Pole GFCI Breaker",                           unit: "EA", unitPrice: 70.00 },
  { id: "dist-eat-br-1p-20a-afci", category: "Distribution", description: "Eaton BR 20A 1-Pole AFCI Breaker",                           unit: "EA", unitPrice: 36.00 },
  { id: "dist-eat-br-1p-20a-df",   category: "Distribution", description: "Eaton BR 20A 1-Pole Dual Function Breaker",                  unit: "EA", unitPrice: 53.00 },

  // ── Siemens Load Centers ──────────────────────────────────────────────────
  { id: "dist-sie-100a-20sp",      category: "Distribution", description: "Siemens 100A 20-Space Indoor Load Center",                    unit: "EA", unitPrice: 80.00 },
  { id: "dist-sie-100a-24sp",      category: "Distribution", description: "Siemens 100A 24-Space Indoor Load Center",                    unit: "EA", unitPrice: 95.00 },
  { id: "dist-sie-200a-40sp",      category: "Distribution", description: "Siemens 200A 40-Space Indoor Load Center",                    unit: "EA", unitPrice: 170.00 },
  { id: "dist-sie-200a-40sp-nema3r",category: "Distribution", description: "Siemens 200A 40-Space NEMA 3R Outdoor Load Center",          unit: "EA", unitPrice: 278.00 },

  // ── Siemens Breakers ──────────────────────────────────────────────────────
  { id: "dist-sie-1p-15a",         category: "Distribution", description: "Siemens QP 15A 1-Pole Breaker",                               unit: "EA", unitPrice: 6.50 },
  { id: "dist-sie-1p-20a",         category: "Distribution", description: "Siemens QP 20A 1-Pole Breaker",                               unit: "EA", unitPrice: 6.50 },
  { id: "dist-sie-1p-30a",         category: "Distribution", description: "Siemens QP 30A 1-Pole Breaker",                               unit: "EA", unitPrice: 7.50 },
  { id: "dist-sie-2p-20a",         category: "Distribution", description: "Siemens QP 20A 2-Pole Breaker",                               unit: "EA", unitPrice: 12.00 },
  { id: "dist-sie-2p-30a",         category: "Distribution", description: "Siemens QP 30A 2-Pole Breaker",                               unit: "EA", unitPrice: 12.00 },
  { id: "dist-sie-2p-40a",         category: "Distribution", description: "Siemens QP 40A 2-Pole Breaker",                               unit: "EA", unitPrice: 14.00 },
  { id: "dist-sie-2p-50a",         category: "Distribution", description: "Siemens QP 50A 2-Pole Breaker",                               unit: "EA", unitPrice: 16.00 },
  { id: "dist-sie-2p-60a",         category: "Distribution", description: "Siemens QP 60A 2-Pole Breaker",                               unit: "EA", unitPrice: 18.00 },
  { id: "dist-sie-2p-100a",        category: "Distribution", description: "Siemens QP 100A 2-Pole Breaker",                              unit: "EA", unitPrice: 29.00 },
  { id: "dist-sie-1p-20a-gfci",    category: "Distribution", description: "Siemens QF 20A 1-Pole GFCI Breaker",                         unit: "EA", unitPrice: 39.00 },
  { id: "dist-sie-2p-30a-gfci",    category: "Distribution", description: "Siemens QF 30A 2-Pole GFCI Breaker",                         unit: "EA", unitPrice: 68.00 },
  { id: "dist-sie-1p-20a-afci",    category: "Distribution", description: "Siemens QA 20A 1-Pole AFCI Breaker",                         unit: "EA", unitPrice: 36.00 },
  { id: "dist-sie-1p-20a-df",      category: "Distribution", description: "Siemens QDF 20A 1-Pole Dual Function Breaker",               unit: "EA", unitPrice: 52.00 },

  // ── Commercial Panel Boards (Square D NQ/NF) ─────────────────────────────
  { id: "dist-sqd-nq-100a-42ckt",  category: "Distribution", description: "Square D NQ 100A 42-Circuit 3-Phase 4W Panelboard",          unit: "EA", unitPrice: 485.00 },
  { id: "dist-sqd-nq-225a-42ckt",  category: "Distribution", description: "Square D NQ 225A 42-Circuit 3-Phase 4W Panelboard",          unit: "EA", unitPrice: 685.00 },
  { id: "dist-sqd-nq-400a-42ckt",  category: "Distribution", description: "Square D NQ 400A 42-Circuit 3-Phase 4W Panelboard",          unit: "EA", unitPrice: 985.00 },
  { id: "dist-sqd-nf-100a-42ckt",  category: "Distribution", description: "Square D NF 100A 42-Circuit 1-Phase 3W Panelboard",          unit: "EA", unitPrice: 385.00 },

  // ── Commercial Breakers (Square D KQ/HQ) ─────────────────────────────────
  { id: "dist-sqd-kq-3p-20a",      category: "Distribution", description: "Square D KQ 20A 3-Pole Commercial Breaker",                  unit: "EA", unitPrice: 45.00 },
  { id: "dist-sqd-kq-3p-30a",      category: "Distribution", description: "Square D KQ 30A 3-Pole Commercial Breaker",                  unit: "EA", unitPrice: 48.00 },
  { id: "dist-sqd-kq-3p-40a",      category: "Distribution", description: "Square D KQ 40A 3-Pole Commercial Breaker",                  unit: "EA", unitPrice: 52.00 },
  { id: "dist-sqd-kq-3p-50a",      category: "Distribution", description: "Square D KQ 50A 3-Pole Commercial Breaker",                  unit: "EA", unitPrice: 58.00 },
  { id: "dist-sqd-kq-3p-60a",      category: "Distribution", description: "Square D KQ 60A 3-Pole Commercial Breaker",                  unit: "EA", unitPrice: 65.00 },
  { id: "dist-sqd-kq-3p-100a",     category: "Distribution", description: "Square D KQ 100A 3-Pole Commercial Breaker",                 unit: "EA", unitPrice: 95.00 },

  // ── Disconnects ───────────────────────────────────────────────────────────
  { id: "dist-disc-30a-nf",        category: "Distribution", description: "30A Non-Fusible AC Disconnect NEMA 3R",                      unit: "EA", unitPrice: 38.00 },
  { id: "dist-disc-60a-nf",        category: "Distribution", description: "60A Non-Fusible AC Disconnect NEMA 3R",                      unit: "EA", unitPrice: 52.00 },
  { id: "dist-disc-100a-nf",       category: "Distribution", description: "100A Non-Fusible AC Disconnect NEMA 3R",                     unit: "EA", unitPrice: 78.00 },
  { id: "dist-disc-200a-nf",       category: "Distribution", description: "200A Non-Fusible AC Disconnect NEMA 3R",                     unit: "EA", unitPrice: 145.00 },
  { id: "dist-disc-30a-fused",     category: "Distribution", description: "30A Fusible AC Disconnect NEMA 3R",                         unit: "EA", unitPrice: 48.00 },
  { id: "dist-disc-60a-fused",     category: "Distribution", description: "60A Fusible AC Disconnect NEMA 3R",                         unit: "EA", unitPrice: 65.00 },
  { id: "dist-disc-100a-fused",    category: "Distribution", description: "100A Fusible AC Disconnect NEMA 3R",                        unit: "EA", unitPrice: 95.00 },
  { id: "dist-disc-200a-fused",    category: "Distribution", description: "200A Fusible AC Disconnect NEMA 3R",                        unit: "EA", unitPrice: 165.00 },
  { id: "dist-disc-400a-fused",    category: "Distribution", description: "400A Fusible AC Disconnect NEMA 3R",                        unit: "EA", unitPrice: 385.00 },
  { id: "dist-disc-60a-3ph-nf",    category: "Distribution", description: "60A 3-Phase Non-Fusible Disconnect NEMA 3R",                unit: "EA", unitPrice: 85.00 },
  { id: "dist-disc-100a-3ph-nf",   category: "Distribution", description: "100A 3-Phase Non-Fusible Disconnect NEMA 3R",               unit: "EA", unitPrice: 125.00 },
  { id: "dist-disc-200a-3ph-nf",   category: "Distribution", description: "200A 3-Phase Non-Fusible Disconnect NEMA 3R",               unit: "EA", unitPrice: 195.00 },
  { id: "dist-disc-30a-safety",    category: "Distribution", description: "30A Safety Switch NEMA 1 Indoor",                           unit: "EA", unitPrice: 42.00 },
  { id: "dist-disc-60a-safety",    category: "Distribution", description: "60A Safety Switch NEMA 1 Indoor",                           unit: "EA", unitPrice: 58.00 },
  { id: "dist-disc-100a-safety",   category: "Distribution", description: "100A Safety Switch NEMA 1 Indoor",                          unit: "EA", unitPrice: 88.00 },

  // ── Meter Bases & Meter Combos ────────────────────────────────────────────
  { id: "dist-meter-100a-oh",      category: "Distribution", description: "100A Overhead Meter Base Ringless",                          unit: "EA", unitPrice: 65.00 },
  { id: "dist-meter-200a-oh",      category: "Distribution", description: "200A Overhead Meter Base Ringless",                          unit: "EA", unitPrice: 85.00 },
  { id: "dist-meter-200a-ug",      category: "Distribution", description: "200A Underground Meter Base Ringless",                       unit: "EA", unitPrice: 92.00 },
  { id: "dist-meter-320a-oh",      category: "Distribution", description: "320A Overhead Meter Base (200A + 200A)",                     unit: "EA", unitPrice: 145.00 },
  { id: "dist-meter-combo-100a",   category: "Distribution", description: "100A Meter Main Combo 20-Space NEMA 3R",                     unit: "EA", unitPrice: 185.00 },
  { id: "dist-meter-combo-200a",   category: "Distribution", description: "200A Meter Main Combo 40-Space NEMA 3R",                     unit: "EA", unitPrice: 295.00 },
  { id: "dist-meter-combo-200a-30sp", category: "Distribution", description: "200A Meter Main Combo 30-Space NEMA 3R",                  unit: "EA", unitPrice: 265.00 },
  { id: "dist-meter-ct-cabinet",   category: "Distribution", description: "CT Cabinet 200A 3-Phase Meter Socket",                      unit: "EA", unitPrice: 285.00 },

  // ── Transfer Switches ─────────────────────────────────────────────────────
  { id: "dist-xfer-100a-manual",   category: "Distribution", description: "100A Manual Transfer Switch 10-Circuit",                     unit: "EA", unitPrice: 285.00 },
  { id: "dist-xfer-200a-manual",   category: "Distribution", description: "200A Manual Transfer Switch 16-Circuit",                     unit: "EA", unitPrice: 425.00 },
  { id: "dist-xfer-100a-auto",     category: "Distribution", description: "100A Automatic Transfer Switch 120/240V",                    unit: "EA", unitPrice: 685.00 },
  { id: "dist-xfer-200a-auto",     category: "Distribution", description: "200A Automatic Transfer Switch 120/240V",                    unit: "EA", unitPrice: 985.00 },

  // ── Fuses ─────────────────────────────────────────────────────────────────
  { id: "dist-fuse-30a-class-rk5", category: "Distribution", description: "30A Class RK5 Fuse (2-pack)",                               unit: "PK", unitPrice: 8.50 },
  { id: "dist-fuse-60a-class-rk5", category: "Distribution", description: "60A Class RK5 Fuse (2-pack)",                               unit: "PK", unitPrice: 12.00 },
  { id: "dist-fuse-100a-class-rk5",category: "Distribution", description: "100A Class RK5 Fuse (2-pack)",                              unit: "PK", unitPrice: 18.00 },
  { id: "dist-fuse-200a-class-rk5",category: "Distribution", description: "200A Class RK5 Fuse (2-pack)",                              unit: "PK", unitPrice: 32.00 },
  { id: "dist-fuse-30a-class-j",   category: "Distribution", description: "30A Class J Time-Delay Fuse (2-pack)",                      unit: "PK", unitPrice: 14.00 },
  { id: "dist-fuse-60a-class-j",   category: "Distribution", description: "60A Class J Time-Delay Fuse (2-pack)",                      unit: "PK", unitPrice: 22.00 },
  { id: "dist-fuse-100a-class-j",  category: "Distribution", description: "100A Class J Time-Delay Fuse (2-pack)",                     unit: "PK", unitPrice: 35.00 },
  { id: "dist-fuse-200a-class-j",  category: "Distribution", description: "200A Class J Time-Delay Fuse (2-pack)",                     unit: "PK", unitPrice: 58.00 },
  { id: "dist-fuse-400a-class-l",  category: "Distribution", description: "400A Class L Time-Delay Fuse (2-pack)",                     unit: "PK", unitPrice: 125.00 },
  { id: "dist-fuse-15a-atm",       category: "Distribution", description: "15A ATM Mini Fuse (5-pack)",                                unit: "PK", unitPrice: 6.00 },
  { id: "dist-fuse-20a-atm",       category: "Distribution", description: "20A ATM Mini Fuse (5-pack)",                                unit: "PK", unitPrice: 6.00 },

  // ── Surge Protection ──────────────────────────────────────────────────────
  { id: "dist-spd-120-240-1ph",    category: "Distribution", description: "Whole-House Surge Protector 120/240V 1-Phase",              unit: "EA", unitPrice: 85.00 },
  { id: "dist-spd-120-240-3ph",    category: "Distribution", description: "Whole-House Surge Protector 120/208V 3-Phase",              unit: "EA", unitPrice: 145.00 },
  { id: "dist-spd-service-entrance",category: "Distribution", description: "Service Entrance Surge Protector 200A",                    unit: "EA", unitPrice: 125.00 },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONDUIT — EMT, RMC, PVC Sch 40/80, FMC, LFMC, LFNC, ENT
  // ═══════════════════════════════════════════════════════════════════════════

  // ── EMT (Electrical Metallic Tubing) — price per foot ────────────────────
  { id: "cnd-emt-1/2-ft",          category: "Conduit", description: "1/2\" EMT Conduit (per foot)",                                   unit: "FT", unitPrice: 0.38, searchAliases: "thin wall thinwall half inch pipe tube" },
  { id: "cnd-emt-3/4-ft",          category: "Conduit", description: "3/4\" EMT Conduit (per foot)",                                   unit: "FT", unitPrice: 0.58, searchAliases: "thin wall thinwall 3/4 inch pipe tube" },
  { id: "cnd-emt-1-ft",            category: "Conduit", description: "1\" EMT Conduit (per foot)",                                     unit: "FT", unitPrice: 0.92, searchAliases: "thin wall thinwall one inch pipe tube" },
  { id: "cnd-emt-1-1/4-ft",        category: "Conduit", description: "1-1/4\" EMT Conduit (per foot)",                                 unit: "FT", unitPrice: 1.35 },
  { id: "cnd-emt-1-1/2-ft",        category: "Conduit", description: "1-1/2\" EMT Conduit (per foot)",                                 unit: "FT", unitPrice: 1.72 },
  { id: "cnd-emt-2-ft",            category: "Conduit", description: "2\" EMT Conduit (per foot)",                                     unit: "FT", unitPrice: 2.45 },
  { id: "cnd-emt-2-1/2-ft",        category: "Conduit", description: "2-1/2\" EMT Conduit (per foot)",                                 unit: "FT", unitPrice: 4.20 },
  { id: "cnd-emt-3-ft",            category: "Conduit", description: "3\" EMT Conduit (per foot)",                                     unit: "FT", unitPrice: 5.85 },
  { id: "cnd-emt-3-1/2-ft",        category: "Conduit", description: "3-1/2\" EMT Conduit (per foot)",                                 unit: "FT", unitPrice: 7.40 },
  { id: "cnd-emt-4-ft",            category: "Conduit", description: "4\" EMT Conduit (per foot)",                                     unit: "FT", unitPrice: 9.20 },

  // ── EMT 10-foot sticks ────────────────────────────────────────────────────
  { id: "cnd-emt-1/2-10ft",        category: "Conduit", description: "1/2\" EMT Conduit 10ft Stick",                                   unit: "EA", unitPrice: 3.80 },
  { id: "cnd-emt-3/4-10ft",        category: "Conduit", description: "3/4\" EMT Conduit 10ft Stick",                                   unit: "EA", unitPrice: 5.80 },
  { id: "cnd-emt-1-10ft",          category: "Conduit", description: "1\" EMT Conduit 10ft Stick",                                     unit: "EA", unitPrice: 9.20 },
  { id: "cnd-emt-1-1/4-10ft",      category: "Conduit", description: "1-1/4\" EMT Conduit 10ft Stick",                                 unit: "EA", unitPrice: 13.50 },
  { id: "cnd-emt-1-1/2-10ft",      category: "Conduit", description: "1-1/2\" EMT Conduit 10ft Stick",                                 unit: "EA", unitPrice: 17.20 },
  { id: "cnd-emt-2-10ft",          category: "Conduit", description: "2\" EMT Conduit 10ft Stick",                                     unit: "EA", unitPrice: 24.50 },
  { id: "cnd-emt-2-1/2-10ft",      category: "Conduit", description: "2-1/2\" EMT Conduit 10ft Stick",                                 unit: "EA", unitPrice: 42.00 },
  { id: "cnd-emt-3-10ft",          category: "Conduit", description: "3\" EMT Conduit 10ft Stick",                                     unit: "EA", unitPrice: 58.50 },
  { id: "cnd-emt-4-10ft",          category: "Conduit", description: "4\" EMT Conduit 10ft Stick",                                     unit: "EA", unitPrice: 92.00 },

  // ── RMC / GRC (Rigid Metal Conduit / Galvanized Rigid) — per foot ─────────
  { id: "cnd-rmc-1/2-ft",          category: "Conduit", description: "1/2\" RMC Rigid Metal Conduit (per foot)",                       unit: "FT", unitPrice: 1.25, searchAliases: "rigid galvanized GRC heavy wall" },
  { id: "cnd-rmc-3/4-ft",          category: "Conduit", description: "3/4\" RMC Rigid Metal Conduit (per foot)",                       unit: "FT", unitPrice: 1.85 },
  { id: "cnd-rmc-1-ft",            category: "Conduit", description: "1\" RMC Rigid Metal Conduit (per foot)",                         unit: "FT", unitPrice: 2.75 },
  { id: "cnd-rmc-1-1/4-ft",        category: "Conduit", description: "1-1/4\" RMC Rigid Metal Conduit (per foot)",                     unit: "FT", unitPrice: 3.85 },
  { id: "cnd-rmc-1-1/2-ft",        category: "Conduit", description: "1-1/2\" RMC Rigid Metal Conduit (per foot)",                     unit: "FT", unitPrice: 4.65 },
  { id: "cnd-rmc-2-ft",            category: "Conduit", description: "2\" RMC Rigid Metal Conduit (per foot)",                         unit: "FT", unitPrice: 6.45 },
  { id: "cnd-rmc-2-1/2-ft",        category: "Conduit", description: "2-1/2\" RMC Rigid Metal Conduit (per foot)",                     unit: "FT", unitPrice: 10.80 },
  { id: "cnd-rmc-3-ft",            category: "Conduit", description: "3\" RMC Rigid Metal Conduit (per foot)",                         unit: "FT", unitPrice: 14.50 },
  { id: "cnd-rmc-3-1/2-ft",        category: "Conduit", description: "3-1/2\" RMC Rigid Metal Conduit (per foot)",                     unit: "FT", unitPrice: 18.20 },
  { id: "cnd-rmc-4-ft",            category: "Conduit", description: "4\" RMC Rigid Metal Conduit (per foot)",                         unit: "FT", unitPrice: 22.50 },

  // ── PVC Schedule 40 — per foot ────────────────────────────────────────────
  { id: "cnd-pvc40-1/2-ft",        category: "Conduit", description: "1/2\" PVC Schedule 40 Conduit (per foot)",                       unit: "FT", unitPrice: 0.22 },
  { id: "cnd-pvc40-3/4-ft",        category: "Conduit", description: "3/4\" PVC Schedule 40 Conduit (per foot)",                       unit: "FT", unitPrice: 0.32 },
  { id: "cnd-pvc40-1-ft",          category: "Conduit", description: "1\" PVC Schedule 40 Conduit (per foot)",                         unit: "FT", unitPrice: 0.48 },
  { id: "cnd-pvc40-1-1/4-ft",      category: "Conduit", description: "1-1/4\" PVC Schedule 40 Conduit (per foot)",                     unit: "FT", unitPrice: 0.68 },
  { id: "cnd-pvc40-1-1/2-ft",      category: "Conduit", description: "1-1/2\" PVC Schedule 40 Conduit (per foot)",                     unit: "FT", unitPrice: 0.85 },
  { id: "cnd-pvc40-2-ft",          category: "Conduit", description: "2\" PVC Schedule 40 Conduit (per foot)",                         unit: "FT", unitPrice: 1.20 },
  { id: "cnd-pvc40-2-1/2-ft",      category: "Conduit", description: "2-1/2\" PVC Schedule 40 Conduit (per foot)",                     unit: "FT", unitPrice: 1.85 },
  { id: "cnd-pvc40-3-ft",          category: "Conduit", description: "3\" PVC Schedule 40 Conduit (per foot)",                         unit: "FT", unitPrice: 2.55 },
  { id: "cnd-pvc40-3-1/2-ft",      category: "Conduit", description: "3-1/2\" PVC Schedule 40 Conduit (per foot)",                     unit: "FT", unitPrice: 3.20 },
  { id: "cnd-pvc40-4-ft",          category: "Conduit", description: "4\" PVC Schedule 40 Conduit (per foot)",                         unit: "FT", unitPrice: 3.95 },
  { id: "cnd-pvc40-5-ft",          category: "Conduit", description: "5\" PVC Schedule 40 Conduit (per foot)",                         unit: "FT", unitPrice: 6.20 },
  { id: "cnd-pvc40-6-ft",          category: "Conduit", description: "6\" PVC Schedule 40 Conduit (per foot)",                         unit: "FT", unitPrice: 8.50 },

  // ── PVC Schedule 80 — per foot ────────────────────────────────────────────
  { id: "cnd-pvc80-1/2-ft",        category: "Conduit", description: "1/2\" PVC Schedule 80 Conduit (per foot)",                       unit: "FT", unitPrice: 0.42 },
  { id: "cnd-pvc80-3/4-ft",        category: "Conduit", description: "3/4\" PVC Schedule 80 Conduit (per foot)",                       unit: "FT", unitPrice: 0.62 },
  { id: "cnd-pvc80-1-ft",          category: "Conduit", description: "1\" PVC Schedule 80 Conduit (per foot)",                         unit: "FT", unitPrice: 0.92 },
  { id: "cnd-pvc80-1-1/4-ft",      category: "Conduit", description: "1-1/4\" PVC Schedule 80 Conduit (per foot)",                     unit: "FT", unitPrice: 1.28 },
  { id: "cnd-pvc80-1-1/2-ft",      category: "Conduit", description: "1-1/2\" PVC Schedule 80 Conduit (per foot)",                     unit: "FT", unitPrice: 1.62 },
  { id: "cnd-pvc80-2-ft",          category: "Conduit", description: "2\" PVC Schedule 80 Conduit (per foot)",                         unit: "FT", unitPrice: 2.25 },
  { id: "cnd-pvc80-2-1/2-ft",      category: "Conduit", description: "2-1/2\" PVC Schedule 80 Conduit (per foot)",                     unit: "FT", unitPrice: 3.45 },
  { id: "cnd-pvc80-3-ft",          category: "Conduit", description: "3\" PVC Schedule 80 Conduit (per foot)",                         unit: "FT", unitPrice: 4.85 },
  { id: "cnd-pvc80-4-ft",          category: "Conduit", description: "4\" PVC Schedule 80 Conduit (per foot)",                         unit: "FT", unitPrice: 7.20 },

  // ── FMC (Flexible Metal Conduit) — per foot ───────────────────────────────
  { id: "cnd-fmc-3/8-ft",          category: "Conduit", description: "3/8\" FMC Flexible Metal Conduit (per foot)",                    unit: "FT", unitPrice: 0.28 },
  { id: "cnd-fmc-1/2-ft",          category: "Conduit", description: "1/2\" FMC Flexible Metal Conduit (per foot)",                    unit: "FT", unitPrice: 0.42, searchAliases: "flex greenfield snake" },
  { id: "cnd-fmc-3/4-ft",          category: "Conduit", description: "3/4\" FMC Flexible Metal Conduit (per foot)",                    unit: "FT", unitPrice: 0.65 },
  { id: "cnd-fmc-1-ft",            category: "Conduit", description: "1\" FMC Flexible Metal Conduit (per foot)",                      unit: "FT", unitPrice: 1.05 },
  { id: "cnd-fmc-1-1/4-ft",        category: "Conduit", description: "1-1/4\" FMC Flexible Metal Conduit (per foot)",                  unit: "FT", unitPrice: 1.55 },
  { id: "cnd-fmc-1-1/2-ft",        category: "Conduit", description: "1-1/2\" FMC Flexible Metal Conduit (per foot)",                  unit: "FT", unitPrice: 2.05 },
  { id: "cnd-fmc-2-ft",            category: "Conduit", description: "2\" FMC Flexible Metal Conduit (per foot)",                      unit: "FT", unitPrice: 3.20 },

  // ── LFMC (Liquid-Tight Flexible Metal Conduit) — per foot ─────────────────
  { id: "cnd-lfmc-3/8-ft",         category: "Conduit", description: "3/8\" LFMC Liquid-Tight Flexible Metal Conduit (per foot)",      unit: "FT", unitPrice: 0.55 },
  { id: "cnd-lfmc-1/2-ft",         category: "Conduit", description: "1/2\" LFMC Liquid-Tight Flexible Metal Conduit (per foot)",      unit: "FT", unitPrice: 0.75, searchAliases: "sealtite seal-tite liquid tight liquidtight" },
  { id: "cnd-lfmc-3/4-ft",         category: "Conduit", description: "3/4\" LFMC Liquid-Tight Flexible Metal Conduit (per foot)",      unit: "FT", unitPrice: 1.10 },
  { id: "cnd-lfmc-1-ft",           category: "Conduit", description: "1\" LFMC Liquid-Tight Flexible Metal Conduit (per foot)",        unit: "FT", unitPrice: 1.65 },
  { id: "cnd-lfmc-1-1/4-ft",       category: "Conduit", description: "1-1/4\" LFMC Liquid-Tight Flexible Metal Conduit (per foot)",    unit: "FT", unitPrice: 2.35 },
  { id: "cnd-lfmc-1-1/2-ft",       category: "Conduit", description: "1-1/2\" LFMC Liquid-Tight Flexible Metal Conduit (per foot)",    unit: "FT", unitPrice: 3.05 },
  { id: "cnd-lfmc-2-ft",           category: "Conduit", description: "2\" LFMC Liquid-Tight Flexible Metal Conduit (per foot)",        unit: "FT", unitPrice: 4.50 },

  // ── LFNC (Liquid-Tight Flexible Non-Metallic) — per foot ──────────────────
  { id: "cnd-lfnc-1/2-ft",         category: "Conduit", description: "1/2\" LFNC Liquid-Tight Non-Metallic Conduit (per foot)",        unit: "FT", unitPrice: 0.45 },
  { id: "cnd-lfnc-3/4-ft",         category: "Conduit", description: "3/4\" LFNC Liquid-Tight Non-Metallic Conduit (per foot)",        unit: "FT", unitPrice: 0.65 },
  { id: "cnd-lfnc-1-ft",           category: "Conduit", description: "1\" LFNC Liquid-Tight Non-Metallic Conduit (per foot)",          unit: "FT", unitPrice: 1.00 },

  // ── ENT (Electrical Non-Metallic Tubing / Smurf Tube) — per foot ──────────
  { id: "cnd-ent-1/2-ft",          category: "Conduit", description: "1/2\" ENT Flexible Non-Metallic Conduit (per foot)",             unit: "FT", unitPrice: 0.18 },
  { id: "cnd-ent-3/4-ft",          category: "Conduit", description: "3/4\" ENT Flexible Non-Metallic Conduit (per foot)",             unit: "FT", unitPrice: 0.28 },
  { id: "cnd-ent-1-ft",            category: "Conduit", description: "1\" ENT Flexible Non-Metallic Conduit (per foot)",               unit: "FT", unitPrice: 0.42 },

  // ── IMC (Intermediate Metal Conduit) — per foot ───────────────────────────
  { id: "cnd-imc-1/2-ft",          category: "Conduit", description: "1/2\" IMC Intermediate Metal Conduit (per foot)",                unit: "FT", unitPrice: 0.85 },
  { id: "cnd-imc-3/4-ft",          category: "Conduit", description: "3/4\" IMC Intermediate Metal Conduit (per foot)",                unit: "FT", unitPrice: 1.25 },
  { id: "cnd-imc-1-ft",            category: "Conduit", description: "1\" IMC Intermediate Metal Conduit (per foot)",                  unit: "FT", unitPrice: 1.85 },
  { id: "cnd-imc-1-1/4-ft",        category: "Conduit", description: "1-1/4\" IMC Intermediate Metal Conduit (per foot)",              unit: "FT", unitPrice: 2.65 },
  { id: "cnd-imc-1-1/2-ft",        category: "Conduit", description: "1-1/2\" IMC Intermediate Metal Conduit (per foot)",              unit: "FT", unitPrice: 3.25 },
  { id: "cnd-imc-2-ft",            category: "Conduit", description: "2\" IMC Intermediate Metal Conduit (per foot)",                  unit: "FT", unitPrice: 4.65 },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONDUIT FITTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── EMT Set-Screw Connectors ──────────────────────────────────────────────
  { id: "fit-emt-ss-conn-1/2",     category: "Conduit Fittings", description: "1/2\" EMT Set-Screw Connector",                         unit: "EA", unitPrice: 0.55 },
  { id: "fit-emt-ss-conn-3/4",     category: "Conduit Fittings", description: "3/4\" EMT Set-Screw Connector",                         unit: "EA", unitPrice: 0.75 },
  { id: "fit-emt-ss-conn-1",       category: "Conduit Fittings", description: "1\" EMT Set-Screw Connector",                           unit: "EA", unitPrice: 1.15 },
  { id: "fit-emt-ss-conn-1-1/4",   category: "Conduit Fittings", description: "1-1/4\" EMT Set-Screw Connector",                       unit: "EA", unitPrice: 1.85 },
  { id: "fit-emt-ss-conn-1-1/2",   category: "Conduit Fittings", description: "1-1/2\" EMT Set-Screw Connector",                       unit: "EA", unitPrice: 2.45 },
  { id: "fit-emt-ss-conn-2",       category: "Conduit Fittings", description: "2\" EMT Set-Screw Connector",                           unit: "EA", unitPrice: 3.50 },
  { id: "fit-emt-ss-conn-2-1/2",   category: "Conduit Fittings", description: "2-1/2\" EMT Set-Screw Connector",                       unit: "EA", unitPrice: 7.50 },
  { id: "fit-emt-ss-conn-3",       category: "Conduit Fittings", description: "3\" EMT Set-Screw Connector",                           unit: "EA", unitPrice: 12.00 },
  { id: "fit-emt-ss-conn-4",       category: "Conduit Fittings", description: "4\" EMT Set-Screw Connector",                           unit: "EA", unitPrice: 18.50 },

  // ── EMT Compression Connectors ────────────────────────────────────────────
  { id: "fit-emt-comp-conn-1/2",   category: "Conduit Fittings", description: "1/2\" EMT Compression Connector",                       unit: "EA", unitPrice: 0.85 },
  { id: "fit-emt-comp-conn-3/4",   category: "Conduit Fittings", description: "3/4\" EMT Compression Connector",                       unit: "EA", unitPrice: 1.15 },
  { id: "fit-emt-comp-conn-1",     category: "Conduit Fittings", description: "1\" EMT Compression Connector",                         unit: "EA", unitPrice: 1.75 },
  { id: "fit-emt-comp-conn-1-1/4", category: "Conduit Fittings", description: "1-1/4\" EMT Compression Connector",                     unit: "EA", unitPrice: 2.85 },
  { id: "fit-emt-comp-conn-1-1/2", category: "Conduit Fittings", description: "1-1/2\" EMT Compression Connector",                     unit: "EA", unitPrice: 3.65 },
  { id: "fit-emt-comp-conn-2",     category: "Conduit Fittings", description: "2\" EMT Compression Connector",                         unit: "EA", unitPrice: 5.25 },
  { id: "fit-emt-comp-conn-3",     category: "Conduit Fittings", description: "3\" EMT Compression Connector",                         unit: "EA", unitPrice: 18.00 },
  { id: "fit-emt-comp-conn-4",     category: "Conduit Fittings", description: "4\" EMT Compression Connector",                         unit: "EA", unitPrice: 28.00 },

  // ── EMT Set-Screw Couplings ───────────────────────────────────────────────
  { id: "fit-emt-ss-coup-1/2",     category: "Conduit Fittings", description: "1/2\" EMT Set-Screw Coupling",                          unit: "EA", unitPrice: 0.45 },
  { id: "fit-emt-ss-coup-3/4",     category: "Conduit Fittings", description: "3/4\" EMT Set-Screw Coupling",                          unit: "EA", unitPrice: 0.65 },
  { id: "fit-emt-ss-coup-1",       category: "Conduit Fittings", description: "1\" EMT Set-Screw Coupling",                            unit: "EA", unitPrice: 0.95 },
  { id: "fit-emt-ss-coup-1-1/4",   category: "Conduit Fittings", description: "1-1/4\" EMT Set-Screw Coupling",                        unit: "EA", unitPrice: 1.55 },
  { id: "fit-emt-ss-coup-1-1/2",   category: "Conduit Fittings", description: "1-1/2\" EMT Set-Screw Coupling",                        unit: "EA", unitPrice: 2.05 },
  { id: "fit-emt-ss-coup-2",       category: "Conduit Fittings", description: "2\" EMT Set-Screw Coupling",                            unit: "EA", unitPrice: 2.95 },
  { id: "fit-emt-ss-coup-2-1/2",   category: "Conduit Fittings", description: "2-1/2\" EMT Set-Screw Coupling",                        unit: "EA", unitPrice: 6.50 },
  { id: "fit-emt-ss-coup-3",       category: "Conduit Fittings", description: "3\" EMT Set-Screw Coupling",                            unit: "EA", unitPrice: 10.50 },
  { id: "fit-emt-ss-coup-4",       category: "Conduit Fittings", description: "4\" EMT Set-Screw Coupling",                            unit: "EA", unitPrice: 16.00 },

  // ── EMT Compression Couplings ─────────────────────────────────────────────
  { id: "fit-emt-comp-coup-1/2",   category: "Conduit Fittings", description: "1/2\" EMT Compression Coupling",                        unit: "EA", unitPrice: 0.75 },
  { id: "fit-emt-comp-coup-3/4",   category: "Conduit Fittings", description: "3/4\" EMT Compression Coupling",                        unit: "EA", unitPrice: 1.05 },
  { id: "fit-emt-comp-coup-1",     category: "Conduit Fittings", description: "1\" EMT Compression Coupling",                          unit: "EA", unitPrice: 1.55 },
  { id: "fit-emt-comp-coup-1-1/2", category: "Conduit Fittings", description: "1-1/2\" EMT Compression Coupling",                      unit: "EA", unitPrice: 3.25 },
  { id: "fit-emt-comp-coup-2",     category: "Conduit Fittings", description: "2\" EMT Compression Coupling",                          unit: "EA", unitPrice: 4.75 },

  // ── EMT 90-Degree Elbows ──────────────────────────────────────────────────
  { id: "fit-emt-elbow90-1/2",     category: "Conduit Fittings", description: "1/2\" EMT 90-Degree Elbow",                             unit: "EA", unitPrice: 1.25 },
  { id: "fit-emt-elbow90-3/4",     category: "Conduit Fittings", description: "3/4\" EMT 90-Degree Elbow",                             unit: "EA", unitPrice: 1.85 },
  { id: "fit-emt-elbow90-1",       category: "Conduit Fittings", description: "1\" EMT 90-Degree Elbow",                               unit: "EA", unitPrice: 3.25 },
  { id: "fit-emt-elbow90-1-1/4",   category: "Conduit Fittings", description: "1-1/4\" EMT 90-Degree Elbow",                           unit: "EA", unitPrice: 5.50 },
  { id: "fit-emt-elbow90-1-1/2",   category: "Conduit Fittings", description: "1-1/2\" EMT 90-Degree Elbow",                           unit: "EA", unitPrice: 7.50 },
  { id: "fit-emt-elbow90-2",       category: "Conduit Fittings", description: "2\" EMT 90-Degree Elbow",                               unit: "EA", unitPrice: 12.00 },
  { id: "fit-emt-elbow90-3",       category: "Conduit Fittings", description: "3\" EMT 90-Degree Elbow",                               unit: "EA", unitPrice: 38.00 },
  { id: "fit-emt-elbow90-4",       category: "Conduit Fittings", description: "4\" EMT 90-Degree Elbow",                               unit: "EA", unitPrice: 65.00 },

  // ── RMC / GRC Fittings ────────────────────────────────────────────────────
  { id: "fit-rmc-conn-1/2",        category: "Conduit Fittings", description: "1/2\" RMC Threaded Connector",                          unit: "EA", unitPrice: 1.85 },
  { id: "fit-rmc-conn-3/4",        category: "Conduit Fittings", description: "3/4\" RMC Threaded Connector",                          unit: "EA", unitPrice: 2.45 },
  { id: "fit-rmc-conn-1",          category: "Conduit Fittings", description: "1\" RMC Threaded Connector",                            unit: "EA", unitPrice: 3.85 },
  { id: "fit-rmc-conn-1-1/2",      category: "Conduit Fittings", description: "1-1/2\" RMC Threaded Connector",                        unit: "EA", unitPrice: 6.50 },
  { id: "fit-rmc-conn-2",          category: "Conduit Fittings", description: "2\" RMC Threaded Connector",                            unit: "EA", unitPrice: 9.50 },
  { id: "fit-rmc-conn-3",          category: "Conduit Fittings", description: "3\" RMC Threaded Connector",                            unit: "EA", unitPrice: 22.00 },
  { id: "fit-rmc-conn-4",          category: "Conduit Fittings", description: "4\" RMC Threaded Connector",                            unit: "EA", unitPrice: 38.00 },
  { id: "fit-rmc-coup-1/2",        category: "Conduit Fittings", description: "1/2\" RMC Threaded Coupling",                           unit: "EA", unitPrice: 1.45 },
  { id: "fit-rmc-coup-3/4",        category: "Conduit Fittings", description: "3/4\" RMC Threaded Coupling",                           unit: "EA", unitPrice: 1.95 },
  { id: "fit-rmc-coup-1",          category: "Conduit Fittings", description: "1\" RMC Threaded Coupling",                             unit: "EA", unitPrice: 3.25 },
  { id: "fit-rmc-coup-1-1/2",      category: "Conduit Fittings", description: "1-1/2\" RMC Threaded Coupling",                         unit: "EA", unitPrice: 5.50 },
  { id: "fit-rmc-coup-2",          category: "Conduit Fittings", description: "2\" RMC Threaded Coupling",                             unit: "EA", unitPrice: 8.00 },
  { id: "fit-rmc-elbow90-1/2",     category: "Conduit Fittings", description: "1/2\" RMC 90-Degree Elbow",                             unit: "EA", unitPrice: 3.50 },
  { id: "fit-rmc-elbow90-3/4",     category: "Conduit Fittings", description: "3/4\" RMC 90-Degree Elbow",                             unit: "EA", unitPrice: 4.85 },
  { id: "fit-rmc-elbow90-1",       category: "Conduit Fittings", description: "1\" RMC 90-Degree Elbow",                               unit: "EA", unitPrice: 7.50 },
  { id: "fit-rmc-elbow90-2",       category: "Conduit Fittings", description: "2\" RMC 90-Degree Elbow",                               unit: "EA", unitPrice: 18.00 },
  { id: "fit-rmc-nipple-close-1/2",category: "Conduit Fittings", description: "1/2\" RMC Close Nipple",                                unit: "EA", unitPrice: 1.25 },
  { id: "fit-rmc-nipple-close-3/4",category: "Conduit Fittings", description: "3/4\" RMC Close Nipple",                                unit: "EA", unitPrice: 1.75 },
  { id: "fit-rmc-nipple-close-1",  category: "Conduit Fittings", description: "1\" RMC Close Nipple",                                  unit: "EA", unitPrice: 2.65 },
  { id: "fit-rmc-nipple-2in-1/2",  category: "Conduit Fittings", description: "1/2\" RMC 2\" Nipple",                                  unit: "EA", unitPrice: 1.45 },
  { id: "fit-rmc-nipple-4in-3/4",  category: "Conduit Fittings", description: "3/4\" RMC 4\" Nipple",                                  unit: "EA", unitPrice: 2.25 },
  { id: "fit-rmc-nipple-6in-1",    category: "Conduit Fittings", description: "1\" RMC 6\" Nipple",                                    unit: "EA", unitPrice: 3.85 },
  { id: "fit-rmc-lb-1/2",          category: "Conduit Fittings", description: "1/2\" RMC LB Conduit Body",                             unit: "EA", unitPrice: 4.50 },
  { id: "fit-rmc-lb-3/4",          category: "Conduit Fittings", description: "3/4\" RMC LB Conduit Body",                             unit: "EA", unitPrice: 6.50 },
  { id: "fit-rmc-lb-1",            category: "Conduit Fittings", description: "1\" RMC LB Conduit Body",                               unit: "EA", unitPrice: 10.50 },
  { id: "fit-rmc-lb-1-1/2",        category: "Conduit Fittings", description: "1-1/2\" RMC LB Conduit Body",                           unit: "EA", unitPrice: 18.00 },
  { id: "fit-rmc-lb-2",            category: "Conduit Fittings", description: "2\" RMC LB Conduit Body",                               unit: "EA", unitPrice: 28.00 },
  { id: "fit-rmc-ll-1/2",          category: "Conduit Fittings", description: "1/2\" RMC LL Conduit Body",                             unit: "EA", unitPrice: 4.50 },
  { id: "fit-rmc-ll-3/4",          category: "Conduit Fittings", description: "3/4\" RMC LL Conduit Body",                             unit: "EA", unitPrice: 6.50 },
  { id: "fit-rmc-lr-1/2",          category: "Conduit Fittings", description: "1/2\" RMC LR Conduit Body",                             unit: "EA", unitPrice: 4.50 },
  { id: "fit-rmc-lr-3/4",          category: "Conduit Fittings", description: "3/4\" RMC LR Conduit Body",                             unit: "EA", unitPrice: 6.50 },
  { id: "fit-rmc-t-1/2",           category: "Conduit Fittings", description: "1/2\" RMC T Conduit Body",                              unit: "EA", unitPrice: 5.50 },
  { id: "fit-rmc-t-3/4",           category: "Conduit Fittings", description: "3/4\" RMC T Conduit Body",                              unit: "EA", unitPrice: 7.50 },
  { id: "fit-rmc-t-1",             category: "Conduit Fittings", description: "1\" RMC T Conduit Body",                                unit: "EA", unitPrice: 12.00 },

  // ── PVC Fittings ──────────────────────────────────────────────────────────
  { id: "fit-pvc-coup-1/2",        category: "Conduit Fittings", description: "1/2\" PVC Sch 40 Coupling",                             unit: "EA", unitPrice: 0.35 },
  { id: "fit-pvc-coup-3/4",        category: "Conduit Fittings", description: "3/4\" PVC Sch 40 Coupling",                             unit: "EA", unitPrice: 0.45 },
  { id: "fit-pvc-coup-1",          category: "Conduit Fittings", description: "1\" PVC Sch 40 Coupling",                               unit: "EA", unitPrice: 0.65 },
  { id: "fit-pvc-coup-1-1/4",      category: "Conduit Fittings", description: "1-1/4\" PVC Sch 40 Coupling",                           unit: "EA", unitPrice: 0.95 },
  { id: "fit-pvc-coup-1-1/2",      category: "Conduit Fittings", description: "1-1/2\" PVC Sch 40 Coupling",                           unit: "EA", unitPrice: 1.25 },
  { id: "fit-pvc-coup-2",          category: "Conduit Fittings", description: "2\" PVC Sch 40 Coupling",                               unit: "EA", unitPrice: 1.75 },
  { id: "fit-pvc-coup-3",          category: "Conduit Fittings", description: "3\" PVC Sch 40 Coupling",                               unit: "EA", unitPrice: 3.85 },
  { id: "fit-pvc-coup-4",          category: "Conduit Fittings", description: "4\" PVC Sch 40 Coupling",                               unit: "EA", unitPrice: 5.50 },
  { id: "fit-pvc-elbow90-1/2",     category: "Conduit Fittings", description: "1/2\" PVC Sch 40 90-Degree Elbow",                      unit: "EA", unitPrice: 0.55 },
  { id: "fit-pvc-elbow90-3/4",     category: "Conduit Fittings", description: "3/4\" PVC Sch 40 90-Degree Elbow",                      unit: "EA", unitPrice: 0.75 },
  { id: "fit-pvc-elbow90-1",       category: "Conduit Fittings", description: "1\" PVC Sch 40 90-Degree Elbow",                        unit: "EA", unitPrice: 1.15 },
  { id: "fit-pvc-elbow90-1-1/2",   category: "Conduit Fittings", description: "1-1/2\" PVC Sch 40 90-Degree Elbow",                    unit: "EA", unitPrice: 2.25 },
  { id: "fit-pvc-elbow90-2",       category: "Conduit Fittings", description: "2\" PVC Sch 40 90-Degree Elbow",                        unit: "EA", unitPrice: 3.25 },
  { id: "fit-pvc-elbow90-3",       category: "Conduit Fittings", description: "3\" PVC Sch 40 90-Degree Elbow",                        unit: "EA", unitPrice: 7.50 },
  { id: "fit-pvc-elbow90-4",       category: "Conduit Fittings", description: "4\" PVC Sch 40 90-Degree Elbow",                        unit: "EA", unitPrice: 12.00 },
  { id: "fit-pvc-sweep-1/2",       category: "Conduit Fittings", description: "1/2\" PVC Sch 40 Long Radius 90 Sweep",                 unit: "EA", unitPrice: 1.25 },
  { id: "fit-pvc-sweep-3/4",       category: "Conduit Fittings", description: "3/4\" PVC Sch 40 Long Radius 90 Sweep",                 unit: "EA", unitPrice: 1.75 },
  { id: "fit-pvc-sweep-1",         category: "Conduit Fittings", description: "1\" PVC Sch 40 Long Radius 90 Sweep",                   unit: "EA", unitPrice: 2.65 },
  { id: "fit-pvc-sweep-1-1/2",     category: "Conduit Fittings", description: "1-1/2\" PVC Sch 40 Long Radius 90 Sweep",               unit: "EA", unitPrice: 4.50 },
  { id: "fit-pvc-sweep-2",         category: "Conduit Fittings", description: "2\" PVC Sch 40 Long Radius 90 Sweep",                   unit: "EA", unitPrice: 6.50 },
  { id: "fit-pvc-sweep-3",         category: "Conduit Fittings", description: "3\" PVC Sch 40 Long Radius 90 Sweep",                   unit: "EA", unitPrice: 14.00 },
  { id: "fit-pvc-sweep-4",         category: "Conduit Fittings", description: "4\" PVC Sch 40 Long Radius 90 Sweep",                   unit: "EA", unitPrice: 22.00 },
  { id: "fit-pvc-adapter-1/2",     category: "Conduit Fittings", description: "1/2\" PVC Terminal Adapter (Male)",                     unit: "EA", unitPrice: 0.45 },
  { id: "fit-pvc-adapter-3/4",     category: "Conduit Fittings", description: "3/4\" PVC Terminal Adapter (Male)",                     unit: "EA", unitPrice: 0.65 },
  { id: "fit-pvc-adapter-1",       category: "Conduit Fittings", description: "1\" PVC Terminal Adapter (Male)",                       unit: "EA", unitPrice: 0.95 },
  { id: "fit-pvc-adapter-2",       category: "Conduit Fittings", description: "2\" PVC Terminal Adapter (Male)",                       unit: "EA", unitPrice: 1.85 },
  { id: "fit-pvc-bell-1/2",        category: "Conduit Fittings", description: "1/2\" PVC Bell End (Female Adapter)",                   unit: "EA", unitPrice: 0.45 },
  { id: "fit-pvc-bell-3/4",        category: "Conduit Fittings", description: "3/4\" PVC Bell End (Female Adapter)",                   unit: "EA", unitPrice: 0.65 },
  { id: "fit-pvc-bell-1",          category: "Conduit Fittings", description: "1\" PVC Bell End (Female Adapter)",                     unit: "EA", unitPrice: 0.95 },
  { id: "fit-pvc-bell-2",          category: "Conduit Fittings", description: "2\" PVC Bell End (Female Adapter)",                     unit: "EA", unitPrice: 1.85 },
  { id: "fit-pvc-plug-1/2",        category: "Conduit Fittings", description: "1/2\" PVC End Cap/Plug",                                unit: "EA", unitPrice: 0.35 },
  { id: "fit-pvc-plug-3/4",        category: "Conduit Fittings", description: "3/4\" PVC End Cap/Plug",                                unit: "EA", unitPrice: 0.45 },
  { id: "fit-pvc-plug-1",          category: "Conduit Fittings", description: "1\" PVC End Cap/Plug",                                  unit: "EA", unitPrice: 0.65 },
  { id: "fit-pvc-plug-2",          category: "Conduit Fittings", description: "2\" PVC End Cap/Plug",                                  unit: "EA", unitPrice: 1.25 },

  // ── FMC / LFMC Fittings ───────────────────────────────────────────────────
  { id: "fit-fmc-conn-3/8",        category: "Conduit Fittings", description: "3/8\" FMC Straight Connector",                          unit: "EA", unitPrice: 1.85 },
  { id: "fit-fmc-conn-1/2",        category: "Conduit Fittings", description: "1/2\" FMC Straight Connector",                          unit: "EA", unitPrice: 2.25 },
  { id: "fit-fmc-conn-3/4",        category: "Conduit Fittings", description: "3/4\" FMC Straight Connector",                          unit: "EA", unitPrice: 3.25 },
  { id: "fit-fmc-conn-1",          category: "Conduit Fittings", description: "1\" FMC Straight Connector",                            unit: "EA", unitPrice: 5.50 },
  { id: "fit-fmc-90-1/2",          category: "Conduit Fittings", description: "1/2\" FMC 90-Degree Connector",                         unit: "EA", unitPrice: 3.25 },
  { id: "fit-fmc-90-3/4",          category: "Conduit Fittings", description: "3/4\" FMC 90-Degree Connector",                         unit: "EA", unitPrice: 4.75 },
  { id: "fit-lfmc-conn-3/8",       category: "Conduit Fittings", description: "3/8\" LFMC Straight Liquid-Tight Connector",            unit: "EA", unitPrice: 2.25 },
  { id: "fit-lfmc-conn-1/2",       category: "Conduit Fittings", description: "1/2\" LFMC Straight Liquid-Tight Connector",            unit: "EA", unitPrice: 2.85 },
  { id: "fit-lfmc-conn-3/4",       category: "Conduit Fittings", description: "3/4\" LFMC Straight Liquid-Tight Connector",            unit: "EA", unitPrice: 3.85 },
  { id: "fit-lfmc-conn-1",         category: "Conduit Fittings", description: "1\" LFMC Straight Liquid-Tight Connector",              unit: "EA", unitPrice: 6.50 },
  { id: "fit-lfmc-conn-1-1/2",     category: "Conduit Fittings", description: "1-1/2\" LFMC Straight Liquid-Tight Connector",          unit: "EA", unitPrice: 10.50 },
  { id: "fit-lfmc-conn-2",         category: "Conduit Fittings", description: "2\" LFMC Straight Liquid-Tight Connector",              unit: "EA", unitPrice: 15.00 },
  { id: "fit-lfmc-90-1/2",         category: "Conduit Fittings", description: "1/2\" LFMC 90-Degree Liquid-Tight Connector",           unit: "EA", unitPrice: 3.85 },
  { id: "fit-lfmc-90-3/4",         category: "Conduit Fittings", description: "3/4\" LFMC 90-Degree Liquid-Tight Connector",           unit: "EA", unitPrice: 5.50 },
  { id: "fit-lfmc-90-1",           category: "Conduit Fittings", description: "1\" LFMC 90-Degree Liquid-Tight Connector",             unit: "EA", unitPrice: 8.50 },

  // ── Reducing Bushings & Locknuts ──────────────────────────────────────────
  { id: "fit-bush-3/4-1/2",        category: "Conduit Fittings", description: "3/4\" to 1/2\" Reducing Bushing",                       unit: "EA", unitPrice: 0.85 },
  { id: "fit-bush-1-3/4",          category: "Conduit Fittings", description: "1\" to 3/4\" Reducing Bushing",                         unit: "EA", unitPrice: 1.15 },
  { id: "fit-bush-1-1/4-1",        category: "Conduit Fittings", description: "1-1/4\" to 1\" Reducing Bushing",                       unit: "EA", unitPrice: 1.65 },
  { id: "fit-bush-1-1/2-1",        category: "Conduit Fittings", description: "1-1/2\" to 1\" Reducing Bushing",                       unit: "EA", unitPrice: 2.25 },
  { id: "fit-bush-2-1-1/2",        category: "Conduit Fittings", description: "2\" to 1-1/2\" Reducing Bushing",                       unit: "EA", unitPrice: 3.25 },
  { id: "fit-locknut-1/2",         category: "Conduit Fittings", description: "1/2\" Steel Locknut",                                   unit: "EA", unitPrice: 0.35 },
  { id: "fit-locknut-3/4",         category: "Conduit Fittings", description: "3/4\" Steel Locknut",                                   unit: "EA", unitPrice: 0.45 },
  { id: "fit-locknut-1",           category: "Conduit Fittings", description: "1\" Steel Locknut",                                     unit: "EA", unitPrice: 0.65 },
  { id: "fit-locknut-1-1/4",       category: "Conduit Fittings", description: "1-1/4\" Steel Locknut",                                 unit: "EA", unitPrice: 0.95 },
  { id: "fit-locknut-1-1/2",       category: "Conduit Fittings", description: "1-1/2\" Steel Locknut",                                 unit: "EA", unitPrice: 1.25 },
  { id: "fit-locknut-2",           category: "Conduit Fittings", description: "2\" Steel Locknut",                                     unit: "EA", unitPrice: 1.75 },
  { id: "fit-locknut-3",           category: "Conduit Fittings", description: "3\" Steel Locknut",                                     unit: "EA", unitPrice: 3.50 },
  { id: "fit-locknut-4",           category: "Conduit Fittings", description: "4\" Steel Locknut",                                     unit: "EA", unitPrice: 5.50 },
  { id: "fit-insul-bush-1/2",      category: "Conduit Fittings", description: "1/2\" Insulated Plastic Bushing",                       unit: "EA", unitPrice: 0.25 },
  { id: "fit-insul-bush-3/4",      category: "Conduit Fittings", description: "3/4\" Insulated Plastic Bushing",                       unit: "EA", unitPrice: 0.35 },
  { id: "fit-insul-bush-1",        category: "Conduit Fittings", description: "1\" Insulated Plastic Bushing",                         unit: "EA", unitPrice: 0.55 },
  { id: "fit-insul-bush-1-1/2",    category: "Conduit Fittings", description: "1-1/2\" Insulated Plastic Bushing",                     unit: "EA", unitPrice: 0.85 },
  { id: "fit-insul-bush-2",        category: "Conduit Fittings", description: "2\" Insulated Plastic Bushing",                         unit: "EA", unitPrice: 1.25 },
  { id: "fit-insul-bush-3",        category: "Conduit Fittings", description: "3\" Insulated Plastic Bushing",                         unit: "EA", unitPrice: 2.25 },
  { id: "fit-insul-bush-4",        category: "Conduit Fittings", description: "4\" Insulated Plastic Bushing",                         unit: "EA", unitPrice: 3.50 },

  // ── Conduit Sealing Fittings ──────────────────────────────────────────────
  { id: "fit-seal-1/2",            category: "Conduit Fittings", description: "1/2\" Conduit Sealing Fitting (Hazardous Location)",     unit: "EA", unitPrice: 18.00 },
  { id: "fit-seal-3/4",            category: "Conduit Fittings", description: "3/4\" Conduit Sealing Fitting (Hazardous Location)",     unit: "EA", unitPrice: 22.00 },
  { id: "fit-seal-1",              category: "Conduit Fittings", description: "1\" Conduit Sealing Fitting (Hazardous Location)",       unit: "EA", unitPrice: 32.00 },
  { id: "fit-seal-2",              category: "Conduit Fittings", description: "2\" Conduit Sealing Fitting (Hazardous Location)",       unit: "EA", unitPrice: 58.00 },

  // ═══════════════════════════════════════════════════════════════════════════
  // WIRE & CABLE
  // ═══════════════════════════════════════════════════════════════════════════

  // ── THHN/THWN-2 Copper — per foot ────────────────────────────────────────
  { id: "wir-thhn-14cu",           category: "Wire & Cable", description: "#14 AWG THHN/THWN-2 Copper (per foot)",                     unit: "FT", unitPrice: 0.12 },
  { id: "wir-thhn-12cu",           category: "Wire & Cable", description: "#12 AWG THHN/THWN-2 Copper (per foot)",                     unit: "FT", unitPrice: 0.18 },
  { id: "wir-thhn-10cu",           category: "Wire & Cable", description: "#10 AWG THHN/THWN-2 Copper (per foot)",                     unit: "FT", unitPrice: 0.28 },
  { id: "wir-thhn-8cu",            category: "Wire & Cable", description: "#8 AWG THHN/THWN-2 Copper (per foot)",                      unit: "FT", unitPrice: 0.48 },
  { id: "wir-thhn-6cu",            category: "Wire & Cable", description: "#6 AWG THHN/THWN-2 Copper (per foot)",                      unit: "FT", unitPrice: 0.78 },
  { id: "wir-thhn-4cu",            category: "Wire & Cable", description: "#4 AWG THHN/THWN-2 Copper (per foot)",                      unit: "FT", unitPrice: 1.22 },
  { id: "wir-thhn-3cu",            category: "Wire & Cable", description: "#3 AWG THHN/THWN-2 Copper (per foot)",                      unit: "FT", unitPrice: 1.55 },
  { id: "wir-thhn-2cu",            category: "Wire & Cable", description: "#2 AWG THHN/THWN-2 Copper (per foot)",                      unit: "FT", unitPrice: 1.95 },
  { id: "wir-thhn-1cu",            category: "Wire & Cable", description: "#1 AWG THHN/THWN-2 Copper (per foot)",                      unit: "FT", unitPrice: 2.55 },
  { id: "wir-thhn-1/0cu",          category: "Wire & Cable", description: "#1/0 AWG THHN/THWN-2 Copper (per foot)",                    unit: "FT", unitPrice: 3.25 },
  { id: "wir-thhn-2/0cu",          category: "Wire & Cable", description: "#2/0 AWG THHN/THWN-2 Copper (per foot)",                    unit: "FT", unitPrice: 4.10 },
  { id: "wir-thhn-3/0cu",          category: "Wire & Cable", description: "#3/0 AWG THHN/THWN-2 Copper (per foot)",                    unit: "FT", unitPrice: 5.20 },
  { id: "wir-thhn-4/0cu",          category: "Wire & Cable", description: "#4/0 AWG THHN/THWN-2 Copper (per foot)",                    unit: "FT", unitPrice: 6.55 },
  { id: "wir-thhn-250cu",          category: "Wire & Cable", description: "250 KCMIL THHN/THWN-2 Copper (per foot)",                   unit: "FT", unitPrice: 8.20 },
  { id: "wir-thhn-300cu",          category: "Wire & Cable", description: "300 KCMIL THHN/THWN-2 Copper (per foot)",                   unit: "FT", unitPrice: 9.85 },
  { id: "wir-thhn-350cu",          category: "Wire & Cable", description: "350 KCMIL THHN/THWN-2 Copper (per foot)",                   unit: "FT", unitPrice: 11.50 },
  { id: "wir-thhn-400cu",          category: "Wire & Cable", description: "400 KCMIL THHN/THWN-2 Copper (per foot)",                   unit: "FT", unitPrice: 13.20 },
  { id: "wir-thhn-500cu",          category: "Wire & Cable", description: "500 KCMIL THHN/THWN-2 Copper (per foot)",                   unit: "FT", unitPrice: 16.50 },

  // ── THHN/THWN-2 Aluminum — per foot ──────────────────────────────────────
  { id: "wir-thhn-6al",            category: "Wire & Cable", description: "#6 AWG THHN/THWN-2 Aluminum (per foot)",                    unit: "FT", unitPrice: 0.28 },
  { id: "wir-thhn-4al",            category: "Wire & Cable", description: "#4 AWG THHN/THWN-2 Aluminum (per foot)",                    unit: "FT", unitPrice: 0.42 },
  { id: "wir-thhn-2al",            category: "Wire & Cable", description: "#2 AWG THHN/THWN-2 Aluminum (per foot)",                    unit: "FT", unitPrice: 0.65 },
  { id: "wir-thhn-1al",            category: "Wire & Cable", description: "#1 AWG THHN/THWN-2 Aluminum (per foot)",                    unit: "FT", unitPrice: 0.85 },
  { id: "wir-thhn-1/0al",          category: "Wire & Cable", description: "#1/0 AWG THHN/THWN-2 Aluminum (per foot)",                  unit: "FT", unitPrice: 1.10 },
  { id: "wir-thhn-2/0al",          category: "Wire & Cable", description: "#2/0 AWG THHN/THWN-2 Aluminum (per foot)",                  unit: "FT", unitPrice: 1.38 },
  { id: "wir-thhn-3/0al",          category: "Wire & Cable", description: "#3/0 AWG THHN/THWN-2 Aluminum (per foot)",                  unit: "FT", unitPrice: 1.72 },
  { id: "wir-thhn-4/0al",          category: "Wire & Cable", description: "#4/0 AWG THHN/THWN-2 Aluminum (per foot)",                  unit: "FT", unitPrice: 2.15 },
  { id: "wir-thhn-250al",          category: "Wire & Cable", description: "250 KCMIL THHN/THWN-2 Aluminum (per foot)",                 unit: "FT", unitPrice: 2.65 },
  { id: "wir-thhn-350al",          category: "Wire & Cable", description: "350 KCMIL THHN/THWN-2 Aluminum (per foot)",                 unit: "FT", unitPrice: 3.75 },
  { id: "wir-thhn-500al",          category: "Wire & Cable", description: "500 KCMIL THHN/THWN-2 Aluminum (per foot)",                 unit: "FT", unitPrice: 5.25 },
  { id: "wir-thhn-750al",          category: "Wire & Cable", description: "750 KCMIL THHN/THWN-2 Aluminum (per foot)",                 unit: "FT", unitPrice: 7.85 },

  // ── NM-B (Romex) — per foot ───────────────────────────────────────────────
  { id: "wir-nmb-14-2",            category: "Wire & Cable", description: "14/2 NM-B w/Ground Romex (per foot)",                       unit: "FT", unitPrice: 0.28 },
  { id: "wir-nmb-14-3",            category: "Wire & Cable", description: "14/3 NM-B w/Ground Romex (per foot)",                       unit: "FT", unitPrice: 0.42 },
  { id: "wir-nmb-12-2",            category: "Wire & Cable", description: "12/2 NM-B w/Ground Romex (per foot)",                       unit: "FT", unitPrice: 0.38 },
  { id: "wir-nmb-12-3",            category: "Wire & Cable", description: "12/3 NM-B w/Ground Romex (per foot)",                       unit: "FT", unitPrice: 0.58 },
  { id: "wir-nmb-10-2",            category: "Wire & Cable", description: "10/2 NM-B w/Ground Romex (per foot)",                       unit: "FT", unitPrice: 0.62 },
  { id: "wir-nmb-10-3",            category: "Wire & Cable", description: "10/3 NM-B w/Ground Romex (per foot)",                       unit: "FT", unitPrice: 0.92 },
  { id: "wir-nmb-8-2",             category: "Wire & Cable", description: "8/2 NM-B w/Ground Romex (per foot)",                        unit: "FT", unitPrice: 1.15 },
  { id: "wir-nmb-8-3",             category: "Wire & Cable", description: "8/3 NM-B w/Ground Romex (per foot)",                        unit: "FT", unitPrice: 1.65 },
  { id: "wir-nmb-6-2",             category: "Wire & Cable", description: "6/2 NM-B w/Ground Romex (per foot)",                        unit: "FT", unitPrice: 1.85 },
  { id: "wir-nmb-6-3",             category: "Wire & Cable", description: "6/3 NM-B w/Ground Romex (per foot)",                        unit: "FT", unitPrice: 2.65 },

  // ── MC Cable — per foot ───────────────────────────────────────────────────
  { id: "wir-mc-14-2",             category: "Wire & Cable", description: "14/2 MC Cable w/Ground (per foot)",                         unit: "FT", unitPrice: 0.45 },
  { id: "wir-mc-14-3",             category: "Wire & Cable", description: "14/3 MC Cable w/Ground (per foot)",                         unit: "FT", unitPrice: 0.65 },
  { id: "wir-mc-12-2",             category: "Wire & Cable", description: "12/2 MC Cable w/Ground (per foot)",                         unit: "FT", unitPrice: 0.58 },
  { id: "wir-mc-12-3",             category: "Wire & Cable", description: "12/3 MC Cable w/Ground (per foot)",                         unit: "FT", unitPrice: 0.82 },
  { id: "wir-mc-12-4",             category: "Wire & Cable", description: "12/4 MC Cable w/Ground (per foot)",                         unit: "FT", unitPrice: 1.05 },
  { id: "wir-mc-10-2",             category: "Wire & Cable", description: "10/2 MC Cable w/Ground (per foot)",                         unit: "FT", unitPrice: 0.88 },
  { id: "wir-mc-10-3",             category: "Wire & Cable", description: "10/3 MC Cable w/Ground (per foot)",                         unit: "FT", unitPrice: 1.25 },
  { id: "wir-mc-8-2",              category: "Wire & Cable", description: "8/2 MC Cable w/Ground (per foot)",                          unit: "FT", unitPrice: 1.55 },
  { id: "wir-mc-8-3",              category: "Wire & Cable", description: "8/3 MC Cable w/Ground (per foot)",                          unit: "FT", unitPrice: 2.15 },
  { id: "wir-mc-6-2",              category: "Wire & Cable", description: "6/2 MC Cable w/Ground (per foot)",                          unit: "FT", unitPrice: 2.45 },
  { id: "wir-mc-6-3",              category: "Wire & Cable", description: "6/3 MC Cable w/Ground (per foot)",                          unit: "FT", unitPrice: 3.25 },
  { id: "wir-mc-4-3",              category: "Wire & Cable", description: "4/3 MC Cable w/Ground (per foot)",                          unit: "FT", unitPrice: 4.85 },
  { id: "wir-mc-2-3",              category: "Wire & Cable", description: "2/3 MC Cable w/Ground (per foot)",                          unit: "FT", unitPrice: 7.50 },
  { id: "wir-mc-2-4",              category: "Wire & Cable", description: "2/4 MC Cable w/Ground (per foot)",                          unit: "FT", unitPrice: 9.50 },

  // ── MC Cable Connectors ───────────────────────────────────────────────────
  { id: "wir-mc-conn-3/8",         category: "Wire & Cable", description: "3/8\" MC Cable Connector",                                  unit: "EA", unitPrice: 1.25 },
  { id: "wir-mc-conn-1/2",         category: "Wire & Cable", description: "1/2\" MC Cable Connector",                                  unit: "EA", unitPrice: 1.55 },
  { id: "wir-mc-conn-3/4",         category: "Wire & Cable", description: "3/4\" MC Cable Connector",                                  unit: "EA", unitPrice: 2.25 },
  { id: "wir-mc-conn-1",           category: "Wire & Cable", description: "1\" MC Cable Connector",                                    unit: "EA", unitPrice: 3.50 },

  // ── Service Entrance / SER Cable ──────────────────────────────────────────
  { id: "wir-ser-100a",            category: "Wire & Cable", description: "100A SER Service Entrance Cable 2-2-2-4 (per foot)",        unit: "FT", unitPrice: 3.85 },
  { id: "wir-ser-150a", category: "Wire & Cable", description: '150A SER Service Entrance Cable 1/0-1/0-1/0-2 (per foot)', unit: "FT", unitPrice: 5.50 },
  { id: "wir-ser-200a", category: "Wire & Cable", description: '200A SER Service Entrance Cable 2/0-2/0-2/0-4 (per foot)', unit: "FT", unitPrice: 7.25 },
  { id: "wir-se-100a",             category: "Wire & Cable", description: "100A SE Style R Service Entrance Cable (per foot)",         unit: "FT", unitPrice: 3.25 },
  { id: "wir-se-200a",             category: "Wire & Cable", description: "200A SE Style R Service Entrance Cable (per foot)",         unit: "FT", unitPrice: 6.50 },

  // ── URD / USE-2 Underground Cable ─────────────────────────────────────────
  { id: "wir-urd-2cu",             category: "Wire & Cable", description: "#2 AWG URD Copper Underground Distribution (per foot)",     unit: "FT", unitPrice: 2.25 },
  { id: "wir-urd-1/0cu",           category: "Wire & Cable", description: "#1/0 AWG URD Copper Underground (per foot)",                unit: "FT", unitPrice: 3.65 },
  { id: "wir-urd-2/0al",           category: "Wire & Cable", description: "#2/0 AWG URD Aluminum Underground (per foot)",              unit: "FT", unitPrice: 1.85 },
  { id: "wir-urd-4/0al",           category: "Wire & Cable", description: "#4/0 AWG URD Aluminum Underground (per foot)",              unit: "FT", unitPrice: 2.85 },
  { id: "wir-urd-350al",           category: "Wire & Cable", description: "350 KCMIL URD Aluminum Underground (per foot)",             unit: "FT", unitPrice: 4.65 },
  { id: "wir-use2-6cu",            category: "Wire & Cable", description: "#6 AWG USE-2 Copper Underground (per foot)",                unit: "FT", unitPrice: 0.95 },
  { id: "wir-use2-4cu",            category: "Wire & Cable", description: "#4 AWG USE-2 Copper Underground (per foot)",                unit: "FT", unitPrice: 1.45 },
  { id: "wir-use2-2cu",            category: "Wire & Cable", description: "#2 AWG USE-2 Copper Underground (per foot)",                unit: "FT", unitPrice: 2.25 },

  // ── Bare Copper Ground Wire ───────────────────────────────────────────────
  { id: "wir-bare-14cu",           category: "Wire & Cable", description: "#14 AWG Bare Copper Ground Wire (per foot)",                unit: "FT", unitPrice: 0.08 },
  { id: "wir-bare-12cu",           category: "Wire & Cable", description: "#12 AWG Bare Copper Ground Wire (per foot)",                unit: "FT", unitPrice: 0.12 },
  { id: "wir-bare-10cu",           category: "Wire & Cable", description: "#10 AWG Bare Copper Ground Wire (per foot)",                unit: "FT", unitPrice: 0.18 },
  { id: "wir-bare-8cu",            category: "Wire & Cable", description: "#8 AWG Bare Copper Ground Wire (per foot)",                 unit: "FT", unitPrice: 0.32 },
  { id: "wir-bare-6cu",            category: "Wire & Cable", description: "#6 AWG Bare Copper Ground Wire (per foot)",                 unit: "FT", unitPrice: 0.55 },
  { id: "wir-bare-4cu",            category: "Wire & Cable", description: "#4 AWG Bare Copper Ground Wire (per foot)",                 unit: "FT", unitPrice: 0.88 },
  { id: "wir-bare-2cu",            category: "Wire & Cable", description: "#2 AWG Bare Copper Ground Wire (per foot)",                 unit: "FT", unitPrice: 1.45 },

  // ── Low-Voltage / Control Wire ────────────────────────────────────────────
  { id: "wir-lv-18-2",             category: "Wire & Cable", description: "18/2 Low-Voltage Thermostat Wire (per foot)",               unit: "FT", unitPrice: 0.08 },
  { id: "wir-lv-18-5",             category: "Wire & Cable", description: "18/5 Low-Voltage Thermostat Wire (per foot)",               unit: "FT", unitPrice: 0.14 },
  { id: "wir-lv-18-8",             category: "Wire & Cable", description: "18/8 Low-Voltage Control Wire (per foot)",                  unit: "FT", unitPrice: 0.22 },
  { id: "wir-lv-cat6",             category: "Wire & Cable", description: "Cat6 UTP Data Cable (per foot)",                            unit: "FT", unitPrice: 0.18 },
  { id: "wir-lv-cat6a",            category: "Wire & Cable", description: "Cat6A UTP Data Cable (per foot)",                           unit: "FT", unitPrice: 0.32 },
  { id: "wir-lv-coax-rg6",         category: "Wire & Cable", description: "RG-6 Coaxial Cable (per foot)",                             unit: "FT", unitPrice: 0.12 },
  { id: "wir-lv-coax-rg11",        category: "Wire & Cable", description: "RG-11 Coaxial Cable (per foot)",                            unit: "FT", unitPrice: 0.28 },
  { id: "wir-lv-fiber-sm-2",       category: "Wire & Cable", description: "2-Strand Single-Mode Fiber Optic Cable (per foot)",         unit: "FT", unitPrice: 0.45 },
  { id: "wir-lv-fiber-sm-6",       category: "Wire & Cable", description: "6-Strand Single-Mode Fiber Optic Cable (per foot)",         unit: "FT", unitPrice: 0.85 },
  { id: "wir-lv-speaker-16-2",     category: "Wire & Cable", description: "16/2 Speaker Wire (per foot)",                              unit: "FT", unitPrice: 0.08 },

  // ═══════════════════════════════════════════════════════════════════════════
  // BOXES & ENCLOSURES
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Single-Gang Outlet Boxes ──────────────────────────────────────────────
  { id: "box-sg-sw-1900",          category: "Boxes & Enclosures", description: "Single-Gang Steel Switch Box 1-7/8\" Deep",           unit: "EA", unitPrice: 1.25, searchAliases: "1900 device box outlet box single gang" },
  { id: "box-sg-sw-2-1/2",         category: "Boxes & Enclosures", description: "Single-Gang Steel Switch Box 2-1/2\" Deep",           unit: "EA", unitPrice: 1.45 },
  { id: "box-sg-sw-3-1/2",         category: "Boxes & Enclosures", description: "Single-Gang Steel Switch Box 3-1/2\" Deep",           unit: "EA", unitPrice: 1.65 },
  { id: "box-sg-pvc-1-1/2",        category: "Boxes & Enclosures", description: "Single-Gang PVC Switch Box 1-1/2\" Deep",             unit: "EA", unitPrice: 0.65 },
  { id: "box-sg-pvc-2-1/2",        category: "Boxes & Enclosures", description: "Single-Gang PVC Switch Box 2-1/2\" Deep",             unit: "EA", unitPrice: 0.85 },
  { id: "box-sg-old-work",         category: "Boxes & Enclosures", description: "Single-Gang Old Work Plastic Box with Wings",         unit: "EA", unitPrice: 1.15 },
  { id: "box-sg-new-work-nail",     category: "Boxes & Enclosures", description: "Single-Gang New Work Plastic Box with Nails",        unit: "EA", unitPrice: 0.85 },

  // ── Double-Gang Outlet Boxes ──────────────────────────────────────────────
  { id: "box-dg-steel-2-1/2",      category: "Boxes & Enclosures", description: "Double-Gang Steel Box 2-1/2\" Deep",                  unit: "EA", unitPrice: 2.25 },
  { id: "box-dg-pvc-2-1/2",        category: "Boxes & Enclosures", description: "Double-Gang PVC Box 2-1/2\" Deep",                    unit: "EA", unitPrice: 1.25 },
  { id: "box-dg-old-work",         category: "Boxes & Enclosures", description: "Double-Gang Old Work Plastic Box",                    unit: "EA", unitPrice: 1.85 },
  { id: "box-dg-new-work-nail",     category: "Boxes & Enclosures", description: "Double-Gang New Work Plastic Box with Nails",        unit: "EA", unitPrice: 1.45 },

  // ── 4-Inch Square Boxes ───────────────────────────────────────────────────
  { id: "box-4sq-1-1/2",           category: "Boxes & Enclosures", description: "4\" Square Steel Box 1-1/2\" Deep",                   unit: "EA", unitPrice: 2.85, searchAliases: "4 square 4s four square 4x4 jbox junction box" },
  { id: "box-4sq-2-1/8",           category: "Boxes & Enclosures", description: "4\" Square Steel Box 2-1/8\" Deep",                   unit: "EA", unitPrice: 3.25, searchAliases: "4 square 4s four square 4x4 jbox junction box deep" },
  { id: "box-4sq-pvc-1-1/2",       category: "Boxes & Enclosures", description: "4\" Square PVC Box 1-1/2\" Deep",                     unit: "EA", unitPrice: 1.85 },

  // ── 4-Inch Square Mud Rings ───────────────────────────────────────────────
  { id: "box-mudring-sg-1/2",      category: "Boxes & Enclosures", description: "4\" Square to Single-Gang Mud Ring 1/2\" Raised",     unit: "EA", unitPrice: 1.25 },
  { id: "box-mudring-sg-5/8",      category: "Boxes & Enclosures", description: "4\" Square to Single-Gang Mud Ring 5/8\" Raised",     unit: "EA", unitPrice: 1.25 },
  { id: "box-mudring-sg-1",        category: "Boxes & Enclosures", description: "4\" Square to Single-Gang Mud Ring 1\" Raised",       unit: "EA", unitPrice: 1.35 },
  { id: "box-mudring-dg-1/2",      category: "Boxes & Enclosures", description: "4\" Square to Double-Gang Mud Ring 1/2\" Raised",     unit: "EA", unitPrice: 1.45 },
  { id: "box-mudring-dg-5/8",      category: "Boxes & Enclosures", description: "4\" Square to Double-Gang Mud Ring 5/8\" Raised",     unit: "EA", unitPrice: 1.45 },
  { id: "box-mudring-dg-1",        category: "Boxes & Enclosures", description: "4\" Square to Double-Gang Mud Ring 1\" Raised",       unit: "EA", unitPrice: 1.55 },
  { id: "box-mudring-round-1/2",   category: "Boxes & Enclosures", description: "4\" Square to Round Mud Ring 1/2\" Raised",           unit: "EA", unitPrice: 1.25 },
  { id: "box-mudring-round-1",     category: "Boxes & Enclosures", description: "4\" Square to Round Mud Ring 1\" Raised",             unit: "EA", unitPrice: 1.35 },

  // ── 4-11/16\" Square Boxes ────────────────────────────────────────────────
  { id: "box-4-11/16-2-1/8",       category: "Boxes & Enclosures", description: "4-11/16\" Square Steel Box 2-1/8\" Deep",             unit: "EA", unitPrice: 4.50, searchAliases: "4 square 4s four square 411 4x4 big square large square jbox junction box" },
  { id: "box-4-11/16-mudring-sg",  category: "Boxes & Enclosures", description: "4-11/16\" to Single-Gang Mud Ring",                   unit: "EA", unitPrice: 1.85 },
  { id: "box-4-11/16-mudring-dg",  category: "Boxes & Enclosures", description: "4-11/16\" to Double-Gang Mud Ring",                   unit: "EA", unitPrice: 2.25 },

  // ── Octagon / Round Boxes ─────────────────────────────────────────────────
  { id: "box-oct-4-1-1/2",         category: "Boxes & Enclosures", description: "4\" Octagon Steel Box 1-1/2\" Deep",                  unit: "EA", unitPrice: 2.25, searchAliases: "oct box round box ceiling box fan box pancake" },
  { id: "box-oct-4-2-1/8",         category: "Boxes & Enclosures", description: "4\" Octagon Steel Box 2-1/8\" Deep",                  unit: "EA", unitPrice: 2.65 },
  { id: "box-oct-4-bar-hanger",    category: "Boxes & Enclosures", description: "4\" Octagon Box with Bar Hanger",                     unit: "EA", unitPrice: 4.25 },
  { id: "box-oct-4-pvc",           category: "Boxes & Enclosures", description: "4\" Octagon PVC Box 1-1/2\" Deep",                    unit: "EA", unitPrice: 1.45 },
  { id: "box-round-4-pancake",     category: "Boxes & Enclosures", description: "4\" Round Pancake Box 1/2\" Deep",                    unit: "EA", unitPrice: 1.85 },
  { id: "box-round-4-fan-rated",   category: "Boxes & Enclosures", description: "4\" Round Fan-Rated Ceiling Box",                     unit: "EA", unitPrice: 5.50 },
  { id: "box-round-4-fan-brace",   category: "Boxes & Enclosures", description: "Adjustable Fan/Light Brace with Box",                 unit: "EA", unitPrice: 12.00 },

  // ── Weatherproof Boxes ────────────────────────────────────────────────────
  { id: "box-wp-sg-1g",            category: "Boxes & Enclosures", description: "Single-Gang Weatherproof Box",                        unit: "EA", unitPrice: 2.85 },
  { id: "box-wp-dg-2g",            category: "Boxes & Enclosures", description: "Double-Gang Weatherproof Box",                        unit: "EA", unitPrice: 3.85 },
  { id: "box-wp-cover-1g-gfci",    category: "Boxes & Enclosures", description: "1-Gang In-Use Weatherproof Cover (GFCI/Duplex)",      unit: "EA", unitPrice: 4.50 },
  { id: "box-wp-cover-2g",         category: "Boxes & Enclosures", description: "2-Gang In-Use Weatherproof Cover",                    unit: "EA", unitPrice: 5.50 },
  { id: "box-wp-cover-1g-blank",   category: "Boxes & Enclosures", description: "1-Gang Weatherproof Blank Cover",                     unit: "EA", unitPrice: 2.25 },
  { id: "box-wp-cover-toggle",     category: "Boxes & Enclosures", description: "1-Gang Weatherproof Toggle Switch Cover",             unit: "EA", unitPrice: 3.25 },

  // ── FS

  // ── FS/FD Cast Boxes ──────────────────────────────────────────────────────
  { id: "box-fs-sg",               category: "Boxes & Enclosures", description: "FS Single-Gang Cast Box",                              unit: "EA", unitPrice: 5.50, searchAliases: "cast box surface mount conduit box industrial box" },
  { id: "box-fs-dg",               category: "Boxes & Enclosures", description: "FS Double-Gang Cast Box",                              unit: "EA", unitPrice: 7.50 },
  { id: "box-fd-sg",               category: "Boxes & Enclosures", description: "FD Single-Gang Cast Box (Deep)",                       unit: "EA", unitPrice: 6.50 },
  { id: "box-fd-dg",               category: "Boxes & Enclosures", description: "FD Double-Gang Cast Box (Deep)",                       unit: "EA", unitPrice: 8.50 },

  // ── Pull Boxes / Junction Boxes ───────────────────────────────────────────
  { id: "box-pull-4x4x4",          category: "Boxes & Enclosures", description: "4″x4″x4″ Steel Pull Box NEMA 1",                  unit: "EA", unitPrice: 8.50 },
  { id: "box-pull-6x6x4",          category: "Boxes & Enclosures", description: "6″x6″x4″ Steel Pull Box NEMA 1",                  unit: "EA", unitPrice: 12.00 },
  { id: "box-pull-8x8x4",          category: "Boxes & Enclosures", description: "8″x8″x4″ Steel Pull Box NEMA 1",                  unit: "EA", unitPrice: 16.00 },
  { id: "box-pull-12x12x6",        category: "Boxes & Enclosures", description: "12″x12″x6″ Steel Pull Box NEMA 1",                unit: "EA", unitPrice: 28.00 },
  { id: "box-pull-24x24x8",        category: "Boxes & Enclosures", description: "24″x24″x8″ Steel Pull Box NEMA 1",                unit: "EA", unitPrice: 75.00 },
  { id: "box-pull-6x6x4-nema3r",   category: "Boxes & Enclosures", description: "6\"x6\"x4\" Steel Pull Box NEMA 3R Outdoor",           unit: "EA", unitPrice: 18.00 },
  { id: "box-pull-12x12x6-nema3r", category: "Boxes & Enclosures", description: "12\"x12\"x6\" Steel Pull Box NEMA 3R Outdoor",         unit: "EA", unitPrice: 38.00 },
  { id: "box-pull-4x4x4-pvc",      category: "Boxes & Enclosures", description: "4\"x4\"x4\" PVC Pull Box",                             unit: "EA", unitPrice: 5.50 },
  { id: "box-pull-6x6x4-pvc",      category: "Boxes & Enclosures", description: "6\"x6\"x4\" PVC Pull Box",                             unit: "EA", unitPrice: 8.50 },
  { id: "box-pull-12x12x6-pvc",    category: "Boxes & Enclosures", description: "12\"x12\"x6\" PVC Pull Box",                           unit: "EA", unitPrice: 18.00 },

  // ── Handy Boxes ───────────────────────────────────────────────────────────
  { id: "box-handy-1-1/2",         category: "Boxes & Enclosures", description: "Handy Box 4\" x 2-1/8\" x 1-1/2\" Steel",             unit: "EA", unitPrice: 1.85, searchAliases: "utility box handy 2x4 box" },
  { id: "box-handy-2-1/8",         category: "Boxes & Enclosures", description: "Handy Box 4\" x 2-1/8\" x 2-1/8\" Steel",             unit: "EA", unitPrice: 2.25 },
  { id: "box-handy-cover-blank",   category: "Boxes & Enclosures", description: "Handy Box Blank Cover",                                unit: "EA", unitPrice: 0.85 },
  { id: "box-handy-cover-sg",      category: "Boxes & Enclosures", description: "Handy Box Single-Gang Cover",                          unit: "EA", unitPrice: 0.95 },

  // ═══════════════════════════════════════════════════════════════════════════
  // SUPPORTS & FASTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Unistrut / Slotted Channel ────────────────────────────────────────────
  { id: "sup-strut-1-5/8-12g-10ft",category: "Supports & Fasteners", description: "1-5/8\" x 1-5/8\" Slotted Strut Channel 12-Gauge 10ft",  unit: "EA", unitPrice: 18.00 },
  { id: "sup-strut-1-5/8-14g-10ft",category: "Supports & Fasteners", description: "1-5/8\" x 1-5/8\" Slotted Strut Channel 14-Gauge 10ft",  unit: "EA", unitPrice: 14.00 },
  { id: "sup-strut-1-5/8-half-10ft",category: "Supports & Fasteners", description: "1-5/8\" x 13/16\" Half-Slot Strut Channel 10ft",         unit: "EA", unitPrice: 11.00 },
  { id: "sup-strut-2-3/8-10ft",    category: "Supports & Fasteners", description: "2-3/8\" x 1-5/8\" Deep Slotted Strut Channel 10ft",       unit: "EA", unitPrice: 24.00 },
  { id: "sup-strut-nut-3/8",       category: "Supports & Fasteners", description: "3/8\" Strut Nut (Spring Nut) (25-pack)",                   unit: "PK", unitPrice: 8.50 },
  { id: "sup-strut-nut-1/2",       category: "Supports & Fasteners", description: "1/2\" Strut Nut (Spring Nut) (25-pack)",                   unit: "PK", unitPrice: 10.00 },
  { id: "sup-strut-clamp-1/2",     category: "Supports & Fasteners", description: "1/2\" EMT Strut Clamp",                                    unit: "EA", unitPrice: 0.85 },
  { id: "sup-strut-clamp-3/4",     category: "Supports & Fasteners", description: "3/4\" EMT Strut Clamp",                                    unit: "EA", unitPrice: 0.95 },
  { id: "sup-strut-clamp-1",       category: "Supports & Fasteners", description: "1\" EMT Strut Clamp",                                      unit: "EA", unitPrice: 1.25 },
  { id: "sup-strut-clamp-1-1/2",   category: "Supports & Fasteners", description: "1-1/2\" EMT Strut Clamp",                                  unit: "EA", unitPrice: 1.85 },
  { id: "sup-strut-clamp-2",       category: "Supports & Fasteners", description: "2\" EMT Strut Clamp",                                      unit: "EA", unitPrice: 2.65 },
  { id: "sup-strut-clamp-3",       category: "Supports & Fasteners", description: "3\" EMT Strut Clamp",                                      unit: "EA", unitPrice: 4.50 },
  { id: "sup-strut-clamp-4",       category: "Supports & Fasteners", description: "4\" EMT Strut Clamp",                                      unit: "EA", unitPrice: 6.50 },
  { id: "sup-strut-angle-90",      category: "Supports & Fasteners", description: "Strut 90-Degree Angle Bracket",                            unit: "EA", unitPrice: 3.50 },
  { id: "sup-strut-flat-plate",    category: "Supports & Fasteners", description: "Strut Flat Plate Connector",                               unit: "EA", unitPrice: 2.85 },
  { id: "sup-strut-beam-clamp",    category: "Supports & Fasteners", description: "Strut Beam Clamp 3/8\"",                                   unit: "EA", unitPrice: 3.25 },
  { id: "sup-strut-closure-strip", category: "Supports & Fasteners", description: "Strut Closure Strip 10ft",                                 unit: "EA", unitPrice: 4.50 },

  // ── Threaded Rod ──────────────────────────────────────────────────────────
  { id: "sup-rod-3/8-10ft",        category: "Supports & Fasteners", description: "3/8\" Threaded Rod 10ft",                                  unit: "EA", unitPrice: 6.50 },
  { id: "sup-rod-1/2-10ft",        category: "Supports & Fasteners", description: "1/2\" Threaded Rod 10ft",                                  unit: "EA", unitPrice: 9.50 },
  { id: "sup-rod-5/8-10ft",        category: "Supports & Fasteners", description: "5/8\" Threaded Rod 10ft",                                  unit: "EA", unitPrice: 14.00 },
  { id: "sup-rod-3/4-10ft",        category: "Supports & Fasteners", description: "3/4\" Threaded Rod 10ft",                                  unit: "EA", unitPrice: 18.00 },
  { id: "sup-rod-coupler-3/8",     category: "Supports & Fasteners", description: "3/8\" Threaded Rod Coupling Nut",                          unit: "EA", unitPrice: 0.85 },
  { id: "sup-rod-coupler-1/2",     category: "Supports & Fasteners", description: "1/2\" Threaded Rod Coupling Nut",                          unit: "EA", unitPrice: 1.25 },
  { id: "sup-rod-anchor-3/8",      category: "Supports & Fasteners", description: "3/8\" Drop-In Anchor (25-pack)",                           unit: "PK", unitPrice: 18.00 },
  { id: "sup-rod-anchor-1/2",      category: "Supports & Fasteners", description: "1/2\" Drop-In Anchor (25-pack)",                           unit: "PK", unitPrice: 24.00 },
  { id: "sup-rod-hanger-3/8",      category: "Supports & Fasteners", description: "3/8\" Conduit Hanger for Threaded Rod",                    unit: "EA", unitPrice: 1.25 },
  { id: "sup-rod-hanger-1/2",      category: "Supports & Fasteners", description: "1/2\" Conduit Hanger for Threaded Rod",                    unit: "EA", unitPrice: 1.45 },

  // ── One-Hole / Two-Hole Straps ────────────────────────────────────────────
  { id: "sup-strap-1h-1/2",        category: "Supports & Fasteners", description: "1/2\" EMT One-Hole Strap (100-pack)",                      unit: "BX", unitPrice: 12.00 },
  { id: "sup-strap-1h-3/4",        category: "Supports & Fasteners", description: "3/4\" EMT One-Hole Strap (100-pack)",                      unit: "BX", unitPrice: 14.00 },
  { id: "sup-strap-1h-1",          category: "Supports & Fasteners", description: "1\" EMT One-Hole Strap (50-pack)",                         unit: "BX", unitPrice: 12.00 },
  { id: "sup-strap-1h-1-1/2",      category: "Supports & Fasteners", description: "1-1/2\" EMT One-Hole Strap (50-pack)",                     unit: "BX", unitPrice: 16.00 },
  { id: "sup-strap-1h-2",          category: "Supports & Fasteners", description: "2\" EMT One-Hole Strap (25-pack)",                         unit: "BX", unitPrice: 12.00 },
  { id: "sup-strap-2h-1/2",        category: "Supports & Fasteners", description: "1/2\" EMT Two-Hole Strap (50-pack)",                       unit: "BX", unitPrice: 10.00 },
  { id: "sup-strap-2h-3/4",        category: "Supports & Fasteners", description: "3/4\" EMT Two-Hole Strap (50-pack)",                       unit: "BX", unitPrice: 12.00 },
  { id: "sup-strap-2h-1",          category: "Supports & Fasteners", description: "1\" EMT Two-Hole Strap (25-pack)",                         unit: "BX", unitPrice: 10.00 },
  { id: "sup-strap-2h-1-1/2",      category: "Supports & Fasteners", description: "1-1/2\" EMT Two-Hole Strap (25-pack)",                     unit: "BX", unitPrice: 14.00 },
  { id: "sup-strap-2h-2",          category: "Supports & Fasteners", description: "2\" EMT Two-Hole Strap (25-pack)",                         unit: "BX", unitPrice: 16.00 },

  // ── NM-B / Romex Staples ──────────────────────────────────────────────────
  { id: "sup-staple-nm-1/2",       category: "Supports & Fasteners", description: "1/2\" NM-B Cable Staples (100-pack)",                      unit: "BX", unitPrice: 4.50 },
  { id: "sup-staple-nm-3/4",       category: "Supports & Fasteners", description: "3/4\" NM-B Cable Staples (100-pack)",                      unit: "BX", unitPrice: 5.50 },
  { id: "sup-staple-nm-1",         category: "Supports & Fasteners", description: "1\" NM-B Cable Staples (100-pack)",                        unit: "BX", unitPrice: 6.50 },
  { id: "sup-staple-mc-1/2",       category: "Supports & Fasteners", description: "1/2\" MC Cable Staples (100-pack)",                        unit: "BX", unitPrice: 5.50 },
  { id: "sup-staple-mc-3/4",       category: "Supports & Fasteners", description: "3/4\" MC Cable Staples (100-pack)",                        unit: "BX", unitPrice: 6.50 },

  // ── Wire Nuts & Connectors ────────────────────────────────────────────────
  { id: "sup-wirenut-red",         category: "Supports & Fasteners", description: "Red Wire Nuts (100-pack) #18-#12",                         unit: "BX", unitPrice: 6.50 },
  { id: "sup-wirenut-yellow",      category: "Supports & Fasteners", description: "Yellow Wire Nuts (100-pack) #18-#10",                      unit: "BX", unitPrice: 7.00 },
  { id: "sup-wirenut-orange",      category: "Supports & Fasteners", description: "Orange Wire Nuts (100-pack) #16-#6",                       unit: "BX", unitPrice: 7.50 },
  { id: "sup-wirenut-gray",        category: "Supports & Fasteners", description: "Gray Wire Nuts (100-pack) #14-#8",                         unit: "BX", unitPrice: 8.00 },
  { id: "sup-wirenut-tan",         category: "Supports & Fasteners", description: "Tan Wire Nuts (100-pack) #22-#16",                         unit: "BX", unitPrice: 6.00 },
  { id: "sup-wirenut-blue",        category: "Supports & Fasteners", description: "Blue Wire Nuts (100-pack) #22-#14",                        unit: "BX", unitPrice: 6.50 },
  { id: "sup-wirenut-purple",      category: "Supports & Fasteners", description: "Purple Wire Nuts (100-pack) #22-#18",                      unit: "BX", unitPrice: 5.50 },
  { id: "sup-wirenut-green",       category: "Supports & Fasteners", description: "Green Grounding Wire Nuts (100-pack)",                     unit: "BX", unitPrice: 8.50 },
  { id: "sup-wirenut-lever-2",     category: "Supports & Fasteners", description: "2-Port Lever Wago Connectors (50-pack)",                   unit: "BX", unitPrice: 18.00 },
  { id: "sup-wirenut-lever-3",     category: "Supports & Fasteners", description: "3-Port Lever Wago Connectors (50-pack)",                   unit: "BX", unitPrice: 22.00 },
  { id: "sup-wirenut-lever-5",     category: "Supports & Fasteners", description: "5-Port Lever Wago Connectors (50-pack)",                   unit: "BX", unitPrice: 28.00 },

  // ── Electrical Tape ───────────────────────────────────────────────────────
  { id: "sup-tape-elec-black",     category: "Supports & Fasteners", description: "Electrical Tape Black 3/4\" x 66ft (10-pack)",             unit: "PK", unitPrice: 12.00 },
  { id: "sup-tape-elec-color",     category: "Supports & Fasteners", description: "Electrical Tape Color-Coded Set 6-pack",                   unit: "PK", unitPrice: 9.50 },
  { id: "sup-tape-self-fusing",    category: "Supports & Fasteners", description: "Self-Fusing Silicone Tape 1\" x 10ft",                     unit: "EA", unitPrice: 8.50 },
  { id: "sup-tape-pull",           category: "Supports & Fasteners", description: "Fish Tape 100ft Steel",                                    unit: "EA", unitPrice: 35.00 },
  { id: "sup-pull-string",         category: "Supports & Fasteners", description: "Pull String/Mule Tape 500ft",                              unit: "EA", unitPrice: 18.00 },
  { id: "sup-lube-wire",           category: "Supports & Fasteners", description: "Wire Pulling Lubricant 1 Gallon",                          unit: "EA", unitPrice: 22.00 },
  { id: "sup-lube-wire-qt",        category: "Supports & Fasteners", description: "Wire Pulling Lubricant 1 Quart",                           unit: "EA", unitPrice: 8.50 },

  // ── Anchors & Fasteners ───────────────────────────────────────────────────
  { id: "sup-anchor-toggle-1/4",   category: "Supports & Fasteners", description: "1/4\" Toggle Bolt Anchor (50-pack)",                       unit: "BX", unitPrice: 12.00 },
  { id: "sup-anchor-toggle-3/8",   category: "Supports & Fasteners", description: "3/8\" Toggle Bolt Anchor (25-pack)",                       unit: "BX", unitPrice: 10.00 },
  { id: "sup-anchor-plastic-1/4",  category: "Supports & Fasteners", description: "1/4\" Plastic Anchor (100-pack)",                          unit: "BX", unitPrice: 5.50 },
  { id: "sup-anchor-concrete-3/8", category: "Supports & Fasteners", description: "3/8\" Concrete Wedge Anchor (25-pack)",                    unit: "BX", unitPrice: 18.00 },
  { id: "sup-anchor-concrete-1/2", category: "Supports & Fasteners", description: "1/2\" Concrete Wedge Anchor (25-pack)",                    unit: "BX", unitPrice: 24.00 },
  { id: "sup-screw-8x1-1/4",       category: "Supports & Fasteners", description: "#8x1-1/4\" Pan Head Screw (100-pack)",                     unit: "BX", unitPrice: 5.00 },
  { id: "sup-screw-10x1-1/2",      category: "Supports & Fasteners", description: "#10x1-1/2\" Pan Head Screw (100-pack)",                    unit: "BX", unitPrice: 6.00 },
  { id: "sup-screw-10x3/4-hex",    category: "Supports & Fasteners", description: "#10x3/4\" Hex Head Sheet Metal Screw (100-pack)",          unit: "BX", unitPrice: 5.50 },
  { id: "sup-screw-lag-3/8",       category: "Supports & Fasteners", description: "3/8\" Lag Screw 2\" (50-pack)",                            unit: "BX", unitPrice: 8.00 },
  { id: "sup-screw-lag-1/2",       category: "Supports & Fasteners", description: "1/2\" Lag Screw 3\" (25-pack)",                            unit: "BX", unitPrice: 9.50 },
  { id: "sup-beam-clamp-3/8",      category: "Supports & Fasteners", description: "3/8\" Beam Clamp for I-Beam",                              unit: "EA", unitPrice: 2.85 },
  { id: "sup-beam-clamp-1/2",      category: "Supports & Fasteners", description: "1/2\" Beam Clamp for I-Beam",                              unit: "EA", unitPrice: 3.50 },
  { id: "sup-j-hook-1",            category: "Supports & Fasteners", description: "1\" J-Hook Cable Support",                                 unit: "EA", unitPrice: 1.25 },
  { id: "sup-j-hook-2",            category: "Supports & Fasteners", description: "2\" J-Hook Cable Support",                                 unit: "EA", unitPrice: 1.65 },
  { id: "sup-j-hook-4",            category: "Supports & Fasteners", description: "4\" J-Hook Cable Support",                                 unit: "EA", unitPrice: 2.25 },
  { id: "sup-cable-tray-4",        category: "Supports & Fasteners", description: "4\" Wire Mesh Cable Tray 10ft",                            unit: "EA", unitPrice: 28.00 },
  { id: "sup-cable-tray-6",        category: "Supports & Fasteners", description: "6\" Wire Mesh Cable Tray 10ft",                            unit: "EA", unitPrice: 35.00 },
  { id: "sup-cable-tray-12",       category: "Supports & Fasteners", description: "12\" Wire Mesh Cable Tray 10ft",                           unit: "EA", unitPrice: 48.00 },
  { id: "sup-flex-strap-1/2",      category: "Supports & Fasteners", description: "1/2\" FMC/LFMC Strap (50-pack)",                           unit: "BX", unitPrice: 8.00 },
  { id: "sup-flex-strap-3/4",      category: "Supports & Fasteners", description: "3/4\" FMC/LFMC Strap (50-pack)",                           unit: "BX", unitPrice: 10.00 },
  { id: "sup-cord-grip-1/2",       category: "Supports & Fasteners", description: "1/2\" Strain Relief Cord Grip",                            unit: "EA", unitPrice: 1.80 },
  { id: "sup-cord-grip-3/4",       category: "Supports & Fasteners", description: "3/4\" Strain Relief Cord Grip",                            unit: "EA", unitPrice: 2.20 },
  { id: "sup-cord-grip-1",         category: "Supports & Fasteners", description: "1\" Strain Relief Cord Grip",                              unit: "EA", unitPrice: 3.20 },

  // ═══════════════════════════════════════════════════════════════════════════
  // DEVICES & TRIM
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Receptacles ───────────────────────────────────────────────────────────
  { id: "dev-rec-15a-125v-wh",     category: "Devices & Trim", description: "15A 125V Duplex Receptacle White",                          unit: "EA", unitPrice: 1.85, searchAliases: "outlet plug duplex 15 amp standard outlet" },
  { id: "dev-rec-20a-125v-wh",     category: "Devices & Trim", description: "20A 125V Duplex Receptacle White",                          unit: "EA", unitPrice: 2.45, searchAliases: "outlet plug duplex 20 amp T-slot" },
  { id: "dev-rec-15a-125v-iv",     category: "Devices & Trim", description: "15A 125V Duplex Receptacle Ivory",                          unit: "EA", unitPrice: 1.85 },
  { id: "dev-rec-20a-125v-iv",     category: "Devices & Trim", description: "20A 125V Duplex Receptacle Ivory",                          unit: "EA", unitPrice: 2.45 },
  { id: "dev-rec-15a-125v-al",     category: "Devices & Trim", description: "15A 125V Duplex Receptacle Almond",                         unit: "EA", unitPrice: 1.85 },
  { id: "dev-rec-20a-125v-al",     category: "Devices & Trim", description: "20A 125V Duplex Receptacle Almond",                         unit: "EA", unitPrice: 2.45 },
  { id: "dev-rec-20a-tt-wh",       category: "Devices & Trim", description: "20A 125V T-Slot Duplex Receptacle White",                   unit: "EA", unitPrice: 3.25 },
  { id: "dev-rec-30a-250v-2p",     category: "Devices & Trim", description: "30A 250V 2-Pole Dryer Receptacle NEMA 10-30R",              unit: "EA", unitPrice: 8.50 },
  { id: "dev-rec-30a-250v-3p",     category: "Devices & Trim", description: "30A 125/250V 3-Pole Dryer Receptacle NEMA 14-30R",          unit: "EA", unitPrice: 9.50 },
  { id: "dev-rec-50a-250v-3p",     category: "Devices & Trim", description: "50A 125/250V Range Receptacle NEMA 14-50R",                 unit: "EA", unitPrice: 12.00 },
  { id: "dev-rec-30a-rv",          category: "Devices & Trim", description: "30A RV Outlet NEMA TT-30R",                                 unit: "EA", unitPrice: 14.00 },
  { id: "dev-rec-50a-rv",          category: "Devices & Trim", description: "50A RV Outlet NEMA 14-50R",                                 unit: "EA", unitPrice: 18.00 },
  { id: "dev-rec-20a-hosp-wh",     category: "Devices & Trim", description: "20A Hospital Grade Receptacle White",                       unit: "EA", unitPrice: 12.00 },
  { id: "dev-rec-20a-hosp-red",    category: "Devices & Trim", description: "20A Hospital Grade Receptacle Red (Emergency)",             unit: "EA", unitPrice: 14.00 },
  { id: "dev-rec-usb-a-wh",        category: "Devices & Trim", description: "15A USB-A Duplex Receptacle White",                         unit: "EA", unitPrice: 14.00 },
  { id: "dev-rec-usb-c-wh",        category: "Devices & Trim", description: "15A USB-C Duplex Receptacle White",                         unit: "EA", unitPrice: 18.00 },
  { id: "dev-rec-usb-ac-wh",       category: "Devices & Trim", description: "15A USB-A+C Duplex Receptacle White",                       unit: "EA", unitPrice: 22.00 },

  // ── GFCI Receptacles ──────────────────────────────────────────────────────
  { id: "dev-gfci-15a-wh",         category: "Devices & Trim", description: "15A GFCI Receptacle White",                                 unit: "EA", unitPrice: 12.00, searchAliases: "GFI ground fault outlet bathroom kitchen garage" },
  { id: "dev-gfci-20a-wh",         category: "Devices & Trim", description: "20A GFCI Receptacle White",                                 unit: "EA", unitPrice: 14.00 },
  { id: "dev-gfci-15a-iv",         category: "Devices & Trim", description: "15A GFCI Receptacle Ivory",                                 unit: "EA", unitPrice: 12.00 },
  { id: "dev-gfci-20a-iv",         category: "Devices & Trim", description: "20A GFCI Receptacle Ivory",                                 unit: "EA", unitPrice: 14.00 },
  { id: "dev-gfci-15a-al",         category: "Devices & Trim", description: "15A GFCI Receptacle Almond",                                unit: "EA", unitPrice: 12.00 },
  { id: "dev-gfci-20a-wh-wp",      category: "Devices & Trim", description: "20A GFCI Receptacle White Weatherproof",                    unit: "EA", unitPrice: 18.00 },

  // ── Switches ──────────────────────────────────────────────────────────────
  { id: "dev-sw-sp-15a-wh",        category: "Devices & Trim", description: "15A Single-Pole Switch White",                              unit: "EA", unitPrice: 1.65 },
  { id: "dev-sw-sp-20a-wh",        category: "Devices & Trim", description: "20A Single-Pole Switch White",                              unit: "EA", unitPrice: 2.25 },
  { id: "dev-sw-3w-15a-wh",        category: "Devices & Trim", description: "15A 3-Way Switch White",                                    unit: "EA", unitPrice: 2.85 },
  { id: "dev-sw-3w-20a-wh",        category: "Devices & Trim", description: "20A 3-Way Switch White",                                    unit: "EA", unitPrice: 3.85 },
  { id: "dev-sw-4w-15a-wh",        category: "Devices & Trim", description: "15A 4-Way Switch White",                                    unit: "EA", unitPrice: 5.50 },
  { id: "dev-sw-sp-15a-iv",        category: "Devices & Trim", description: "15A Single-Pole Switch Ivory",                              unit: "EA", unitPrice: 1.65 },
  { id: "dev-sw-3w-15a-iv",        category: "Devices & Trim", description: "15A 3-Way Switch Ivory",                                    unit: "EA", unitPrice: 2.85 },
  { id: "dev-sw-sp-15a-al",        category: "Devices & Trim", description: "15A Single-Pole Switch Almond",                             unit: "EA", unitPrice: 1.65 },
  { id: "dev-sw-dimmer-sp-wh",     category: "Devices & Trim", description: "Single-Pole LED Dimmer Switch White",                       unit: "EA", unitPrice: 18.00 },
  { id: "dev-sw-dimmer-3w-wh",     category: "Devices & Trim", description: "3-Way LED Dimmer Switch White",                             unit: "EA", unitPrice: 24.00 },
  { id: "dev-sw-dimmer-smart",     category: "Devices & Trim", description: "Smart Wi-Fi Dimmer Switch (No Neutral)",                    unit: "EA", unitPrice: 38.00 },
  { id: "dev-sw-timer-sp",         category: "Devices & Trim", description: "Single-Pole 7-Day Digital Timer Switch",                    unit: "EA", unitPrice: 22.00 },
  { id: "dev-sw-motion-sp",        category: "Devices & Trim", description: "Single-Pole Occupancy/Motion Sensor Switch",                unit: "EA", unitPrice: 22.00 },
  { id: "dev-sw-sp-20a-commercial",category: "Devices & Trim", description: "20A Single-Pole Commercial Grade Switch White",             unit: "EA", unitPrice: 5.50 },
  { id: "dev-sw-3w-20a-commercial",category: "Devices & Trim", description: "20A 3-Way Commercial Grade Switch White",                   unit: "EA", unitPrice: 7.50 },
  { id: "dev-sw-pilot-sp-wh",      category: "Devices & Trim", description: "15A Single-Pole Pilot Light Switch White",                  unit: "EA", unitPrice: 8.50 },
  { id: "dev-sw-keyed-sp",         category: "Devices & Trim", description: "15A Single-Pole Keyed Switch",                              unit: "EA", unitPrice: 18.00 },

  // ── Decorator / Decora Devices ────────────────────────────────────────────
  { id: "dev-dec-rec-15a-wh",      category: "Devices & Trim", description: "15A Decora Duplex Receptacle White",                        unit: "EA", unitPrice: 2.25 },
  { id: "dev-dec-rec-20a-wh",      category: "Devices & Trim", description: "20A Decora Duplex Receptacle White",                        unit: "EA", unitPrice: 3.25 },
  { id: "dev-dec-gfci-15a-wh",     category: "Devices & Trim", description: "15A Decora GFCI Receptacle White",                          unit: "EA", unitPrice: 13.00 },
  { id: "dev-dec-gfci-20a-wh",     category: "Devices & Trim", description: "20A Decora GFCI Receptacle White",                          unit: "EA", unitPrice: 15.00 },
  { id: "dev-dec-sw-sp-wh",        category: "Devices & Trim", description: "15A Decora Single-Pole Switch White",                       unit: "EA", unitPrice: 2.25 },
  { id: "dev-dec-sw-3w-wh",        category: "Devices & Trim", description: "15A Decora 3-Way Switch White",                             unit: "EA", unitPrice: 3.85 },
  { id: "dev-dec-usb-c-wh",        category: "Devices & Trim", description: "Decora USB-C Charger Outlet White",                         unit: "EA", unitPrice: 22.00 },

  // ── Wall Plates / Cover Plates ────────────────────────────────────────────
  { id: "dev-plate-1g-blank-wh",   category: "Devices & Trim", description: "1-Gang Blank Wall Plate White",                             unit: "EA", unitPrice: 0.45 },
  { id: "dev-plate-1g-duplex-wh",  category: "Devices & Trim", description: "1-Gang Duplex Receptacle Wall Plate White",                 unit: "EA", unitPrice: 0.55 },
  { id: "dev-plate-1g-toggle-wh",  category: "Devices & Trim", description: "1-Gang Toggle Switch Wall Plate White",                     unit: "EA", unitPrice: 0.55 },
  { id: "dev-plate-1g-gfci-wh",    category: "Devices & Trim", description: "1-Gang GFCI Wall Plate White",                              unit: "EA", unitPrice: 0.65 },
  { id: "dev-plate-1g-decora-wh",  category: "Devices & Trim", description: "1-Gang Decora/Rocker Wall Plate White",                     unit: "EA", unitPrice: 0.65 },
  { id: "dev-plate-2g-duplex-wh",  category: "Devices & Trim", description: "2-Gang Duplex Receptacle Wall Plate White",                 unit: "EA", unitPrice: 0.85 },
  { id: "dev-plate-2g-toggle-wh",  category: "Devices & Trim", description: "2-Gang Toggle Switch Wall Plate White",                     unit: "EA", unitPrice: 0.85 },
  { id: "dev-plate-2g-decora-wh",  category: "Devices & Trim", description: "2-Gang Decora Wall Plate White",                            unit: "EA", unitPrice: 0.95 },
  { id: "dev-plate-3g-decora-wh",  category: "Devices & Trim", description: "3-Gang Decora Wall Plate White",                            unit: "EA", unitPrice: 1.25 },
  { id: "dev-plate-1g-blank-iv",   category: "Devices & Trim", description: "1-Gang Blank Wall Plate Ivory",                             unit: "EA", unitPrice: 0.45 },
  { id: "dev-plate-1g-duplex-iv",  category: "Devices & Trim", description: "1-Gang Duplex Receptacle Wall Plate Ivory",                 unit: "EA", unitPrice: 0.55 },
  { id: "dev-plate-1g-toggle-iv",  category: "Devices & Trim", description: "1-Gang Toggle Switch Wall Plate Ivory",                     unit: "EA", unitPrice: 0.55 },
  { id: "dev-plate-1g-decora-iv",  category: "Devices & Trim", description: "1-Gang Decora Wall Plate Ivory",                            unit: "EA", unitPrice: 0.65 },
  { id: "dev-plate-ss-1g-blank",   category: "Devices & Trim", description: "1-Gang Stainless Steel Blank Wall Plate",                   unit: "EA", unitPrice: 1.85 },
  { id: "dev-plate-ss-1g-duplex",  category: "Devices & Trim", description: "1-Gang Stainless Steel Duplex Wall Plate",                  unit: "EA", unitPrice: 2.25 },
  { id: "dev-plate-ss-1g-decora",  category: "Devices & Trim", description: "1-Gang Stainless Steel Decora Wall Plate",                  unit: "EA", unitPrice: 2.25 },
  { id: "dev-plate-4sq-blank",     category: "Devices & Trim", description: "4\" Square Blank Cover Plate",                              unit: "EA", unitPrice: 0.85 },
  { id: "dev-plate-oct-blank",     category: "Devices & Trim", description: "4\" Octagon Blank Cover Plate",                             unit: "EA", unitPrice: 0.75 },

  // ═══════════════════════════════════════════════════════════════════════════
  // LIGHTING
  // ═══════════════════════════════════════════════════════════════════════════

  // ── LED Recessed Lighting ─────────────────────────────────────────────────
  { id: "lgt-led-wafer-4-wh",      category: "Lighting", description: "4\" LED Wafer Downlight 9W 650lm 3000K White",                   unit: "EA", unitPrice: 12.00 },
  { id: "lgt-led-wafer-6-wh",      category: "Lighting", description: "6\" LED Wafer Downlight 12W 900lm 3000K White",                  unit: "EA", unitPrice: 14.00 },
  { id: "lgt-led-wafer-4-cct",     category: "Lighting", description: "4\" LED Wafer Downlight CCT Selectable 3000/4000/5000K",         unit: "EA", unitPrice: 16.00 },
  { id: "lgt-led-wafer-6-cct",     category: "Lighting", description: "6\" LED Wafer Downlight CCT Selectable 3000/4000/5000K",         unit: "EA", unitPrice: 18.00 },
  { id: "lgt-led-can-4-retrofit",  category: "Lighting", description: "4\" LED Recessed Can Retrofit Kit 9W",                           unit: "EA", unitPrice: 18.00 },
  { id: "lgt-led-can-6-retrofit",  category: "Lighting", description: "6\" LED Recessed Can Retrofit Kit 12W",                          unit: "EA", unitPrice: 22.00 },
  { id: "lgt-led-can-4-new",       category: "Lighting", description: "4\" LED New Construction Recessed Housing + Trim",               unit: "EA", unitPrice: 28.00 },
  { id: "lgt-led-can-6-new",       category: "Lighting", description: "6\" LED New Construction Recessed Housing + Trim",               unit: "EA", unitPrice: 32.00 },
  { id: "lgt-led-can-6-ic",        category: "Lighting", description: "6\" LED IC-Rated Recessed Housing + Trim",                       unit: "EA", unitPrice: 38.00 },

  // ── Commercial / Industrial Lighting ─────────────────────────────────────
  { id: "lgt-led-strip-2ft",       category: "Lighting", description: "2ft LED Strip Light Fixture 20W 2000lm",                         unit: "EA", unitPrice: 28.00 },
  { id: "lgt-led-strip-4ft",       category: "Lighting", description: "4ft LED Strip Light Fixture 40W 4000lm",                         unit: "EA", unitPrice: 38.00 },
  { id: "lgt-led-strip-8ft",       category: "Lighting", description: "8ft LED Strip Light Fixture 80W 8000lm",                         unit: "EA", unitPrice: 65.00 },
  { id: "lgt-led-vapor-4ft",       category: "Lighting", description: "4ft LED Vapor Tight Fixture 40W 4000lm",                         unit: "EA", unitPrice: 55.00 },
  { id: "lgt-led-vapor-8ft",       category: "Lighting", description: "8ft LED Vapor Tight Fixture 80W 8000lm",                         unit: "EA", unitPrice: 95.00 },
  { id: "lgt-led-highbay-100w",    category: "Lighting", description: "100W LED High Bay Light 13000lm",                                unit: "EA", unitPrice: 85.00 },
  { id: "lgt-led-highbay-150w",    category: "Lighting", description: "150W LED High Bay Light 19500lm",                                unit: "EA", unitPrice: 115.00 },
  { id: "lgt-led-highbay-200w",    category: "Lighting", description: "200W LED High Bay Light 26000lm",                                unit: "EA", unitPrice: 145.00 },
  { id: "lgt-led-troffer-2x2",     category: "Lighting", description: "2x2 LED Troffer 30W 3500lm",                                     unit: "EA", unitPrice: 48.00 },
  { id: "lgt-led-troffer-2x4",     category: "Lighting", description: "2x4 LED Troffer 50W 5500lm",                                     unit: "EA", unitPrice: 65.00 },
  { id: "lgt-led-panel-1x4",       category: "Lighting", description: "1x4 LED Panel Light 30W 3000lm",                                 unit: "EA", unitPrice: 42.00 },
  { id: "lgt-led-panel-2x2",       category: "Lighting", description: "2x2 LED Panel Light 40W 4000lm",                                 unit: "EA", unitPrice: 55.00 },
  { id: "lgt-led-panel-2x4",       category: "Lighting", description: "2x4 LED Panel Light 50W 5000lm",                                 unit: "EA", unitPrice: 68.00 },

  // ── Outdoor / Area Lighting ───────────────────────────────────────────────
  { id: "lgt-led-wall-pack-20w",   category: "Lighting", description: "20W LED Wall Pack Outdoor 2400lm",                               unit: "EA", unitPrice: 55.00 },
  { id: "lgt-led-wall-pack-40w",   category: "Lighting", description: "40W LED Wall Pack Outdoor 4800lm",                               unit: "EA", unitPrice: 75.00 },
  { id: "lgt-led-wall-pack-80w",   category: "Lighting", description: "80W LED Wall Pack Outdoor 9600lm",                               unit: "EA", unitPrice: 115.00 },
  { id: "lgt-led-floodlight-30w",  category: "Lighting", description: "30W LED Floodlight Outdoor",                                     unit: "EA", unitPrice: 35.00 },
  { id: "lgt-led-floodlight-50w",  category: "Lighting", description: "50W LED Floodlight Outdoor",                                     unit: "EA", unitPrice: 48.00 },
  { id: "lgt-led-floodlight-100w", category: "Lighting", description: "100W LED Floodlight Outdoor",                                    unit: "EA", unitPrice: 75.00 },
  { id: "lgt-led-area-100w",       category: "Lighting", description: "100W LED Area Light Shoebox 13000lm",                            unit: "EA", unitPrice: 145.00 },
  { id: "lgt-led-area-150w",       category: "Lighting", description: "150W LED Area Light Shoebox 19500lm",                            unit: "EA", unitPrice: 195.00 },
  { id: "lgt-led-canopy-40w",      category: "Lighting", description: "40W LED Canopy Light 5200lm",                                    unit: "EA", unitPrice: 85.00 },
  { id: "lgt-led-canopy-60w",      category: "Lighting", description: "60W LED Canopy Light 7800lm",                                    unit: "EA", unitPrice: 115.00 },
  { id: "lgt-motion-sensor-outdoor",category: "Lighting", description: "Outdoor Motion Sensor Security Light 180-Degree",               unit: "EA", unitPrice: 28.00 },
  { id: "lgt-photocell-120v",      category: "Lighting", description: "120V Photocell Dusk-to-Dawn Sensor",                             unit: "EA", unitPrice: 8.50 },
  { id: "lgt-photocell-twist-lock",category: "Lighting", description: "Twist-Lock Photocell NEMA Shorting Cap",                         unit: "EA", unitPrice: 5.50 },

  // ── Exit / Emergency Lighting ─────────────────────────────────────────────
  { id: "lgt-exit-led-red",        category: "Lighting", description: "LED Exit Sign Red Letters",                                      unit: "EA", unitPrice: 28.00 },
  { id: "lgt-exit-led-green",      category: "Lighting", description: "LED Exit Sign Green Letters",                                    unit: "EA", unitPrice: 28.00 },
  { id: "lgt-exit-combo-battery",  category: "Lighting", description: "LED Exit/Emergency Combo Unit with Battery Backup",              unit: "EA", unitPrice: 65.00 },
  { id: "lgt-emerg-led-2head",     category: "Lighting", description: "LED Emergency Light 2-Head with Battery Backup",                 unit: "EA", unitPrice: 38.00 },
  { id: "lgt-emerg-led-remote",    category: "Lighting", description: "LED Emergency Remote Head (for central battery system)",         unit: "EA", unitPrice: 28.00 },

  // ── Lamps & Bulbs ─────────────────────────────────────────────────────────
  { id: "lgt-bulb-led-a19-9w",     category: "Lighting", description: "LED A19 9W 800lm 2700K (6-pack)",                                unit: "PK", unitPrice: 12.00 },
  { id: "lgt-bulb-led-a19-15w",    category: "Lighting", description: "LED A19 15W 1600lm 5000K (6-pack)",                              unit: "PK", unitPrice: 14.00 },
  { id: "lgt-bulb-led-par38-15w",  category: "Lighting", description: "LED PAR38 15W 1050lm Flood",                                    unit: "EA", unitPrice: 8.50 },
  { id: "lgt-bulb-led-t8-4ft",     category: "Lighting", description: "LED T8 4ft Tube 18W Type A (4-pack)",                            unit: "PK", unitPrice: 22.00 },
  { id: "lgt-bulb-led-t8-4ft-ab",  category: "Lighting", description: "LED T8 4ft Tube 18W Type A+B Ballast Bypass (4-pack)",           unit: "PK", unitPrice: 28.00 },
  { id: "lgt-bulb-led-t8-8ft",     category: "Lighting", description: "LED T8 8ft Tube 36W Type B (2-pack)",                            unit: "PK", unitPrice: 22.00 },
  { id: "lgt-ballast-t8-2lamp",    category: "Lighting", description: "T8 Electronic Ballast 2-Lamp 120/277V",                          unit: "EA", unitPrice: 14.00 },
  { id: "lgt-ballast-t8-4lamp",    category: "Lighting", description: "T8 Electronic Ballast 4-Lamp 120/277V",                          unit: "EA", unitPrice: 18.00 },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOW VOLTAGE & DATA
  // ═══════════════════════════════════════════════════════════════════════════

  { id: "lv-box-1g-low-vol",       category: "Low Voltage & Data", description: "1-Gang Low-Voltage Mounting Bracket",                  unit: "EA", unitPrice: 1.25 },
  { id: "lv-box-2g-low-vol",       category: "Low Voltage & Data", description: "2-Gang Low-Voltage Mounting Bracket",                  unit: "EA", unitPrice: 1.65 },
  { id: "lv-box-old-work-lv",      category: "Low Voltage & Data", description: "Old Work Low-Voltage Box",                             unit: "EA", unitPrice: 1.85 },
  { id: "lv-keystone-cat6-wh",     category: "Low Voltage & Data", description: "Cat6 Keystone Jack White",                             unit: "EA", unitPrice: 2.85 },
  { id: "lv-keystone-cat6a-wh",    category: "Low Voltage & Data", description: "Cat6A Keystone Jack White",                            unit: "EA", unitPrice: 4.50 },
  { id: "lv-keystone-coax-wh",     category: "Low Voltage & Data", description: "F-Type Coax Keystone Jack White",                      unit: "EA", unitPrice: 2.25 },
  { id: "lv-patch-panel-24p",      category: "Low Voltage & Data", description: "24-Port Cat6 Patch Panel 1U",                          unit: "EA", unitPrice: 38.00 },
  { id: "lv-patch-panel-48p",      category: "Low Voltage & Data", description: "48-Port Cat6 Patch Panel 2U",                          unit: "EA", unitPrice: 65.00 },
  { id: "lv-patch-cord-3ft",       category: "Low Voltage & Data", description: "Cat6 Patch Cord 3ft",                                  unit: "EA", unitPrice: 3.50 },
  { id: "lv-patch-cord-7ft",       category: "Low Voltage & Data", description: "Cat6 Patch Cord 7ft",                                  unit: "EA", unitPrice: 4.50 },
  { id: "lv-patch-cord-10ft",      category: "Low Voltage & Data", description: "Cat6 Patch Cord 10ft",                                 unit: "EA", unitPrice: 5.50 },
  { id: "lv-rack-12u",             category: "Low Voltage & Data", description: "12U Wall-Mount Network Rack",                          unit: "EA", unitPrice: 85.00 },
  { id: "lv-rack-24u",             category: "Low Voltage & Data", description: "24U Wall-Mount Network Rack",                          unit: "EA", unitPrice: 145.00 },
  { id: "lv-conduit-ent-1/2-100ft",category: "Low Voltage & Data", description: "1/2\" ENT Flexible Conduit 100ft Coil",                unit: "EA", unitPrice: 18.00 },
  { id: "lv-conduit-ent-3/4-100ft",category: "Low Voltage & Data", description: "3/4\" ENT Flexible Conduit 100ft Coil",                unit: "EA", unitPrice: 26.00 },
  { id: "lv-smoke-det-120v",       category: "Low Voltage & Data", description: "120V Hardwired Smoke Detector with Battery Backup",    unit: "EA", unitPrice: 18.00 },
  { id: "lv-smoke-det-combo",      category: "Low Voltage & Data", description: "120V Hardwired Smoke/CO Combo Detector",               unit: "EA", unitPrice: 28.00 },
  { id: "lv-co-det-120v",          category: "Low Voltage & Data", description: "120V Hardwired CO Detector",                           unit: "EA", unitPrice: 22.00 },
  { id: "lv-doorbell-transformer", category: "Low Voltage & Data", description: "16V Doorbell Transformer 30VA",                        unit: "EA", unitPrice: 12.00 },
  { id: "lv-thermostat-wire-18-5", category: "Low Voltage & Data", description: "18/5 Thermostat Wire 50ft",                            unit: "EA", unitPrice: 8.50 },
  { id: "lv-thermostat-wire-18-8", category: "Low Voltage & Data", description: "18/8 Thermostat Wire 50ft",                            unit: "EA", unitPrice: 12.00 },
  { id: "lv-intercom-wire-22-4",   category: "Low Voltage & Data", description: "22/4 Intercom/Security Wire 500ft",                    unit: "EA", unitPrice: 28.00 },
  { id: "lv-speaker-wire-16-2-50", category: "Low Voltage & Data", description: "16/2 Speaker Wire 50ft",                               unit: "EA", unitPrice: 8.50 },
  { id: "lv-speaker-wire-14-2-50", category: "Low Voltage & Data", description: "14/2 Speaker Wire 50ft",                               unit: "EA", unitPrice: 12.00 },
  { id: "lv-conduit-sleeve-1",     category: "Low Voltage & Data", description: "1\" Conduit Sleeve Through-Wall Kit",                  unit: "EA", unitPrice: 8.50 },
  { id: "lv-conduit-sleeve-2",     category: "Low Voltage & Data", description: "2\" Conduit Sleeve Through-Wall Kit",                  unit: "EA", unitPrice: 12.00 },

  // ═══════════════════════════════════════════════════════════════════════════
  // CIVIL & MISC
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Grounding ─────────────────────────────────────────────────────────────
  { id: "civ-ground-rod-5/8-8ft",  category: "Civil & Misc", description: "5/8\" x 8ft Copper-Clad Ground Rod",                         unit: "EA", unitPrice: 18.00 },
  { id: "civ-ground-rod-3/4-10ft", category: "Civil & Misc", description: "3/4\" x 10ft Copper-Clad Ground Rod",                        unit: "EA", unitPrice: 28.00 },
  { id: "civ-ground-rod-clamp-5/8",category: "Civil & Misc", description: "5/8\" Ground Rod Clamp Acorn Type",                          unit: "EA", unitPrice: 3.50 },
  { id: "civ-ground-rod-clamp-3/4",category: "Civil & Misc", description: "3/4\" Ground Rod Clamp Acorn Type",                          unit: "EA", unitPrice: 4.50 },
  { id: "civ-ground-rod-driver",   category: "Civil & Misc", description: "Ground Rod Driver Attachment (SDS)",                         unit: "EA", unitPrice: 22.00 },
  { id: "civ-ground-clamp-pipe",   category: "Civil & Misc", description: "Ground Clamp for Water Pipe 3/4\" to 1\"",                   unit: "EA", unitPrice: 4.50 },
  { id: "civ-ground-clamp-pipe-2", category: "Civil & Misc", description: "Ground Clamp for Water Pipe 1-1/4\" to 2\"",                 unit: "EA", unitPrice: 6.50 },
  { id: "civ-ground-lug-4",        category: "Civil & Misc", description: "#4 AWG Ground Lug (10-pack)",                                unit: "PK", unitPrice: 8.50 },
  { id: "civ-ground-lug-2",        category: "Civil & Misc", description: "#2 AWG Ground Lug (10-pack)",                                unit: "PK", unitPrice: 10.00 },
  { id: "civ-ground-lug-1/0",      category: "Civil & Misc", description: "#1/0 AWG Ground Lug (10-pack)",                              unit: "PK", unitPrice: 12.00 },
  { id: "civ-ground-bar",          category: "Civil & Misc", description: "Ground Bar Kit 14-Position",                                 unit: "EA", unitPrice: 12.00 },
  { id: "civ-ground-plate",        category: "Civil & Misc", description: "Copper Ground Plate 4\" x 12\"",                             unit: "EA", unitPrice: 28.00 },

  // ── Underground / Direct Burial ───────────────────────────────────────────
  { id: "civ-warning-tape-elec",   category: "Civil & Misc", description: "Underground Warning Tape Electric 3\" x 1000ft",             unit: "EA", unitPrice: 18.00 },
  { id: "civ-warning-tape-gas",    category: "Civil & Misc", description: "Underground Warning Tape Gas 3\" x 1000ft",                  unit: "EA", unitPrice: 18.00 },
  { id: "civ-warning-tape-comm",   category: "Civil & Misc", description: "Underground Warning Tape Communications 3\" x 1000ft",       unit: "EA", unitPrice: 18.00 },
  { id: "civ-conduit-spacer",      category: "Civil & Misc", description: "PVC Conduit Spacer/Separator for Duct Bank",                 unit: "EA", unitPrice: 2.85 },
  { id: "civ-duct-seal",           category: "Civil & Misc", description: "Duct Seal Compound 1 lb",                                    unit: "EA", unitPrice: 4.50 },
  { id: "civ-duct-seal-5lb",       category: "Civil & Misc", description: "Duct Seal Compound 5 lb",                                    unit: "EA", unitPrice: 14.00 },
  { id: "civ-foam-seal",           category: "Civil & Misc", description: "Electrical Foam Sealant 12oz Can",                           unit: "EA", unitPrice: 8.50 },
  { id: "civ-sand-bag",            category: "Civil & Misc", description: "Sand Bag for Conduit Trench (50 lb)",                        unit: "EA", unitPrice: 6.50 },

  // ── Conduit Sealing / Weatherproofing ─────────────────────────────────────
  { id: "civ-reducing-washer-1-1/2",category: "Civil & Misc", description: "Reducing Washer 1-1/2\" to 1\"",                            unit: "EA", unitPrice: 1.25 },
  { id: "civ-reducing-washer-2",   category: "Civil & Misc", description: "Reducing Washer 2\" to 1-1/2\"",                             unit: "EA", unitPrice: 1.65 },
  { id: "civ-reducing-washer",     category: "Civil & Misc", description: "Reducing Washer 1\" to 1/2\" (25-pack)",                     unit: "BX", unitPrice: 5.00 },
  { id: "civ-cord-grip-1/2",       category: "Civil & Misc", description: "1/2\" Strain Relief Cord Grip",                              unit: "EA", unitPrice: 1.80 },
  { id: "civ-cord-grip-3/4",       category: "Civil & Misc", description: "3/4\" Strain Relief Cord Grip",                              unit: "EA", unitPrice: 2.20 },
  { id: "civ-cord-grip-1",         category: "Civil & Misc", description: "1\" Strain Relief Cord Grip",                                unit: "EA", unitPrice: 3.20 },
  { id: "civ-weatherhead-1",       category: "Civil & Misc", description: "1\" Service Entrance Weatherhead",                           unit: "EA", unitPrice: 12.00 },
  { id: "civ-weatherhead-1-1/4",   category: "Civil & Misc", description: "1-1/4\" Service Entrance Weatherhead",                       unit: "EA", unitPrice: 15.00 },
  { id: "civ-weatherhead-2",       category: "Civil & Misc", description: "2\" Service Entrance Weatherhead",                           unit: "EA", unitPrice: 22.00 },
  { id: "civ-weatherhead-2-1/2",   category: "Civil & Misc", description: "2-1/2\" Service Entrance Weatherhead",                       unit: "EA", unitPrice: 32.00 },
  { id: "civ-mast-bracket",        category: "Civil & Misc", description: "Service Entrance Mast Bracket",                              unit: "EA", unitPrice: 8.50 },
  { id: "civ-meter-socket-seal",   category: "Civil & Misc", description: "Meter Socket Sealing Ring",                                  unit: "EA", unitPrice: 2.50 },

  // ── Miscellaneous Site Materials ──────────────────────────────────────────
  { id: "civ-wire-marker-tape",    category: "Civil & Misc", description: "Wire Marker Tape (10-pack assorted)",                        unit: "PK", unitPrice: 8.50 },
  { id: "civ-cable-ties-4",        category: "Civil & Misc", description: "4\" Cable Ties (100-pack)",                                  unit: "BX", unitPrice: 3.50 },
  { id: "civ-cable-ties-8",        category: "Civil & Misc", description: "8\" Cable Ties (100-pack)",                                  unit: "BX", unitPrice: 5.50 },
  { id: "civ-cable-ties-11",       category: "Civil & Misc", description: "11\" Cable Ties (100-pack)",                                 unit: "BX", unitPrice: 7.50 },
  { id: "civ-cable-ties-14",       category: "Civil & Misc", description: "14\" Cable Ties (100-pack)",                                 unit: "BX", unitPrice: 9.50 },
  { id: "civ-cable-ties-uv-8",     category: "Civil & Misc", description: "8\" UV-Resistant Cable Ties (100-pack)",                     unit: "BX", unitPrice: 8.50 },
  { id: "civ-label-maker-tape",    category: "Civil & Misc", description: "Label Maker Tape 1/2\" x 26ft",                              unit: "EA", unitPrice: 5.50 },
  { id: "civ-wire-label-sleeve",   category: "Civil & Misc", description: "Wire Label Sleeves Assorted (200-pack)",                     unit: "BX", unitPrice: 12.00 },
  { id: "civ-phase-tape-set",      category: "Civil & Misc", description: "Phase Identification Tape Set (3-roll: black/red/blue)",     unit: "PK", unitPrice: 8.50 },
  { id: "civ-conduit-cement",      category: "Civil & Misc", description: "PVC Conduit Cement 1/2 Pint",                                unit: "EA", unitPrice: 5.50 },
  { id: "civ-conduit-primer",      category: "Civil & Misc", description: "PVC Conduit Primer 1/2 Pint",                                unit: "EA", unitPrice: 4.50 },
  { id: "civ-antioxidant",         category: "Civil & Misc", description: "Aluminum Antioxidant Compound 8oz",                          unit: "EA", unitPrice: 8.50 },
  { id: "civ-penetration-seal",    category: "Civil & Misc", description: "Fire-Rated Penetration Sealant Caulk 10oz",                  unit: "EA", unitPrice: 12.00 },
  { id: "civ-penetration-pillow",  category: "Civil & Misc", description: "Fire-Rated Intumescent Pillow 4\" x 6\"",                    unit: "EA", unitPrice: 8.50 },
  { id: "civ-bushing-plastic-1/2", category: "Civil & Misc", description: "1/2\" Plastic Knockout Bushing",                             unit: "EA", unitPrice: 0.25 },
  { id: "civ-bushing-plastic-3/4", category: "Civil & Misc", description: "3/4\" Plastic Knockout Bushing",                             unit: "EA", unitPrice: 0.35 },
  { id: "civ-bushing-plastic-1",   category: "Civil & Misc", description: "1\" Plastic Knockout Bushing",                               unit: "EA", unitPrice: 0.55 },
  { id: "civ-knockout-plug-1/2",   category: "Civil & Misc", description: "1/2\" Knockout Plug (25-pack)",                              unit: "BX", unitPrice: 3.50 },
  { id: "civ-knockout-plug-3/4",   category: "Civil & Misc", description: "3/4\" Knockout Plug (25-pack)",                              unit: "BX", unitPrice: 4.50 },
  { id: "civ-knockout-plug-1",     category: "Civil & Misc", description: "1\" Knockout Plug (25-pack)",                                unit: "BX", unitPrice: 5.50 },
  { id: "civ-knockout-plug-2",     category: "Civil & Misc", description: "2\" Knockout Plug (25-pack)",                                unit: "BX", unitPrice: 8.50 },
  { id: "civ-flex-whip-1/2-6ft",   category: "Civil & Misc", description: "1/2\" LFMC Pre-Made Whip 6ft with Connectors",               unit: "EA", unitPrice: 12.00 },
  { id: "civ-flex-whip-3/4-6ft",   category: "Civil & Misc", description: "3/4\" LFMC Pre-Made Whip 6ft with Connectors",               unit: "EA", unitPrice: 16.00 },
  { id: "civ-flex-whip-1-6ft",     category: "Civil & Misc", description: "1\" LFMC Pre-Made Whip 6ft with Connectors",                 unit: "EA", unitPrice: 22.00 },
  { id: "civ-conduit-hanger-adj",  category: "Civil & Misc", description: "Adjustable Conduit Hanger 1/2\" to 4\"",                     unit: "EA", unitPrice: 2.85 },
  { id: "civ-splice-kit-600v",     category: "Civil & Misc", description: "600V Wire Splice Kit (10-pack)",                             unit: "BX", unitPrice: 18.00 },
  { id: "civ-lug-al-2/0",          category: "Civil & Misc", description: "#2/0 Aluminum Compression Lug",                              unit: "EA", unitPrice: 3.50 },
  { id: "civ-lug-al-4/0",          category: "Civil & Misc", description: "#4/0 Aluminum Compression Lug",                              unit: "EA", unitPrice: 4.50 },
  { id: "civ-lug-cu-2/0",          category: "Civil & Misc", description: "#2/0 Copper Compression Lug",                                unit: "EA", unitPrice: 5.50 },
  { id: "civ-lug-cu-4/0",          category: "Civil & Misc", description: "#4/0 Copper Compression Lug",                                unit: "EA", unitPrice: 7.50 },
  { id: "civ-lug-cu-350",          category: "Civil & Misc", description: "350 KCMIL Copper Compression Lug",                           unit: "EA", unitPrice: 12.00 },
  { id: "civ-lug-cu-500",          category: "Civil & Misc", description: "500 KCMIL Copper Compression Lug",                           unit: "EA", unitPrice: 16.00 },
  { id: "civ-split-bolt-6",        category: "Civil & Misc", description: "#6 AWG Split Bolt Connector",                                unit: "EA", unitPrice: 2.85 },
  { id: "civ-split-bolt-2",        category: "Civil & Misc", description: "#2 AWG Split Bolt Connector",                                unit: "EA", unitPrice: 4.50 },
  { id: "civ-split-bolt-1/0",      category: "Civil & Misc", description: "#1/0 AWG Split Bolt Connector",                              unit: "EA", unitPrice: 6.50 },
  { id: "civ-split-bolt-2/0",      category: "Civil & Misc", description: "#2/0 AWG Split Bolt Connector",                              unit: "EA", unitPrice: 8.50 },
  { id: "civ-split-bolt-4/0",      category: "Civil & Misc", description: "#4/0 AWG Split Bolt Connector",                              unit: "EA", unitPrice: 12.00 },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIONAL DISTRIBUTION EQUIPMENT
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Siemens Load Centers ────────────────────────────────────────────────────────────
  { id: "dist-sie-lc-100a-20sp",    category: "Distribution", description: "Siemens 100A 20-Space 40-Circuit Load Center Main Breaker",  unit: "EA", unitPrice: 95.00 },
  { id: "dist-sie-lc-150a-30sp",    category: "Distribution", description: "Siemens 150A 30-Space 60-Circuit Load Center Main Breaker",  unit: "EA", unitPrice: 135.00 },
  { id: "dist-sie-lc-200a-40sp",    category: "Distribution", description: "Siemens 200A 40-Space 80-Circuit Load Center Main Breaker",  unit: "EA", unitPrice: 165.00 },
  { id: "dist-sie-lc-200a-42sp",    category: "Distribution", description: "Siemens 200A 42-Space 84-Circuit Load Center Main Breaker",  unit: "EA", unitPrice: 185.00 },
  { id: "dist-sie-lc-100a-20sp-ml", category: "Distribution", description: "Siemens 100A 20-Space 40-Circuit Load Center Main Lug",      unit: "EA", unitPrice: 75.00 },
  { id: "dist-sie-lc-200a-40sp-ml", category: "Distribution", description: "Siemens 200A 40-Space 80-Circuit Load Center Main Lug",      unit: "EA", unitPrice: 145.00 },
  { id: "dist-sie-meter-200a",       category: "Distribution", description: "Siemens 200A Meter Socket NEMA 3R",                         unit: "EA", unitPrice: 95.00 },
  { id: "dist-sie-combo-200a",       category: "Distribution", description: "Siemens 200A Meter-Main Combo NEMA 3R",                     unit: "EA", unitPrice: 245.00 },

  // ── Siemens Breakers ───────────────────────────────────────────────────────────────
  { id: "dist-sie-br-1p-15",         category: "Distribution", description: "Siemens QP 1-Pole 15A Breaker",                            unit: "EA", unitPrice: 7.50 },
  { id: "dist-sie-br-1p-20",         category: "Distribution", description: "Siemens QP 1-Pole 20A Breaker",                            unit: "EA", unitPrice: 7.50 },
  { id: "dist-sie-br-1p-30",         category: "Distribution", description: "Siemens QP 1-Pole 30A Breaker",                            unit: "EA", unitPrice: 8.50 },
  { id: "dist-sie-br-2p-20",         category: "Distribution", description: "Siemens QP 2-Pole 20A Breaker",                            unit: "EA", unitPrice: 14.00 },
  { id: "dist-sie-br-2p-30",         category: "Distribution", description: "Siemens QP 2-Pole 30A Breaker",                            unit: "EA", unitPrice: 15.00 },
  { id: "dist-sie-br-2p-40",         category: "Distribution", description: "Siemens QP 2-Pole 40A Breaker",                            unit: "EA", unitPrice: 18.00 },
  { id: "dist-sie-br-2p-50",         category: "Distribution", description: "Siemens QP 2-Pole 50A Breaker",                            unit: "EA", unitPrice: 20.00 },
  { id: "dist-sie-br-2p-60",         category: "Distribution", description: "Siemens QP 2-Pole 60A Breaker",                            unit: "EA", unitPrice: 22.00 },
  { id: "dist-sie-br-2p-100",        category: "Distribution", description: "Siemens QP 2-Pole 100A Breaker",                           unit: "EA", unitPrice: 38.00 },
  { id: "dist-sie-gfci-1p-15",       category: "Distribution", description: "Siemens QP 1-Pole 15A GFCI Breaker",                       unit: "EA", unitPrice: 38.00 },
  { id: "dist-sie-gfci-1p-20",       category: "Distribution", description: "Siemens QP 1-Pole 20A GFCI Breaker",                       unit: "EA", unitPrice: 40.00 },
  { id: "dist-sie-gfci-2p-20",       category: "Distribution", description: "Siemens QP 2-Pole 20A GFCI Breaker",                       unit: "EA", unitPrice: 55.00 },
  { id: "dist-sie-gfci-2p-30",       category: "Distribution", description: "Siemens QP 2-Pole 30A GFCI Breaker",                       unit: "EA", unitPrice: 58.00 },
  { id: "dist-sie-afci-1p-15",       category: "Distribution", description: "Siemens QP 1-Pole 15A AFCI Breaker",                       unit: "EA", unitPrice: 42.00 },
  { id: "dist-sie-afci-1p-20",       category: "Distribution", description: "Siemens QP 1-Pole 20A AFCI Breaker",                       unit: "EA", unitPrice: 44.00 },
  { id: "dist-sie-dfci-1p-15",       category: "Distribution", description: "Siemens QP 1-Pole 15A Dual Function AFCI/GFCI Breaker",     unit: "EA", unitPrice: 55.00 },
  { id: "dist-sie-dfci-1p-20",       category: "Distribution", description: "Siemens QP 1-Pole 20A Dual Function AFCI/GFCI Breaker",     unit: "EA", unitPrice: 58.00 },
  { id: "dist-sie-tandem-15-15",     category: "Distribution", description: "Siemens QT Tandem 15A/15A Breaker",                        unit: "EA", unitPrice: 18.00 },
  { id: "dist-sie-tandem-20-20",     category: "Distribution", description: "Siemens QT Tandem 20A/20A Breaker",                        unit: "EA", unitPrice: 20.00 },

  // ── Schneider Electric / Square D QO Breakers (additional) ──────────────────────
  { id: "dist-sqd-qo-1p-15",         category: "Distribution", description: "Square D QO 1-Pole 15A Breaker",                           unit: "EA", unitPrice: 8.50 },
  { id: "dist-sqd-qo-1p-20",         category: "Distribution", description: "Square D QO 1-Pole 20A Breaker",                           unit: "EA", unitPrice: 8.50 },
  { id: "dist-sqd-qo-1p-30",         category: "Distribution", description: "Square D QO 1-Pole 30A Breaker",                           unit: "EA", unitPrice: 9.50 },
  { id: "dist-sqd-qo-2p-20",         category: "Distribution", description: "Square D QO 2-Pole 20A Breaker",                           unit: "EA", unitPrice: 16.00 },
  { id: "dist-sqd-qo-2p-30",         category: "Distribution", description: "Square D QO 2-Pole 30A Breaker",                           unit: "EA", unitPrice: 18.00 },
  { id: "dist-sqd-qo-2p-40",         category: "Distribution", description: "Square D QO 2-Pole 40A Breaker",                           unit: "EA", unitPrice: 20.00 },
  { id: "dist-sqd-qo-2p-50",         category: "Distribution", description: "Square D QO 2-Pole 50A Breaker",                           unit: "EA", unitPrice: 22.00 },
  { id: "dist-sqd-qo-2p-60",         category: "Distribution", description: "Square D QO 2-Pole 60A Breaker",                           unit: "EA", unitPrice: 24.00 },
  { id: "dist-sqd-qo-2p-100",        category: "Distribution", description: "Square D QO 2-Pole 100A Breaker",                          unit: "EA", unitPrice: 42.00 },
  { id: "dist-sqd-qo-3p-20",         category: "Distribution", description: "Square D QO 3-Pole 20A Breaker",                           unit: "EA", unitPrice: 28.00 },
  { id: "dist-sqd-qo-3p-30",         category: "Distribution", description: "Square D QO 3-Pole 30A Breaker",                           unit: "EA", unitPrice: 30.00 },
  { id: "dist-sqd-qo-3p-60",         category: "Distribution", description: "Square D QO 3-Pole 60A Breaker",                           unit: "EA", unitPrice: 48.00 },
  { id: "dist-sqd-qo-3p-100",        category: "Distribution", description: "Square D QO 3-Pole 100A Breaker",                          unit: "EA", unitPrice: 75.00 },
  { id: "dist-sqd-gfci-1p-15",       category: "Distribution", description: "Square D QO 1-Pole 15A GFCI Breaker",                      unit: "EA", unitPrice: 42.00 },
  { id: "dist-sqd-gfci-1p-20",       category: "Distribution", description: "Square D QO 1-Pole 20A GFCI Breaker",                      unit: "EA", unitPrice: 44.00 },
  { id: "dist-sqd-gfci-2p-20",       category: "Distribution", description: "Square D QO 2-Pole 20A GFCI Breaker",                      unit: "EA", unitPrice: 58.00 },
  { id: "dist-sqd-gfci-2p-30",       category: "Distribution", description: "Square D QO 2-Pole 30A GFCI Breaker",                      unit: "EA", unitPrice: 62.00 },
  { id: "dist-sqd-afci-1p-15",       category: "Distribution", description: "Square D QO 1-Pole 15A AFCI Breaker",                      unit: "EA", unitPrice: 45.00 },
  { id: "dist-sqd-afci-1p-20",       category: "Distribution", description: "Square D QO 1-Pole 20A AFCI Breaker",                      unit: "EA", unitPrice: 48.00 },
  { id: "dist-sqd-dfci-1p-15",       category: "Distribution", description: "Square D QO 1-Pole 15A Dual Function AFCI/GFCI Breaker",    unit: "EA", unitPrice: 58.00 },
  { id: "dist-sqd-dfci-1p-20",       category: "Distribution", description: "Square D QO 1-Pole 20A Dual Function AFCI/GFCI Breaker",    unit: "EA", unitPrice: 62.00 },
  { id: "dist-sqd-qo-tandem-15",     category: "Distribution", description: "Square D QO Tandem 15A/15A Breaker",                       unit: "EA", unitPrice: 20.00 },
  { id: "dist-sqd-qo-tandem-20",     category: "Distribution", description: "Square D QO Tandem 20A/20A Breaker",                       unit: "EA", unitPrice: 22.00 },

  // ── Eaton Breakers (additional) ───────────────────────────────────────────────────────────────
  { id: "dist-eat-br-3p-20",         category: "Distribution", description: "Eaton BR 3-Pole 20A Breaker",                             unit: "EA", unitPrice: 26.00 },
  { id: "dist-eat-br-3p-30",         category: "Distribution", description: "Eaton BR 3-Pole 30A Breaker",                             unit: "EA", unitPrice: 28.00 },
  { id: "dist-eat-br-3p-60",         category: "Distribution", description: "Eaton BR 3-Pole 60A Breaker",                             unit: "EA", unitPrice: 45.00 },
  { id: "dist-eat-br-3p-100",        category: "Distribution", description: "Eaton BR 3-Pole 100A Breaker",                            unit: "EA", unitPrice: 72.00 },
  { id: "dist-eat-ch-1p-15",         category: "Distribution", description: "Eaton CH 1-Pole 15A Breaker",                             unit: "EA", unitPrice: 8.50 },
  { id: "dist-eat-ch-1p-20",         category: "Distribution", description: "Eaton CH 1-Pole 20A Breaker",                             unit: "EA", unitPrice: 8.50 },
  { id: "dist-eat-ch-2p-30",         category: "Distribution", description: "Eaton CH 2-Pole 30A Breaker",                             unit: "EA", unitPrice: 18.00 },
  { id: "dist-eat-ch-2p-50",         category: "Distribution", description: "Eaton CH 2-Pole 50A Breaker",                             unit: "EA", unitPrice: 22.00 },
  { id: "dist-eat-ch-2p-100",        category: "Distribution", description: "Eaton CH 2-Pole 100A Breaker",                            unit: "EA", unitPrice: 40.00 },
  { id: "dist-eat-ch-3p-30",         category: "Distribution", description: "Eaton CH 3-Pole 30A Breaker",                             unit: "EA", unitPrice: 30.00 },
  { id: "dist-eat-ch-3p-60",         category: "Distribution", description: "Eaton CH 3-Pole 60A Breaker",                             unit: "EA", unitPrice: 48.00 },
  { id: "dist-eat-gfci-1p-20",       category: "Distribution", description: "Eaton BR 1-Pole 20A GFCI Breaker",                        unit: "EA", unitPrice: 42.00 },
  { id: "dist-eat-gfci-2p-20",       category: "Distribution", description: "Eaton BR 2-Pole 20A GFCI Breaker",                        unit: "EA", unitPrice: 58.00 },
  { id: "dist-eat-afci-1p-20",       category: "Distribution", description: "Eaton BR 1-Pole 20A AFCI Breaker",                        unit: "EA", unitPrice: 45.00 },
  { id: "dist-eat-dfci-1p-20",       category: "Distribution", description: "Eaton BR 1-Pole 20A Dual Function AFCI/GFCI Breaker",      unit: "EA", unitPrice: 60.00 },

  // ── Disconnects & Safety Switches ─────────────────────────────────────────────────────────
  { id: "dist-disc-30a-fused-3r",    category: "Distribution", description: "30A 240V Fused Safety Switch NEMA 3R",                    unit: "EA", unitPrice: 65.00 },
  { id: "dist-disc-60a-fused-3r",    category: "Distribution", description: "60A 240V Fused Safety Switch NEMA 3R",                    unit: "EA", unitPrice: 95.00 },
  { id: "dist-disc-100a-fused-3r",   category: "Distribution", description: "100A 240V Fused Safety Switch NEMA 3R",                   unit: "EA", unitPrice: 145.00 },
  { id: "dist-disc-200a-fused-3r",   category: "Distribution", description: "200A 240V Fused Safety Switch NEMA 3R",                   unit: "EA", unitPrice: 245.00 },
  { id: "dist-disc-30a-nonfused-3r", category: "Distribution", description: "30A 240V Non-Fused Safety Switch NEMA 3R",                 unit: "EA", unitPrice: 48.00 },
  { id: "dist-disc-60a-nonfused-3r", category: "Distribution", description: "60A 240V Non-Fused Safety Switch NEMA 3R",                 unit: "EA", unitPrice: 75.00 },
  { id: "dist-disc-100a-nonfused-3r",category: "Distribution", description: "100A 240V Non-Fused Safety Switch NEMA 3R",                unit: "EA", unitPrice: 115.00 },
  { id: "dist-disc-200a-nonfused-3r",category: "Distribution", description: "200A 240V Non-Fused Safety Switch NEMA 3R",                unit: "EA", unitPrice: 185.00 },
  { id: "dist-disc-30a-ac",          category: "Distribution", description: "30A 240V AC Disconnect Non-Fused NEMA 3R",                 unit: "EA", unitPrice: 28.00 },
  { id: "dist-disc-60a-ac",          category: "Distribution", description: "60A 240V AC Disconnect Non-Fused NEMA 3R",                 unit: "EA", unitPrice: 42.00 },
  { id: "dist-disc-200a-3ph-fused",  category: "Distribution", description: "200A 480V 3-Phase Fused Safety Switch NEMA 3R",            unit: "EA", unitPrice: 385.00 },
  { id: "dist-disc-400a-3ph-fused",  category: "Distribution", description: "400A 480V 3-Phase Fused Safety Switch NEMA 3R",            unit: "EA", unitPrice: 685.00 },
  { id: "dist-fuse-class-j-30",      category: "Distribution", description: "30A Class J Fuse (2-pack)",                               unit: "PK", unitPrice: 12.00 },
  { id: "dist-fuse-class-j-60",      category: "Distribution", description: "60A Class J Fuse (2-pack)",                               unit: "PK", unitPrice: 18.00 },
  { id: "dist-fuse-class-j-100",     category: "Distribution", description: "100A Class J Fuse (2-pack)",                              unit: "PK", unitPrice: 28.00 },
  { id: "dist-fuse-class-j-200",     category: "Distribution", description: "200A Class J Fuse (2-pack)",                              unit: "PK", unitPrice: 48.00 },
  { id: "dist-fuse-class-rk5-30",    category: "Distribution", description: "30A Class RK5 Fuse (2-pack)",                             unit: "PK", unitPrice: 8.50 },
  { id: "dist-fuse-class-rk5-60",    category: "Distribution", description: "60A Class RK5 Fuse (2-pack)",                             unit: "PK", unitPrice: 12.00 },
  { id: "dist-fuse-class-cc-15",     category: "Distribution", description: "15A Class CC Fuse (10-pack)",                             unit: "PK", unitPrice: 12.00 },
  { id: "dist-fuse-class-cc-20",     category: "Distribution", description: "20A Class CC Fuse (10-pack)",                             unit: "PK", unitPrice: 14.00 },
  { id: "dist-fuse-class-cc-30",     category: "Distribution", description: "30A Class CC Fuse (10-pack)",                             unit: "PK", unitPrice: 16.00 },

  // ── Panelboards & Distribution Boards ──────────────────────────────────────────────────
  { id: "dist-panel-sqd-nqod-42",    category: "Distribution", description: "Square D NQOD 42-Circuit 225A 3-Phase Panelboard",         unit: "EA", unitPrice: 485.00 },
  { id: "dist-panel-sqd-nqod-84",    category: "Distribution", description: "Square D NQOD 84-Circuit 400A 3-Phase Panelboard",         unit: "EA", unitPrice: 785.00 },
  { id: "dist-panel-eat-prl1-42",    category: "Distribution", description: "Eaton PRL1 42-Circuit 225A 3-Phase Panelboard",            unit: "EA", unitPrice: 465.00 },
  { id: "dist-panel-eat-prl1-84",    category: "Distribution", description: "Eaton PRL1 84-Circuit 400A 3-Phase Panelboard",            unit: "EA", unitPrice: 765.00 },
  { id: "dist-panel-sie-s1-42",      category: "Distribution", description: "Siemens S1 42-Circuit 225A 3-Phase Panelboard",            unit: "EA", unitPrice: 475.00 },
  { id: "dist-panel-mlo-100a-12sp",  category: "Distribution", description: "100A 12-Space Main Lug Only Panelboard",                  unit: "EA", unitPrice: 145.00 },
  { id: "dist-panel-mlo-200a-20sp",  category: "Distribution", description: "200A 20-Space Main Lug Only Panelboard",                  unit: "EA", unitPrice: 245.00 },
  { id: "dist-panel-mlo-400a-42sp",  category: "Distribution", description: "400A 42-Space Main Lug Only Panelboard",                  unit: "EA", unitPrice: 485.00 },
  { id: "dist-panel-mlo-600a-42sp",  category: "Distribution", description: "600A 42-Space Main Lug Only Panelboard",                  unit: "EA", unitPrice: 685.00 },
  { id: "dist-panel-mlo-800a-42sp",  category: "Distribution", description: "800A 42-Space Main Lug Only Panelboard",                  unit: "EA", unitPrice: 985.00 },
  { id: "dist-panel-mlo-1200a-42sp", category: "Distribution", description: "1200A 42-Space Main Lug Only Panelboard",                 unit: "EA", unitPrice: 1485.00 },

  // ── Transformers ───────────────────────────────────────────────────────────────────
  { id: "dist-xfmr-1kva-480-120",    category: "Distribution", description: "1 KVA Dry-Type Transformer 480V to 120/240V",             unit: "EA", unitPrice: 285.00 },
  { id: "dist-xfmr-3kva-480-120",    category: "Distribution", description: "3 KVA Dry-Type Transformer 480V to 120/240V",             unit: "EA", unitPrice: 385.00 },
  { id: "dist-xfmr-5kva-480-120",    category: "Distribution", description: "5 KVA Dry-Type Transformer 480V to 120/240V",             unit: "EA", unitPrice: 485.00 },
  { id: "dist-xfmr-7.5kva-480-120",  category: "Distribution", description: "7.5 KVA Dry-Type Transformer 480V to 120/208V",           unit: "EA", unitPrice: 585.00 },
  { id: "dist-xfmr-15kva-480-120",   category: "Distribution", description: "15 KVA Dry-Type Transformer 480V to 120/208V",            unit: "EA", unitPrice: 785.00 },
  { id: "dist-xfmr-25kva-480-120",   category: "Distribution", description: "25 KVA Dry-Type Transformer 480V to 120/208V",            unit: "EA", unitPrice: 985.00 },
  { id: "dist-xfmr-45kva-480-120",   category: "Distribution", description: "45 KVA Dry-Type Transformer 480V to 120/208V",            unit: "EA", unitPrice: 1485.00 },
  { id: "dist-xfmr-75kva-480-120",   category: "Distribution", description: "75 KVA Dry-Type Transformer 480V to 120/208V",            unit: "EA", unitPrice: 1985.00 },
  { id: "dist-xfmr-100kva-480-120",  category: "Distribution", description: "100 KVA Dry-Type Transformer 480V to 120/208V",           unit: "EA", unitPrice: 2485.00 },
  { id: "dist-xfmr-150kva-480-120",  category: "Distribution", description: "150 KVA Dry-Type Transformer 480V to 120/208V",           unit: "EA", unitPrice: 3485.00 },
  { id: "dist-xfmr-step-down-120-24",category: "Distribution", description: "120V to 24V Control Transformer 100VA",                   unit: "EA", unitPrice: 45.00 },
  { id: "dist-xfmr-step-down-120-12",category: "Distribution", description: "120V to 12V Transformer 50VA",                            unit: "EA", unitPrice: 28.00 },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIONAL CONDUIT FITTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── IMC Fittings ───────────────────────────────────────────────────────────────────
  { id: "fit-imc-conn-1/2",          category: "Conduit Fittings", description: "1/2\" IMC Compression Connector",                      unit: "EA", unitPrice: 1.65 },
  { id: "fit-imc-conn-3/4",          category: "Conduit Fittings", description: "3/4\" IMC Compression Connector",                      unit: "EA", unitPrice: 2.25 },
  { id: "fit-imc-conn-1",            category: "Conduit Fittings", description: "1\" IMC Compression Connector",                        unit: "EA", unitPrice: 3.25 },
  { id: "fit-imc-conn-1-1/4",        category: "Conduit Fittings", description: "1-1/4\" IMC Compression Connector",                    unit: "EA", unitPrice: 4.50 },
  { id: "fit-imc-conn-1-1/2",        category: "Conduit Fittings", description: "1-1/2\" IMC Compression Connector",                    unit: "EA", unitPrice: 5.50 },
  { id: "fit-imc-conn-2",            category: "Conduit Fittings", description: "2\" IMC Compression Connector",                        unit: "EA", unitPrice: 7.50 },
  { id: "fit-imc-coup-1/2",          category: "Conduit Fittings", description: "1/2\" IMC Compression Coupling",                       unit: "EA", unitPrice: 2.25 },
  { id: "fit-imc-coup-3/4",          category: "Conduit Fittings", description: "3/4\" IMC Compression Coupling",                       unit: "EA", unitPrice: 3.25 },
  { id: "fit-imc-coup-1",            category: "Conduit Fittings", description: "1\" IMC Compression Coupling",                         unit: "EA", unitPrice: 4.50 },
  { id: "fit-imc-coup-1-1/2",        category: "Conduit Fittings", description: "1-1/2\" IMC Compression Coupling",                     unit: "EA", unitPrice: 6.50 },
  { id: "fit-imc-coup-2",            category: "Conduit Fittings", description: "2\" IMC Compression Coupling",                         unit: "EA", unitPrice: 9.50 },

  // ── RMC (Rigid) Fittings ───────────────────────────────────────────────────────────────
  { id: "fit-rmc-conn-1/2",          category: "Conduit Fittings", description: "1/2\" RMC Threaded Conduit Body LB",                   unit: "EA", unitPrice: 4.50 },
  { id: "fit-rmc-conn-3/4",          category: "Conduit Fittings", description: "3/4\" RMC Threaded Conduit Body LB",                   unit: "EA", unitPrice: 5.50 },
  { id: "fit-rmc-conn-1",            category: "Conduit Fittings", description: "1\" RMC Threaded Conduit Body LB",                     unit: "EA", unitPrice: 8.50 },
  { id: "fit-rmc-conn-1-1/2",        category: "Conduit Fittings", description: "1-1/2\" RMC Threaded Conduit Body LB",                 unit: "EA", unitPrice: 14.00 },
  { id: "fit-rmc-conn-2",            category: "Conduit Fittings", description: "2\" RMC Threaded Conduit Body LB",                     unit: "EA", unitPrice: 20.00 },
  { id: "fit-rmc-coup-1/2",          category: "Conduit Fittings", description: "1/2\" RMC Threaded Coupling",                          unit: "EA", unitPrice: 1.65 },
  { id: "fit-rmc-coup-3/4",          category: "Conduit Fittings", description: "3/4\" RMC Threaded Coupling",                          unit: "EA", unitPrice: 2.25 },
  { id: "fit-rmc-coup-1",            category: "Conduit Fittings", description: "1\" RMC Threaded Coupling",                            unit: "EA", unitPrice: 3.25 },
  { id: "fit-rmc-coup-1-1/2",        category: "Conduit Fittings", description: "1-1/2\" RMC Threaded Coupling",                        unit: "EA", unitPrice: 5.50 },
  { id: "fit-rmc-coup-2",            category: "Conduit Fittings", description: "2\" RMC Threaded Coupling",                            unit: "EA", unitPrice: 8.50 },
  { id: "fit-rmc-coup-2-1/2",        category: "Conduit Fittings", description: "2-1/2\" RMC Threaded Coupling",                        unit: "EA", unitPrice: 12.00 },
  { id: "fit-rmc-coup-3",            category: "Conduit Fittings", description: "3\" RMC Threaded Coupling",                            unit: "EA", unitPrice: 18.00 },
  { id: "fit-rmc-coup-4",            category: "Conduit Fittings", description: "4\" RMC Threaded Coupling",                            unit: "EA", unitPrice: 28.00 },
  { id: "fit-rmc-nipple-1/2-2",      category: "Conduit Fittings", description: "1/2\" x 2\" RMC Close Nipple",                          unit: "EA", unitPrice: 2.25 },
  { id: "fit-rmc-nipple-3/4-2",      category: "Conduit Fittings", description: "3/4\" x 2\" RMC Close Nipple",                          unit: "EA", unitPrice: 3.25 },
  { id: "fit-rmc-nipple-1-2",        category: "Conduit Fittings", description: "1\" x 2\" RMC Close Nipple",                            unit: "EA", unitPrice: 4.50 },
  { id: "fit-rmc-nipple-1-1/2-2",    category: "Conduit Fittings", description: "1-1/2\" x 2\" RMC Close Nipple",                        unit: "EA", unitPrice: 7.50 },
  { id: "fit-rmc-nipple-2-2",        category: "Conduit Fittings", description: "2\" x 2\" RMC Close Nipple",                            unit: "EA", unitPrice: 10.00 },
  { id: "fit-rmc-locknut-1/2",       category: "Conduit Fittings", description: "1/2\" Rigid Locknut (25-pack)",                        unit: "BX", unitPrice: 4.50 },
  { id: "fit-rmc-locknut-3/4",       category: "Conduit Fittings", description: "3/4\" Rigid Locknut (25-pack)",                        unit: "BX", unitPrice: 5.50 },
  { id: "fit-rmc-locknut-1",         category: "Conduit Fittings", description: "1\" Rigid Locknut (25-pack)",                          unit: "BX", unitPrice: 7.50 },
  { id: "fit-rmc-locknut-1-1/2",     category: "Conduit Fittings", description: "1-1/2\" Rigid Locknut (25-pack)",                      unit: "BX", unitPrice: 10.00 },
  { id: "fit-rmc-locknut-2",         category: "Conduit Fittings", description: "2\" Rigid Locknut (25-pack)",                          unit: "BX", unitPrice: 14.00 },
  { id: "fit-rmc-bushing-1/2",       category: "Conduit Fittings", description: "1/2\" Insulated Grounding Bushing",                    unit: "EA", unitPrice: 2.25 },
  { id: "fit-rmc-bushing-3/4",       category: "Conduit Fittings", description: "3/4\" Insulated Grounding Bushing",                    unit: "EA", unitPrice: 2.85 },
  { id: "fit-rmc-bushing-1",         category: "Conduit Fittings", description: "1\" Insulated Grounding Bushing",                      unit: "EA", unitPrice: 3.85 },
  { id: "fit-rmc-bushing-1-1/2",     category: "Conduit Fittings", description: "1-1/2\" Insulated Grounding Bushing",                  unit: "EA", unitPrice: 5.50 },
  { id: "fit-rmc-bushing-2",         category: "Conduit Fittings", description: "2\" Insulated Grounding Bushing",                      unit: "EA", unitPrice: 7.50 },
  { id: "fit-rmc-bushing-2-1/2",     category: "Conduit Fittings", description: "2-1/2\" Insulated Grounding Bushing",                  unit: "EA", unitPrice: 10.00 },
  { id: "fit-rmc-bushing-3",         category: "Conduit Fittings", description: "3\" Insulated Grounding Bushing",                      unit: "EA", unitPrice: 14.00 },
  { id: "fit-rmc-bushing-4",         category: "Conduit Fittings", description: "4\" Insulated Grounding Bushing",                      unit: "EA", unitPrice: 18.00 },

  // ── PVC Fittings (additional) ──────────────────────────────────────────────────────────────
  { id: "fit-pvc-lb-1/2",            category: "Conduit Fittings", description: "1/2\" PVC LB Conduit Body",                            unit: "EA", unitPrice: 2.25 },
  { id: "fit-pvc-lb-3/4",            category: "Conduit Fittings", description: "3/4\" PVC LB Conduit Body",                            unit: "EA", unitPrice: 3.25 },
  { id: "fit-pvc-lb-1",              category: "Conduit Fittings", description: "1\" PVC LB Conduit Body",                              unit: "EA", unitPrice: 4.50 },
  { id: "fit-pvc-lb-1-1/2",          category: "Conduit Fittings", description: "1-1/2\" PVC LB Conduit Body",                          unit: "EA", unitPrice: 7.50 },
  { id: "fit-pvc-lb-2",              category: "Conduit Fittings", description: "2\" PVC LB Conduit Body",                              unit: "EA", unitPrice: 10.00 },
  { id: "fit-pvc-lb-3",              category: "Conduit Fittings", description: "3\" PVC LB Conduit Body",                              unit: "EA", unitPrice: 18.00 },
  { id: "fit-pvc-lb-4",              category: "Conduit Fittings", description: "4\" PVC LB Conduit Body",                              unit: "EA", unitPrice: 28.00 },
  { id: "fit-pvc-ll-1/2",            category: "Conduit Fittings", description: "1/2\" PVC LL Conduit Body",                            unit: "EA", unitPrice: 2.25 },
  { id: "fit-pvc-ll-3/4",            category: "Conduit Fittings", description: "3/4\" PVC LL Conduit Body",                            unit: "EA", unitPrice: 3.25 },
  { id: "fit-pvc-ll-1",              category: "Conduit Fittings", description: "1\" PVC LL Conduit Body",                              unit: "EA", unitPrice: 4.50 },
  { id: "fit-pvc-lr-1/2",            category: "Conduit Fittings", description: "1/2\" PVC LR Conduit Body",                            unit: "EA", unitPrice: 2.25 },
  { id: "fit-pvc-lr-3/4",            category: "Conduit Fittings", description: "3/4\" PVC LR Conduit Body",                            unit: "EA", unitPrice: 3.25 },
  { id: "fit-pvc-lr-1",              category: "Conduit Fittings", description: "1\" PVC LR Conduit Body",                              unit: "EA", unitPrice: 4.50 },
  { id: "fit-pvc-t-1/2",             category: "Conduit Fittings", description: "1/2\" PVC T Conduit Body",                             unit: "EA", unitPrice: 2.85 },
  { id: "fit-pvc-t-3/4",             category: "Conduit Fittings", description: "3/4\" PVC T Conduit Body",                             unit: "EA", unitPrice: 3.85 },
  { id: "fit-pvc-t-1",               category: "Conduit Fittings", description: "1\" PVC T Conduit Body",                               unit: "EA", unitPrice: 5.50 },
  { id: "fit-pvc-t-2",               category: "Conduit Fittings", description: "2\" PVC T Conduit Body",                               unit: "EA", unitPrice: 12.00 },
  { id: "fit-pvc-t-3",               category: "Conduit Fittings", description: "3\" PVC T Conduit Body",                               unit: "EA", unitPrice: 22.00 },
  { id: "fit-pvc-t-4",               category: "Conduit Fittings", description: "4\" PVC T Conduit Body",                               unit: "EA", unitPrice: 35.00 },
  { id: "fit-pvc-bell-end-1/2",      category: "Conduit Fittings", description: "1/2\" PVC Bell End Adapter",                           unit: "EA", unitPrice: 0.85 },
  { id: "fit-pvc-bell-end-3/4",      category: "Conduit Fittings", description: "3/4\" PVC Bell End Adapter",                           unit: "EA", unitPrice: 1.25 },
  { id: "fit-pvc-bell-end-1",        category: "Conduit Fittings", description: "1\" PVC Bell End Adapter",                             unit: "EA", unitPrice: 1.65 },
  { id: "fit-pvc-bell-end-2",        category: "Conduit Fittings", description: "2\" PVC Bell End Adapter",                             unit: "EA", unitPrice: 2.85 },
  { id: "fit-pvc-bell-end-3",        category: "Conduit Fittings", description: "3\" PVC Bell End Adapter",                             unit: "EA", unitPrice: 4.50 },
  { id: "fit-pvc-bell-end-4",        category: "Conduit Fittings", description: "4\" PVC Bell End Adapter",                             unit: "EA", unitPrice: 6.50 },
  { id: "fit-pvc-sch80-coup-1/2",    category: "Conduit Fittings", description: "1/2\" PVC Sch 80 Coupling",                            unit: "EA", unitPrice: 1.65 },
  { id: "fit-pvc-sch80-coup-3/4",    category: "Conduit Fittings", description: "3/4\" PVC Sch 80 Coupling",                            unit: "EA", unitPrice: 2.25 },
  { id: "fit-pvc-sch80-coup-1",      category: "Conduit Fittings", description: "1\" PVC Sch 80 Coupling",                              unit: "EA", unitPrice: 3.25 },
  { id: "fit-pvc-sch80-coup-2",      category: "Conduit Fittings", description: "2\" PVC Sch 80 Coupling",                              unit: "EA", unitPrice: 5.50 },
  { id: "fit-pvc-sch80-coup-3",      category: "Conduit Fittings", description: "3\" PVC Sch 80 Coupling",                              unit: "EA", unitPrice: 9.50 },
  { id: "fit-pvc-sch80-coup-4",      category: "Conduit Fittings", description: "4\" PVC Sch 80 Coupling",                              unit: "EA", unitPrice: 14.00 },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDITIONAL WIRE & CABLE
  // ═══════════════════════════════════════════════════════════════════════════

  // ── XHHW-2 Aluminum Wire ───────────────────────────────────────────────────────────
  { id: "wir-xhhw-6al-ft",           category: "Wire & Cable", description: "#6 AWG XHHW-2 Aluminum Wire (per ft)",                   unit: "FT", unitPrice: 0.55 },
  { id: "wir-xhhw-4al-ft",           category: "Wire & Cable", description: "#4 AWG XHHW-2 Aluminum Wire (per ft)",                   unit: "FT", unitPrice: 0.75 },
  { id: "wir-xhhw-2al-ft",           category: "Wire & Cable", description: "#2 AWG XHHW-2 Aluminum Wire (per ft)",                   unit: "FT", unitPrice: 1.05 },
  { id: "wir-xhhw-1al-ft",           category: "Wire & Cable", description: "#1 AWG XHHW-2 Aluminum Wire (per ft)",                   unit: "FT", unitPrice: 1.35 },
  { id: "wir-xhhw-1/0al-ft",         category: "Wire & Cable", description: "#1/0 AWG XHHW-2 Aluminum Wire (per ft)",                 unit: "FT", unitPrice: 1.65 },
  { id: "wir-xhhw-2/0al-ft",         category: "Wire & Cable", description: "#2/0 AWG XHHW-2 Aluminum Wire (per ft)",                 unit: "FT", unitPrice: 2.05 },
  { id: "wir-xhhw-3/0al-ft",         category: "Wire & Cable", description: "#3/0 AWG XHHW-2 Aluminum Wire (per ft)",                 unit: "FT", unitPrice: 2.55 },
  { id: "wir-xhhw-4/0al-ft",         category: "Wire & Cable", description: "#4/0 AWG XHHW-2 Aluminum Wire (per ft)",                 unit: "FT", unitPrice: 3.15 },
  { id: "wir-xhhw-250al-ft",         category: "Wire & Cable", description: "250 KCMIL XHHW-2 Aluminum Wire (per ft)",                unit: "FT", unitPrice: 3.85 },
  { id: "wir-xhhw-350al-ft",         category: "Wire & Cable", description: "350 KCMIL XHHW-2 Aluminum Wire (per ft)",                unit: "FT", unitPrice: 5.25 },
  { id: "wir-xhhw-500al-ft",         category: "Wire & Cable", description: "500 KCMIL XHHW-2 Aluminum Wire (per ft)",                unit: "FT", unitPrice: 7.25 },
  { id: "wir-xhhw-750al-ft",         category: "Wire & Cable", description: "750 KCMIL XHHW-2 Aluminum Wire (per ft)",                unit: "FT", unitPrice: 10.50 },

  // ── Bare Copper / Grounding Conductors ───────────────────────────────────────────────
  { id: "wir-bare-cu-14-ft",          category: "Wire & Cable", description: "#14 AWG Bare Copper Grounding Wire (per ft)",            unit: "FT", unitPrice: 0.18 },
  { id: "wir-bare-cu-12-ft",          category: "Wire & Cable", description: "#12 AWG Bare Copper Grounding Wire (per ft)",            unit: "FT", unitPrice: 0.28 },
  { id: "wir-bare-cu-10-ft",          category: "Wire & Cable", description: "#10 AWG Bare Copper Grounding Wire (per ft)",            unit: "FT", unitPrice: 0.42 },
  { id: "wir-bare-cu-8-ft",           category: "Wire & Cable", description: "#8 AWG Bare Copper Grounding Wire (per ft)",             unit: "FT", unitPrice: 0.65 },
  { id: "wir-bare-cu-6-ft",           category: "Wire & Cable", description: "#6 AWG Bare Copper Grounding Wire (per ft)",             unit: "FT", unitPrice: 0.95 },
  { id: "wir-bare-cu-4-ft",           category: "Wire & Cable", description: "#4 AWG Bare Copper Grounding Wire (per ft)",             unit: "FT", unitPrice: 1.45 },
  { id: "wir-bare-cu-2-ft",           category: "Wire & Cable", description: "#2 AWG Bare Copper Grounding Wire (per ft)",             unit: "FT", unitPrice: 2.25 },
  { id: "wir-bare-cu-1/0-ft",         category: "Wire & Cable", description: "#1/0 AWG Bare Copper Grounding Wire (per ft)",           unit: "FT", unitPrice: 3.50 },
  { id: "wir-bare-cu-2/0-ft",         category: "Wire & Cable", description: "#2/0 AWG Bare Copper Grounding Wire (per ft)",           unit: "FT", unitPrice: 4.50 },
  { id: "wir-bare-cu-4/0-ft",         category: "Wire & Cable", description: "#4/0 AWG Bare Copper Grounding Wire (per ft)",           unit: "FT", unitPrice: 7.00 },

  // ── Tray Cable (TC) ───────────────────────────────────────────────────────────────────
  { id: "wir-tc-12-2-ft",             category: "Wire & Cable", description: "12/2 Tray Cable TC-ER 600V (per ft)",                   unit: "FT", unitPrice: 0.85 },
  { id: "wir-tc-12-3-ft",             category: "Wire & Cable", description: "12/3 Tray Cable TC-ER 600V (per ft)",                   unit: "FT", unitPrice: 1.15 },
  { id: "wir-tc-10-2-ft",             category: "Wire & Cable", description: "10/2 Tray Cable TC-ER 600V (per ft)",                   unit: "FT", unitPrice: 1.25 },
  { id: "wir-tc-10-3-ft",             category: "Wire & Cable", description: "10/3 Tray Cable TC-ER 600V (per ft)",                   unit: "FT", unitPrice: 1.65 },
  { id: "wir-tc-8-3-ft",              category: "Wire & Cable", description: "8/3 Tray Cable TC-ER 600V (per ft)",                    unit: "FT", unitPrice: 2.25 },
  { id: "wir-tc-6-3-ft",              category: "Wire & Cable", description: "6/3 Tray Cable TC-ER 600V (per ft)",                    unit: "FT", unitPrice: 3.25 },
  { id: "wir-tc-4-3-ft",              category: "Wire & Cable", description: "4/3 Tray Cable TC-ER 600V (per ft)",                    unit: "FT", unitPrice: 4.50 },

  // ── VFD / Motor Lead Cable ────────────────────────────────────────────────────────────
  { id: "wir-vfd-12-3-ft",            category: "Wire & Cable", description: "12/3 VFD Cable Shielded (per ft)",                      unit: "FT", unitPrice: 1.85 },
  { id: "wir-vfd-10-3-ft",            category: "Wire & Cable", description: "10/3 VFD Cable Shielded (per ft)",                      unit: "FT", unitPrice: 2.65 },
  { id: "wir-vfd-8-3-ft",             category: "Wire & Cable", description: "8/3 VFD Cable Shielded (per ft)",                       unit: "FT", unitPrice: 3.85 },
  { id: "wir-vfd-6-3-ft",             category: "Wire & Cable", description: "6/3 VFD Cable Shielded (per ft)",                       unit: "FT", unitPrice: 5.50 },

  // ── Flexible Cords ───────────────────────────────────────────────────────────────────
  { id: "wir-soow-12-3-ft",           category: "Wire & Cable", description: "12/3 SOOW Portable Power Cable (per ft)",               unit: "FT", unitPrice: 1.25 },
  { id: "wir-soow-10-3-ft",           category: "Wire & Cable", description: "10/3 SOOW Portable Power Cable (per ft)",               unit: "FT", unitPrice: 1.85 },
  { id: "wir-soow-8-3-ft",            category: "Wire & Cable", description: "8/3 SOOW Portable Power Cable (per ft)",                unit: "FT", unitPrice: 2.65 },
  { id: "wir-soow-6-3-ft",            category: "Wire & Cable", description: "6/3 SOOW Portable Power Cable (per ft)",                unit: "FT", unitPrice: 3.85 },
  { id: "wir-sjow-16-3-ft",           category: "Wire & Cable", description: "16/3 SJOW Extension Cord Cable (per ft)",               unit: "FT", unitPrice: 0.55 },
  { id: "wir-sjow-14-3-ft",           category: "Wire & Cable", description: "14/3 SJOW Extension Cord Cable (per ft)",               unit: "FT", unitPrice: 0.75 },
];

// ─── Derived constants ────────────────────────────────────────────────────────

/** Unique sorted list of all categories in the catalog */
export const CATALOG_CATEGORIES: string[] = Array.from(
  new Set(CATALOG.map((i) => i.category))
).sort();

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
  const typeMap: Record<string, string> = {
    EMT: "cnd-emt",
    IMC: "cnd-imc",
    RMC: "cnd-rmc",
    GRC: "cnd-rmc",
    "PVC-40": "cnd-pvc40",
    "PVC-80": "cnd-pvc80",
    PVC: "cnd-pvc40",
    FMC: "cnd-fmc",
    LFMC: "cnd-lfmc",
    LFNC: "cnd-lfnc",
    ENT: "cnd-ent",
  };
  const prefix = typeMap[conduitType.toUpperCase()] ?? `cnd-${conduitType.toLowerCase()}`;
  const sizeNorm = conduitSize.replace(/\"/g, "").trim();
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

  if (wireType.toUpperCase().includes("THHN") || wireType.toUpperCase().includes("THWN")) {
    const id = `wir-thhn-${sizeNorm}${mat}`;
    const item = getCatalogItem(id);
    return item ? item.unitPrice : null;
  }
  if (wireType.toUpperCase().includes("NM") || wireType.toUpperCase().includes("ROMEX")) {
    const id = `wir-nmb-${sizeNorm}`;
    const item = getCatalogItem(id);
    return item ? item.unitPrice : null;
  }
  if (wireType.toUpperCase().includes("MC")) {
    const id = `wir-mc-${sizeNorm}`;
    const item = getCatalogItem(id);
    return item ? item.unitPrice : null;
  }
  if (wireType.toUpperCase().includes("SE") || wireType.toUpperCase().includes("SER")) {
    const id = `wir-ser-${sizeNorm}`;
    const item = getCatalogItem(id);
    return item ? item.unitPrice : null;
  }
  if (wireType.toUpperCase().includes("URD") || wireType.toUpperCase().includes("USE")) {
    const id = `wir-urd-${sizeNorm}${mat}`;
    const item = getCatalogItem(id);
    return item ? item.unitPrice : null;
  }
  return null;
}
