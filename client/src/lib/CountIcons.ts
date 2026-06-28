/**
 * BidPhase — Electrical Symbol Library
 *
 * Standard electrical symbols based on NFPA 70 / IEC 60617 conventions.
 * Each symbol is defined as SVG path segments rendered on a 24x24 viewBox.
 * Grouped by category for the icon selector UI.
 *
 * Path conventions:
 *   strokeOnly: true  -> path is stroked only (no fill)
 *   strokeOnly: false -> path is filled with the session color
 *   strokeWidth       -> override default 1.5 stroke width
 */

export interface CountIconDef {
  id: string;
  label: string;
  category: string;
  paths: Array<{
    d: string;
    strokeOnly?: boolean;
    strokeWidth?: number;
  }>;
}

export const ICON_CATEGORIES = [
  "Receptacles",
  "Switches",
  "Lighting",
  "Power / Distribution",
  "Boxes",
  "Safety / Alarm",
  "Communications",
  "Motors / HVAC",
] as const;

export type IconCategory = typeof ICON_CATEGORIES[number];

export const COUNT_ICONS: CountIconDef[] = [
  // ── Receptacles ──────────────────────────────────────────────────────────────
  {
    // Standard duplex outlet: circle with two vertical slot lines (classic NFPA symbol)
    id: "outlet-duplex",
    label: "Duplex Outlet",
    category: "Receptacles",
    paths: [
      // Outer circle
      { d: "M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0", strokeOnly: true, strokeWidth: 1.8 },
      // Left slot
      { d: "M9.5 8 L9.5 14", strokeOnly: true, strokeWidth: 2 },
      // Right slot
      { d: "M14.5 8 L14.5 14", strokeOnly: true, strokeWidth: 2 },
    ],
  },
  {
    // Quad outlet: circle with 2×2 slots (four lines)
    id: "outlet-quad",
    label: "Quad Outlet",
    category: "Receptacles",
    paths: [
      // Outer circle
      { d: "M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0", strokeOnly: true, strokeWidth: 1.8 },
      // Top-left slot
      { d: "M8.5 7.5 L8.5 11", strokeOnly: true, strokeWidth: 1.8 },
      // Top-right slot
      { d: "M15.5 7.5 L15.5 11", strokeOnly: true, strokeWidth: 1.8 },
      // Bottom-left slot
      { d: "M8.5 13 L8.5 16.5", strokeOnly: true, strokeWidth: 1.8 },
      // Bottom-right slot
      { d: "M15.5 13 L15.5 16.5", strokeOnly: true, strokeWidth: 1.8 },
    ],
  },
  {
    // 240V outlet: circle with two slots + horizontal ground slot (NEMA 6-20 style)
    id: "outlet-220",
    label: "240V Outlet",
    category: "Receptacles",
    paths: [
      // Outer circle
      { d: "M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0", strokeOnly: true, strokeWidth: 1.8 },
      // Left vertical slot
      { d: "M9.5 8 L9.5 13", strokeOnly: true, strokeWidth: 2 },
      // Right vertical slot
      { d: "M14.5 8 L14.5 13", strokeOnly: true, strokeWidth: 2 },
      // Horizontal ground slot (distinguishes 240V)
      { d: "M9 15 L15 15", strokeOnly: true, strokeWidth: 2 },
    ],
  },
  {
    // Floor outlet: circle inside a square plate
    id: "outlet-floor",
    label: "Floor Outlet",
    category: "Receptacles",
    paths: [
      // Square plate
      { d: "M4 4 L20 4 L20 20 L4 20 Z", strokeOnly: true, strokeWidth: 1.5 },
      // Inner circle
      { d: "M12 12 m-5.5 0 a5.5 5.5 0 1 0 11 0 a5.5 5.5 0 1 0 -11 0", strokeOnly: true, strokeWidth: 1.5 },
      // Two vertical slots
      { d: "M10 9 L10 14", strokeOnly: true, strokeWidth: 2 },
      { d: "M14 9 L14 14", strokeOnly: true, strokeWidth: 2 },
    ],
  },
  // ── Switches ─────────────────────────────────────────────────────────────────
  {
    // Standard single-pole: bold "S" only
    id: "switch-spst",
    label: "Single-Pole Switch",
    category: "Switches",
    paths: [
      // Bold "S" centered
      { d: "M15 7 Q12 6 9 7 Q6 8 6 10 Q6 12 9 12 Q15 12 15 14 Q15 16 12 17 Q9 18 6 17", strokeOnly: true, strokeWidth: 2.2 },
    ],
  },
  {
    // 3-way switch: "S" + subscript "3"
    id: "switch-3way",
    label: "3-Way Switch",
    category: "Switches",
    paths: [
      // "S" (slightly left of center)
      { d: "M14 7 Q11 6 8 7 Q5 8 5 10 Q5 12 8 12 Q14 12 14 14 Q14 16 11 17 Q8 18 5 17", strokeOnly: true, strokeWidth: 2 },
      // Subscript "3" (two arcs, bottom-right)
      { d: "M16 14 Q19 14 19 15.5 Q19 17 16 17", strokeOnly: true, strokeWidth: 1.4 },
      { d: "M16 17 Q19 17 19 18.5 Q19 20 16 20", strokeOnly: true, strokeWidth: 1.4 },
    ],
  },
  {
    // 4-way switch: "S" + subscript "4"
    id: "switch-4way",
    label: "4-Way Switch",
    category: "Switches",
    paths: [
      // "S"
      { d: "M14 7 Q11 6 8 7 Q5 8 5 10 Q5 12 8 12 Q14 12 14 14 Q14 16 11 17 Q8 18 5 17", strokeOnly: true, strokeWidth: 2 },
      // Subscript "4": vertical bar + horizontal crossbar
      { d: "M16 14 L16 20 M16 14 L19 17 L16 17", strokeOnly: true, strokeWidth: 1.4 },
    ],
  },
  {
    // Timer switch: "S" + subscript "T"
    id: "switch-timer",
    label: "Timer Switch",
    category: "Switches",
    paths: [
      // "S"
      { d: "M14 7 Q11 6 8 7 Q5 8 5 10 Q5 12 8 12 Q14 12 14 14 Q14 16 11 17 Q8 18 5 17", strokeOnly: true, strokeWidth: 2 },
      // Subscript "T": horizontal top + vertical stem
      { d: "M15.5 14 L19.5 14 M17.5 14 L17.5 20", strokeOnly: true, strokeWidth: 1.4 },
    ],
  },
  {
    // Dimmer switch: "S" + subscript "D"
    id: "switch-dimmer",
    label: "Dimmer Switch",
    category: "Switches",
    paths: [
      // "S"
      { d: "M14 7 Q11 6 8 7 Q5 8 5 10 Q5 12 8 12 Q14 12 14 14 Q14 16 11 17 Q8 18 5 17", strokeOnly: true, strokeWidth: 2 },
      // Subscript "D": vertical bar + right arc
      { d: "M16 14 L16 20 M16 14 Q20 14 20 17 Q20 20 16 20", strokeOnly: true, strokeWidth: 1.4 },
    ],
  },
  {
    // Motion sensor switch: "S" + subscript "M"
    id: "switch-motion",
    label: "Motion Sensor",
    category: "Switches",
    paths: [
      // "S"
      { d: "M14 7 Q11 6 8 7 Q5 8 5 10 Q5 12 8 12 Q14 12 14 14 Q14 16 11 17 Q8 18 5 17", strokeOnly: true, strokeWidth: 2 },
      // Subscript "M": two diagonals + outer verticals
      { d: "M15.5 14 L15.5 20 M15.5 14 L17.5 18 L19.5 14 L19.5 20", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  // ── Lighting ──────────────────────────────────────────────────────────────────
  {
    id: "fixture-ceiling",
    label: "Ceiling Fixture",
    category: "Lighting",
    paths: [
      { d: "M12 12 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0", strokeOnly: true },
      { d: "M12 6 L12 18", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M6 12 L18 12", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "fixture-recessed",
    label: "Recessed Light",
    category: "Lighting",
    paths: [
      { d: "M12 12 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0", strokeOnly: true },
      { d: "M12 12 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0", strokeOnly: false },
    ],
  },
  {
    id: "fixture-pendant",
    label: "Pendant Light",
    category: "Lighting",
    paths: [
      { d: "M12 4 L12 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 12 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0", strokeOnly: true },
      { d: "M12 8 L12 16", strokeOnly: true, strokeWidth: 1 },
      { d: "M8 12 L16 12", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    // 2×4 Troffer: rectangle with three parallel tube lines
    id: "fixture-troffer",
    label: "Troffer (2×4)",
    category: "Lighting",
    paths: [
      { d: "M3 8 L21 8 L21 16 L3 16 Z", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M6 10.5 L6 13.5", strokeOnly: true, strokeWidth: 2.5 },
      { d: "M12 10.5 L12 13.5", strokeOnly: true, strokeWidth: 2.5 },
      { d: "M18 10.5 L18 13.5", strokeOnly: true, strokeWidth: 2.5 },
    ],
  },
  {
    // Exit sign: rectangle with bold right arrow + "E" letterform
    id: "fixture-exit",
    label: "Exit Sign",
    category: "Lighting",
    paths: [
      { d: "M3 8 L21 8 L21 16 L3 16 Z", strokeOnly: true, strokeWidth: 1.5 },
      // Bold right arrow
      { d: "M7 12 L15 12", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 9.5 L15 12 L12 14.5", strokeOnly: true, strokeWidth: 2 },
      // "E" on left
      { d: "M4.5 10 L4.5 14 M4.5 10 L6.5 10 M4.5 12 L6.5 12 M4.5 14 L6.5 14", strokeOnly: true, strokeWidth: 0.9 },
    ],
  },
  {
    // Emergency light: battery box + two diverging beam heads
    id: "fixture-emergency",
    label: "Emergency Light",
    category: "Lighting",
    paths: [
      { d: "M8 10 L16 10 L16 14 L8 14 Z", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M11 8 L13 8 L13 10 L11 10 Z", strokeOnly: false },
      { d: "M8 12 L4 9 L4 15 Z", strokeOnly: false },
      { d: "M16 12 L20 9 L20 15 Z", strokeOnly: false },
      { d: "M3 8 L2 7 M3 12 L1.5 12 M3 16 L2 17", strokeOnly: true, strokeWidth: 0.8 },
      { d: "M21 8 L22 7 M21 12 L22.5 12 M21 16 L22 17", strokeOnly: true, strokeWidth: 0.8 },
    ],
  },
  {
    id: "fixture-pole",
    label: "Light Pole",
    category: "Lighting",
    paths: [
      { d: "M12 20 L12 6", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 6 L18 6", strokeOnly: true, strokeWidth: 2 },
      { d: "M15 4 L21 4 L21 8 L15 8 Z", strokeOnly: true },
    ],
  },
  // ── Power / Distribution ──────────────────────────────────────────────────────
  {
    id: "panel-main",
    label: "Main Panel",
    category: "Power / Distribution",
    paths: [
      { d: "M5 4 L19 4 L19 20 L5 20 Z", strokeOnly: true },
      { d: "M8 8 L16 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M8 12 L16 12", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M8 16 L16 16", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "panel-sub",
    label: "Sub-Panel",
    category: "Power / Distribution",
    paths: [
      { d: "M7 5 L17 5 L17 19 L7 19 Z", strokeOnly: true },
      { d: "M9 9 L15 9", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M9 13 L15 13", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M9 17 L15 17", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    // Transformer: proper two-coil symbol with center core line
    id: "transformer",
    label: "Transformer",
    category: "Power / Distribution",
    paths: [
      // Left winding (3 bumps upward)
      { d: "M3 14 Q3 11 5 11 Q7 11 7 14 Q7 11 9 11 Q11 11 11 14 Q11 11 13 11 Q14 11 14 12.5", strokeOnly: true, strokeWidth: 1.5 },
      // Right winding (3 bumps upward, mirrored)
      { d: "M21 14 Q21 11 19 11 Q17 11 17 14 Q17 11 15 11 Q14 11 14 12.5", strokeOnly: true, strokeWidth: 1.5 },
      // Center core dividing line
      { d: "M14 8 L14 18", strokeOnly: true, strokeWidth: 2.5 },
      // Lead lines
      { d: "M3 14 L3 18", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M21 14 L21 18", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "disconnect",
    label: "Disconnect Switch",
    category: "Power / Distribution",
    paths: [
      { d: "M6 6 L18 6 L18 18 L6 18 Z", strokeOnly: true },
      { d: "M9 15 L9 12", strokeOnly: true, strokeWidth: 2 },
      { d: "M9 12 L15 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M15 8 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0", strokeOnly: false },
    ],
  },
  {
    // Solar panel: tilted parallelogram with cell grid
    id: "solar-panel",
    label: "Solar Panel",
    category: "Power / Distribution",
    paths: [
      { d: "M4 16 L8 4 L20 8 L16 20 Z", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M5.3 13.3 L17.3 17.3", strokeOnly: true, strokeWidth: 0.8 },
      { d: "M6.7 10.7 L18.7 14.7", strokeOnly: true, strokeWidth: 0.8 },
      { d: "M8 8 L20 12", strokeOnly: true, strokeWidth: 0.8 },
      { d: "M9.3 5.3 L5.3 17.3", strokeOnly: true, strokeWidth: 0.8 },
      { d: "M14 6.7 L10 18.7", strokeOnly: true, strokeWidth: 0.8 },
    ],
  },
  {
    // Generator: circle with bold "G" letterform (open arc + horizontal bar)
    id: "generator",
    label: "Generator",
    category: "Power / Distribution",
    paths: [
      // Outer circle
      { d: "M12 12 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0", strokeOnly: true, strokeWidth: 1.5 },
      // Bold "G": open arc from 2 o'clock sweeping counterclockwise to 4 o'clock, then horizontal bar inward
      { d: "M17 8.5 Q14 5 10 6 Q6 7 5 10 Q4 13 6 16 Q8 19 12 19 Q16 19 17.5 16.5 L17.5 12.5 L13 12.5", strokeOnly: true, strokeWidth: 2 },
    ],
  },
  {
    // EV Charger: plug body with lightning bolt inside
    id: "ev-charger",
    label: "EV Charger",
    category: "Power / Distribution",
    paths: [
      // Plug body (rounded rectangle)
      { d: "M8 6 L16 6 L16 16 Q16 18 14 18 L10 18 Q8 18 8 16 Z", strokeOnly: true, strokeWidth: 1.5 },
      // Prongs at top
      { d: "M10 4 L10 6", strokeOnly: true, strokeWidth: 2.2 },
      { d: "M14 4 L14 6", strokeOnly: true, strokeWidth: 2.2 },
      // Lightning bolt (top-right to bottom-left, with kink)
      { d: "M13.5 7.5 L10.5 12.5 L13 12.5 L10.5 17.5", strokeOnly: true, strokeWidth: 2 },
    ],
  },
  // ── Boxes ─────────────────────────────────────────────────────────────────────
  {
    // Standard electrical box: simple square outline
    id: "box-standard",
    label: "Electrical Box",
    category: "Boxes",
    paths: [
      // Square outline
      { d: "M5 5 L19 5 L19 19 L5 19 Z", strokeOnly: true, strokeWidth: 2 },
      // Knockout dots (four corners)
      { d: "M8 8 m-1 0 a1 1 0 1 0 2 0 a1 1 0 1 0 -2 0", strokeOnly: false },
      { d: "M16 8 m-1 0 a1 1 0 1 0 2 0 a1 1 0 1 0 -2 0", strokeOnly: false },
      { d: "M8 16 m-1 0 a1 1 0 1 0 2 0 a1 1 0 1 0 -2 0", strokeOnly: false },
      { d: "M16 16 m-1 0 a1 1 0 1 0 2 0 a1 1 0 1 0 -2 0", strokeOnly: false },
    ],
  },
  {
    // Junction box: square with "JB" letterforms inside
    id: "junction-box",
    label: "Junction Box",
    category: "Boxes",
    paths: [
      { d: "M5 5 L19 5 L19 19 L5 19 Z", strokeOnly: true },
      // "J"
      { d: "M9 8 L9 15 Q9 17 7 17", strokeOnly: true, strokeWidth: 1.5 },
      // "B"
      { d: "M11 8 L11 16 M11 8 Q15 8 15 10 Q15 12 11 12 Q15 12 15 14 Q15 16 11 16", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    // In-ground / underground junction box: square with dashed bottom and ground lines
    id: "box-inground",
    label: "In-Ground Junction Box",
    category: "Boxes",
    paths: [
      // Box outline (solid top/sides, dashed bottom to indicate underground)
      { d: "M5 5 L19 5 L19 17", strokeOnly: true, strokeWidth: 1.8 },
      { d: "M5 5 L5 17", strokeOnly: true, strokeWidth: 1.8 },
      // Dashed bottom edge (three segments)
      { d: "M5 17 L8 17", strokeOnly: true, strokeWidth: 1.8 },
      { d: "M10 17 L14 17", strokeOnly: true, strokeWidth: 1.8 },
      { d: "M16 17 L19 17", strokeOnly: true, strokeWidth: 1.8 },
      // Ground hatch lines below box
      { d: "M5 19 L19 19", strokeOnly: true, strokeWidth: 1.2 },
      { d: "M7 21 L17 21", strokeOnly: true, strokeWidth: 0.8 },
      // "UG" label inside
      { d: "M8 9 L8 14 Q8 15.5 9.5 15.5 Q11 15.5 11 14 L11 9", strokeOnly: true, strokeWidth: 1.2 },
      { d: "M13 9 L13 15.5 M13 9 Q17 9 17 12 Q17 15.5 13 15.5", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  // ── Safety / Alarm ────────────────────────────────────────────────────────────
  {
    id: "smoke-detector",
    label: "Smoke Detector",
    category: "Safety / Alarm",
    paths: [
      { d: "M12 12 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0", strokeOnly: true },
      { d: "M12 12 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0", strokeOnly: false },
      { d: "M8 8 Q12 5 16 8", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "co-detector",
    label: "CO Detector",
    category: "Safety / Alarm",
    paths: [
      { d: "M12 12 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0", strokeOnly: true },
      { d: "M9 10 Q7 10 7 12 Q7 14 9 14 Q11 14 11 12 Q11 10 9 10", strokeOnly: true, strokeWidth: 1 },
      { d: "M13 10 Q15 10 15 12 Q15 14 13 14 Q13 14 13 12 Q13 10 13 10", strokeOnly: true, strokeWidth: 1 },
      { d: "M13 12 L15 12", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "fire-alarm",
    label: "Fire Alarm Pull",
    category: "Safety / Alarm",
    paths: [
      { d: "M7 6 L17 6 L17 18 L7 18 Z", strokeOnly: true },
      { d: "M9 14 L15 14", strokeOnly: true, strokeWidth: 2 },
      { d: "M9 14 L9 17 L15 17 L15 14", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M9 8 L12 12 L15 8 M10.5 10.5 L13.5 10.5", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "horn-strobe",
    label: "Horn / Strobe",
    category: "Safety / Alarm",
    paths: [
      { d: "M6 9 L6 15 L12 18 L12 6 Z", strokeOnly: true },
      { d: "M14 9 Q17 12 14 15", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M16 7 Q20 12 16 17", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "security-camera",
    label: "Security Camera",
    category: "Safety / Alarm",
    paths: [
      { d: "M4 9 L14 9 L14 15 L4 15 Z", strokeOnly: true },
      { d: "M14 11 L20 8 L20 16 L14 13 Z", strokeOnly: true },
    ],
  },
  // ── Communications ────────────────────────────────────────────────────────────
  {
    id: "data-outlet",
    label: "Data Outlet",
    category: "Communications",
    paths: [
      { d: "M6 6 L18 6 L18 18 L6 18 Z", strokeOnly: true },
      { d: "M9 9 L9 15 Q15 15 15 12 Q15 9 9 9", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "tv-outlet",
    label: "TV / Cable Outlet",
    category: "Communications",
    paths: [
      { d: "M6 6 L18 6 L18 18 L6 18 Z", strokeOnly: true },
      { d: "M8 9 L16 9 L16 14 L8 14 Z", strokeOnly: true, strokeWidth: 1 },
      { d: "M10 14 L10 16 M14 14 L14 16 M9 16 L15 16", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  // ── Motors / HVAC ─────────────────────────────────────────────────────────────
  {
    id: "motor",
    label: "Motor",
    category: "Motors / HVAC",
    paths: [
      { d: "M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0", strokeOnly: true },
      { d: "M8 15 L8 9 L12 13 L16 9 L16 15", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "thermostat",
    label: "Thermostat",
    category: "Motors / HVAC",
    paths: [
      { d: "M12 12 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0", strokeOnly: true },
      { d: "M12 7 L12 13", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 14 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0", strokeOnly: false },
    ],
  },
];

/** Default high-visibility pin colors for the color picker */
export const PIN_COLORS = [
  { label: "Neon Green",   hex: "#39FF14" },
  { label: "Cyan",         hex: "#00CFFF" },
  { label: "Magenta",      hex: "#FF3FD4" },
  { label: "Yellow",       hex: "#FFE600" },
  { label: "Orange",       hex: "#FF6B00" },
  { label: "Purple",       hex: "#BF5FFF" },
  { label: "Red",          hex: "#FF4444" },
  { label: "Teal",         hex: "#00FFD1" },
  { label: "White",        hex: "#FFFFFF" },
  { label: "Gold",         hex: "#F5C518" },
];

/** Fallback icon id when none is set */
export const DEFAULT_ICON_ID = "outlet-duplex";
/** Fallback pin color when none is set */
export const DEFAULT_PIN_COLOR = "#39FF14";
