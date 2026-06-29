/**
 * BidPhase — Electrical Estimating Database
 *
 * COPYRIGHT NOTICE:
 *   All item descriptions use standard industry terminology (not copyrightable).
 *   All base_labor_hours values are ORIGINAL ESTIMATES authored for this software.
 *   They are NOT copied from NECA, RSMeans, Gordian, or any other publication.
 *   Users may override these values with their own licensed data via the
 *   Labor Standards connector in Settings.
 *
 * Fields:
 *  - item_id:          unique identifier
 *  - description:      human-readable item name (standard trade terminology)
 *  - category:         phase/trade grouping
 *  - unit:             EA / FT / LF / BOX / etc.
 *  - base_labor_hours: original estimated hours per unit (not from any publication)
 *  - mock_unit_price:  placeholder price (replace with live API or user upload)
 *  - platt_sku:        Platt SKU placeholder (populated when Platt API is live)
 *  - keywords:         additional search terms for fuzzy matching
 *
 * Category multipliers (applied in the Estimate Engine):
 *   Residential:        × 0.90
 *   Commercial:         × 1.05
 *   Industrial:         × 1.20
 *   Infrastructure:     × 1.30
 *
 * Platt API stub:
 *   When VITE_PLATT_API_KEY is set, fetchPlattPrice(platt_sku) replaces mock_unit_price.
 *   Until then, mock_unit_price is used as-is.
 */

export type ElectricalPhase =
  | "Conduit & Raceway"
  | "Wire & Cable"
  | "Panels & Breakers"
  | "Devices & Wiring"
  | "Lighting"
  | "Motors & Controls"
  | "Low Voltage"
  | "Grounding"
  | "Fittings & Hardware"
  | "Infrastructure";

export interface ElectricalItem {
  item_id: string;
  description: string;
  phase: ElectricalPhase;
  unit: string;
  base_labor_hours: number;   // original estimate (hrs/unit)
  mock_unit_price: number;    // contractor net (mock)
  platt_sku?: string;
  keywords?: string[];
}

