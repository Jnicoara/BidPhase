/**
 * BidPhase — Electrical Count Icons
 *
 * Each icon is defined as a lightweight SVG path (or set of paths) drawn on a
 * 24×24 viewBox. The canvas renderer scales these to the desired on-screen size
 * and fills/strokes them with the assembly's chosen pin color.
 *
 * Adding a new icon:
 *   1. Add an entry to COUNT_ICONS below.
 *   2. The `paths` array supports multiple sub-paths (filled or stroked).
 *   3. `strokeOnly` = true means the path is stroked, not filled.
 */

export interface CountIconDef {
  id: string;
  label: string;
  /** SVG path data strings, drawn on a 24×24 viewBox */
  paths: Array<{
    d: string;
    strokeOnly?: boolean; // default: fill
    strokeWidth?: number; // default: 1.5
  }>;
}

export const COUNT_ICONS: CountIconDef[] = [
  {
    id: "outlet",
    label: "Outlet",
    // Circle with two vertical slots (duplex receptacle symbol)
    paths: [
      { d: "M12 2 a10 10 0 1 0 0.001 0 Z", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M10 8 L10 13", strokeOnly: true, strokeWidth: 2 },
      { d: "M14 8 L14 13", strokeOnly: true, strokeWidth: 2 },
    ],
  },
  {
    id: "switch",
    label: "Switch",
    // S-shape toggle switch symbol
    paths: [
      { d: "M7 18 C7 14 17 10 17 6", strokeOnly: true, strokeWidth: 2 },
      { d: "M7 18 m-2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0", strokeOnly: false },
      { d: "M17 6 m-2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0", strokeOnly: false },
    ],
  },
  {
    id: "dimmer",
    label: "Dimmer",
    // Rectangle with a diagonal slash (dimmer symbol)
    paths: [
      { d: "M4 6 L20 6 L20 18 L4 18 Z", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M7 18 L17 6", strokeOnly: true, strokeWidth: 1.8 },
    ],
  },
  {
    id: "light-fixture",
    label: "Lighting Fixture",
    // Circle with cross (ceiling fixture symbol)
    paths: [
      { d: "M12 2 a10 10 0 1 0 0.001 0 Z", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 4 L12 20", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M4 12 L20 12", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "smoke-alarm",
    label: "Smoke Alarm",
    // Circle with inner dot and three arc lines (smoke alarm symbol)
    paths: [
      { d: "M12 2 a10 10 0 1 0 0.001 0 Z", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 10 a2 2 0 1 0 0.001 0 Z", strokeOnly: false },
      { d: "M8 7 Q12 4 16 7", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  {
    id: "light-pole",
    label: "Light Pole",
    // Tall vertical line with horizontal overhang and lamp circle
    paths: [
      { d: "M12 22 L12 6", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 6 L18 6", strokeOnly: true, strokeWidth: 2 },
      { d: "M18 6 m-3 0 a3 3 0 1 0 0.001 0 Z", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "junction-box",
    label: "Junction Box",
    // Square with 'JB' text rendered as paths (in-ground junction box)
    paths: [
      { d: "M3 3 L21 3 L21 21 L3 21 Z", strokeOnly: true, strokeWidth: 1.5 },
      // J
      { d: "M9 7 L9 15 Q9 17 7 17", strokeOnly: true, strokeWidth: 1.8 },
      // B
      { d: "M11 7 L11 17 M11 7 Q16 7 16 10 Q16 12 11 12 Q16 12 16 14.5 Q16 17 11 17", strokeOnly: true, strokeWidth: 1.8 },
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
export const DEFAULT_ICON_ID = "outlet";
/** Fallback pin color when none is set */
export const DEFAULT_PIN_COLOR = "#39FF14";
