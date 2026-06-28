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

  // ── Receptacles ─────────────────────────────────────────────────────────────
  // NFPA-style: circle body with slot details. Clean and readable at small sizes.
  {
    // Duplex: circle + two vertical slots
    id: "outlet-duplex",
    label: "Duplex Outlet",
    category: "Receptacles",
    paths: [
      { d: "M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0", strokeOnly: true },
      { d: "M10 9 L10 12", strokeOnly: true, strokeWidth: 2 },
      { d: "M14 9 L14 12", strokeOnly: true, strokeWidth: 2 },
    ],
  },
  {
    // Quad: circle + four slots (2×2)
    id: "outlet-quad",
    label: "Quad Outlet",
    category: "Receptacles",
    paths: [
      { d: "M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0", strokeOnly: true },
      { d: "M9.5 8.5 L9.5 10.5", strokeOnly: true, strokeWidth: 1.8 },
      { d: "M12.5 8.5 L12.5 10.5", strokeOnly: true, strokeWidth: 1.8 },
      { d: "M9.5 13 L9.5 15", strokeOnly: true, strokeWidth: 1.8 },
      { d: "M12.5 13 L12.5 15", strokeOnly: true, strokeWidth: 1.8 },
      { d: "M8 12 L16 12", strokeOnly: true, strokeWidth: 0.7 },
      { d: "M11 7 L11 17", strokeOnly: true, strokeWidth: 0.7 },
    ],
  },
  {
    // 240V: circle + two vertical slots + ground pin
    id: "outlet-220",
    label: "240V Outlet",
    category: "Receptacles",
    paths: [
      { d: "M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0", strokeOnly: true },
      { d: "M10 8.5 L10 11", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M14 8.5 L14 11", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 11 L12 14", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    // Floor outlet: square plate + two slots
    id: "outlet-floor",
    label: "Floor Outlet",
    category: "Receptacles",
    paths: [
      { d: "M6 6 L18 6 L18 18 L6 18 Z", strokeOnly: true },
      { d: "M10 9 L10 12", strokeOnly: true, strokeWidth: 2 },
      { d: "M14 9 L14 12", strokeOnly: true, strokeWidth: 2 },
    ],
  },

  // ── Switches ─────────────────────────────────────────────────────────────────
  // Original blade-style: angled line + filled pivot dot + subscript indicator.
  {
    id: "switch-spst",
    label: "Single-Pole Switch",
    category: "Switches",
    paths: [
      { d: "M12 18 L12 14", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 14 L18 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 14 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0", strokeOnly: false },
    ],
  },
  {
    id: "switch-3way",
    label: "3-Way Switch",
    category: "Switches",
    paths: [
      { d: "M12 18 L12 14", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 14 L18 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 14 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0", strokeOnly: false },
      // "3" subscript: two right-opening bumps
      { d: "M17 12 Q19 11 19 13 Q19 15 17 15", strokeOnly: true, strokeWidth: 1.2 },
      { d: "M17 8.5 Q20 8.5 20 10.5 Q20 12 17 12", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  {
    id: "switch-4way",
    label: "4-Way Switch",
    category: "Switches",
    paths: [
      { d: "M12 18 L12 14", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 14 L18 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 14 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0", strokeOnly: false },
      // "4" subscript: diagonal + vertical + crossbar
      { d: "M17 8.5 L17 15.5", strokeOnly: true, strokeWidth: 1.2 },
      { d: "M17 8.5 L20 12", strokeOnly: true, strokeWidth: 1.2 },
      { d: "M17 12 L20 12", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  {
    id: "switch-timer",
    label: "Timer Switch",
    category: "Switches",
    paths: [
      { d: "M12 18 L12 14", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 14 L18 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 14 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0", strokeOnly: false },
      // "T" subscript: crossbar + stem
      { d: "M16.5 8.5 L20.5 8.5", strokeOnly: true, strokeWidth: 1.2 },
      { d: "M18.5 8.5 L18.5 15.5", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  {
    id: "switch-dimmer",
    label: "Dimmer Switch",
    category: "Switches",
    paths: [
      { d: "M12 18 L12 14", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 14 L18 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 14 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0", strokeOnly: false },
      // "D" subscript: vertical + right arc
      { d: "M17 8.5 L17 15.5", strokeOnly: true, strokeWidth: 1.2 },
      { d: "M17 8.5 Q21 8.5 21 12 Q21 15.5 17 15.5", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  {
    id: "switch-motion",
    label: "Motion Sensor",
    category: "Switches",
    paths: [
      { d: "M12 18 L12 14", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 14 L18 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 14 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0", strokeOnly: false },
      // Motion arc waves
      { d: "M16 9 Q19 7 19 11", strokeOnly: true, strokeWidth: 0.9 },
      { d: "M16 7 Q21 6 21 12", strokeOnly: true, strokeWidth: 0.9 },
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
    // Exterior floodlight: wall-mount arm + tilted housing + focused beam cone
    id: "fixture-floodlight",
    label: "Exterior Floodlight",
    category: "Lighting",
    paths: [
      // Wall plate (left edge)
      { d: "M3 5 L3 19", strokeOnly: true, strokeWidth: 3 },
      // Mounting arm
      { d: "M3 10 L8 10", strokeOnly: true, strokeWidth: 1.8 },
      // Tilted housing (parallelogram, angled downward-right)
      { d: "M8 7 L16 9 L14 13 L6 11 Z", strokeOnly: true, strokeWidth: 1.5 },
      // Lens circle inside housing
      { d: "M10 10 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0", strokeOnly: false },
      // Focused beam (two diverging lines from front face)
      { d: "M14 9 L22 5", strokeOnly: true, strokeWidth: 1.3 },
      { d: "M14 13 L22 19", strokeOnly: true, strokeWidth: 1.3 },
      // Beam fill line at midpoint
      { d: "M17 8 L17 16", strokeOnly: true, strokeWidth: 0.7 },
      { d: "M20 6.5 L20 17.5", strokeOnly: true, strokeWidth: 0.7 },
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
    // Generator: circle with bold "G" letterform inside
    id: "generator",
    label: "Generator",
    category: "Power / Distribution",
    paths: [
      // Outer circle
      { d: "M12 12 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0", strokeOnly: true, strokeWidth: 1.8 },
      // "G": open arc (left side + top + bottom) — C-shape
      { d: "M16 9 Q16 5 12 5 Q7 5 7 12 Q7 19 12 19 Q16 19 16 15 L12 15", strokeOnly: true, strokeWidth: 2 },
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
    // Smoke detector: outer circle + bold "S" letterform inside
    id: "smoke-detector",
    label: "Smoke Detector",
    category: "Safety / Alarm",
    paths: [
      // Outer circle
      { d: "M12 12 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0", strokeOnly: true, strokeWidth: 1.5 },
      // "S": upper arc (left-opening)
      { d: "M15 8.5 Q15 6 12 6 Q9 6 9 8.5 Q9 11 12 11.5", strokeOnly: true, strokeWidth: 2 },
      // "S": lower arc (right-opening)
      { d: "M9 15.5 Q9 18 12 18 Q15 18 15 15.5 Q15 13 12 12.5", strokeOnly: true, strokeWidth: 2 },
      // "S": connecting bridge
      { d: "M12 11.5 L12 12.5", strokeOnly: true, strokeWidth: 2 },
    ],
  },
  {
    // CO detector: outer circle + "CO" letterforms inside
    id: "co-detector",
    label: "CO Detector",
    category: "Safety / Alarm",
    paths: [
      // Outer circle
      { d: "M12 12 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0", strokeOnly: true, strokeWidth: 1.5 },
      // "C": open arc (left side of circle)
      { d: "M13.5 8 Q8 8 8 12 Q8 16 13.5 16", strokeOnly: true, strokeWidth: 1.8 },
      // "O": small circle on right
      { d: "M17 12 m-2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0", strokeOnly: true, strokeWidth: 1.5 },
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
