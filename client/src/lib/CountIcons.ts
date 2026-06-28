/**
 * BidPhase — Electrical Symbol Library
 *
 * Symbols are drawn on a 24×24 viewBox.
 * strokeOnly: true  → stroked only (no fill)
 * strokeOnly: false → filled with session color
 * strokeWidth       → overrides default 1.5
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

  // ── Receptacles ───────────────────────────────────────────────────────────────
  // Design language: clean rectangular wall-plate silhouette with slot details.
  // No NFPA circles — these read clearly at small pin sizes.
  {
    // Duplex: wall plate + two slot pairs (hot + neutral)
    id: "outlet-duplex",
    label: "Duplex Outlet",
    category: "Receptacles",
    paths: [
      // Wall plate
      { d: "M7 3 L17 3 L17 21 L7 21 Z", strokeOnly: true, strokeWidth: 1.8 },
      // Upper left slot (hot)
      { d: "M10 7 L10 10", strokeOnly: true, strokeWidth: 1.8 },
      // Upper right slot (neutral, slightly taller)
      { d: "M14 6.5 L14 10", strokeOnly: true, strokeWidth: 1.8 },
      // Lower left slot
      { d: "M10 14 L10 17", strokeOnly: true, strokeWidth: 1.8 },
      // Lower right slot
      { d: "M14 13.5 L14 17", strokeOnly: true, strokeWidth: 1.8 },
      // Upper ground arc
      { d: "M10.5 10.5 Q12 11.5 13.5 10.5", strokeOnly: true, strokeWidth: 1.5 },
      // Lower ground arc
      { d: "M10.5 17.5 Q12 18.5 13.5 17.5", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    // Quad: wall plate + four slot pairs in 2×2 grid
    id: "outlet-quad",
    label: "Quad Outlet",
    category: "Receptacles",
    paths: [
      { d: "M5 3 L19 3 L19 21 L5 21 Z", strokeOnly: true, strokeWidth: 1.8 },
      // Top-left pair
      { d: "M8 6 L8 9", strokeOnly: true, strokeWidth: 1.8 },
      { d: "M10.5 5.5 L10.5 9", strokeOnly: true, strokeWidth: 1.8 },
      // Top-right pair
      { d: "M13.5 6 L13.5 9", strokeOnly: true, strokeWidth: 1.8 },
      { d: "M16 5.5 L16 9", strokeOnly: true, strokeWidth: 1.8 },
      // Bottom-left pair
      { d: "M8 15 L8 18", strokeOnly: true, strokeWidth: 1.8 },
      { d: "M10.5 14.5 L10.5 18", strokeOnly: true, strokeWidth: 1.8 },
      // Bottom-right pair
      { d: "M13.5 15 L13.5 18", strokeOnly: true, strokeWidth: 1.8 },
      { d: "M16 14.5 L16 18", strokeOnly: true, strokeWidth: 1.8 },
      // Center divider lines
      { d: "M5 12 L19 12", strokeOnly: true, strokeWidth: 0.8 },
      { d: "M12 3 L12 21", strokeOnly: true, strokeWidth: 0.8 },
    ],
  },
  {
    // 240V: wider plate + two L-shaped slots + round ground pin (NEMA 6-20 / 14-30 style)
    id: "outlet-220",
    label: "240V Outlet",
    category: "Receptacles",
    paths: [
      { d: "M6 4 L18 4 L18 20 L6 20 Z", strokeOnly: true, strokeWidth: 1.8 },
      // Left L-slot (hot)
      { d: "M9 8 L9 12 L10.5 12", strokeOnly: true, strokeWidth: 2 },
      // Right L-slot (hot, mirrored)
      { d: "M15 8 L15 12 L13.5 12", strokeOnly: true, strokeWidth: 2 },
      // Round ground pin (filled circle at bottom center)
      { d: "M12 15.5 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0", strokeOnly: false },
    ],
  },
  {
    // Floor outlet: round cover plate (circle) with two slots + ground arc
    id: "outlet-floor",
    label: "Floor Outlet",
    category: "Receptacles",
    paths: [
      // Round cover plate
      { d: "M12 12 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0", strokeOnly: true, strokeWidth: 1.8 },
      // Left slot
      { d: "M9.5 9 L9.5 13", strokeOnly: true, strokeWidth: 2 },
      // Right slot
      { d: "M14.5 8.5 L14.5 13", strokeOnly: true, strokeWidth: 2 },
      // Ground arc at bottom
      { d: "M10 13.5 Q12 15 14 13.5", strokeOnly: true, strokeWidth: 1.5 },
      // Small "F" indicator at top (floor)
      { d: "M11 5.5 L11 7.5 M11 5.5 L13 5.5 M11 6.5 L12.5 6.5", strokeOnly: true, strokeWidth: 1 },
    ],
  },

  // ── Switches ──────────────────────────────────────────────────────────────────
  // Design language: clean geometric "S" constructed from two offset semicircles
  // (like a proper typographic letterform), with tight subscript numerals/letters
  // drawn with the same stroke weight for a consistent, professional look.
  {
    id: "switch-spst",
    label: "Single-Pole Switch",
    category: "Switches",
    paths: [
      // Upper arc of S (top bump, left-opening)
      { d: "M15.5 6.5 Q15.5 4 12 4 Q8.5 4 8.5 7 Q8.5 10 12 10.5", strokeOnly: true, strokeWidth: 2.2 },
      // Lower arc of S (bottom bump, right-opening)
      { d: "M8.5 17.5 Q8.5 20 12 20 Q15.5 20 15.5 17 Q15.5 14 12 13.5", strokeOnly: true, strokeWidth: 2.2 },
      // Connecting diagonal
      { d: "M12 10.5 L12 13.5", strokeOnly: true, strokeWidth: 2.2 },
    ],
  },
  {
    id: "switch-3way",
    label: "3-Way Switch",
    category: "Switches",
    paths: [
      // S (shifted left to make room for subscript)
      { d: "M13.5 6.5 Q13.5 4 10.5 4 Q7.5 4 7.5 7 Q7.5 10 10.5 10.5", strokeOnly: true, strokeWidth: 2 },
      { d: "M7.5 17.5 Q7.5 20 10.5 20 Q13.5 20 13.5 17 Q13.5 14 10.5 13.5", strokeOnly: true, strokeWidth: 2 },
      { d: "M10.5 10.5 L10.5 13.5", strokeOnly: true, strokeWidth: 2 },
      // Subscript "3": upper bump + lower bump
      { d: "M15.5 8 Q18.5 8 18.5 10 Q18.5 12 15.5 12", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M15.5 12 Q18.5 12 18.5 14.5 Q18.5 17 15.5 17", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "switch-4way",
    label: "4-Way Switch",
    category: "Switches",
    paths: [
      // S
      { d: "M13.5 6.5 Q13.5 4 10.5 4 Q7.5 4 7.5 7 Q7.5 10 10.5 10.5", strokeOnly: true, strokeWidth: 2 },
      { d: "M7.5 17.5 Q7.5 20 10.5 20 Q13.5 20 13.5 17 Q13.5 14 10.5 13.5", strokeOnly: true, strokeWidth: 2 },
      { d: "M10.5 10.5 L10.5 13.5", strokeOnly: true, strokeWidth: 2 },
      // Subscript "4": diagonal + vertical + crossbar
      { d: "M15.5 8 L15.5 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M15.5 8 L18.5 13", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M15.5 13 L18.5 13", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "switch-timer",
    label: "Timer Switch",
    category: "Switches",
    paths: [
      // S
      { d: "M13.5 6.5 Q13.5 4 10.5 4 Q7.5 4 7.5 7 Q7.5 10 10.5 10.5", strokeOnly: true, strokeWidth: 2 },
      { d: "M7.5 17.5 Q7.5 20 10.5 20 Q13.5 20 13.5 17 Q13.5 14 10.5 13.5", strokeOnly: true, strokeWidth: 2 },
      { d: "M10.5 10.5 L10.5 13.5", strokeOnly: true, strokeWidth: 2 },
      // Subscript "T": crossbar + stem
      { d: "M15 8 L19 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M17 8 L17 17", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "switch-dimmer",
    label: "Dimmer Switch",
    category: "Switches",
    paths: [
      // S
      { d: "M13.5 6.5 Q13.5 4 10.5 4 Q7.5 4 7.5 7 Q7.5 10 10.5 10.5", strokeOnly: true, strokeWidth: 2 },
      { d: "M7.5 17.5 Q7.5 20 10.5 20 Q13.5 20 13.5 17 Q13.5 14 10.5 13.5", strokeOnly: true, strokeWidth: 2 },
      { d: "M10.5 10.5 L10.5 13.5", strokeOnly: true, strokeWidth: 2 },
      // Subscript "D": vertical + right-side arc
      { d: "M15.5 8 L15.5 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M15.5 8 Q19.5 8 19.5 12.5 Q19.5 17 15.5 17", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "switch-motion",
    label: "Motion Sensor",
    category: "Switches",
    paths: [
      // S
      { d: "M13.5 6.5 Q13.5 4 10.5 4 Q7.5 4 7.5 7 Q7.5 10 10.5 10.5", strokeOnly: true, strokeWidth: 2 },
      { d: "M7.5 17.5 Q7.5 20 10.5 20 Q13.5 20 13.5 17 Q13.5 14 10.5 13.5", strokeOnly: true, strokeWidth: 2 },
      { d: "M10.5 10.5 L10.5 13.5", strokeOnly: true, strokeWidth: 2 },
      // Subscript "M": two outer verticals + two inner diagonals meeting at center
      { d: "M15 8 L15 17 M15 8 L17 13 L19 8 L19 17", strokeOnly: true, strokeWidth: 1.3 },
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
    // 2×4 Troffer: wide landscape rectangle with two long horizontal tube lines
    id: "fixture-troffer-2x4",
    label: "Troffer (2×4)",
    category: "Lighting",
    paths: [
      { d: "M2 8 L22 8 L22 16 L2 16 Z", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M4 10.5 L20 10.5", strokeOnly: true, strokeWidth: 2.5 },
      { d: "M4 13.5 L20 13.5", strokeOnly: true, strokeWidth: 2.5 },
    ],
  },
  {
    // 2×2 Troffer: square rectangle with two shorter horizontal tube lines
    id: "fixture-troffer-2x2",
    label: "Troffer (2×2)",
    category: "Lighting",
    paths: [
      { d: "M5 6 L19 6 L19 18 L5 18 Z", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M7 9.5 L17 9.5", strokeOnly: true, strokeWidth: 2.5 },
      { d: "M7 14.5 L17 14.5", strokeOnly: true, strokeWidth: 2.5 },
    ],
  },
  {
    // Wall sconce: half-circle shade facing right + mounting bracket on left wall
    id: "fixture-sconce",
    label: "Wall Sconce",
    category: "Lighting",
    paths: [
      // Mounting plate on left wall
      { d: "M4 8 L4 16", strokeOnly: true, strokeWidth: 3 },
      // Arm extending right
      { d: "M4 12 L8 12", strokeOnly: true, strokeWidth: 1.8 },
      // Half-circle shade (open to left, facing right)
      { d: "M8 7 Q16 7 16 12 Q16 17 8 17 Z", strokeOnly: true, strokeWidth: 1.5 },
      // Filament line inside shade
      { d: "M9 12 L14 12", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    // Track lighting: horizontal rail + three pendant heads hanging down
    id: "fixture-track",
    label: "Track Lighting",
    category: "Lighting",
    paths: [
      // Rail
      { d: "M3 7 L21 7", strokeOnly: true, strokeWidth: 3 },
      // Head 1 stem + cone
      { d: "M7 7 L7 10", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M5 10 L9 10 L8 14 L6 14 Z", strokeOnly: true, strokeWidth: 1.2 },
      // Head 2 stem + cone
      { d: "M12 7 L12 10", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M10 10 L14 10 L13 14 L11 14 Z", strokeOnly: true, strokeWidth: 1.2 },
      // Head 3 stem + cone
      { d: "M17 7 L17 10", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M15 10 L19 10 L18 14 L16 14 Z", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  {
    // Ceiling fan: center hub + four blades radiating out
    id: "fixture-ceiling-fan",
    label: "Ceiling Fan",
    category: "Lighting",
    paths: [
      // Center hub
      { d: "M12 12 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0", strokeOnly: false },
      // Blade up
      { d: "M12 10.5 L10 4 L14 4 Z", strokeOnly: true, strokeWidth: 1.2 },
      // Blade right
      { d: "M13.5 12 L20 10 L20 14 Z", strokeOnly: true, strokeWidth: 1.2 },
      // Blade down
      { d: "M12 13.5 L14 20 L10 20 Z", strokeOnly: true, strokeWidth: 1.2 },
      // Blade left
      { d: "M10.5 12 L4 14 L4 10 Z", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  {
    // Exhaust fan: circle housing + four-blade propeller
    id: "fixture-exhaust-fan",
    label: "Exhaust Fan",
    category: "Lighting",
    paths: [
      // Housing circle
      { d: "M12 12 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0", strokeOnly: true, strokeWidth: 1.5 },
      // Propeller blades (four curved wedges)
      { d: "M12 12 Q12 8 15 7 Q14 10 12 12", strokeOnly: false },
      { d: "M12 12 Q16 12 17 15 Q14 14 12 12", strokeOnly: false },
      { d: "M12 12 Q12 16 9 17 Q10 14 12 12", strokeOnly: false },
      { d: "M12 12 Q8 12 7 9 Q10 10 12 12", strokeOnly: false },
      // Center hub
      { d: "M12 12 m-1 0 a1 1 0 1 0 2 0 a1 1 0 1 0 -2 0", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    // Exterior floodlight: rectangular housing + wide beam spread lines
    id: "fixture-floodlight",
    label: "Exterior Floodlight",
    category: "Lighting",
    paths: [
      // Housing body
      { d: "M7 9 L17 9 L17 15 L7 15 Z", strokeOnly: true, strokeWidth: 1.5 },
      // Mounting bracket at top
      { d: "M11 6 L13 6 L13 9 L11 9 Z", strokeOnly: false },
      // Wide beam spread (three diverging rays downward)
      { d: "M7 15 L3 21", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 15 L12 22", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M17 15 L21 21", strokeOnly: true, strokeWidth: 1.5 },
      // Beam fill lines
      { d: "M5 18 L19 18", strokeOnly: true, strokeWidth: 0.7 },
      { d: "M4 20 L20 20", strokeOnly: true, strokeWidth: 0.7 },
    ],
  },
  {
    // Exterior wall pack: rectangular box housing + downward beam cone
    id: "fixture-wall-pack",
    label: "Exterior Wall Pack",
    category: "Lighting",
    paths: [
      // Wall mounting plate
      { d: "M3 6 L3 18", strokeOnly: true, strokeWidth: 3 },
      // Housing box
      { d: "M3 8 L10 8 L10 16 L3 16 Z", strokeOnly: true, strokeWidth: 1.5 },
      // Downward beam cone
      { d: "M5 16 L3 22 L12 22 L10 16 Z", strokeOnly: true, strokeWidth: 1.2 },
      // Beam fill line
      { d: "M4 19 L11 19", strokeOnly: true, strokeWidth: 0.8 },
    ],
  },
  {
    // Exit sign: rectangle with bold right arrow + "E" letterform
    id: "fixture-exit",
    label: "Exit Sign",
    category: "Lighting",
    paths: [
      { d: "M3 8 L21 8 L21 16 L3 16 Z", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M7 12 L15 12", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 9.5 L15 12 L12 14.5", strokeOnly: true, strokeWidth: 2 },
      { d: "M4.5 10 L4.5 14 M4.5 10 L6.5 10 M4.5 12 L6.5 12 M4.5 14 L6.5 14", strokeOnly: true, strokeWidth: 0.9 },
    ],
  },
  {
    // Emergency light: battery box + two diverging filled beam heads
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
    // Transformer: standard IEC two-coil symbol — two touching circles with lead lines
    id: "transformer",
    label: "Transformer",
    category: "Power / Distribution",
    paths: [
      // Primary coil (left circle)
      { d: "M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0", strokeOnly: true, strokeWidth: 1.5 },
      // Secondary coil (right circle, offset right — overlapping slightly)
      { d: "M16 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0", strokeOnly: true, strokeWidth: 1.5 },
      // Primary lead lines (left side)
      { d: "M2 8 L5 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M2 16 L5 16", strokeOnly: true, strokeWidth: 1.5 },
      // Secondary lead lines (right side)
      { d: "M23 8 L20 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M23 16 L20 16", strokeOnly: true, strokeWidth: 1.5 },
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
    // Generator: standard IEC/ANSI symbol — circle with sine wave inside
    id: "generator",
    label: "Generator",
    category: "Power / Distribution",
    paths: [
      // Outer circle
      { d: "M12 12 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0", strokeOnly: true, strokeWidth: 1.8 },
      // Sine wave inside (one full cycle, centered vertically)
      { d: "M5 12 Q6.5 8 8 12 Q9.5 16 11 12 Q12.5 8 14 12 Q15.5 16 17 12 Q18 9.5 19 12", strokeOnly: true, strokeWidth: 1.8 },
    ],
  },
  {
    // EV Charger: plug body with bold lightning bolt inside
    id: "ev-charger",
    label: "EV Charger",
    category: "Power / Distribution",
    paths: [
      // Plug body
      { d: "M8 6 L16 6 L16 16 Q16 18 14 18 L10 18 Q8 18 8 16 Z", strokeOnly: true, strokeWidth: 1.5 },
      // Prongs
      { d: "M10 4 L10 6", strokeOnly: true, strokeWidth: 2.2 },
      { d: "M14 4 L14 6", strokeOnly: true, strokeWidth: 2.2 },
      // Bold lightning bolt
      { d: "M13.5 7.5 L10.5 12.5 L13 12.5 L10.5 17.5", strokeOnly: true, strokeWidth: 2.2 },
    ],
  },

  // ── Boxes ─────────────────────────────────────────────────────────────────────
  {
    // Electrical box: clean simple square — no extra detail
    id: "box-standard",
    label: "Electrical Box",
    category: "Boxes",
    paths: [
      { d: "M5 5 L19 5 L19 19 L5 19 Z", strokeOnly: true, strokeWidth: 2.2 },
    ],
  },
  {
    // Junction box: square with "JB" letterforms
    id: "junction-box",
    label: "Junction Box",
    category: "Boxes",
    paths: [
      { d: "M5 5 L19 5 L19 19 L5 19 Z", strokeOnly: true },
      { d: "M8 8 L8 15 Q8 17 6.5 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M10.5 8 L10.5 16 M10.5 8 Q14 8 14 10 Q14 12 10.5 12 Q14 12 14 14 Q14 16 10.5 16", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    // In-ground junction box: square with dashed bottom + ground hatch lines
    id: "box-inground",
    label: "In-Ground Junction Box",
    category: "Boxes",
    paths: [
      { d: "M5 5 L19 5 L19 16", strokeOnly: true, strokeWidth: 1.8 },
      { d: "M5 5 L5 16", strokeOnly: true, strokeWidth: 1.8 },
      { d: "M5 16 L8 16", strokeOnly: true, strokeWidth: 1.8 },
      { d: "M10 16 L14 16", strokeOnly: true, strokeWidth: 1.8 },
      { d: "M16 16 L19 16", strokeOnly: true, strokeWidth: 1.8 },
      { d: "M5 18 L19 18", strokeOnly: true, strokeWidth: 1.2 },
      { d: "M7 20.5 L17 20.5", strokeOnly: true, strokeWidth: 0.8 },
      // "UG" inside
      { d: "M7 8.5 L7 13 Q7 14.5 8.5 14.5 Q10 14.5 10 13 L10 8.5", strokeOnly: true, strokeWidth: 1.2 },
      { d: "M12 8.5 L12 14.5 M12 8.5 Q16 8.5 16 11.5 Q16 14.5 12 14.5", strokeOnly: true, strokeWidth: 1.2 },
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

/** Default high-visibility pin colors */
export const PIN_COLORS = [
  { label: "Neon Green", hex: "#39FF14" },
  { label: "Cyan",       hex: "#00CFFF" },
  { label: "Magenta",    hex: "#FF3FD4" },
  { label: "Yellow",     hex: "#FFE600" },
  { label: "Orange",     hex: "#FF6B00" },
  { label: "Purple",     hex: "#BF5FFF" },
  { label: "Red",        hex: "#FF4444" },
  { label: "Teal",       hex: "#00FFD1" },
  { label: "White",      hex: "#FFFFFF" },
  { label: "Gold",       hex: "#F5C518" },
];

export const DEFAULT_ICON_ID  = "outlet-duplex";
export const DEFAULT_PIN_COLOR = "#39FF14";
