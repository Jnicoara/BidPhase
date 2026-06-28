/**
 * BidPhase — Electrical Symbol Library
 *
 * 35+ standard electrical symbols based on NFPA 70 / IEC 60617 conventions.
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
  "Misc",
] as const;

export type IconCategory = typeof ICON_CATEGORIES[number];

export const COUNT_ICONS: CountIconDef[] = [
  // ── Receptacles ──────────────────────────────────────────────────────────────
  {
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
    id: "outlet-gfci",
    label: "GFCI Outlet",
    category: "Receptacles",
    paths: [
      { d: "M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0", strokeOnly: true },
      { d: "M10 9 L10 12", strokeOnly: true, strokeWidth: 2 },
      { d: "M14 9 L14 12", strokeOnly: true, strokeWidth: 2 },
      { d: "M9 14.5 L15 14.5", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
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
    id: "outlet-floor",
    label: "Floor Outlet",
    category: "Receptacles",
    paths: [
      { d: "M6 6 L18 6 L18 18 L6 18 Z", strokeOnly: true },
      { d: "M10 9 L10 12", strokeOnly: true, strokeWidth: 2 },
      { d: "M14 9 L14 12", strokeOnly: true, strokeWidth: 2 },
    ],
  },
  {
    id: "outlet-weatherproof",
    label: "Weatherproof Outlet",
    category: "Receptacles",
    paths: [
      { d: "M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0", strokeOnly: true },
      { d: "M10 9 L10 12", strokeOnly: true, strokeWidth: 2 },
      { d: "M14 9 L14 12", strokeOnly: true, strokeWidth: 2 },
      { d: "M7 12 Q12 6 17 12", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  // ── Switches ─────────────────────────────────────────────────────────────────
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
      { d: "M17 12 Q19 11 19 13 Q19 15 17 15", strokeOnly: true, strokeWidth: 1 },
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
      { d: "M17 11 L17 15 M15 13 L19 13", strokeOnly: true, strokeWidth: 1 },
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
      { d: "M15 12 Q16 10.5 17 12 Q18 13.5 19 12", strokeOnly: true, strokeWidth: 1 },
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
      { d: "M17 11 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0", strokeOnly: true, strokeWidth: 0.8 },
      { d: "M17 10 L17 11 L18 12", strokeOnly: true, strokeWidth: 0.8 },
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
      { d: "M16 9 Q19 7 19 11", strokeOnly: true, strokeWidth: 0.8 },
      { d: "M16 7 Q21 6 21 12", strokeOnly: true, strokeWidth: 0.8 },
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
    id: "fixture-exit",
    label: "Exit Sign",
    category: "Lighting",
    paths: [
      { d: "M4 8 L20 8 L20 16 L4 16 Z", strokeOnly: true },
      { d: "M8 10 L16 14 M16 10 L8 14", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "fixture-emergency",
    label: "Emergency Light",
    category: "Lighting",
    paths: [
      { d: "M4 10 L20 10 L20 14 L4 14 Z", strokeOnly: true },
      { d: "M7 10 L5 7", strokeOnly: true, strokeWidth: 2 },
      { d: "M17 10 L19 7", strokeOnly: true, strokeWidth: 2 },
      { d: "M4 6 L6 8 M8 5 L7 8", strokeOnly: true, strokeWidth: 1 },
      { d: "M20 6 L18 8 M16 5 L17 8", strokeOnly: true, strokeWidth: 1 },
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
  {
    id: "fixture-track",
    label: "Track Lighting",
    category: "Lighting",
    paths: [
      { d: "M4 8 L20 8", strokeOnly: true, strokeWidth: 3 },
      { d: "M8 8 L8 13", strokeOnly: true, strokeWidth: 1 },
      { d: "M8 13 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0", strokeOnly: true, strokeWidth: 1 },
      { d: "M12 8 L12 13", strokeOnly: true, strokeWidth: 1 },
      { d: "M12 13 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0", strokeOnly: true, strokeWidth: 1 },
      { d: "M16 8 L16 13", strokeOnly: true, strokeWidth: 1 },
      { d: "M16 13 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0", strokeOnly: true, strokeWidth: 1 },
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
    id: "transformer",
    label: "Transformer",
    category: "Power / Distribution",
    paths: [
      { d: "M4 12 Q5 9 6 12 Q7 15 8 12 Q9 9 10 12", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M14 12 Q15 9 16 12 Q17 15 18 12 Q19 9 20 12", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M11 8 L13 8 L13 16 L11 16 Z", strokeOnly: false },
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
    id: "meter",
    label: "Electric Meter",
    category: "Power / Distribution",
    paths: [
      { d: "M12 12 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0", strokeOnly: true },
      { d: "M12 7 L12 9", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 15 L12 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M7 12 L9 12", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M15 12 L17 12", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 12 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0", strokeOnly: false },
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
    id: "telephone",
    label: "Telephone Outlet",
    category: "Communications",
    paths: [
      { d: "M6 6 L18 6 L18 18 L6 18 Z", strokeOnly: true },
      { d: "M9 9 L15 9 M12 9 L12 15", strokeOnly: true, strokeWidth: 1.5 },
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
  {
    id: "intercom",
    label: "Intercom",
    category: "Communications",
    paths: [
      { d: "M6 6 L18 6 L18 18 L6 18 Z", strokeOnly: true },
      { d: "M9 9 L15 9 M9 11 L15 11 M9 13 L15 13", strokeOnly: true, strokeWidth: 1 },
      { d: "M12 15 m-1 0 a1 1 0 1 0 2 0 a1 1 0 1 0 -2 0", strokeOnly: false },
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
    id: "hvac-unit",
    label: "HVAC Unit",
    category: "Motors / HVAC",
    paths: [
      { d: "M4 8 L20 8 L20 16 L4 16 Z", strokeOnly: true },
      { d: "M8 10 L16 14 M16 10 L8 14", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 12 m-1 0 a1 1 0 1 0 2 0 a1 1 0 1 0 -2 0", strokeOnly: false },
    ],
  },
  {
    id: "exhaust-fan",
    label: "Exhaust Fan",
    category: "Motors / HVAC",
    paths: [
      { d: "M12 12 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0", strokeOnly: true },
      { d: "M12 12 L12 7 Q14 9 12 12", strokeOnly: true, strokeWidth: 1 },
      { d: "M12 12 L17 12 Q15 14 12 12", strokeOnly: true, strokeWidth: 1 },
      { d: "M12 12 L12 17 Q10 15 12 12", strokeOnly: true, strokeWidth: 1 },
      { d: "M12 12 L7 12 Q9 10 12 12", strokeOnly: true, strokeWidth: 1 },
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
  // ── Misc ──────────────────────────────────────────────────────────────────────
  {
    id: "doorbell",
    label: "Doorbell",
    category: "Misc",
    paths: [
      { d: "M8 16 L16 16 Q16 10 12 8 Q8 10 8 16 Z", strokeOnly: true },
      { d: "M12 16 L12 18", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 18 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0", strokeOnly: false },
    ],
  },
  {
    id: "ceiling-fan",
    label: "Ceiling Fan",
    category: "Misc",
    paths: [
      { d: "M12 12 m-1.5 0 a1.5 1.5 0 1 0 3 0 a1.5 1.5 0 1 0 -3 0", strokeOnly: false },
      { d: "M12 10.5 L10 5 L14 5 Z", strokeOnly: true, strokeWidth: 1 },
      { d: "M13.5 12 L19 10 L19 14 Z", strokeOnly: true, strokeWidth: 1 },
      { d: "M12 13.5 L14 19 L10 19 Z", strokeOnly: true, strokeWidth: 1 },
      { d: "M10.5 12 L5 14 L5 10 Z", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "ev-charger",
    label: "EV Charger",
    category: "Misc",
    paths: [
      { d: "M8 4 L16 4 L16 20 L8 20 Z", strokeOnly: true },
      { d: "M13 8 L10 13 L13 13 L11 18 L14 11 L11 11 Z", strokeOnly: false },
    ],
  },
  {
    id: "generator",
    label: "Generator",
    category: "Misc",
    paths: [
      { d: "M4 8 L20 8 L20 16 L4 16 Z", strokeOnly: true },
      { d: "M16 10 Q12 8 9 10 Q7 12 9 14 Q12 16 16 14 L16 12 L13 12", strokeOnly: true, strokeWidth: 1.5 },
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
