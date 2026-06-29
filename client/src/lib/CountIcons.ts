/**
 * BidPhase — Pin Shape Library
 *
 * Shapes for Unit Count sessions.
 * Shape rendering is handled directly in PlanPanel canvas code
 * (not via SVG paths) for crisp results at all zoom levels.
 *
 * The `paths` array provides a representative SVG path for the
 * 24×24 preview swatch rendered in the session row UI.
 */

export type PinShape =
  | "dot-xs"
  | "dot-sm"
  | "dot"
  | "circle"
  | "large-circle"
  | "xl-circle"
  | "square"
  | "square-lg"
  | "square-xl"
  | "triangle-sm"
  | "triangle"
  | "triangle-lg";

export interface CountIconDef {
  id: PinShape;
  label: string;
  category: "Dots" | "Circles" | "Squares" | "Triangles";
  /** SVG path(s) for the 24×24 preview swatch in the session row */
  paths: Array<{
    d: string;
    strokeOnly?: boolean;
    strokeWidth?: number;
  }>;
}

export const ICON_CATEGORIES = ["Dots", "Circles", "Squares", "Triangles"] as const;
export type IconCategory = typeof ICON_CATEGORIES[number];

export const COUNT_ICONS: CountIconDef[] = [
  // ── Dots ──────────────────────────────────────────────────────────────────
  {
    id: "dot-xs",
    label: "Dot XS",
    category: "Dots",
    paths: [{ d: "M13 12 a1 1 0 1 1 -2 0 a1 1 0 1 1 2 0 Z", strokeOnly: false, strokeWidth: 0 }],
  },
  {
    id: "dot-sm",
    label: "Dot SM",
    category: "Dots",
    paths: [{ d: "M14 12 a2 2 0 1 1 -4 0 a2 2 0 1 1 4 0 Z", strokeOnly: false, strokeWidth: 0 }],
  },
  {
    id: "dot",
    label: "Dot",
    category: "Dots",
    paths: [{ d: "M16 12 a4 4 0 1 1 -8 0 a4 4 0 1 1 8 0 Z", strokeOnly: false, strokeWidth: 0 }],
  },
  // ── Circles ───────────────────────────────────────────────────────────────
  {
    id: "circle",
    label: "Circle",
    category: "Circles",
    paths: [{ d: "M18 12 a6 6 0 1 1 -12 0 a6 6 0 1 1 12 0 Z", strokeOnly: true, strokeWidth: 1.8 }],
  },
  {
    id: "large-circle",
    label: "Circle LG",
    category: "Circles",
    paths: [{ d: "M21 12 a9 9 0 1 1 -18 0 a9 9 0 1 1 18 0 Z", strokeOnly: true, strokeWidth: 1.8 }],
  },
  {
    id: "xl-circle",
    label: "Circle XL",
    category: "Circles",
    paths: [{ d: "M23 12 a11 11 0 1 1 -22 0 a11 11 0 1 1 22 0 Z", strokeOnly: true, strokeWidth: 2 }],
  },
  // ── Squares ───────────────────────────────────────────────────────────────
  {
    id: "square",
    label: "Square",
    category: "Squares",
    paths: [{ d: "M6 6 h12 v12 h-12 Z", strokeOnly: true, strokeWidth: 1.8 }],
  },
  {
    id: "square-lg",
    label: "Square LG",
    category: "Squares",
    paths: [{ d: "M4 4 h16 v16 h-16 Z", strokeOnly: true, strokeWidth: 2 }],
  },
  {
    id: "square-xl",
    label: "Square XL",
    category: "Squares",
    paths: [{ d: "M2 2 h20 v20 h-20 Z", strokeOnly: true, strokeWidth: 2.2 }],
  },
  // ── Triangles ─────────────────────────────────────────────────────────────
  {
    id: "triangle-sm",
    label: "Triangle SM",
    category: "Triangles",
    paths: [{ d: "M12 6 L18 18 L6 18 Z", strokeOnly: true, strokeWidth: 1.8 }],
  },
  {
    id: "triangle",
    label: "Triangle",
    category: "Triangles",
    paths: [{ d: "M12 3 L21 20 L3 20 Z", strokeOnly: true, strokeWidth: 1.8 }],
  },
  {
    id: "triangle-lg",
    label: "Triangle LG",
    category: "Triangles",
    paths: [{ d: "M12 1 L23 22 L1 22 Z", strokeOnly: true, strokeWidth: 2 }],
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
