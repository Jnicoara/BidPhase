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
  "Safety / Alarm",
  "Communications",
  "Motors / HVAC",
] as const;

export type IconCategory = typeof ICON_CATEGORIES[number];

export const COUNT_ICONS: CountIconDef[] = [
  // ── Receptacles ──────────────────────────────────────────────────────────────
  {
    // Standard duplex outlet: circle body, two vertical slots, D-shaped ground
    id: "outlet-duplex",
    label: "Duplex Outlet",
    category: "Receptacles",
    paths: [
      // Outer circle
      { d: "M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0", strokeOnly: true, strokeWidth: 1.5 },
      // Left slot
      { d: "M9.5 8.5 L9.5 11.5", strokeOnly: true, strokeWidth: 1.8 },
      // Right slot
      { d: "M14.5 8.5 L14.5 11.5", strokeOnly: true, strokeWidth: 1.8 },
      // D-shaped ground (half-circle below slots)
      { d: "M10 13 Q12 16 14 13", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    // Quad outlet: circle with 2x2 grid of slots
    id: "outlet-quad",
    label: "Quad Outlet",
    category: "Receptacles",
    paths: [
      // Outer circle
      { d: "M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0", strokeOnly: true, strokeWidth: 1.5 },
      // Top-left slot
      { d: "M9 7.5 L9 9.5", strokeOnly: true, strokeWidth: 1.6 },
      // Top-right slot
      { d: "M15 7.5 L15 9.5", strokeOnly: true, strokeWidth: 1.6 },
      // Bottom-left slot
      { d: "M9 13.5 L9 15.5", strokeOnly: true, strokeWidth: 1.6 },
      // Bottom-right slot
      { d: "M15 13.5 L15 15.5", strokeOnly: true, strokeWidth: 1.6 },
      // Center divider cross (light)
      { d: "M12 7 L12 17 M8 12 L16 12", strokeOnly: true, strokeWidth: 0.6 },
    ],
  },
  {
    // 240V outlet: circle with L-shaped hot slots + round ground at bottom
    id: "outlet-220",
    label: "240V Outlet",
    category: "Receptacles",
    paths: [
      // Outer circle
      { d: "M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0", strokeOnly: true, strokeWidth: 1.5 },
      // Left angled hot slot
      { d: "M9 8 L9 11 L7.5 11", strokeOnly: true, strokeWidth: 1.6 },
      // Right angled hot slot (mirrored)
      { d: "M15 8 L15 11 L16.5 11", strokeOnly: true, strokeWidth: 1.6 },
      // Round ground pin (filled circle at bottom)
      { d: "M12 14.5 m-1.2 0 a1.2 1.2 0 1 0 2.4 0 a1.2 1.2 0 1 0 -2.4 0", strokeOnly: false },
    ],
  },
  {
    // Floor outlet: square plate with circle inside + FO dot
    id: "outlet-floor",
    label: "Floor Outlet",
    category: "Receptacles",
    paths: [
      // Square plate
      { d: "M5 5 L19 5 L19 19 L5 19 Z", strokeOnly: true, strokeWidth: 1.5 },
      // Inner circle (outlet face)
      { d: "M12 12 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0", strokeOnly: true, strokeWidth: 1.2 },
      // Two vertical slots
      { d: "M10 9.5 L10 12", strokeOnly: true, strokeWidth: 1.8 },
      { d: "M14 9.5 L14 12", strokeOnly: true, strokeWidth: 1.8 },
      // Ground arc
      { d: "M10.5 13.5 Q12 15.5 13.5 13.5", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  {
    // Weatherproof outlet: circle with WP arc above
    id: "outlet-weatherproof",
    label: "Weatherproof Outlet",
    category: "Receptacles",
    paths: [
      { d: "M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M9.5 8.5 L9.5 11.5", strokeOnly: true, strokeWidth: 1.8 },
      { d: "M14.5 8.5 L14.5 11.5", strokeOnly: true, strokeWidth: 1.8 },
      { d: "M10 13 Q12 16 14 13", strokeOnly: true, strokeWidth: 1.5 },
      // WP hood arc above circle
      { d: "M6 10 Q12 4 18 10", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  // ── Switches ─────────────────────────────────────────────────────────────────
  {
    // Standard single-pole switch: vertical stem + angled blade + filled pivot dot + "S" mark
    id: "switch-spst",
    label: "Single-Pole Switch",
    category: "Switches",
    paths: [
      // Vertical stem (wall connection)
      { d: "M12 20 L12 15.5", strokeOnly: true, strokeWidth: 2 },
      // Angled blade
      { d: "M12 15.5 L19 9", strokeOnly: true, strokeWidth: 1.5 },
      // Pivot dot (filled)
      { d: "M12 15.5 m-1.8 0 a1.8 1.8 0 1 0 3.6 0 a1.8 1.8 0 1 0 -3.6 0", strokeOnly: false },
      // "S" letterform (two arcs)
      { d: "M7 8.5 Q5 8.5 5 10 Q5 11.5 7 11.5 Q9 11.5 9 13 Q9 14.5 7 14.5 Q5 14.5 5 13", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  {
    // 3-way switch: same as SPST + "3" subscript
    id: "switch-3way",
    label: "3-Way Switch",
    category: "Switches",
    paths: [
      { d: "M12 20 L12 15.5", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 15.5 L19 9", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 15.5 m-1.8 0 a1.8 1.8 0 1 0 3.6 0 a1.8 1.8 0 1 0 -3.6 0", strokeOnly: false },
      // "S"
      { d: "M7 8.5 Q5 8.5 5 10 Q5 11.5 7 11.5 Q9 11.5 9 13 Q9 14.5 7 14.5 Q5 14.5 5 13", strokeOnly: true, strokeWidth: 1.2 },
      // "3" subscript: two arcs stacked
      { d: "M5.5 15.5 Q7 15.5 7 16.5 Q7 17.5 5.5 17.5", strokeOnly: true, strokeWidth: 1 },
      { d: "M5.5 17.5 Q7 17.5 7 18.5 Q7 19.5 5.5 19.5", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    // 4-way switch: same as SPST + "4" subscript
    id: "switch-4way",
    label: "4-Way Switch",
    category: "Switches",
    paths: [
      { d: "M12 20 L12 15.5", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 15.5 L19 9", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 15.5 m-1.8 0 a1.8 1.8 0 1 0 3.6 0 a1.8 1.8 0 1 0 -3.6 0", strokeOnly: false },
      // "S"
      { d: "M7 8.5 Q5 8.5 5 10 Q5 11.5 7 11.5 Q9 11.5 9 13 Q9 14.5 7 14.5 Q5 14.5 5 13", strokeOnly: true, strokeWidth: 1.2 },
      // "4" subscript: vertical + horizontal crossbar
      { d: "M5 15.5 L5 18 L7.5 18 M7.5 15.5 L7.5 19.5", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    // Dimmer switch: same blade + wavy line below S
    id: "switch-dimmer",
    label: "Dimmer Switch",
    category: "Switches",
    paths: [
      { d: "M12 20 L12 15.5", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 15.5 L19 9", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 15.5 m-1.8 0 a1.8 1.8 0 1 0 3.6 0 a1.8 1.8 0 1 0 -3.6 0", strokeOnly: false },
      // "S"
      { d: "M7 8.5 Q5 8.5 5 10 Q5 11.5 7 11.5 Q9 11.5 9 13 Q9 14.5 7 14.5 Q5 14.5 5 13", strokeOnly: true, strokeWidth: 1.2 },
      // Wavy dimmer line below
      { d: "M4 16 Q5 15 6 16 Q7 17 8 16 Q9 15 10 16", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    // Timer switch: same blade + small clock face
    id: "switch-timer",
    label: "Timer Switch",
    category: "Switches",
    paths: [
      { d: "M12 20 L12 15.5", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 15.5 L19 9", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 15.5 m-1.8 0 a1.8 1.8 0 1 0 3.6 0 a1.8 1.8 0 1 0 -3.6 0", strokeOnly: false },
      // "S"
      { d: "M7 8.5 Q5 8.5 5 10 Q5 11.5 7 11.5 Q9 11.5 9 13 Q9 14.5 7 14.5 Q5 14.5 5 13", strokeOnly: true, strokeWidth: 1.2 },
      // Clock circle
      { d: "M7 17 m-2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0", strokeOnly: true, strokeWidth: 0.9 },
      // Clock hands
      { d: "M7 14.5 L7 17 L8.5 17.8", strokeOnly: true, strokeWidth: 0.9 },
    ],
  },
  {
    // Motion sensor switch
    id: "switch-motion",
    label: "Motion Sensor",
    category: "Switches",
    paths: [
      { d: "M12 20 L12 15.5", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 15.5 L19 9", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 15.5 m-1.8 0 a1.8 1.8 0 1 0 3.6 0 a1.8 1.8 0 1 0 -3.6 0", strokeOnly: false },
      // "S"
      { d: "M7 8.5 Q5 8.5 5 10 Q5 11.5 7 11.5 Q9 11.5 9 13 Q9 14.5 7 14.5 Q5 14.5 5 13", strokeOnly: true, strokeWidth: 1.2 },
      // Motion arcs
      { d: "M5 16 Q7 14 9 16", strokeOnly: true, strokeWidth: 0.9 },
      { d: "M4 18 Q7 15 10 18", strokeOnly: true, strokeWidth: 0.9 },
    ],
  },
  // ── Lighting ──────────────────────────────────────────────────────────────────
  {
    // Ceiling fixture: circle with crosshair
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
    // Recessed light: outer circle + filled inner circle
    id: "fixture-recessed",
    label: "Recessed Light",
    category: "Lighting",
    paths: [
      { d: "M12 12 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0", strokeOnly: true },
      { d: "M12 12 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0", strokeOnly: false },
    ],
  },
  {
    // Pendant light: drop stem + circle + crosshair
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
    // 2x4 Troffer: rectangle outline with two parallel fluorescent tube lines inside
    id: "fixture-troffer",
    label: "Troffer (2×4)",
    category: "Lighting",
    paths: [
      // Fixture housing rectangle
      { d: "M3 8 L21 8 L21 16 L3 16 Z", strokeOnly: true, strokeWidth: 1.5 },
      // Left tube
      { d: "M6 10.5 L6 13.5", strokeOnly: true, strokeWidth: 2.5 },
      // Right tube
      { d: "M18 10.5 L18 13.5", strokeOnly: true, strokeWidth: 2.5 },
      // Center tube
      { d: "M12 10.5 L12 13.5", strokeOnly: true, strokeWidth: 2.5 },
      // Mounting center dot
      { d: "M12 12 m-0.8 0 a0.8 0.8 0 1 0 1.6 0 a0.8 0.8 0 1 0 -1.6 0", strokeOnly: false },
    ],
  },
  {
    // Exit sign: rectangle with bold arrow pointing right (not an X)
    id: "fixture-exit",
    label: "Exit Sign",
    category: "Lighting",
    paths: [
      // Housing rectangle
      { d: "M3 8 L21 8 L21 16 L3 16 Z", strokeOnly: true, strokeWidth: 1.5 },
      // Bold right-pointing arrow inside
      { d: "M6 12 L15 12", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 9.5 L15 12 L12 14.5", strokeOnly: true, strokeWidth: 2 },
      // "E" letterform on left
      { d: "M5 10 L5 14 M5 10 L7 10 M5 12 L7 12 M5 14 L7 14", strokeOnly: true, strokeWidth: 0.9 },
    ],
  },
  {
    // Emergency light: battery pack body + two diverging beam heads
    id: "fixture-emergency",
    label: "Emergency Light",
    category: "Lighting",
    paths: [
      // Central battery box body
      { d: "M8 10 L16 10 L16 14 L8 14 Z", strokeOnly: true, strokeWidth: 1.5 },
      // Battery terminal nub on top
      { d: "M11 8 L13 8 L13 10 L11 10 Z", strokeOnly: false },
      // Left beam head (angled left)
      { d: "M8 12 L4 9 L4 15 Z", strokeOnly: false },
      // Right beam head (angled right)
      { d: "M16 12 L20 9 L20 15 Z", strokeOnly: false },
      // Left beam rays
      { d: "M3 8 L2 7 M3 12 L1.5 12 M3 16 L2 17", strokeOnly: true, strokeWidth: 0.8 },
      // Right beam rays
      { d: "M21 8 L22 7 M21 12 L22.5 12 M21 16 L22 17", strokeOnly: true, strokeWidth: 0.8 },
    ],
  },
  {
    // Light pole: vertical pole + horizontal arm + fixture box
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
    // Main panel: tall rectangle with three breaker lines
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
    // Sub-panel: slightly smaller rectangle with breaker lines
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
    // Junction box: square with "JB" letterforms
    id: "junction-box",
    label: "Junction Box",
    category: "Power / Distribution",
    paths: [
      { d: "M5 5 L19 5 L19 19 L5 19 Z", strokeOnly: true },
      { d: "M9 8 L9 15 Q9 17 7 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M11 8 L11 16 M11 8 Q15 8 15 10 Q15 12 11 12 Q15 12 15 14 Q15 16 11 16", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    // Transformer: proper two-coil symbol — left coil arcs + right coil arcs + center dividing line
    id: "transformer",
    label: "Transformer",
    category: "Power / Distribution",
    paths: [
      // Left winding coils (3 bumps)
      { d: "M3 12 Q3 9 5 9 Q7 9 7 12 Q7 9 9 9 Q11 9 11 12 Q11 9 13 9 Q14 9 14 10.5", strokeOnly: true, strokeWidth: 1.5 },
      // Right winding coils (3 bumps, mirrored)
      { d: "M21 12 Q21 9 19 9 Q17 9 17 12 Q17 9 15 9 Q14 9 14 10.5", strokeOnly: true, strokeWidth: 1.5 },
      // Center core dividing line
      { d: "M14 7 L14 17", strokeOnly: true, strokeWidth: 2 },
      // Lead lines left
      { d: "M3 12 L3 17", strokeOnly: true, strokeWidth: 1.5 },
      // Lead lines right
      { d: "M21 12 L21 17", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    // Disconnect switch: square box with switch blade inside
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
    // Solar panel: tilted rectangle divided into a 3x2 grid of cells
    id: "solar-panel",
    label: "Solar Panel",
    category: "Power / Distribution",
    paths: [
      // Panel outline (slightly rotated feel via parallelogram)
      { d: "M4 16 L8 4 L20 8 L16 20 Z", strokeOnly: true, strokeWidth: 1.5 },
      // Horizontal cell dividers
      { d: "M5.3 13.3 L17.3 17.3", strokeOnly: true, strokeWidth: 0.8 },
      { d: "M6.7 10.7 L18.7 14.7", strokeOnly: true, strokeWidth: 0.8 },
      { d: "M8 8 L20 12", strokeOnly: true, strokeWidth: 0.8 },
      // Vertical cell dividers
      { d: "M9.3 5.3 L5.3 17.3", strokeOnly: true, strokeWidth: 0.8 },
      { d: "M14 6.7 L10 18.7", strokeOnly: true, strokeWidth: 0.8 },
    ],
  },
  {
    // Generator: circle with "G" + sine wave inside
    id: "generator",
    label: "Generator",
    category: "Power / Distribution",
    paths: [
      // Outer circle
      { d: "M12 12 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0", strokeOnly: true, strokeWidth: 1.5 },
      // "G" letterform
      { d: "M15 9 Q12 7 9 9 Q6 11 6 12 Q6 15 9 16 Q12 17 15 16 L15 13 L12 13", strokeOnly: true, strokeWidth: 1.4 },
    ],
  },
  {
    // EV Charger: charging plug outline with lightning bolt inside
    id: "ev-charger",
    label: "EV Charger",
    category: "Power / Distribution",
    paths: [
      // Plug body (rounded rectangle)
      { d: "M8 5 L16 5 L16 15 Q16 17 14 17 L10 17 Q8 17 8 15 Z", strokeOnly: true, strokeWidth: 1.5 },
      // Plug prongs at top
      { d: "M10 3 L10 5", strokeOnly: true, strokeWidth: 2 },
      { d: "M14 3 L14 5", strokeOnly: true, strokeWidth: 2 },
      // Lightning bolt inside plug body
      { d: "M13 7 L10 12 L13 12 L11 17", strokeOnly: true, strokeWidth: 1.4 },
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
