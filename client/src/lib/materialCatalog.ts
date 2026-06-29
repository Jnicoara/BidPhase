/**
 * BidPhase — Material Price Catalog
 *
 * Sample electrical / construction material database.
 * Each entry has a unique id, category, description, unit, and base price.
 * Prices are typical US market rates (2024) — replace with your actual pricing.
 *
 * To add your own materials: append entries to the CATALOG array.
 * Future: this will be backed by a database for live editing.
 */

export interface CatalogItem {
  id: string;
  category: string;
  description: string;
  unit: string;
  unitPrice: number;   // USD
  notes?: string;
}

export const CATALOG_CATEGORIES = [
  "Wire & Cable",
  "Conduit",
  "Conduit Fittings",
  "Boxes & Enclosures",
  "Devices & Receptacles",
  "Lighting",
  "Panels & Breakers",
  "Grounding",
  "Fasteners & Supports",
  "Underground",
  "Low Voltage",
  "Miscellaneous",
] as const;

export type CatalogCategory = typeof CATALOG_CATEGORIES[number];

export const CATALOG: CatalogItem[] = [
  // ── Wire & Cable ──────────────────────────────────────────────────────────
  { id: "w-thhn-14cu",   category: "Wire & Cable", description: "THHN #14 AWG Copper",          unit: "FT",  unitPrice: 0.18 },
  { id: "w-thhn-12cu",   category: "Wire & Cable", description: "THHN #12 AWG Copper",          unit: "FT",  unitPrice: 0.28 },
  { id: "w-thhn-10cu",   category: "Wire & Cable", description: "THHN #10 AWG Copper",          unit: "FT",  unitPrice: 0.44 },
  { id: "w-thhn-8cu",    category: "Wire & Cable", description: "THHN #8 AWG Copper",           unit: "FT",  unitPrice: 0.72 },
  { id: "w-thhn-6cu",    category: "Wire & Cable", description: "THHN #6 AWG Copper",           unit: "FT",  unitPrice: 1.10 },
  { id: "w-thhn-4cu",    category: "Wire & Cable", description: "THHN #4 AWG Copper",           unit: "FT",  unitPrice: 1.65 },
  { id: "w-thhn-2cu",    category: "Wire & Cable", description: "THHN #2 AWG Copper",           unit: "FT",  unitPrice: 2.40 },
  { id: "w-thhn-1cu",    category: "Wire & Cable", description: "THHN #1 AWG Copper",           unit: "FT",  unitPrice: 3.20 },
  { id: "w-thhn-1/0cu",  category: "Wire & Cable", description: "THHN 1/0 AWG Copper",          unit: "FT",  unitPrice: 4.10 },
  { id: "w-thhn-2/0cu",  category: "Wire & Cable", description: "THHN 2/0 AWG Copper",          unit: "FT",  unitPrice: 5.20 },
  { id: "w-thhn-3/0cu",  category: "Wire & Cable", description: "THHN 3/0 AWG Copper",          unit: "FT",  unitPrice: 6.50 },
  { id: "w-thhn-4/0cu",  category: "Wire & Cable", description: "THHN 4/0 AWG Copper",          unit: "FT",  unitPrice: 8.20 },
  { id: "w-thhn-250cu",  category: "Wire & Cable", description: "THHN 250 kcmil Copper",        unit: "FT",  unitPrice: 10.50 },
  { id: "w-thhn-350cu",  category: "Wire & Cable", description: "THHN 350 kcmil Copper",        unit: "FT",  unitPrice: 14.20 },
  { id: "w-thhn-500cu",  category: "Wire & Cable", description: "THHN 500 kcmil Copper",        unit: "FT",  unitPrice: 19.80 },
  { id: "w-thhn-14al",   category: "Wire & Cable", description: "THHN #14 AWG Aluminum",        unit: "FT",  unitPrice: 0.09 },
  { id: "w-thhn-2al",    category: "Wire & Cable", description: "THHN #2 AWG Aluminum",         unit: "FT",  unitPrice: 0.55 },
  { id: "w-thhn-1/0al",  category: "Wire & Cable", description: "THHN 1/0 AWG Aluminum",        unit: "FT",  unitPrice: 0.90 },
  { id: "w-thhn-4/0al",  category: "Wire & Cable", description: "THHN 4/0 AWG Aluminum",        unit: "FT",  unitPrice: 1.80 },
  { id: "w-thhn-350al",  category: "Wire & Cable", description: "THHN 350 kcmil Aluminum",      unit: "FT",  unitPrice: 3.20 },
  { id: "w-nm-14/2",     category: "Wire & Cable", description: "NM-B 14/2 w/Ground",           unit: "FT",  unitPrice: 0.55 },
  { id: "w-nm-12/2",     category: "Wire & Cable", description: "NM-B 12/2 w/Ground",           unit: "FT",  unitPrice: 0.80 },
  { id: "w-nm-10/2",     category: "Wire & Cable", description: "NM-B 10/2 w/Ground",           unit: "FT",  unitPrice: 1.20 },
  { id: "w-nm-14/3",     category: "Wire & Cable", description: "NM-B 14/3 w/Ground",           unit: "FT",  unitPrice: 0.85 },
  { id: "w-nm-12/3",     category: "Wire & Cable", description: "NM-B 12/3 w/Ground",           unit: "FT",  unitPrice: 1.20 },
  { id: "w-mc-12/2",     category: "Wire & Cable", description: "MC Cable 12/2 w/Ground",       unit: "FT",  unitPrice: 1.45 },
  { id: "w-mc-12/3",     category: "Wire & Cable", description: "MC Cable 12/3 w/Ground",       unit: "FT",  unitPrice: 1.85 },
  { id: "w-mc-10/3",     category: "Wire & Cable", description: "MC Cable 10/3 w/Ground",       unit: "FT",  unitPrice: 2.60 },
  { id: "w-urd-2al",     category: "Wire & Cable", description: "URD 2 AWG Aluminum (direct bury)", unit: "FT", unitPrice: 1.20 },
  { id: "w-urd-1/0al",   category: "Wire & Cable", description: "URD 1/0 AWG Aluminum (direct bury)", unit: "FT", unitPrice: 1.85 },
  { id: "w-urd-4/0al",   category: "Wire & Cable", description: "URD 4/0 AWG Aluminum (direct bury)", unit: "FT", unitPrice: 3.40 },

  // ── Conduit ───────────────────────────────────────────────────────────────
  { id: "c-emt-1/2",    category: "Conduit", description: "EMT ½\" (10 ft stick)",              unit: "EA",  unitPrice: 4.20 },
  { id: "c-emt-3/4",    category: "Conduit", description: "EMT ¾\" (10 ft stick)",              unit: "EA",  unitPrice: 6.10 },
  { id: "c-emt-1",      category: "Conduit", description: "EMT 1\" (10 ft stick)",              unit: "EA",  unitPrice: 9.50 },
  { id: "c-emt-1.25",   category: "Conduit", description: "EMT 1¼\" (10 ft stick)",             unit: "EA",  unitPrice: 13.80 },
  { id: "c-emt-1.5",    category: "Conduit", description: "EMT 1½\" (10 ft stick)",             unit: "EA",  unitPrice: 17.20 },
  { id: "c-emt-2",      category: "Conduit", description: "EMT 2\" (10 ft stick)",              unit: "EA",  unitPrice: 24.50 },
  { id: "c-emt-2.5",    category: "Conduit", description: "EMT 2½\" (10 ft stick)",             unit: "EA",  unitPrice: 42.00 },
  { id: "c-emt-3",      category: "Conduit", description: "EMT 3\" (10 ft stick)",              unit: "EA",  unitPrice: 58.00 },
  { id: "c-emt-4",      category: "Conduit", description: "EMT 4\" (10 ft stick)",              unit: "EA",  unitPrice: 88.00 },
  { id: "c-imc-1/2",    category: "Conduit", description: "IMC ½\" (10 ft stick)",              unit: "EA",  unitPrice: 8.50 },
  { id: "c-imc-3/4",    category: "Conduit", description: "IMC ¾\" (10 ft stick)",              unit: "EA",  unitPrice: 12.00 },
  { id: "c-imc-1",      category: "Conduit", description: "IMC 1\" (10 ft stick)",              unit: "EA",  unitPrice: 18.50 },
  { id: "c-rmc-1/2",    category: "Conduit", description: "RMC ½\" (10 ft stick)",              unit: "EA",  unitPrice: 14.00 },
  { id: "c-rmc-3/4",    category: "Conduit", description: "RMC ¾\" (10 ft stick)",              unit: "EA",  unitPrice: 20.00 },
  { id: "c-rmc-1",      category: "Conduit", description: "RMC 1\" (10 ft stick)",              unit: "EA",  unitPrice: 30.00 },
  { id: "c-rmc-2",      category: "Conduit", description: "RMC 2\" (10 ft stick)",              unit: "EA",  unitPrice: 65.00 },
  { id: "c-pvc-1/2",    category: "Conduit", description: "PVC Schedule 40 ½\" (10 ft)",        unit: "EA",  unitPrice: 2.80 },
  { id: "c-pvc-3/4",    category: "Conduit", description: "PVC Schedule 40 ¾\" (10 ft)",        unit: "EA",  unitPrice: 3.80 },
  { id: "c-pvc-1",      category: "Conduit", description: "PVC Schedule 40 1\" (10 ft)",        unit: "EA",  unitPrice: 5.50 },
  { id: "c-pvc-2",      category: "Conduit", description: "PVC Schedule 40 2\" (10 ft)",        unit: "EA",  unitPrice: 10.50 },
  { id: "c-pvc-3",      category: "Conduit", description: "PVC Schedule 40 3\" (10 ft)",        unit: "EA",  unitPrice: 20.00 },
  { id: "c-pvc-4",      category: "Conduit", description: "PVC Schedule 40 4\" (10 ft)",        unit: "EA",  unitPrice: 30.00 },
  { id: "c-lfmc-1/2",   category: "Conduit", description: "LFMC ½\" Liquid-Tight Flex",         unit: "FT",  unitPrice: 1.85 },
  { id: "c-lfmc-3/4",   category: "Conduit", description: "LFMC ¾\" Liquid-Tight Flex",         unit: "FT",  unitPrice: 2.60 },
  { id: "c-lfmc-1",     category: "Conduit", description: "LFMC 1\" Liquid-Tight Flex",         unit: "FT",  unitPrice: 3.80 },

  // ── Conduit Fittings ──────────────────────────────────────────────────────
  { id: "cf-emt-coup-1/2",  category: "Conduit Fittings", description: "EMT Coupling ½\"",      unit: "EA",  unitPrice: 0.65 },
  { id: "cf-emt-coup-3/4",  category: "Conduit Fittings", description: "EMT Coupling ¾\"",      unit: "EA",  unitPrice: 0.90 },
  { id: "cf-emt-coup-1",    category: "Conduit Fittings", description: "EMT Coupling 1\"",       unit: "EA",  unitPrice: 1.40 },
  { id: "cf-emt-conn-1/2",  category: "Conduit Fittings", description: "EMT Connector ½\" (set-screw)", unit: "EA", unitPrice: 0.55 },
  { id: "cf-emt-conn-3/4",  category: "Conduit Fittings", description: "EMT Connector ¾\" (set-screw)", unit: "EA", unitPrice: 0.80 },
  { id: "cf-emt-conn-1",    category: "Conduit Fittings", description: "EMT Connector 1\" (set-screw)",  unit: "EA", unitPrice: 1.20 },
  { id: "cf-emt-90-1/2",    category: "Conduit Fittings", description: "EMT 90° Elbow ½\"",     unit: "EA",  unitPrice: 2.80 },
  { id: "cf-emt-90-3/4",    category: "Conduit Fittings", description: "EMT 90° Elbow ¾\"",     unit: "EA",  unitPrice: 3.80 },
  { id: "cf-emt-90-1",      category: "Conduit Fittings", description: "EMT 90° Elbow 1\"",     unit: "EA",  unitPrice: 5.50 },
  { id: "cf-pvc-coup-1/2",  category: "Conduit Fittings", description: "PVC Coupling ½\"",      unit: "EA",  unitPrice: 0.35 },
  { id: "cf-pvc-coup-2",    category: "Conduit Fittings", description: "PVC Coupling 2\"",       unit: "EA",  unitPrice: 1.20 },
  { id: "cf-pvc-90-1/2",    category: "Conduit Fittings", description: "PVC 90° Elbow ½\"",     unit: "EA",  unitPrice: 0.85 },
  { id: "cf-pvc-90-2",      category: "Conduit Fittings", description: "PVC 90° Elbow 2\"",     unit: "EA",  unitPrice: 3.20 },
  { id: "cf-pvc-90-4",      category: "Conduit Fittings", description: "PVC 90° Elbow 4\"",     unit: "EA",  unitPrice: 12.00 },
  { id: "cf-lbody-1/2",     category: "Conduit Fittings", description: "LB Conduit Body ½\"",   unit: "EA",  unitPrice: 4.50 },
  { id: "cf-lbody-3/4",     category: "Conduit Fittings", description: "LB Conduit Body ¾\"",   unit: "EA",  unitPrice: 6.20 },
  { id: "cf-lbody-1",       category: "Conduit Fittings", description: "LB Conduit Body 1\"",   unit: "EA",  unitPrice: 9.00 },
  { id: "cf-locknut-1/2",   category: "Conduit Fittings", description: "Locknut ½\"",            unit: "EA",  unitPrice: 0.25 },
  { id: "cf-locknut-3/4",   category: "Conduit Fittings", description: "Locknut ¾\"",            unit: "EA",  unitPrice: 0.35 },
  { id: "cf-bushing-1/2",   category: "Conduit Fittings", description: "Plastic Bushing ½\"",   unit: "EA",  unitPrice: 0.20 },
  { id: "cf-bushing-2",     category: "Conduit Fittings", description: "Plastic Bushing 2\"",   unit: "EA",  unitPrice: 0.65 },

  // ── Boxes & Enclosures ────────────────────────────────────────────────────
  { id: "bx-1g-sw",     category: "Boxes & Enclosures", description: "1-Gang Switch Box (plastic)", unit: "EA", unitPrice: 0.75 },
  { id: "bx-1g-metal",  category: "Boxes & Enclosures", description: "1-Gang Metal Box",          unit: "EA",  unitPrice: 1.20 },
  { id: "bx-2g-sw",     category: "Boxes & Enclosures", description: "2-Gang Switch Box (plastic)", unit: "EA", unitPrice: 1.10 },
  { id: "bx-2g-metal",  category: "Boxes & Enclosures", description: "2-Gang Metal Box",          unit: "EA",  unitPrice: 1.85 },
  { id: "bx-3g-metal",  category: "Boxes & Enclosures", description: "3-Gang Metal Box",          unit: "EA",  unitPrice: 2.80 },
  { id: "bx-4sq",       category: "Boxes & Enclosures", description: "4\" Square Box (1-1/2\" deep)", unit: "EA", unitPrice: 2.20 },
  { id: "bx-4sq-ext",   category: "Boxes & Enclosures", description: "4\" Square Extension Ring", unit: "EA",  unitPrice: 1.80 },
  { id: "bx-4oct",      category: "Boxes & Enclosures", description: "4\" Octagon Box",           unit: "EA",  unitPrice: 1.90 },
  { id: "bx-handy",     category: "Boxes & Enclosures", description: "Handy Box (utility box)",   unit: "EA",  unitPrice: 1.40 },
  { id: "bx-pull-6x6",  category: "Boxes & Enclosures", description: "Pull Box 6\"×6\"×4\"",      unit: "EA",  unitPrice: 18.00 },
  { id: "bx-pull-12x12",category: "Boxes & Enclosures", description: "Pull Box 12\"×12\"×6\"",    unit: "EA",  unitPrice: 45.00 },
  { id: "bx-nema3r-sm", category: "Boxes & Enclosures", description: "NEMA 3R Enclosure 6\"×6\"", unit: "EA",  unitPrice: 28.00 },
  { id: "bx-nema3r-lg", category: "Boxes & Enclosures", description: "NEMA 3R Enclosure 12\"×12\"", unit: "EA", unitPrice: 65.00 },
  { id: "bx-weatherproof-1g", category: "Boxes & Enclosures", description: "Weatherproof 1-Gang Box", unit: "EA", unitPrice: 3.50 },

  // ── Devices & Receptacles ─────────────────────────────────────────────────
  { id: "dev-duplex-15",  category: "Devices & Receptacles", description: "Duplex Receptacle 15A",       unit: "EA", unitPrice: 1.80 },
  { id: "dev-duplex-20",  category: "Devices & Receptacles", description: "Duplex Receptacle 20A",       unit: "EA", unitPrice: 2.40 },
  { id: "dev-gfci-15",    category: "Devices & Receptacles", description: "GFCI Receptacle 15A",         unit: "EA", unitPrice: 14.00 },
  { id: "dev-gfci-20",    category: "Devices & Receptacles", description: "GFCI Receptacle 20A",         unit: "EA", unitPrice: 18.00 },
  { id: "dev-afci-15",    category: "Devices & Receptacles", description: "AFCI Receptacle 15A",         unit: "EA", unitPrice: 32.00 },
  { id: "dev-sw-1p",      category: "Devices & Receptacles", description: "Single-Pole Switch 15A",      unit: "EA", unitPrice: 2.20 },
  { id: "dev-sw-3w",      category: "Devices & Receptacles", description: "3-Way Switch 15A",            unit: "EA", unitPrice: 4.50 },
  { id: "dev-sw-4w",      category: "Devices & Receptacles", description: "4-Way Switch 15A",            unit: "EA", unitPrice: 9.00 },
  { id: "dev-dimmer-1p",  category: "Devices & Receptacles", description: "Dimmer Switch Single-Pole",   unit: "EA", unitPrice: 18.00 },
  { id: "dev-dimmer-3w",  category: "Devices & Receptacles", description: "Dimmer Switch 3-Way",         unit: "EA", unitPrice: 28.00 },
  { id: "dev-250v-30a",   category: "Devices & Receptacles", description: "250V 30A Dryer Receptacle",   unit: "EA", unitPrice: 8.50 },
  { id: "dev-250v-50a",   category: "Devices & Receptacles", description: "250V 50A Range Receptacle",   unit: "EA", unitPrice: 12.00 },
  { id: "dev-cover-1g",   category: "Devices & Receptacles", description: "1-Gang Decorator Cover Plate", unit: "EA", unitPrice: 0.65 },
  { id: "dev-cover-2g",   category: "Devices & Receptacles", description: "2-Gang Cover Plate",          unit: "EA", unitPrice: 0.95 },
  { id: "dev-cover-wp",   category: "Devices & Receptacles", description: "Weatherproof In-Use Cover",   unit: "EA", unitPrice: 4.50 },

  // ── Lighting ──────────────────────────────────────────────────────────────
  { id: "lt-can-4",      category: "Lighting", description: "4\" LED Recessed Can (new construction)", unit: "EA", unitPrice: 22.00 },
  { id: "lt-can-6",      category: "Lighting", description: "6\" LED Recessed Can (new construction)", unit: "EA", unitPrice: 28.00 },
  { id: "lt-can-6-ic",   category: "Lighting", description: "6\" LED Recessed Can (IC-rated)",         unit: "EA", unitPrice: 35.00 },
  { id: "lt-troffer-2x4",category: "Lighting", description: "2×4 LED Troffer 40W",                     unit: "EA", unitPrice: 65.00 },
  { id: "lt-troffer-2x2",category: "Lighting", description: "2×2 LED Troffer 30W",                     unit: "EA", unitPrice: 55.00 },
  { id: "lt-strip-8",    category: "Lighting", description: "8 ft LED Strip Light",                    unit: "EA", unitPrice: 48.00 },
  { id: "lt-exit",       category: "Lighting", description: "LED Exit Sign (battery backup)",           unit: "EA", unitPrice: 55.00 },
  { id: "lt-emerg",      category: "Lighting", description: "Emergency Light (2-head)",                 unit: "EA", unitPrice: 65.00 },
  { id: "lt-wallpack",   category: "Lighting", description: "LED Wall Pack 40W",                        unit: "EA", unitPrice: 85.00 },
  { id: "lt-pole-arm",   category: "Lighting", description: "Pole-Mounted LED Area Light 150W",         unit: "EA", unitPrice: 320.00 },
  { id: "lt-vapor-4",    category: "Lighting", description: "4 ft LED Vapor-Tight Fixture",             unit: "EA", unitPrice: 72.00 },

  // ── Panels & Breakers ─────────────────────────────────────────────────────
  { id: "pb-200a-42sp",  category: "Panels & Breakers", description: "200A 42-Space Main Breaker Panel",  unit: "EA", unitPrice: 280.00 },
  { id: "pb-200a-24sp",  category: "Panels & Breakers", description: "200A 24-Space Main Breaker Panel",  unit: "EA", unitPrice: 195.00 },
  { id: "pb-100a-20sp",  category: "Panels & Breakers", description: "100A 20-Space Sub Panel",           unit: "EA", unitPrice: 120.00 },
  { id: "pb-cb-1p-15",   category: "Panels & Breakers", description: "1-Pole 15A Breaker",               unit: "EA", unitPrice: 8.50 },
  { id: "pb-cb-1p-20",   category: "Panels & Breakers", description: "1-Pole 20A Breaker",               unit: "EA", unitPrice: 9.00 },
  { id: "pb-cb-1p-30",   category: "Panels & Breakers", description: "1-Pole 30A Breaker",               unit: "EA", unitPrice: 10.50 },
  { id: "pb-cb-2p-20",   category: "Panels & Breakers", description: "2-Pole 20A Breaker",               unit: "EA", unitPrice: 14.00 },
  { id: "pb-cb-2p-30",   category: "Panels & Breakers", description: "2-Pole 30A Breaker",               unit: "EA", unitPrice: 16.00 },
  { id: "pb-cb-2p-50",   category: "Panels & Breakers", description: "2-Pole 50A Breaker",               unit: "EA", unitPrice: 22.00 },
  { id: "pb-cb-2p-100",  category: "Panels & Breakers", description: "2-Pole 100A Breaker",              unit: "EA", unitPrice: 38.00 },
  { id: "pb-cb-2p-200",  category: "Panels & Breakers", description: "2-Pole 200A Main Breaker",         unit: "EA", unitPrice: 85.00 },
  { id: "pb-afci-1p-15", category: "Panels & Breakers", description: "AFCI 1-Pole 15A Breaker",          unit: "EA", unitPrice: 42.00 },
  { id: "pb-afci-1p-20", category: "Panels & Breakers", description: "AFCI 1-Pole 20A Breaker",          unit: "EA", unitPrice: 45.00 },
  { id: "pb-gfci-2p-20", category: "Panels & Breakers", description: "GFCI 2-Pole 20A Breaker",          unit: "EA", unitPrice: 55.00 },

  // ── Grounding ─────────────────────────────────────────────────────────────
  { id: "gr-rod-5/8",   category: "Grounding", description: "Ground Rod ⅝\"×8 ft (copper-clad)",  unit: "EA",  unitPrice: 14.00 },
  { id: "gr-rod-clamp", category: "Grounding", description: "Ground Rod Clamp ⅝\"",               unit: "EA",  unitPrice: 2.50 },
  { id: "gr-wire-4cu",  category: "Grounding", description: "Bare Copper #4 AWG Ground Wire",      unit: "FT",  unitPrice: 1.20 },
  { id: "gr-wire-6cu",  category: "Grounding", description: "Bare Copper #6 AWG Ground Wire",      unit: "FT",  unitPrice: 0.75 },
  { id: "gr-lug-4",     category: "Grounding", description: "Ground Lug #4 AWG",                   unit: "EA",  unitPrice: 1.80 },
  { id: "gr-bus-bar",   category: "Grounding", description: "Ground Bus Bar (12-terminal)",         unit: "EA",  unitPrice: 8.50 },

  // ── Fasteners & Supports ──────────────────────────────────────────────────
  { id: "fs-strap-1/2", category: "Fasteners & Supports", description: "1-Hole Strap ½\" EMT",    unit: "EA",  unitPrice: 0.25 },
  { id: "fs-strap-3/4", category: "Fasteners & Supports", description: "1-Hole Strap ¾\" EMT",    unit: "EA",  unitPrice: 0.30 },
  { id: "fs-strap-1",   category: "Fasteners & Supports", description: "1-Hole Strap 1\" EMT",    unit: "EA",  unitPrice: 0.40 },
  { id: "fs-2hole-1/2", category: "Fasteners & Supports", description: "2-Hole Strap ½\" EMT",    unit: "EA",  unitPrice: 0.45 },
  { id: "fs-2hole-3/4", category: "Fasteners & Supports", description: "2-Hole Strap ¾\" EMT",    unit: "EA",  unitPrice: 0.55 },
  { id: "fs-unistrut-10",category: "Fasteners & Supports", description: "Unistrut 1-5/8\" (10 ft)", unit: "EA", unitPrice: 22.00 },
  { id: "fs-unistrut-20",category: "Fasteners & Supports", description: "Unistrut 1-5/8\" (20 ft)", unit: "EA", unitPrice: 42.00 },
  { id: "fs-beam-clamp", category: "Fasteners & Supports", description: "Beam Clamp ½\"",          unit: "EA",  unitPrice: 1.20 },
  { id: "fs-wire-mesh",  category: "Fasteners & Supports", description: "Wire Mesh Cable Tray (12\"×10 ft)", unit: "EA", unitPrice: 85.00 },
  { id: "fs-conduit-hanger-1/2", category: "Fasteners & Supports", description: "Conduit Hanger ½\" (threaded rod)", unit: "EA", unitPrice: 0.85 },
  { id: "fs-conduit-hanger-1",   category: "Fasteners & Supports", description: "Conduit Hanger 1\" (threaded rod)",  unit: "EA", unitPrice: 1.20 },
  { id: "fs-anchor-1/4", category: "Fasteners & Supports", description: "Concrete Anchor ¼\"×1-1/4\" (100-pk)", unit: "BX", unitPrice: 18.00 },
  { id: "fs-tapcon-3/16",category: "Fasteners & Supports", description: "Tapcon Screw 3/16\" (100-pk)", unit: "BX", unitPrice: 22.00 },

  // ── Underground ───────────────────────────────────────────────────────────
  { id: "ug-pvc-2-db",   category: "Underground", description: "PVC Schedule 80 2\" (DB — direct bury)", unit: "FT", unitPrice: 1.80 },
  { id: "ug-pvc-3-db",   category: "Underground", description: "PVC Schedule 80 3\" (DB)",               unit: "FT", unitPrice: 2.80 },
  { id: "ug-pvc-4-db",   category: "Underground", description: "PVC Schedule 80 4\" (DB)",               unit: "FT", unitPrice: 4.20 },
  { id: "ug-warning-tape",category: "Underground", description: "Underground Warning Tape (1000 ft)",    unit: "RL", unitPrice: 28.00 },
  { id: "ug-sand",        category: "Underground", description: "Bedding Sand (per ton)",                 unit: "TN", unitPrice: 42.00 },
  { id: "ug-handhole-sm", category: "Underground", description: "Polymer Handhole 12\"×12\"",            unit: "EA", unitPrice: 85.00 },
  { id: "ug-handhole-lg", category: "Underground", description: "Polymer Handhole 24\"×36\"",            unit: "EA", unitPrice: 280.00 },
  { id: "ug-manhole",     category: "Underground", description: "Precast Concrete Manhole",               unit: "EA", unitPrice: 1800.00 },
  { id: "ug-duct-seal",   category: "Underground", description: "Duct Seal Compound (1 lb)",             unit: "EA", unitPrice: 4.50 },
  { id: "ug-pulling-eye", category: "Underground", description: "Pulling Eye (cable grip)",               unit: "EA", unitPrice: 12.00 },

  // ── Low Voltage ───────────────────────────────────────────────────────────
  { id: "lv-cat6",       category: "Low Voltage", description: "Cat6 UTP Cable (1000 ft)",        unit: "RL", unitPrice: 95.00 },
  { id: "lv-cat6a",      category: "Low Voltage", description: "Cat6A STP Cable (1000 ft)",       unit: "RL", unitPrice: 185.00 },
  { id: "lv-coax-rg6",   category: "Low Voltage", description: "RG6 Coax Cable (500 ft)",         unit: "RL", unitPrice: 55.00 },
  { id: "lv-speaker-16", category: "Low Voltage", description: "16/2 Speaker Wire (500 ft)",      unit: "RL", unitPrice: 45.00 },
  { id: "lv-j-box-lv",   category: "Low Voltage", description: "Low Voltage Mounting Bracket",    unit: "EA", unitPrice: 1.20 },
  { id: "lv-keystone-rj45", category: "Low Voltage", description: "Keystone Jack Cat6 RJ45",      unit: "EA", unitPrice: 3.50 },
  { id: "lv-patch-panel-24", category: "Low Voltage", description: "24-Port Patch Panel Cat6",    unit: "EA", unitPrice: 55.00 },
  { id: "lv-smoke-det",  category: "Low Voltage", description: "Smoke Detector (120V w/battery)", unit: "EA", unitPrice: 22.00 },
  { id: "lv-co-det",     category: "Low Voltage", description: "CO Detector (120V)",               unit: "EA", unitPrice: 28.00 },

  // ── Miscellaneous ─────────────────────────────────────────────────────────
  { id: "misc-tape-elec",  category: "Miscellaneous", description: "Electrical Tape (10-roll pk)", unit: "PK", unitPrice: 12.00 },
  { id: "misc-wire-nut-sm",category: "Miscellaneous", description: "Wire Nuts Small (100-pk)",    unit: "BX", unitPrice: 6.50 },
  { id: "misc-wire-nut-lg",category: "Miscellaneous", description: "Wire Nuts Large (100-pk)",    unit: "BX", unitPrice: 8.00 },
  { id: "misc-pulling-lube",category: "Miscellaneous", description: "Wire Pulling Lubricant (1 qt)", unit: "QT", unitPrice: 14.00 },
  { id: "misc-conduit-lube",category: "Miscellaneous", description: "Conduit Bending Lubricant",  unit: "EA", unitPrice: 8.50 },
  { id: "misc-label-tape", category: "Miscellaneous", description: "Label Tape (Brother TZe)",    unit: "EA", unitPrice: 9.00 },
  { id: "misc-wire-marker",category: "Miscellaneous", description: "Wire Marker Book",             unit: "EA", unitPrice: 4.50 },
  { id: "misc-fish-tape",  category: "Miscellaneous", description: "Fish Tape 50 ft",              unit: "EA", unitPrice: 38.00 },
  { id: "misc-knockout-1/2",category: "Miscellaneous", description: "Knockout Punch ½\"",          unit: "EA", unitPrice: 28.00 },
  { id: "misc-knockout-3/4",category: "Miscellaneous", description: "Knockout Punch ¾\"",          unit: "EA", unitPrice: 32.00 },
];

/** Search the catalog by description, category, or id */
export function searchCatalog(query: string, limit = 20): CatalogItem[] {
  if (!query.trim()) return CATALOG.slice(0, limit);
  const q = query.toLowerCase();
  return CATALOG.filter(
    (item) =>
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      (item.notes ?? "").toLowerCase().includes(q)
  ).slice(0, limit);
}

/** Get a catalog item by id */
export function getCatalogItem(id: string): CatalogItem | undefined {
  return CATALOG.find((item) => item.id === id);
}
