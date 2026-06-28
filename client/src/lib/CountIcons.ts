/**
 * BidPhase — Pin Shape Library
 *
 * Four simple shapes for Unit Count sessions.
 * Shape rendering is handled directly in PlanPanel canvas code
 * (not via SVG paths) for crisp results at all zoom levels.
 *
 * The `paths` array provides a representative SVG path for the
 * 24×24 preview swatch rendered in the session row UI.
 */

export type PinShape = "dot" | "circle" | "large-circle" | "square";

export interface CountIconDef {
  id: PinShape;
  label: string;
  category: "Shapes";
  /** SVG path(s) for the 24×24 preview swatch in the session row */
  paths: Array<{
    d: string;
    strokeOnly?: boolean;
    strokeWidth?: number;
  }>;
}

export const ICON_CATEGORIES = ["Shapes"] as const;
export type IconCategory = typeof ICON_CATEGORIES[number];

export const COUNT_ICONS: CountIconDef[] = [
  {
    id: "dot",
    label: "Dot",
    category: "Shapes",
    // Small filled circle, radius 4, centred at 12,12
    paths: [{ d: "M16 12 a4 4 0 1 1 -8 0 a4 4 0 1 1 8 0 Z", strokeOnly: false, strokeWidth: 0 }],
  },
  {
    id: "circle",
    label: "Circle",
    category: "Shapes",
    // Medium outline circle, radius 6
    paths: [{ d: "M18 12 a6 6 0 1 1 -12 0 a6 6 0 1 1 12 0 Z", strokeOnly: true, strokeWidth: 1.8 }],
  },
  {
    id: "large-circle",
    label: "Large Circle",
    category: "Shapes",
    // Large outline circle, radius 9
    paths: [{ d: "M21 12 a9 9 0 1 1 -18 0 a9 9 0 1 1 18 0 Z", strokeOnly: true, strokeWidth: 1.8 }],
  },
  {
    id: "square",
    label: "Square",
    category: "Shapes",
    // Outline square, 12×12 centred at 12,12
    paths: [{ d: "M6 6 h12 v12 h-12 Z", strokeOnly: true, strokeWidth: 1.8 }],
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

export const DEFAULT_ICON_ID: PinShape = "dot";
export const DEFAULT_PIN_COLOR = "#39FF14";