// ─── Database ─────────────────────────────────────────────────────────────────
export const ELECTRICAL_DB: ElectricalItem[] = [

  // ── Conduit & Raceway ──────────────────────────────────────────────────────
  { item_id: "CR-001", description: '1/2" EMT Conduit', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.025, mock_unit_price: 0.42, platt_sku: "EMT-050", keywords: ["emt", "half inch", "conduit"] },
  { item_id: "CR-002", description: '3/4" EMT Conduit', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.030, mock_unit_price: 0.68, platt_sku: "EMT-075", keywords: ["emt", "three quarter", "conduit"] },
  { item_id: "CR-003", description: '1" EMT Conduit', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.038, mock_unit_price: 1.05, platt_sku: "EMT-100", keywords: ["emt", "one inch", "conduit"] },
  { item_id: "CR-004", description: '1-1/4" EMT Conduit', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.045, mock_unit_price: 1.52, platt_sku: "EMT-125", keywords: ["emt", "conduit"] },
  { item_id: "CR-005", description: '1-1/2" EMT Conduit', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.052, mock_unit_price: 1.98, platt_sku: "EMT-150", keywords: ["emt", "conduit"] },
  { item_id: "CR-006", description: '2" EMT Conduit', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.062, mock_unit_price: 2.85, platt_sku: "EMT-200", keywords: ["emt", "two inch", "conduit"] },
  { item_id: "CR-007", description: '2-1/2" EMT Conduit', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.082, mock_unit_price: 5.20, platt_sku: "EMT-250", keywords: ["emt", "conduit"] },
  { item_id: "CR-008", description: '3" EMT Conduit', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.100, mock_unit_price: 7.40, platt_sku: "EMT-300", keywords: ["emt", "three inch", "conduit"] },
  { item_id: "CR-009", description: '4" EMT Conduit', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.130, mock_unit_price: 11.80, platt_sku: "EMT-400", keywords: ["emt", "four inch", "conduit"] },

  { item_id: "CR-010", description: '1/2" Rigid Steel Conduit (GRC)', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.045, mock_unit_price: 1.20, platt_sku: "GRC-050", keywords: ["rigid", "grc", "rmc", "conduit"] },
  { item_id: "CR-011", description: '3/4" Rigid Steel Conduit (GRC)', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.055, mock_unit_price: 1.75, platt_sku: "GRC-075", keywords: ["rigid", "grc", "conduit"] },
  { item_id: "CR-012", description: '1" Rigid Steel Conduit (GRC)', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.068, mock_unit_price: 2.50, platt_sku: "GRC-100", keywords: ["rigid", "grc", "conduit"] },
  { item_id: "CR-013", description: '2" Rigid Steel Conduit (GRC)', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.110, mock_unit_price: 6.80, platt_sku: "GRC-200", keywords: ["rigid", "grc", "conduit"] },

  { item_id: "CR-014", description: '1/2" PVC Schedule 40 Conduit', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.018, mock_unit_price: 0.28, platt_sku: "PVC40-050", keywords: ["pvc", "schedule 40", "conduit"] },
  { item_id: "CR-015", description: '3/4" PVC Schedule 40 Conduit', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.022, mock_unit_price: 0.38, platt_sku: "PVC40-075", keywords: ["pvc", "schedule 40", "conduit"] },
  { item_id: "CR-016", description: '1" PVC Schedule 40 Conduit', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.028, mock_unit_price: 0.55, platt_sku: "PVC40-100", keywords: ["pvc", "schedule 40", "conduit"] },
  { item_id: "CR-017", description: '2" PVC Schedule 40 Conduit', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.045, mock_unit_price: 1.10, platt_sku: "PVC40-200", keywords: ["pvc", "schedule 40", "conduit"] },
  { item_id: "CR-018", description: '4" PVC Schedule 40 Conduit', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.085, mock_unit_price: 3.20, platt_sku: "PVC40-400", keywords: ["pvc", "schedule 40", "conduit"] },

  { item_id: "CR-019", description: '3/8" Flexible Metal Conduit (FMC)', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.030, mock_unit_price: 0.65, platt_sku: "FMC-038", keywords: ["flex", "fmc", "flexible"] },
  { item_id: "CR-020", description: '1/2" Flexible Metal Conduit (FMC)', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.035, mock_unit_price: 0.85, platt_sku: "FMC-050", keywords: ["flex", "fmc", "flexible"] },
  { item_id: "CR-021", description: '3/4" Flexible Metal Conduit (FMC)', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.042, mock_unit_price: 1.20, platt_sku: "FMC-075", keywords: ["flex", "fmc", "flexible"] },
  { item_id: "CR-022", description: '1/2" Liquid-Tight Flexible Conduit (LFMC)', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.040, mock_unit_price: 1.10, platt_sku: "LFMC-050", keywords: ["liquid tight", "liquidtight", "lfmc", "flexible"] },
  { item_id: "CR-023", description: '3/4" Liquid-Tight Flexible Conduit (LFMC)', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.048, mock_unit_price: 1.55, platt_sku: "LFMC-075", keywords: ["liquid tight", "lfmc"] },

  { item_id: "CR-024", description: '4" Wire Duct / Cable Tray', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.060, mock_unit_price: 8.50, keywords: ["wire duct", "cable tray", "wireway"] },
  { item_id: "CR-025", description: '6" Wire Duct / Cable Tray', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.075, mock_unit_price: 12.00, keywords: ["wire duct", "cable tray", "wireway"] },
  { item_id: "CR-026", description: '12" Wire Duct / Cable Tray', phase: "Conduit & Raceway", unit: "FT", base_labor_hours: 0.100, mock_unit_price: 22.00, keywords: ["wire duct", "cable tray", "wireway"] },

  // ── Wire & Cable ───────────────────────────────────────────────────────────
  { item_id: "WC-001", description: '#14 AWG THHN/THWN Copper Wire', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.008, mock_unit_price: 0.12, platt_sku: "THHN-14", keywords: ["thhn", "thwn", "14 awg", "wire", "copper"] },
  { item_id: "WC-002", description: '#12 AWG THHN/THWN Copper Wire', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.009, mock_unit_price: 0.18, platt_sku: "THHN-12", keywords: ["thhn", "thwn", "12 awg", "wire", "copper"] },
  { item_id: "WC-003", description: '#10 AWG THHN/THWN Copper Wire', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.010, mock_unit_price: 0.28, platt_sku: "THHN-10", keywords: ["thhn", "thwn", "10 awg", "wire", "copper"] },
  { item_id: "WC-004", description: '#8 AWG THHN/THWN Copper Wire', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.013, mock_unit_price: 0.55, platt_sku: "THHN-8", keywords: ["thhn", "thwn", "8 awg", "wire", "copper"] },
  { item_id: "WC-005", description: '#6 AWG THHN/THWN Copper Wire', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.016, mock_unit_price: 0.88, platt_sku: "THHN-6", keywords: ["thhn", "thwn", "6 awg", "wire", "copper"] },
  { item_id: "WC-006", description: '#4 AWG THHN/THWN Copper Wire', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.020, mock_unit_price: 1.40, platt_sku: "THHN-4", keywords: ["thhn", "thwn", "4 awg", "wire", "copper"] },
  { item_id: "WC-007", description: '#2 AWG THHN/THWN Copper Wire', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.025, mock_unit_price: 2.20, platt_sku: "THHN-2", keywords: ["thhn", "thwn", "2 awg", "wire", "copper"] },
  { item_id: "WC-008", description: '#1/0 AWG THHN/THWN Copper Wire', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.032, mock_unit_price: 3.80, platt_sku: "THHN-1/0", keywords: ["thhn", "1/0", "one ought", "wire", "copper"] },
  { item_id: "WC-009", description: '#2/0 AWG THHN/THWN Copper Wire', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.038, mock_unit_price: 4.80, platt_sku: "THHN-2/0", keywords: ["thhn", "2/0", "two ought", "wire", "copper"] },
  { item_id: "WC-010", description: '#4/0 AWG THHN/THWN Copper Wire', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.050, mock_unit_price: 7.50, platt_sku: "THHN-4/0", keywords: ["thhn", "4/0", "four ought", "wire", "copper"] },
  { item_id: "WC-011", description: '250 kcmil THHN/THWN Copper Wire', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.062, mock_unit_price: 9.80, platt_sku: "THHN-250", keywords: ["thhn", "250 kcmil", "wire", "copper"] },
  { item_id: "WC-012", description: '350 kcmil THHN/THWN Copper Wire', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.080, mock_unit_price: 13.50, platt_sku: "THHN-350", keywords: ["thhn", "350 kcmil", "wire", "copper"] },
  { item_id: "WC-013", description: '500 kcmil THHN/THWN Copper Wire', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.100, mock_unit_price: 19.00, platt_sku: "THHN-500", keywords: ["thhn", "500 kcmil", "wire", "copper"] },

  { item_id: "WC-014", description: '12/2 NM-B (Romex) Cable', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.012, mock_unit_price: 0.45, platt_sku: "NMB-12-2", keywords: ["romex", "nm-b", "12/2", "cable"] },
  { item_id: "WC-015", description: '12/3 NM-B (Romex) Cable', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.014, mock_unit_price: 0.65, platt_sku: "NMB-12-3", keywords: ["romex", "nm-b", "12/3", "cable"] },
  { item_id: "WC-016", description: '14/2 NM-B (Romex) Cable', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.010, mock_unit_price: 0.32, platt_sku: "NMB-14-2", keywords: ["romex", "nm-b", "14/2", "cable"] },
  { item_id: "WC-017", description: '10/2 NM-B (Romex) Cable', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.015, mock_unit_price: 0.72, platt_sku: "NMB-10-2", keywords: ["romex", "nm-b", "10/2", "cable"] },

  { item_id: "WC-018", description: '12/2 MC Cable (Armored)', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.018, mock_unit_price: 0.88, platt_sku: "MC-12-2", keywords: ["mc cable", "armored", "12/2"] },
  { item_id: "WC-019", description: '12/3 MC Cable (Armored)', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.022, mock_unit_price: 1.15, platt_sku: "MC-12-3", keywords: ["mc cable", "armored", "12/3"] },
  { item_id: "WC-020", description: '10/3 MC Cable (Armored)', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.028, mock_unit_price: 1.65, platt_sku: "MC-10-3", keywords: ["mc cable", "armored", "10/3"] },

  { item_id: "WC-021", description: '#14 AWG Ground Wire (Bare Copper)', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.006, mock_unit_price: 0.08, keywords: ["ground", "bare copper", "14 awg"] },
  { item_id: "WC-022", description: '#6 AWG Ground Wire (Bare Copper)', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.010, mock_unit_price: 0.55, keywords: ["ground", "bare copper", "6 awg"] },
  { item_id: "WC-023", description: '#4 AWG Ground Wire (Bare Copper)', phase: "Wire & Cable", unit: "FT", base_labor_hours: 0.012, mock_unit_price: 0.88, keywords: ["ground", "bare copper", "4 awg"] },

  // ── Panels & Breakers ──────────────────────────────────────────────────────
  { item_id: "PB-001", description: '100A 20-Space Main Breaker Panel (Square D QO)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 4.00, mock_unit_price: 185.00, platt_sku: "QO120L200PG", keywords: ["panel", "loadcenter", "100 amp", "square d", "qo"] },
  { item_id: "PB-002", description: '200A 40-Space Main Breaker Panel (Square D QO)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 6.00, mock_unit_price: 320.00, platt_sku: "QO140L200PG", keywords: ["panel", "loadcenter", "200 amp", "square d", "qo"] },
  { item_id: "PB-003", description: '200A 42-Space Main Breaker Panel (Eaton BR)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 6.00, mock_unit_price: 295.00, platt_sku: "BR4242B200", keywords: ["panel", "loadcenter", "200 amp", "eaton", "br"] },
  { item_id: "PB-004", description: '400A 42-Space Main Breaker Panel (Square D QO)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 10.00, mock_unit_price: 680.00, platt_sku: "QO142L400PG", keywords: ["panel", "loadcenter", "400 amp", "square d"] },
  { item_id: "PB-005", description: '800A 3-Phase Distribution Panel', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 20.00, mock_unit_price: 2800.00, keywords: ["distribution", "mcc", "800 amp", "3 phase"] },

  { item_id: "PB-010", description: '15A Single-Pole Circuit Breaker (Square D QO)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 0.25, mock_unit_price: 8.50, platt_sku: "QO115", keywords: ["breaker", "15 amp", "single pole", "square d", "qo"] },
  { item_id: "PB-011", description: '20A Single-Pole Circuit Breaker (Square D QO)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 0.25, mock_unit_price: 8.50, platt_sku: "QO120", keywords: ["breaker", "20 amp", "single pole", "square d", "qo"] },
  { item_id: "PB-012", description: '30A Single-Pole Circuit Breaker (Square D QO)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 0.25, mock_unit_price: 9.50, platt_sku: "QO130", keywords: ["breaker", "30 amp", "single pole", "square d"] },
  { item_id: "PB-013", description: '20A Double-Pole Circuit Breaker (Square D QO)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 0.35, mock_unit_price: 14.50, platt_sku: "QO220", keywords: ["breaker", "20 amp", "double pole", "2 pole", "square d"] },
  { item_id: "PB-014", description: '30A Double-Pole Circuit Breaker (Square D QO)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 0.35, mock_unit_price: 15.50, platt_sku: "QO230", keywords: ["breaker", "30 amp", "double pole", "2 pole", "square d"] },
  { item_id: "PB-015", description: '40A Double-Pole Circuit Breaker (Square D QO)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 0.35, mock_unit_price: 18.00, platt_sku: "QO240", keywords: ["breaker", "40 amp", "double pole", "square d"] },
  { item_id: "PB-016", description: '50A Double-Pole Circuit Breaker (Square D QO)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 0.35, mock_unit_price: 20.00, platt_sku: "QO250", keywords: ["breaker", "50 amp", "double pole", "square d"] },
  { item_id: "PB-017", description: '60A Double-Pole Circuit Breaker (Square D QO)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 0.40, mock_unit_price: 24.00, platt_sku: "QO260", keywords: ["breaker", "60 amp", "double pole", "square d"] },
  { item_id: "PB-018", description: '100A Double-Pole Circuit Breaker (Square D QO)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 0.50, mock_unit_price: 42.00, platt_sku: "QO2100", keywords: ["breaker", "100 amp", "double pole", "square d"] },
  { item_id: "PB-019", description: '20A AFCI Breaker (Square D QO)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 0.40, mock_unit_price: 38.00, platt_sku: "QO120PCAFI", keywords: ["afci", "arc fault", "20 amp", "breaker", "square d"] },
  { item_id: "PB-020", description: '20A GFCI Breaker (Square D QO)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 0.40, mock_unit_price: 42.00, platt_sku: "QO120GFIC", keywords: ["gfci", "ground fault", "20 amp", "breaker", "square d"] },
  { item_id: "PB-021", description: '20A Dual-Function AFCI/GFCI Breaker (Eaton)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 0.45, mock_unit_price: 55.00, keywords: ["afci", "gfci", "dual function", "20 amp", "eaton"] },

  { item_id: "PB-030", description: '15A Single-Pole Breaker (Eaton BR)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 0.25, mock_unit_price: 7.50, platt_sku: "BR115", keywords: ["breaker", "15 amp", "eaton", "br"] },
  { item_id: "PB-031", description: '20A Single-Pole Breaker (Eaton BR)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 0.25, mock_unit_price: 7.50, platt_sku: "BR120", keywords: ["breaker", "20 amp", "eaton", "br"] },
  { item_id: "PB-032", description: '20A Double-Pole Breaker (Eaton BR)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 0.35, mock_unit_price: 13.50, platt_sku: "BR220", keywords: ["breaker", "20 amp", "double pole", "eaton", "br"] },
  { item_id: "PB-033", description: '30A Double-Pole Breaker (Eaton BR)', phase: "Panels & Breakers", unit: "EA", base_labor_hours: 0.35, mock_unit_price: 14.50, platt_sku: "BR230", keywords: ["breaker", "30 amp", "double pole", "eaton"] },

  // ── Devices & Wiring ───────────────────────────────────────────────────────
  { item_id: "DW-001", description: '15A Duplex Receptacle (Ivory)', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.25, mock_unit_price: 1.20, keywords: ["outlet", "receptacle", "duplex", "15 amp"] },
  { item_id: "DW-002", description: '20A Duplex Receptacle (White)', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.25, mock_unit_price: 2.80, keywords: ["outlet", "receptacle", "duplex", "20 amp"] },
  { item_id: "DW-003", description: '20A GFCI Receptacle (White)', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.35, mock_unit_price: 14.50, keywords: ["gfci", "outlet", "receptacle", "20 amp", "ground fault"] },
  { item_id: "DW-004", description: '15A GFCI Receptacle (White)', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.35, mock_unit_price: 12.50, keywords: ["gfci", "outlet", "receptacle", "15 amp"] },
  { item_id: "DW-005", description: '20A Tamper-Resistant Receptacle', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.28, mock_unit_price: 4.50, keywords: ["tamper resistant", "tr", "outlet", "receptacle"] },
  { item_id: "DW-006", description: '30A Dryer Outlet (3-Wire)', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.75, mock_unit_price: 12.00, keywords: ["dryer", "outlet", "30 amp", "3 wire"] },
  { item_id: "DW-007", description: '50A Range Outlet (4-Wire)', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.90, mock_unit_price: 18.00, keywords: ["range", "stove", "outlet", "50 amp", "4 wire"] },
  { item_id: "DW-008", description: 'USB Duplex Receptacle (A+C Ports)', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.35, mock_unit_price: 22.00, keywords: ["usb", "outlet", "receptacle", "charger"] },

  { item_id: "DW-010", description: 'Single-Pole Switch 15A', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.20, mock_unit_price: 1.50, keywords: ["switch", "single pole", "15 amp", "toggle"] },
  { item_id: "DW-011", description: '3-Way Switch 15A', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.25, mock_unit_price: 3.50, keywords: ["switch", "3 way", "three way", "15 amp"] },
  { item_id: "DW-012", description: '4-Way Switch 15A', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.30, mock_unit_price: 8.50, keywords: ["switch", "4 way", "four way", "15 amp"] },
  { item_id: "DW-013", description: 'Dimmer Switch (Single-Pole, 600W)', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.35, mock_unit_price: 18.00, keywords: ["dimmer", "switch", "600 watt"] },
  { item_id: "DW-014", description: 'Occupancy Sensor Switch (PIR)', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.45, mock_unit_price: 28.00, keywords: ["occupancy", "motion", "sensor", "switch", "pir"] },

  { item_id: "DW-020", description: 'Single-Gang Old-Work Box (Plastic)', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.15, mock_unit_price: 0.85, keywords: ["box", "old work", "single gang", "plastic"] },
  { item_id: "DW-021", description: 'Single-Gang New-Work Box (Plastic)', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.12, mock_unit_price: 0.55, keywords: ["box", "new work", "single gang", "plastic"] },
  { item_id: "DW-022", description: '4" Square Box (Steel)', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.20, mock_unit_price: 2.20, keywords: ["box", "4 inch", "square", "steel", "4 square"] },
  { item_id: "DW-023", description: '4-11/16" Square Box (Steel)', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.25, mock_unit_price: 3.50, keywords: ["box", "4 11/16", "square", "steel"] },
  { item_id: "DW-024", description: '4" Round Pancake Box (Steel)', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.18, mock_unit_price: 1.80, keywords: ["box", "round", "pancake", "4 inch"] },
  { item_id: "DW-025", description: 'Weatherproof In-Use Cover (Single Gang)', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.15, mock_unit_price: 4.50, keywords: ["weatherproof", "in use", "cover", "outdoor"] },
  { item_id: "DW-026", description: 'Weatherproof In-Use Cover (Double Gang)', phase: "Devices & Wiring", unit: "EA", base_labor_hours: 0.15, mock_unit_price: 6.50, keywords: ["weatherproof", "in use", "cover", "outdoor", "double"] },

  { item_id: "DW-030", description: 'Wire Nut (Red, 100-pack)', phase: "Devices & Wiring", unit: "BOX", base_labor_hours: 0.50, mock_unit_price: 8.50, keywords: ["wire nut", "connector", "twist on", "red"] },
  { item_id: "DW-031", description: 'Wire Nut (Yellow, 100-pack)', phase: "Devices & Wiring", unit: "BOX", base_labor_hours: 0.50, mock_unit_price: 7.50, keywords: ["wire nut", "connector", "twist on", "yellow"] },
  { item_id: "DW-032", description: 'Push-In Connector (WAGO 221, 5-pack)', phase: "Devices & Wiring", unit: "PKG", base_labor_hours: 0.10, mock_unit_price: 3.50, keywords: ["wago", "push in", "connector", "lever"] },

  // ── Lighting ───────────────────────────────────────────────────────────────
  { item_id: "LT-001", description: '2x4 LED Troffer (4000K, 40W)', phase: "Lighting", unit: "EA", base_labor_hours: 0.75, mock_unit_price: 65.00, keywords: ["troffer", "led", "2x4", "fluorescent replacement", "office"] },
  { item_id: "LT-002", description: '2x2 LED Troffer (4000K, 25W)', phase: "Lighting", unit: "EA", base_labor_hours: 0.65, mock_unit_price: 55.00, keywords: ["troffer", "led", "2x2"] },
  { item_id: "LT-003", description: '6" LED Recessed Downlight (Retrofit)', phase: "Lighting", unit: "EA", base_labor_hours: 0.50, mock_unit_price: 28.00, keywords: ["recessed", "downlight", "can light", "6 inch", "led", "retrofit"] },
  { item_id: "LT-004", description: '4" LED Recessed Downlight', phase: "Lighting", unit: "EA", base_labor_hours: 0.45, mock_unit_price: 22.00, keywords: ["recessed", "downlight", "can light", "4 inch", "led"] },
  { item_id: "LT-005", description: 'LED Vapor Tight Fixture (4ft, 40W)', phase: "Lighting", unit: "EA", base_labor_hours: 0.80, mock_unit_price: 75.00, keywords: ["vapor tight", "led", "wet location", "garage", "warehouse"] },
  { item_id: "LT-006", description: 'LED High Bay (100W, UFO)', phase: "Lighting", unit: "EA", base_labor_hours: 1.50, mock_unit_price: 95.00, keywords: ["high bay", "led", "ufo", "warehouse", "100 watt"] },
  { item_id: "LT-007", description: 'LED High Bay (200W, UFO)', phase: "Lighting", unit: "EA", base_labor_hours: 1.75, mock_unit_price: 145.00, keywords: ["high bay", "led", "ufo", "warehouse", "200 watt"] },
  { item_id: "LT-008", description: 'LED Exit Sign (Battery Backup)', phase: "Lighting", unit: "EA", base_labor_hours: 1.00, mock_unit_price: 42.00, keywords: ["exit sign", "led", "emergency", "battery backup"] },
  { item_id: "LT-009", description: 'LED Emergency Light (Twin Head)', phase: "Lighting", unit: "EA", base_labor_hours: 1.00, mock_unit_price: 38.00, keywords: ["emergency light", "led", "twin head", "battery backup"] },
  { item_id: "LT-010", description: 'LED Wall Pack (40W, Dusk-to-Dawn)', phase: "Lighting", unit: "EA", base_labor_hours: 1.25, mock_unit_price: 85.00, keywords: ["wall pack", "led", "exterior", "outdoor", "dusk to dawn"] },
  { item_id: "LT-011", description: 'LED Parking Lot Pole Light (150W)', phase: "Lighting", unit: "EA", base_labor_hours: 4.00, mock_unit_price: 320.00, keywords: ["parking lot", "area light", "pole light", "led", "150 watt"] },
  { item_id: "LT-012", description: 'LED Street Light (100W, Type III)', phase: "Lighting", unit: "EA", base_labor_hours: 3.50, mock_unit_price: 280.00, keywords: ["street light", "led", "100 watt", "type iii"] },
  { item_id: "LT-013", description: 'Ceiling Fan with Light Kit (52")', phase: "Lighting", unit: "EA", base_labor_hours: 1.50, mock_unit_price: 120.00, keywords: ["ceiling fan", "fan", "light kit", "52 inch"] },

  // ── Motors & Controls ──────────────────────────────────────────────────────
  { item_id: "MC-001", description: '1/2 HP Motor Disconnect (30A Fusible)', phase: "Motors & Controls", unit: "EA", base_labor_hours: 1.50, mock_unit_price: 85.00, keywords: ["disconnect", "motor", "fusible", "30 amp"] },
  { item_id: "MC-002", description: '1 HP Motor Disconnect (30A Non-Fusible)', phase: "Motors & Controls", unit: "EA", base_labor_hours: 1.25, mock_unit_price: 65.00, keywords: ["disconnect", "motor", "non fusible", "30 amp"] },
  { item_id: "MC-003", description: '3 HP Motor Starter (NEMA Size 0)', phase: "Motors & Controls", unit: "EA", base_labor_hours: 3.00, mock_unit_price: 180.00, keywords: ["motor starter", "nema", "size 0", "3 hp"] },
  { item_id: "MC-004", description: '5 HP Motor Starter (NEMA Size 1)', phase: "Motors & Controls", unit: "EA", base_labor_hours: 3.50, mock_unit_price: 250.00, keywords: ["motor starter", "nema", "size 1", "5 hp"] },
  { item_id: "MC-005", description: '10 HP VFD (Variable Frequency Drive)', phase: "Motors & Controls", unit: "EA", base_labor_hours: 6.00, mock_unit_price: 650.00, keywords: ["vfd", "variable frequency drive", "10 hp", "drive"] },
  { item_id: "MC-006", description: '25 HP VFD (Variable Frequency Drive)', phase: "Motors & Controls", unit: "EA", base_labor_hours: 8.00, mock_unit_price: 1400.00, keywords: ["vfd", "variable frequency drive", "25 hp", "drive"] },
  { item_id: "MC-007", description: 'Control Transformer (120V/24V, 75VA)', phase: "Motors & Controls", unit: "EA", base_labor_hours: 1.50, mock_unit_price: 55.00, keywords: ["transformer", "control", "120v", "24v", "75va"] },
  { item_id: "MC-008", description: 'Pushbutton Station (Start/Stop)', phase: "Motors & Controls", unit: "EA", base_labor_hours: 1.00, mock_unit_price: 45.00, keywords: ["pushbutton", "start stop", "station"] },

  // ── Low Voltage ────────────────────────────────────────────────────────────
  { item_id: "LV-001", description: 'Cat6 UTP Cable (1000ft Box)', phase: "Low Voltage", unit: "BOX", base_labor_hours: 8.00, mock_unit_price: 85.00, keywords: ["cat6", "ethernet", "data", "network", "utp"] },
  { item_id: "LV-002", description: 'Cat6 UTP Cable (per foot)', phase: "Low Voltage", unit: "FT", base_labor_hours: 0.008, mock_unit_price: 0.09, keywords: ["cat6", "ethernet", "data", "network"] },
  { item_id: "LV-003", description: 'Cat6A UTP Cable (per foot)', phase: "Low Voltage", unit: "FT", base_labor_hours: 0.010, mock_unit_price: 0.18, keywords: ["cat6a", "ethernet", "data", "network", "10gb"] },
  { item_id: "LV-004", description: 'RJ45 Keystone Jack (Cat6)', phase: "Low Voltage", unit: "EA", base_labor_hours: 0.20, mock_unit_price: 2.50, keywords: ["keystone", "rj45", "cat6", "jack", "data"] },
  { item_id: "LV-005", description: '24-Port Patch Panel (Cat6)', phase: "Low Voltage", unit: "EA", base_labor_hours: 2.00, mock_unit_price: 65.00, keywords: ["patch panel", "24 port", "cat6"] },
  { item_id: "LV-006", description: 'Fire Alarm Initiating Device (Smoke Detector)', phase: "Low Voltage", unit: "EA", base_labor_hours: 0.75, mock_unit_price: 35.00, keywords: ["smoke detector", "fire alarm", "initiating device"] },
  { item_id: "LV-007", description: 'Fire Alarm Notification Device (Horn/Strobe)', phase: "Low Voltage", unit: "EA", base_labor_hours: 0.65, mock_unit_price: 55.00, keywords: ["horn strobe", "fire alarm", "notification", "speaker"] },
  { item_id: "LV-008", description: 'Fire Alarm Control Panel (4-Zone)', phase: "Low Voltage", unit: "EA", base_labor_hours: 8.00, mock_unit_price: 650.00, keywords: ["facp", "fire alarm", "control panel", "4 zone"] },
  { item_id: "LV-009", description: 'Security Camera (IP, 4MP)', phase: "Low Voltage", unit: "EA", base_labor_hours: 1.50, mock_unit_price: 85.00, keywords: ["camera", "cctv", "ip", "security", "surveillance"] },
  { item_id: "LV-010", description: 'Access Control Card Reader', phase: "Low Voltage", unit: "EA", base_labor_hours: 2.00, mock_unit_price: 120.00, keywords: ["access control", "card reader", "proximity"] },

  // ── Grounding ──────────────────────────────────────────────────────────────
  { item_id: "GR-001", description: '5/8" x 8ft Copper Ground Rod', phase: "Grounding", unit: "EA", base_labor_hours: 0.75, mock_unit_price: 18.00, keywords: ["ground rod", "copper", "5/8 inch", "8 foot"] },
  { item_id: "GR-002", description: '5/8" Ground Rod Clamp', phase: "Grounding", unit: "EA", base_labor_hours: 0.15, mock_unit_price: 3.50, keywords: ["ground rod clamp", "clamp", "5/8"] },
  { item_id: "GR-003", description: 'Grounding Busbar (20-Terminal)', phase: "Grounding", unit: "EA", base_labor_hours: 0.50, mock_unit_price: 12.00, keywords: ["busbar", "ground bus", "terminal"] },
  { item_id: "GR-004", description: '#6 AWG Solid Copper Ground Wire (per ft)', phase: "Grounding", unit: "FT", base_labor_hours: 0.010, mock_unit_price: 0.55, keywords: ["ground wire", "solid copper", "6 awg"] },
  { item_id: "GR-005", description: 'Grounding Electrode Conductor (GEC) #4 AWG', phase: "Grounding", unit: "FT", base_labor_hours: 0.012, mock_unit_price: 0.88, keywords: ["gec", "grounding electrode", "4 awg"] },
  { item_id: "GR-006", description: 'Bonding Jumper (Main, #4 AWG)', phase: "Grounding", unit: "EA", base_labor_hours: 0.30, mock_unit_price: 4.50, keywords: ["bonding jumper", "main bonding", "4 awg"] },

  // ── Fittings & Hardware ────────────────────────────────────────────────────
  { item_id: "FH-001", description: '1/2" EMT Compression Coupling', phase: "Fittings & Hardware", unit: "EA", base_labor_hours: 0.08, mock_unit_price: 0.55, keywords: ["coupling", "emt", "compression", "1/2"] },
  { item_id: "FH-002", description: '3/4" EMT Compression Coupling', phase: "Fittings & Hardware", unit: "EA", base_labor_hours: 0.10, mock_unit_price: 0.75, keywords: ["coupling", "emt", "compression", "3/4"] },
  { item_id: "FH-003", description: '1" EMT Compression Coupling', phase: "Fittings & Hardware", unit: "EA", base_labor_hours: 0.12, mock_unit_price: 1.10, keywords: ["coupling", "emt", "compression", "1 inch"] },
  { item_id: "FH-004", description: '1/2" EMT Connector (Compression)', phase: "Fittings & Hardware", unit: "EA", base_labor_hours: 0.08, mock_unit_price: 0.45, keywords: ["connector", "emt", "compression", "1/2"] },
  { item_id: "FH-005", description: '3/4" EMT Connector (Compression)', phase: "Fittings & Hardware", unit: "EA", base_labor_hours: 0.10, mock_unit_price: 0.65, keywords: ["connector", "emt", "compression", "3/4"] },
  { item_id: "FH-006", description: '1/2" EMT 90° Elbow', phase: "Fittings & Hardware", unit: "EA", base_labor_hours: 0.20, mock_unit_price: 1.20, keywords: ["elbow", "emt", "90 degree", "1/2"] },
  { item_id: "FH-007", description: '3/4" EMT 90° Elbow', phase: "Fittings & Hardware", unit: "EA", base_labor_hours: 0.25, mock_unit_price: 1.65, keywords: ["elbow", "emt", "90 degree", "3/4"] },
  { item_id: "FH-008", description: '1/2" One-Hole Conduit Strap', phase: "Fittings & Hardware", unit: "EA", base_labor_hours: 0.05, mock_unit_price: 0.18, keywords: ["strap", "conduit strap", "one hole", "1/2"] },
  { item_id: "FH-009", description: '3/4" One-Hole Conduit Strap', phase: "Fittings & Hardware", unit: "EA", base_labor_hours: 0.05, mock_unit_price: 0.22, keywords: ["strap", "conduit strap", "one hole", "3/4"] },
  { item_id: "FH-010", description: '1/2" Two-Hole Conduit Strap', phase: "Fittings & Hardware", unit: "EA", base_labor_hours: 0.08, mock_unit_price: 0.28, keywords: ["strap", "conduit strap", "two hole", "1/2"] },
  { item_id: "FH-011", description: 'Beam Clamp (1/2" - 3/4" Beam)', phase: "Fittings & Hardware", unit: "EA", base_labor_hours: 0.15, mock_unit_price: 1.80, keywords: ["beam clamp", "unistrut", "beam"] },
  { item_id: "FH-012", description: 'Unistrut Channel (10ft, 1-5/8")', phase: "Fittings & Hardware", unit: "EA", base_labor_hours: 0.50, mock_unit_price: 18.00, keywords: ["unistrut", "strut", "channel", "framing"] },
  { item_id: "FH-013", description: 'Threaded Rod (1/4"-20, 10ft)', phase: "Fittings & Hardware", unit: "EA", base_labor_hours: 0.20, mock_unit_price: 5.50, keywords: ["threaded rod", "all thread", "hanger rod"] },
  { item_id: "FH-014", description: 'Electrical Tape (3M Super 33+)', phase: "Fittings & Hardware", unit: "ROLL", base_labor_hours: 0.02, mock_unit_price: 3.50, keywords: ["tape", "electrical tape", "3m", "vinyl"] },
  { item_id: "FH-015", description: 'Cable Tie / Zip Tie (100-pack, 8")', phase: "Fittings & Hardware", unit: "PKG", base_labor_hours: 0.10, mock_unit_price: 4.50, keywords: ["zip tie", "cable tie", "nylon tie"] },

  // ── Infrastructure ────────────────────────────────────────────────────
  { item_id: "CU-001", description: '2" PVC Schedule 80 Conduit (Direct Burial)', phase: "Infrastructure", unit: "FT", base_labor_hours: 0.060, mock_unit_price: 1.85, keywords: ["pvc", "schedule 80", "direct burial", "underground", "2 inch"] },
  { item_id: "CU-002", description: '3" PVC Schedule 80 Conduit (Direct Burial)', phase: "Infrastructure", unit: "FT", base_labor_hours: 0.080, mock_unit_price: 3.20, keywords: ["pvc", "schedule 80", "direct burial", "underground", "3 inch"] },
  { item_id: "CU-003", description: '4" PVC Schedule 80 Conduit (Direct Burial)', phase: "Infrastructure", unit: "FT", base_labor_hours: 0.100, mock_unit_price: 5.50, keywords: ["pvc", "schedule 80", "direct burial", "underground", "4 inch"] },
  { item_id: "CU-004", description: '6" PVC Schedule 80 Conduit (Direct Burial)', phase: "Infrastructure", unit: "FT", base_labor_hours: 0.140, mock_unit_price: 11.00, keywords: ["pvc", "schedule 80", "direct burial", "underground", "6 inch"] },
  { item_id: "CU-005", description: 'Precast Concrete Handhole (17"x30")', phase: "Infrastructure", unit: "EA", base_labor_hours: 4.00, mock_unit_price: 320.00, keywords: ["handhole", "pull box", "precast", "concrete", "underground"] },
  { item_id: "CU-006", description: 'Precast Concrete Manhole (36"x48")', phase: "Infrastructure", unit: "EA", base_labor_hours: 12.00, mock_unit_price: 1200.00, keywords: ["manhole", "precast", "concrete", "underground"] },
  { item_id: "CU-007", description: 'Duct Seal Compound (1 lb)', phase: "Infrastructure", unit: "EA", base_labor_hours: 0.20, mock_unit_price: 4.50, keywords: ["duct seal", "sealant", "underground"] },
  { item_id: "CU-008", description: 'Underground Warning Tape (Red, 1000ft)', phase: "Infrastructure", unit: "ROLL", base_labor_hours: 0.50, mock_unit_price: 22.00, keywords: ["warning tape", "caution tape", "underground", "red"] },
  { item_id: "CU-009", description: 'Conduit Spacer / Separator (4-way)', phase: "Infrastructure", unit: "EA", base_labor_hours: 0.10, mock_unit_price: 1.80, keywords: ["spacer", "separator", "conduit", "underground"] },
  { item_id: "CU-010", description: 'Concrete Encasement (per CY)', phase: "Infrastructure", unit: "CY", base_labor_hours: 2.00, mock_unit_price: 180.00, keywords: ["concrete", "encasement", "underground", "duct bank"] },
  { item_id: "CU-011", description: 'Transformer Pad (Precast, 4\'x4\')', phase: "Infrastructure", unit: "EA", base_labor_hours: 3.00, mock_unit_price: 450.00, keywords: ["transformer pad", "precast", "concrete pad"] },
  { item_id: "CU-012", description: 'Utility Pole (35ft, Class 4)', phase: "Infrastructure", unit: "EA", base_labor_hours: 8.00, mock_unit_price: 380.00, keywords: ["pole", "utility pole", "wood pole", "35 foot"] },
  { item_id: "CU-013", description: 'Ground Rod (5/8" x 10ft, Copper-Clad)', phase: "Infrastructure", unit: "EA", base_labor_hours: 1.00, mock_unit_price: 28.00, keywords: ["ground rod", "copper clad", "10 foot", "underground"] },
  { item_id: "CU-014", description: 'Pulling Lubricant (1 gallon)', phase: "Infrastructure", unit: "EA", base_labor_hours: 0.10, mock_unit_price: 18.00, keywords: ["pulling lube", "lubricant", "wire pulling", "conduit"] },
];

// ─── Assembly Types ───────────────────────────────────────────────────────────

/** A single component line within an assembly (child item with quantity ratio). */
export interface AssemblyComponent {
  item_id: string;          // references an ElectricalItem.item_id OR a standalone description
  description: string;      // human-readable child item name
  unit: string;             // EA, FT, LF, etc.
  qty_per_unit: number;     // quantity of this component per 1 unit of the assembly
  base_labor_hrs: number;   // original estimate (hrs/unit)
  mock_unit_cost: number;   // contractor net price (mock)
}

/** A bundled assembly that expands into multiple child items. */
export interface ElectricalAssembly {
  assembly_id: string;
  name: string;
  description: string;
  category: "residential" | "commercial" | "industrial" | "infrastructure" | "all";
  phase: string;
  unit: string;             // the assembly's own unit (e.g. "EA" for a drop, "100FT" for a run)
  components: AssemblyComponent[];
}

// ─── Assemblies Database ──────────────────────────────────────────────────────
export const ELECTRICAL_ASSEMBLIES: ElectricalAssembly[] = [

  // ── RESIDENTIAL ────────────────────────────────────────────────────────────

  {
    assembly_id: "ASM-RES-001",
    name: "Residential Duplex Receptacle Drop",
    description: "Standard 20A duplex receptacle rough-in and finish: box, NM cable, device, cover plate",
    category: "residential",
    phase: "Rough-In / Finish",
    unit: "EA",
    components: [
      { item_id: "DW-001", description: "14/2 NM-B Cable (Romex)", unit: "FT", qty_per_unit: 12, base_labor_hrs: 0.008, mock_unit_cost: 0.38 },
      { item_id: "DW-010", description: "Single-Gang Old-Work Box", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.15, mock_unit_cost: 1.25 },
      { item_id: "DW-011", description: "20A Duplex Receptacle (Commercial Grade)", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.25, mock_unit_cost: 4.50 },
      { item_id: "DW-012", description: "Single-Gang Cover Plate", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.05, mock_unit_cost: 0.75 },
      { item_id: "FH-014", description: "Electrical Tape", unit: "ROLL", qty_per_unit: 0.05, base_labor_hrs: 0.00, mock_unit_cost: 3.50 },
    ],
  },

  {
    assembly_id: "ASM-RES-002",
    name: "Residential GFCI Receptacle Drop",
    description: "20A GFCI receptacle for kitchen/bath/garage: box, NM cable, GFCI device, cover plate",
    category: "residential",
    phase: "Rough-In / Finish",
    unit: "EA",
    components: [
      { item_id: "DW-001", description: "12/2 NM-B Cable (Romex)", unit: "FT", qty_per_unit: 12, base_labor_hrs: 0.010, mock_unit_cost: 0.62 },
      { item_id: "DW-010", description: "Single-Gang Old-Work Box", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.15, mock_unit_cost: 1.25 },
      { item_id: "DW-013", description: "20A GFCI Receptacle", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.35, mock_unit_cost: 18.50 },
      { item_id: "DW-012", description: "Single-Gang Cover Plate", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.05, mock_unit_cost: 0.75 },
    ],
  },

  {
    assembly_id: "ASM-RES-003",
    name: "Residential Single-Pole Switch Drop",
    description: "15A single-pole switch rough-in and finish: box, NM cable, switch, cover plate",
    category: "residential",
    phase: "Rough-In / Finish",
    unit: "EA",
    components: [
      { item_id: "DW-001", description: "14/2 NM-B Cable (Romex)", unit: "FT", qty_per_unit: 10, base_labor_hrs: 0.008, mock_unit_cost: 0.38 },
      { item_id: "DW-010", description: "Single-Gang Old-Work Box", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.15, mock_unit_cost: 1.25 },
      { item_id: "DW-014", description: "15A Single-Pole Switch", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.20, mock_unit_cost: 3.25 },
      { item_id: "DW-012", description: "Single-Gang Cover Plate", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.05, mock_unit_cost: 0.75 },
    ],
  },

  {
    assembly_id: "ASM-RES-004",
    name: "Residential Recessed Can Light Drop",
    description: "6-inch LED recessed can rough-in and finish: NM cable, remodel housing, LED trim",
    category: "residential",
    phase: "Rough-In / Finish",
    unit: "EA",
    components: [
      { item_id: "DW-001", description: "14/2 NM-B Cable (Romex)", unit: "FT", qty_per_unit: 8, base_labor_hrs: 0.008, mock_unit_cost: 0.38 },
      { item_id: "LT-001", description: '6" LED Recessed Housing (Remodel)', unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.50, mock_unit_cost: 22.00 },
      { item_id: "LT-002", description: '6" LED Trim & Bulb Kit', unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.20, mock_unit_cost: 18.00 },
      { item_id: "WC-001", description: "Wire Connector (Marrette, 100-pk)", unit: "PKG", qty_per_unit: 0.05, base_labor_hrs: 0.00, mock_unit_cost: 8.50 },
    ],
  },

  {
    assembly_id: "ASM-RES-005",
    name: "Residential 200A Panel Feed",
    description: "200A main panel rough-in: 200A panel, 2/0 SER cable 10ft, meter base, grounding",
    category: "residential",
    phase: "Rough-In",
    unit: "EA",
    components: [
      { item_id: "PB-001", description: "200A 40-Space Main Breaker Panel", unit: "EA", qty_per_unit: 1, base_labor_hrs: 4.00, mock_unit_cost: 185.00 },
      { item_id: "WC-002", description: "2/0 SER Aluminum Service Cable", unit: "FT", qty_per_unit: 10, base_labor_hrs: 0.060, mock_unit_cost: 3.20 },
      { item_id: "GR-001", description: '5/8" x 10ft Copper-Clad Ground Rod', unit: "EA", qty_per_unit: 2, base_labor_hrs: 1.00, mock_unit_cost: 28.00 },
      { item_id: "GR-002", description: "#4 Bare Copper Ground Wire", unit: "FT", qty_per_unit: 20, base_labor_hrs: 0.012, mock_unit_cost: 0.85 },
      { item_id: "FH-001", description: '1/2" EMT Conduit Connector', unit: "EA", qty_per_unit: 2, base_labor_hrs: 0.08, mock_unit_cost: 0.65 },
    ],
  },

  {
    assembly_id: "ASM-RES-006",
    name: "Residential Smoke Detector Drop",
    description: "Hardwired smoke detector with interconnect: NM cable, box, detector",
    category: "residential",
    phase: "Rough-In / Finish",
    unit: "EA",
    components: [
      { item_id: "DW-001", description: "14/3 NM-B Cable (Romex)", unit: "FT", qty_per_unit: 10, base_labor_hrs: 0.009, mock_unit_cost: 0.55 },
      { item_id: "DW-010", description: "Single-Gang Old-Work Box", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.15, mock_unit_cost: 1.25 },
      { item_id: "LV-001", description: "Hardwired Smoke Detector (Interconnectable)", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.40, mock_unit_cost: 32.00 },
    ],
  },

  // ── COMMERCIAL ─────────────────────────────────────────────────────────────

  {
    assembly_id: "ASM-COM-001",
    name: "Commercial Duplex Receptacle Drop (EMT)",
    description: "20A duplex receptacle in EMT conduit: 1/2\" EMT 10ft, box, #12 THHN, device, cover",
    category: "commercial",
    phase: "Rough-In / Finish",
    unit: "EA",
    components: [
      { item_id: "CR-001", description: '1/2" EMT Conduit', unit: "FT", qty_per_unit: 10, base_labor_hrs: 0.025, mock_unit_cost: 0.42 },
      { item_id: "CR-010", description: '1/2" EMT Coupling', unit: "EA", qty_per_unit: 2, base_labor_hrs: 0.05, mock_unit_cost: 0.35 },
      { item_id: "CR-011", description: '1/2" EMT Connector (Set-Screw)', unit: "EA", qty_per_unit: 2, base_labor_hrs: 0.05, mock_unit_cost: 0.28 },
      { item_id: "WC-003", description: "#12 THHN Wire", unit: "FT", qty_per_unit: 30, base_labor_hrs: 0.006, mock_unit_cost: 0.18 },
      { item_id: "DW-010", description: "4-Square Box with Single-Gang Mud Ring", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.20, mock_unit_cost: 3.50 },
      { item_id: "DW-011", description: "20A Duplex Receptacle (Commercial Grade)", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.25, mock_unit_cost: 4.50 },
      { item_id: "DW-012", description: "Single-Gang Cover Plate", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.05, mock_unit_cost: 0.75 },
    ],
  },

  {
    assembly_id: "ASM-COM-002",
    name: "Commercial 2x4 Lay-In Fluorescent/LED Fixture",
    description: "2x4 LED troffer rough-in and finish: 1/2\" EMT whip, fixture, wire connections",
    category: "commercial",
    phase: "Rough-In / Finish",
    unit: "EA",
    components: [
      { item_id: "CR-001", description: '1/2" EMT Conduit (Whip)', unit: "FT", qty_per_unit: 6, base_labor_hrs: 0.025, mock_unit_cost: 0.42 },
      { item_id: "WC-003", description: "#12 THHN Wire", unit: "FT", qty_per_unit: 18, base_labor_hrs: 0.006, mock_unit_cost: 0.18 },
      { item_id: "LT-003", description: '2x4 LED Troffer (4000K, 40W)', unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.75, mock_unit_cost: 68.00 },
      { item_id: "FH-002", description: "Fixture Hanger Wire (12ga, 4ft)", unit: "EA", qty_per_unit: 4, base_labor_hrs: 0.05, mock_unit_cost: 0.45 },
    ],
  },

  {
    assembly_id: "ASM-COM-003",
    name: "Commercial 100A Panel Feed (3-Phase)",
    description: "100A 3-phase sub-panel rough-in: panel, 1\" EMT 20ft, #1 THHN, breaker",
    category: "commercial",
    phase: "Rough-In",
    unit: "EA",
    components: [
      { item_id: "PB-002", description: "100A 3-Phase 42-Space Sub-Panel", unit: "EA", qty_per_unit: 1, base_labor_hrs: 6.00, mock_unit_cost: 420.00 },
      { item_id: "CR-003", description: '1" EMT Conduit', unit: "FT", qty_per_unit: 20, base_labor_hrs: 0.038, mock_unit_cost: 1.05 },
      { item_id: "WC-004", description: "#1 THHN Copper Wire", unit: "FT", qty_per_unit: 80, base_labor_hrs: 0.014, mock_unit_cost: 2.85 },
      { item_id: "PB-003", description: "100A 3-Pole Breaker", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.50, mock_unit_cost: 145.00 },
      { item_id: "GR-002", description: "#6 Bare Copper Ground Wire", unit: "FT", qty_per_unit: 20, base_labor_hrs: 0.010, mock_unit_cost: 0.55 },
    ],
  },

  {
    assembly_id: "ASM-COM-004",
    name: "Commercial Exit Sign / Emergency Light",
    description: "Exit sign with battery backup: EMT whip, box, exit sign unit, wire connections",
    category: "commercial",
    phase: "Rough-In / Finish",
    unit: "EA",
    components: [
      { item_id: "CR-001", description: '1/2" EMT Conduit (Whip)', unit: "FT", qty_per_unit: 6, base_labor_hrs: 0.025, mock_unit_cost: 0.42 },
      { item_id: "WC-003", description: "#12 THHN Wire", unit: "FT", qty_per_unit: 18, base_labor_hrs: 0.006, mock_unit_cost: 0.18 },
      { item_id: "LT-004", description: "LED Exit Sign w/ Battery Backup", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.60, mock_unit_cost: 52.00 },
      { item_id: "DW-010", description: "4-Square Box", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.15, mock_unit_cost: 2.80 },
    ],
  },

  {
    assembly_id: "ASM-COM-005",
    name: "Commercial Single-Pole Switch Drop (EMT)",
    description: "20A single-pole switch in EMT: 1/2\" EMT, box, #12 THHN, switch, cover",
    category: "commercial",
    phase: "Rough-In / Finish",
    unit: "EA",
    components: [
      { item_id: "CR-001", description: '1/2" EMT Conduit', unit: "FT", qty_per_unit: 10, base_labor_hrs: 0.025, mock_unit_cost: 0.42 },
      { item_id: "WC-003", description: "#12 THHN Wire", unit: "FT", qty_per_unit: 30, base_labor_hrs: 0.006, mock_unit_cost: 0.18 },
      { item_id: "DW-010", description: "4-Square Box with Single-Gang Mud Ring", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.20, mock_unit_cost: 3.50 },
      { item_id: "DW-014", description: "20A Single-Pole Switch (Commercial)", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.25, mock_unit_cost: 6.50 },
      { item_id: "DW-012", description: "Single-Gang Cover Plate", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.05, mock_unit_cost: 0.75 },
    ],
  },

  {
    assembly_id: "ASM-COM-006",
    name: "Commercial MC Cable Receptacle Drop",
    description: "20A receptacle via MC cable: MC cable 15ft, box, device, cover",
    category: "commercial",
    phase: "Rough-In / Finish",
    unit: "EA",
    components: [
      { item_id: "WC-005", description: "12/2 MC Cable (Aluminum Armor)", unit: "FT", qty_per_unit: 15, base_labor_hrs: 0.012, mock_unit_cost: 0.72 },
      { item_id: "CR-012", description: "MC Cable Connector (3/4\")", unit: "EA", qty_per_unit: 2, base_labor_hrs: 0.08, mock_unit_cost: 1.85 },
      { item_id: "DW-010", description: "4-Square Box", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.20, mock_unit_cost: 2.80 },
      { item_id: "DW-011", description: "20A Duplex Receptacle", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.25, mock_unit_cost: 4.50 },
      { item_id: "DW-012", description: "Single-Gang Cover Plate", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.05, mock_unit_cost: 0.75 },
    ],
  },

  // ── INDUSTRIAL ─────────────────────────────────────────────────────────────

  {
    assembly_id: "ASM-IND-001",
    name: "Industrial Motor Connection (10HP, 480V)",
    description: "10HP 480V 3-phase motor connection: 1\" RGS conduit, #8 THHN, disconnect, starter",
    category: "industrial",
    phase: "Rough-In / Finish",
    unit: "EA",
    components: [
      { item_id: "CR-020", description: '1" Rigid Galvanized Steel (RGS) Conduit', unit: "FT", qty_per_unit: 20, base_labor_hrs: 0.065, mock_unit_cost: 3.20 },
      { item_id: "WC-006", description: "#8 THHN Wire (600V)", unit: "FT", qty_per_unit: 80, base_labor_hrs: 0.009, mock_unit_cost: 0.62 },
      { item_id: "MC-001", description: "30A 3-Phase Non-Fusible Disconnect", unit: "EA", qty_per_unit: 1, base_labor_hrs: 1.50, mock_unit_cost: 95.00 },
      { item_id: "MC-002", description: "NEMA Size 1 Motor Starter (480V)", unit: "EA", qty_per_unit: 1, base_labor_hrs: 2.00, mock_unit_cost: 185.00 },
      { item_id: "GR-002", description: "#10 Green Ground Wire", unit: "FT", qty_per_unit: 20, base_labor_hrs: 0.008, mock_unit_cost: 0.32 },
    ],
  },

  {
    assembly_id: "ASM-IND-002",
    name: "Industrial Motor Connection (50HP, 480V)",
    description: "50HP 480V 3-phase motor connection: 2\" RGS conduit, #3 THHN, fusible disconnect",
    category: "industrial",
    phase: "Rough-In / Finish",
    unit: "EA",
    components: [
      { item_id: "CR-021", description: '2" Rigid Galvanized Steel (RGS) Conduit', unit: "FT", qty_per_unit: 25, base_labor_hrs: 0.100, mock_unit_cost: 7.80 },
      { item_id: "WC-007", description: "#3 THHN Wire (600V)", unit: "FT", qty_per_unit: 100, base_labor_hrs: 0.012, mock_unit_cost: 1.45 },
      { item_id: "MC-003", description: "100A 3-Phase Fusible Disconnect", unit: "EA", qty_per_unit: 1, base_labor_hrs: 2.50, mock_unit_cost: 285.00 },
      { item_id: "MC-004", description: "NEMA Size 3 Motor Starter (480V)", unit: "EA", qty_per_unit: 1, base_labor_hrs: 3.50, mock_unit_cost: 520.00 },
      { item_id: "GR-002", description: "#6 Green Ground Wire", unit: "FT", qty_per_unit: 25, base_labor_hrs: 0.010, mock_unit_cost: 0.55 },
    ],
  },

  {
    assembly_id: "ASM-IND-003",
    name: "Industrial 480V Receptacle Drop (NEMA 6-50)",
    description: "50A 480V welding/industrial receptacle: 1\" RGS conduit, #6 THHN, box, receptacle",
    category: "industrial",
    phase: "Rough-In / Finish",
    unit: "EA",
    components: [
      { item_id: "CR-020", description: '1" Rigid Galvanized Steel (RGS) Conduit', unit: "FT", qty_per_unit: 15, base_labor_hrs: 0.065, mock_unit_cost: 3.20 },
      { item_id: "WC-008", description: "#6 THHN Wire (600V)", unit: "FT", qty_per_unit: 60, base_labor_hrs: 0.010, mock_unit_cost: 0.88 },
      { item_id: "DW-015", description: "NEMA 6-50R Flush Receptacle", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.50, mock_unit_cost: 28.00 },
      { item_id: "DW-016", description: "4-Square Deep Box (Industrial)", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.25, mock_unit_cost: 5.50 },
      { item_id: "GR-002", description: "#10 Green Ground Wire", unit: "FT", qty_per_unit: 15, base_labor_hrs: 0.008, mock_unit_cost: 0.32 },
    ],
  },

  {
    assembly_id: "ASM-IND-004",
    name: "Industrial Control Panel Feed (MCC Bucket)",
    description: "MCC bucket feed: 2\" RGS conduit, #2 THHN, 225A breaker, bus connections",
    category: "industrial",
    phase: "Rough-In",
    unit: "EA",
    components: [
      { item_id: "CR-021", description: '2" Rigid Galvanized Steel (RGS) Conduit', unit: "FT", qty_per_unit: 30, base_labor_hrs: 0.100, mock_unit_cost: 7.80 },
      { item_id: "WC-009", description: "#2 THHN Wire (600V)", unit: "FT", qty_per_unit: 120, base_labor_hrs: 0.013, mock_unit_cost: 1.85 },
      { item_id: "PB-004", description: "225A 3-Pole Breaker", unit: "EA", qty_per_unit: 1, base_labor_hrs: 1.50, mock_unit_cost: 380.00 },
      { item_id: "GR-002", description: "#4 Green Ground Wire", unit: "FT", qty_per_unit: 30, base_labor_hrs: 0.010, mock_unit_cost: 0.42 },
    ],
  },

  {
    assembly_id: "ASM-IND-005",
    name: "Industrial Explosion-Proof Receptacle Drop",
    description: "Class I Div 1 explosion-proof 20A receptacle: RGS conduit, EYS seal, XP box, XP receptacle",
    category: "industrial",
    phase: "Rough-In / Finish",
    unit: "EA",
    components: [
      { item_id: "CR-020", description: '3/4" Rigid Galvanized Steel (RGS) Conduit', unit: "FT", qty_per_unit: 10, base_labor_hrs: 0.055, mock_unit_cost: 2.40 },
      { item_id: "WC-003", description: "#12 THHN Wire", unit: "FT", qty_per_unit: 30, base_labor_hrs: 0.006, mock_unit_cost: 0.18 },
      { item_id: "MC-005", description: "EYS Conduit Seal Fitting (3/4\")", unit: "EA", qty_per_unit: 2, base_labor_hrs: 0.75, mock_unit_cost: 32.00 },
      { item_id: "DW-017", description: "Explosion-Proof Box (1-Gang)", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.75, mock_unit_cost: 85.00 },
      { item_id: "DW-018", description: "Explosion-Proof 20A Receptacle", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.50, mock_unit_cost: 120.00 },
    ],
  },

  // ── INFRASTRUCTURE ─────────────────────────────────────────────────────────

  {
    assembly_id: "ASM-INF-001",
    name: "100ft 2-inch PVC Infrastructure Run",
    description: "Complete underground 2-inch PVC conduit run per 100 linear feet",
    category: "infrastructure",
    phase: "Rough-In",
    unit: "100FT",
    components: [
      { item_id: "CU-001", description: "2-inch Schedule 40 PVC Conduit (10ft stick)", unit: "EA", qty_per_unit: 10, base_labor_hrs: 0.14, mock_unit_cost: 8.75 },
      { item_id: "itm_pvc_coupling_2in", description: "2-inch PVC Coupling", unit: "EA", qty_per_unit: 10, base_labor_hrs: 0.04, mock_unit_cost: 0.85 },
      { item_id: "itm_pvc_support_2in", description: "2-inch Conduit Strap/Support", unit: "EA", qty_per_unit: 20, base_labor_hrs: 0.02, mock_unit_cost: 0.45 },
      { item_id: "itm_pvc_glue_qt", description: "PVC Cement (quart)", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.00, mock_unit_cost: 12.50 },
      { item_id: "itm_pvc_primer_qt", description: "PVC Primer (quart)", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.00, mock_unit_cost: 9.25 },
    ],
  },

  {
    assembly_id: "ASM-INF-002",
    name: "100ft 4-inch PVC Infrastructure Run",
    description: "Complete underground 4-inch PVC conduit run per 100 linear feet",
    category: "infrastructure",
    phase: "Rough-In",
    unit: "100FT",
    components: [
      { item_id: "CU-003", description: "4-inch Schedule 80 PVC Conduit (10ft stick)", unit: "EA", qty_per_unit: 10, base_labor_hrs: 0.20, mock_unit_cost: 22.00 },
      { item_id: "itm_pvc_coupling_4in", description: "4-inch PVC Coupling", unit: "EA", qty_per_unit: 10, base_labor_hrs: 0.06, mock_unit_cost: 2.80 },
      { item_id: "itm_pvc_support_4in", description: "4-inch Conduit Strap/Support", unit: "EA", qty_per_unit: 20, base_labor_hrs: 0.03, mock_unit_cost: 1.20 },
      { item_id: "itm_pvc_glue_qt", description: "PVC Cement (quart)", unit: "EA", qty_per_unit: 2, base_labor_hrs: 0.00, mock_unit_cost: 12.50 },
      { item_id: "itm_pvc_primer_qt", description: "PVC Primer (quart)", unit: "EA", qty_per_unit: 2, base_labor_hrs: 0.00, mock_unit_cost: 9.25 },
      { item_id: "CU-008", description: "Underground Warning Tape (Red)", unit: "ROLL", qty_per_unit: 0.1, base_labor_hrs: 0.05, mock_unit_cost: 22.00 },
    ],
  },

  {
    assembly_id: "ASM-INF-003",
    name: "Precast Handhole Installation",
    description: "17x30 precast concrete handhole with cover, conduit entry seals, and pull string",
    category: "infrastructure",
    phase: "Rough-In",
    unit: "EA",
    components: [
      { item_id: "CU-005", description: 'Precast Concrete Handhole (17"x30")', unit: "EA", qty_per_unit: 1, base_labor_hrs: 4.00, mock_unit_cost: 320.00 },
      { item_id: "CU-007", description: "Duct Seal Compound (1 lb)", unit: "EA", qty_per_unit: 2, base_labor_hrs: 0.20, mock_unit_cost: 4.50 },
      { item_id: "itm_pull_string", description: "Pull String / Mule Tape (500ft)", unit: "EA", qty_per_unit: 0.1, base_labor_hrs: 0.10, mock_unit_cost: 28.00 },
      { item_id: "itm_gravel_base", description: "Crushed Stone Base (ton)", unit: "TON", qty_per_unit: 0.5, base_labor_hrs: 0.50, mock_unit_cost: 45.00 },
    ],
  },

  {
    assembly_id: "ASM-INF-004",
    name: "Precast Manhole Installation",
    description: "36x48 precast concrete manhole with frame/cover, conduit entries, and ladder",
    category: "infrastructure",
    phase: "Rough-In",
    unit: "EA",
    components: [
      { item_id: "CU-006", description: 'Precast Concrete Manhole (36"x48")', unit: "EA", qty_per_unit: 1, base_labor_hrs: 12.00, mock_unit_cost: 1200.00 },
      { item_id: "CU-007", description: "Duct Seal Compound (1 lb)", unit: "EA", qty_per_unit: 4, base_labor_hrs: 0.20, mock_unit_cost: 4.50 },
      { item_id: "itm_manhole_frame", description: "Cast Iron Frame & Cover", unit: "EA", qty_per_unit: 1, base_labor_hrs: 1.00, mock_unit_cost: 185.00 },
      { item_id: "itm_gravel_base", description: "Crushed Stone Base (ton)", unit: "TON", qty_per_unit: 2, base_labor_hrs: 0.50, mock_unit_cost: 45.00 },
      { item_id: "itm_pull_string", description: "Pull String / Mule Tape (500ft)", unit: "EA", qty_per_unit: 0.2, base_labor_hrs: 0.10, mock_unit_cost: 28.00 },
    ],
  },

  {
    assembly_id: "ASM-INF-005",
    name: "Duct Bank (2-Way, 100ft)",
    description: "2-conduit concrete-encased duct bank per 100 linear feet: 4\" PVC, spacers, concrete",
    category: "infrastructure",
    phase: "Rough-In",
    unit: "100FT",
    components: [
      { item_id: "CU-003", description: "4-inch Schedule 80 PVC Conduit", unit: "FT", qty_per_unit: 200, base_labor_hrs: 0.100, mock_unit_cost: 5.50 },
      { item_id: "CU-009", description: "Conduit Spacer / Separator (4-way)", unit: "EA", qty_per_unit: 50, base_labor_hrs: 0.10, mock_unit_cost: 1.80 },
      { item_id: "CU-010", description: "Concrete Encasement (per CY)", unit: "CY", qty_per_unit: 4, base_labor_hrs: 2.00, mock_unit_cost: 180.00 },
      { item_id: "CU-008", description: "Underground Warning Tape", unit: "ROLL", qty_per_unit: 0.2, base_labor_hrs: 0.05, mock_unit_cost: 22.00 },
      { item_id: "itm_pull_string", description: "Pull String / Mule Tape (500ft)", unit: "EA", qty_per_unit: 0.4, base_labor_hrs: 0.10, mock_unit_cost: 28.00 },
    ],
  },

  {
    assembly_id: "ASM-INF-006",
    name: "Utility Pole Installation",
    description: "35ft Class 4 utility pole with crossarm, insulators, and grounding",
    category: "infrastructure",
    phase: "Rough-In",
    unit: "EA",
    components: [
      { item_id: "CU-012", description: "Utility Pole (35ft, Class 4)", unit: "EA", qty_per_unit: 1, base_labor_hrs: 8.00, mock_unit_cost: 380.00 },
      { item_id: "itm_crossarm", description: "Wood Crossarm (8ft)", unit: "EA", qty_per_unit: 1, base_labor_hrs: 1.00, mock_unit_cost: 45.00 },
      { item_id: "itm_insulator", description: "Pin Insulator (Porcelain)", unit: "EA", qty_per_unit: 3, base_labor_hrs: 0.25, mock_unit_cost: 8.50 },
      { item_id: "CU-013", description: "Ground Rod (5/8\" x 10ft)", unit: "EA", qty_per_unit: 1, base_labor_hrs: 1.00, mock_unit_cost: 28.00 },
      { item_id: "GR-002", description: "#4 Bare Copper Ground Wire", unit: "FT", qty_per_unit: 15, base_labor_hrs: 0.012, mock_unit_cost: 0.85 },
    ],
  },

  // ── ALL CATEGORIES (Universal Assemblies) ──────────────────────────────────

  {
    assembly_id: "ASM-ALL-001",
    name: "100ft 1/2\" EMT Conduit Run",
    description: "Complete 1/2\" EMT conduit run per 100 linear feet with couplings, connectors, and straps",
    category: "all",
    phase: "Rough-In",
    unit: "100FT",
    components: [
      { item_id: "CR-001", description: '1/2" EMT Conduit', unit: "FT", qty_per_unit: 100, base_labor_hrs: 0.025, mock_unit_cost: 0.42 },
      { item_id: "CR-010", description: '1/2" EMT Coupling', unit: "EA", qty_per_unit: 10, base_labor_hrs: 0.05, mock_unit_cost: 0.35 },
      { item_id: "CR-011", description: '1/2" EMT Connector', unit: "EA", qty_per_unit: 2, base_labor_hrs: 0.05, mock_unit_cost: 0.28 },
      { item_id: "FH-010", description: '1/2" One-Hole Strap', unit: "EA", qty_per_unit: 20, base_labor_hrs: 0.04, mock_unit_cost: 0.22 },
    ],
  },

  {
    assembly_id: "ASM-ALL-002",
    name: "100ft 3/4\" EMT Conduit Run",
    description: "Complete 3/4\" EMT conduit run per 100 linear feet with couplings, connectors, and straps",
    category: "all",
    phase: "Rough-In",
    unit: "100FT",
    components: [
      { item_id: "CR-002", description: '3/4" EMT Conduit', unit: "FT", qty_per_unit: 100, base_labor_hrs: 0.030, mock_unit_cost: 0.68 },
      { item_id: "CR-013", description: '3/4" EMT Coupling', unit: "EA", qty_per_unit: 10, base_labor_hrs: 0.06, mock_unit_cost: 0.48 },
      { item_id: "CR-014", description: '3/4" EMT Connector', unit: "EA", qty_per_unit: 2, base_labor_hrs: 0.06, mock_unit_cost: 0.38 },
      { item_id: "FH-011", description: '3/4" One-Hole Strap', unit: "EA", qty_per_unit: 20, base_labor_hrs: 0.04, mock_unit_cost: 0.30 },
    ],
  },

  {
    assembly_id: "ASM-ALL-003",
    name: "100ft 1\" EMT Conduit Run",
    description: "Complete 1\" EMT conduit run per 100 linear feet with couplings, connectors, and straps",
    category: "all",
    phase: "Rough-In",
    unit: "100FT",
    components: [
      { item_id: "CR-003", description: '1" EMT Conduit', unit: "FT", qty_per_unit: 100, base_labor_hrs: 0.038, mock_unit_cost: 1.05 },
      { item_id: "CR-015", description: '1" EMT Coupling', unit: "EA", qty_per_unit: 10, base_labor_hrs: 0.07, mock_unit_cost: 0.72 },
      { item_id: "CR-016", description: '1" EMT Connector', unit: "EA", qty_per_unit: 2, base_labor_hrs: 0.07, mock_unit_cost: 0.58 },
      { item_id: "FH-012", description: '1" One-Hole Strap', unit: "EA", qty_per_unit: 20, base_labor_hrs: 0.05, mock_unit_cost: 0.42 },
    ],
  },

  {
    assembly_id: "ASM-ALL-004",
    name: "Ground Rod Installation",
    description: "Single 10ft copper-clad ground rod with clamp and #6 bare copper tail",
    category: "all",
    phase: "Rough-In",
    unit: "EA",
    components: [
      { item_id: "CU-013", description: "Ground Rod (5/8\" x 10ft, Copper-Clad)", unit: "EA", qty_per_unit: 1, base_labor_hrs: 1.00, mock_unit_cost: 28.00 },
      { item_id: "GR-003", description: "Ground Rod Clamp (Acorn)", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.15, mock_unit_cost: 3.50 },
      { item_id: "GR-002", description: "#6 Bare Copper Ground Wire", unit: "FT", qty_per_unit: 10, base_labor_hrs: 0.010, mock_unit_cost: 0.55 },
    ],
  },

  {
    assembly_id: "ASM-ALL-005",
    name: "Junction Box Installation (4-Square)",
    description: "4-square junction box with blank cover, conduit knockouts, wire connections",
    category: "all",
    phase: "Rough-In",
    unit: "EA",
    components: [
      { item_id: "DW-010", description: "4-Square Steel Box (1-1/2\" deep)", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.25, mock_unit_cost: 2.80 },
      { item_id: "FH-003", description: "4-Square Blank Cover", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.05, mock_unit_cost: 1.20 },
      { item_id: "WC-001", description: "Wire Connectors (Marrette, 100-pk)", unit: "PKG", qty_per_unit: 0.05, base_labor_hrs: 0.00, mock_unit_cost: 8.50 },
    ],
  },

  {
    assembly_id: "ASM-ALL-006",
    name: "Panelboard Circuit Breaker (20A, 1-Pole)",
    description: "Install single 20A 1-pole breaker in existing panel with #12 THHN circuit wire (20ft)",
    category: "all",
    phase: "Rough-In",
    unit: "EA",
    components: [
      { item_id: "PB-005", description: "20A 1-Pole Circuit Breaker", unit: "EA", qty_per_unit: 1, base_labor_hrs: 0.30, mock_unit_cost: 8.50 },
      { item_id: "WC-003", description: "#12 THHN Wire", unit: "FT", qty_per_unit: 60, base_labor_hrs: 0.006, mock_unit_cost: 0.18 },
    ],
  },

];

// ─── Lookup helpers ────────────────────────────────────────────────────────────

/** Fuzzy-match a raw description string against the database.
 *  Returns the best match or null if nothing scores above the threshold. */
export function matchItem(raw: string): ElectricalItem | null {
  const q = raw.toLowerCase().trim();
  let best: ElectricalItem | null = null;
  let bestScore = 0;

  for (const item of ELECTRICAL_DB) {
    let score = 0;
    const desc = item.description.toLowerCase();
    const kw = item.keywords ?? [];

    // Exact description match
    if (desc === q) return item;
    // Description contains query
    if (desc.includes(q)) score += 10;
    // Query contains description
    if (q.includes(desc)) score += 8;
    // Keyword matches
    for (const k of kw) {
      if (q.includes(k)) score += 3;
      if (k.includes(q)) score += 2;
    }
    // Word-level overlap
    const qWords = q.split(/\s+/);
    const dWords = desc.split(/\s+/);
    for (const w of qWords) {
      if (w.length > 2 && dWords.some((d) => d.includes(w))) score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return bestScore >= 3 ? best : null;
}

/** Get all unique phases present in the database. */
export const DB_PHASES: ElectricalPhase[] = [
  "Conduit & Raceway",
  "Wire & Cable",
  "Panels & Breakers",
  "Devices & Wiring",
  "Lighting",
  "Motors & Controls",
  "Low Voltage",
  "Grounding",
  "Fittings & Hardware",
  "Infrastructure",
];

// ─── Category multipliers ──────────────────────────────────────────────────────
export const CATEGORY_MULTIPLIERS: Record<string, number> = {
  "Residential":    0.90,
  "Commercial":     1.05,
  "Industrial":     1.20,
  "Infrastructure": 1.30,
};

// ─── Platt API stub ────────────────────────────────────────────────────────────
/**
 * fetchPlattPrice — stub for the Platt B2B REST API.
 *
 * When VITE_PLATT_API_KEY is set in the environment, this function will call
 * the real Platt API endpoint and return live contractor net pricing.
 * Until then, it returns null and the caller falls back to mock_unit_price.
 *
 * Replace the body of this function with the real API call when credentials
 * are available. The signature and return type must remain the same.
 *
 * @param platt_sku  Platt product SKU (from ElectricalItem.platt_sku)
 * @returns          Contractor net price per unit, or null if unavailable
 */
export async function fetchPlattPrice(platt_sku: string): Promise<number | null> {
  const apiKey = import.meta.env.VITE_PLATT_API_KEY;
  if (!apiKey || !platt_sku) return null;

  // ── REAL PLATT API CALL (uncomment and configure when credentials are ready) ──
  // try {
  //   const res = await fetch(`https://api.platt.com/v1/pricing?sku=${platt_sku}`, {
  //     headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
  //   });
  //   if (!res.ok) return null;
  //   const data = await res.json();
  //   return data.contractorNetPrice ?? null;
  // } catch {
  //   return null;
  // }

  // Stub: return null so mock_unit_price is used
  return null;
}
