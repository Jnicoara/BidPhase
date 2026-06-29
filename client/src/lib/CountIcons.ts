/**
 * BidPhase — Pin Shape Library
 *
 * Four families, four sizes each (SM / MD / LG / XL).
 * Dots are solid filled; Circles, Squares, and Triangles are stroke-only outlines.
 * Shape rendering is handled directly in PlanPanel canvas code
 * (not via SVG paths) for crisp results at all zoom levels.
 *
 * The `paths` array provides a representative SVG path for the
 * 24×24 preview swatch rendered in the session row UI.
 */

export type PinShape =
  // Dots (solid filled circles — 4 sizes)
  | "dot-sm"
  | "dot-md"
  | "dot-lg"
  | "dot-xl"
  // Circles (stroke-only rings — 4 sizes)
  | "circle-sm"
  | "circle-md"
  | "circle-lg"
  | "circle-xl"
  // Squares (stroke-only — 4 sizes)
  | "square-sm"
  | "square-md"
  | "square-lg"
  | "square-xl"
  // Triangles (stroke-only — 4 sizes)
  | "triangle-sm"
  | "triangle-md"
  | "triangle-lg"
  | "triangle-xl";

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
  // ── Dots (solid filled) ───────────────────────────────────────────────────
  {
    id: "dot-sm",
    label: "Dot SM",
    category: "Dots",
    paths: [{ d: "M13.5 12 a1.5 1.5 0 1 1 -3 0 a1.5 1.5 0 1 1 3 0 Z" }],
  },
  {
    id: "dot-md",
    label: "Dot MD",
    category: "Dots",
    paths: [{ d: "M15 12 a3 3 0 1 1 -6 0 a3 3 0 1 1 6 0 Z" }],
  },
  {
    id: "dot-lg",
    label: "Dot LG",
    category: "Dots",
    paths: [{ d: "M17 12 a5 5 0 1 1 -10 0 a5 5 0 1 1 10 0 Z" }],
  },
  {
    id: "dot-xl",
    label: "Dot XL",
    category: "Dots",
    paths: [{ d: "M19 12 a7 7 0 1 1 -14 0 a7 7 0 1 1 14 0 Z" }],
  },
  // ── Circles (stroke-only rings) ───────────────────────────────────────────
  {
    id: "circle-sm",
    label: "Circle SM",
    category: "Circles",
    paths: [{ d: "M17 12 a5 5 0 1 1 -10 0 a5 5 0 1 1 10 0 Z", strokeOnly: true, strokeWidth: 1.6 }],
  },
  {
    id: "circle-md",
    label: "Circle MD",
    category: "Circles",
    paths: [{ d: "M19 12 a7 7 0 1 1 -14 0 a7 7 0 1 1 14 0 Z", strokeOnly: true, strokeWidth: 1.8 }],
  },
  {
    id: "circle-lg",
    label: "Circle LG",
    category: "Circles",
    paths: [{ d: "M21 12 a9 9 0 1 1 -18 0 a9 9 0 1 1 18 0 Z", strokeOnly: true, strokeWidth: 1.8 }],
  },
  {
    id: "circle-xl",
    label: "Circle XL",
    category: "Circles",
    paths: [{ d: "M23.5 12 a11.5 11.5 0 1 1 -23 0 a11.5 11.5 0 1 1 23 0 Z", strokeOnly: true, strokeWidth: 2 }],
  },
  // ── Squares (stroke-only) ─────────────────────────────────────────────────
  {
    id: "square-sm",
    label: "Square SM",
    category: "Squares",
    paths: [{ d: "M8 8 h8 v8 h-8 Z", strokeOnly: true, strokeWidth: 1.6 }],
  },
  {
    id: "square-md",
    label: "Square MD",
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
  // ── Triangles (stroke-only) ───────────────────────────────────────────────
  {
    id: "triangle-sm",
    label: "Triangle SM",
    category: "Triangles",
    paths: [{ d: "M12 7 L18 18 L6 18 Z", strokeOnly: true, strokeWidth: 1.6 }],
  },
  {
    id: "triangle-md",
    label: "Triangle MD",
    category: "Triangles",
    paths: [{ d: "M12 4 L20 19 L4 19 Z", strokeOnly: true, strokeWidth: 1.8 }],
  },
  {
    id: "triangle-lg",
    label: "Triangle LG",
    category: "Triangles",
    paths: [{ d: "M12 2 L22 21 L2 21 Z", strokeOnly: true, strokeWidth: 2 }],
  },
  {
    id: "triangle-xl",
    label: "Triangle XL",
    category: "Triangles",
    paths: [{ d: "M12 0.5 L23.5 23 L0.5 23 Z", strokeOnly: true, strokeWidth: 2.2 }],
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

export const DEFAULT_ICON_ID: PinShape = "dot-md";
export const DEFAULT_PIN_COLOR = "#39FF14";
