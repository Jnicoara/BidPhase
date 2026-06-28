/**
 * BidPhase — Electrical Symbol Library
 *
 * 108 standard electrical symbols.
 * Each icon uses a `paths[]` array of SVG path segments rendered on a 24×24 viewBox.
 * Grouped by category, most-common first within each category.
 *
 * strokeOnly: true  → path is stroked only (no fill)
 * strokeOnly: false → path is filled with the session color
 * strokeWidth       → override default 1.5 stroke width
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
  "Fire Alarm",
  "Low Voltage",
  "Civil / Site",
  "Healthcare",
] as const;

export type IconCategory = typeof ICON_CATEGORIES[number];

export const COUNT_ICONS: CountIconDef[] = [

  // ── Receptacles ──────────────────────────────────────────────────────────────

  {
    id: "outlet-duplex",
    label: "Duplex Receptacle",
    category: "Receptacles",
    paths: [
      { d: "M12 5 a6 6 0 1 0 0 12 a6 6 0 1 0 0-12", strokeOnly: true },
      { d: "M10 5 L10 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M14 5 L14 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 17 L12 22", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "outlet-singleplex",
    label: "Singleplex Receptacle",
    category: "Receptacles",
    paths: [
      { d: "M12 5 a6 6 0 1 0 0 12 a6 6 0 1 0 0-12", strokeOnly: true },
      { d: "M12 5 L12 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 17 L12 22", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "outlet-quad",
    label: "Fourplex (Quad) Receptacle",
    category: "Receptacles",
    paths: [
      { d: "M12 5 a6 6 0 1 0 0 12 a6 6 0 1 0 0-12", strokeOnly: true },
      { d: "M10 5 L10 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M14 5 L14 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M6 11 L18 11", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 17 L12 22", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "outlet-triplex",
    label: "Triplex Receptacle",
    category: "Receptacles",
    paths: [
      { d: "M12 5 a6 6 0 1 0 0 12 a6 6 0 1 0 0-12", strokeOnly: true },
      { d: "M9 6.5 L9 15.5", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 5 L12 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M15 6.5 L15 15.5", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 17 L12 22", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "outlet-gfci",
    label: "GFCI Receptacle",
    category: "Receptacles",
    paths: [
      { d: "M12 4 a6 6 0 1 0 0 12 a6 6 0 1 0 0-12", strokeOnly: true },
      { d: "M10 4 L10 16", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M14 4 L14 16", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 16 L12 19", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M8 20 L10 20 L10 22 L8 22 Z", strokeOnly: false },
      { d: "M11 20 L13 20 L13 22 L11 22 Z", strokeOnly: false },
      { d: "M14 20 L16 20 L16 22 L14 22 Z", strokeOnly: false },
    ],
  },
  {
    id: "outlet-afci",
    label: "AFCI Receptacle",
    category: "Receptacles",
    paths: [
      { d: "M12 4 a6 6 0 1 0 0 12 a6 6 0 1 0 0-12", strokeOnly: true },
      { d: "M10 4 L10 16", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M14 4 L14 16", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 16 L12 19", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M8 20 Q12 18 16 20", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M8 22 Q12 20 16 22", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "outlet-half-hot",
    label: "Half-Hot / Switched Receptacle",
    category: "Receptacles",
    paths: [
      { d: "M12 5 a6 6 0 1 0 0 12 a6 6 0 1 0 0-12", strokeOnly: true },
      { d: "M12 5 a6 6 0 0 1 0 12 Z", strokeOnly: false },
      { d: "M10 5 L10 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M14 5 L14 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 17 L12 22", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "outlet-20a",
    label: "20A Receptacle",
    category: "Receptacles",
    paths: [
      { d: "M12 5 a6 6 0 1 0 0 12 a6 6 0 1 0 0-12", strokeOnly: true },
      { d: "M10 5 L10 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M14 5 L14 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M7 11 L10 11", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 17 L12 22", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "outlet-30a",
    label: "30A Receptacle",
    category: "Receptacles",
    paths: [
      { d: "M12 4 a6 6 0 1 0 0 12 a6 6 0 1 0 0-12", strokeOnly: true },
      { d: "M9.5 5.5 L9.5 14.5", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 4 L12 16", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M14.5 5.5 L14.5 14.5", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 16 L12 20", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "outlet-50a",
    label: "50A Receptacle",
    category: "Receptacles",
    paths: [
      { d: "M12 3 a7 7 0 1 0 0 14 a7 7 0 1 0 0-14", strokeOnly: true },
      { d: "M9.5 4.5 L9.5 15.5", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 3 L12 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M14.5 4.5 L14.5 15.5", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 17 L12 22", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M9 19 L15 19", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "outlet-dryer",
    label: "Dryer Outlet (240V/30A)",
    category: "Receptacles",
    paths: [
      { d: "M12 4 a6 6 0 1 0 0 12 a6 6 0 1 0 0-12", strokeOnly: true },
      { d: "M9.5 5.5 L9.5 14.5", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 4 L12 16", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M14.5 5.5 L14.5 14.5", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 16 L12 20", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M9 21 L15 21", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "outlet-range",
    label: "Range Outlet (240V/50A)",
    category: "Receptacles",
    paths: [
      { d: "M12 3 a7 7 0 1 0 0 14 a7 7 0 1 0 0-14", strokeOnly: true },
      { d: "M9.5 4.5 L9.5 15.5", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 3 L12 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M14.5 4.5 L14.5 15.5", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 17 L12 21", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M9 21 L15 21", strokeOnly: true, strokeWidth: 2 },
      { d: "M10 23 L14 23", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "outlet-floor",
    label: "Floor Receptacle",
    category: "Receptacles",
    paths: [
      { d: "M6 6 L18 6 L18 18 L6 18 Z", strokeOnly: true },
      { d: "M12 8 a5 5 0 1 0 0 10 a5 5 0 1 0 0-10", strokeOnly: true },
      { d: "M10 8 L10 18", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M14 8 L14 18", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "outlet-weatherproof",
    label: "Weatherproof Receptacle",
    category: "Receptacles",
    paths: [
      { d: "M12 5 a6 6 0 1 0 0 12 a6 6 0 1 0 0-12", strokeOnly: true },
      { d: "M10 5 L10 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M14 5 L14 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 17 L12 20", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M7 3 Q12 1 17 3", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "outlet-isolated-ground",
    label: "Isolated Ground Receptacle",
    category: "Receptacles",
    paths: [
      { d: "M12 2 L22 20 L2 20 Z", strokeOnly: true },
      { d: "M10 9 L10 18", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M14 9 L14 18", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "outlet-usb",
    label: "USB Receptacle",
    category: "Receptacles",
    paths: [
      { d: "M12 5 a6 6 0 1 0 0 12 a6 6 0 1 0 0-12", strokeOnly: true },
      { d: "M10 5 L10 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M14 5 L14 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 17 L12 19", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M9 19 L15 19 L14 22 L10 22 Z", strokeOnly: true, strokeWidth: 1 },
      { d: "M12 19 L12 22", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "outlet-clock",
    label: "Clock Receptacle",
    category: "Receptacles",
    paths: [
      { d: "M12 5 a6 6 0 1 0 0 12 a6 6 0 1 0 0-12", strokeOnly: true },
      { d: "M10 5 L10 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M14 5 L14 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 17 L12 20", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M10 1 L14 1 M12 1 L12 3", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "outlet-twistlock",
    label: "Twist-Lock Receptacle",
    category: "Receptacles",
    paths: [
      { d: "M12 5 a6 6 0 1 0 0 12 a6 6 0 1 0 0-12", strokeOnly: true },
      { d: "M10 5 L10 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M14 5 L14 17", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 17 L12 20", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M8 15 Q12 18 16 15", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M9 17 Q12 19.5 15 17", strokeOnly: true, strokeWidth: 1 },
    ],
  },

  // ── Switches ─────────────────────────────────────────────────────────────────

  {
    id: "switch-single",
    label: "Single-Pole Switch",
    category: "Switches",
    paths: [
      { d: "M12 20 L12 15", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 15 L19 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 15 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0", strokeOnly: false },
    ],
  },
  {
    id: "switch-double",
    label: "Double-Pole Switch",
    category: "Switches",
    paths: [
      { d: "M9 20 L9 15", strokeOnly: true, strokeWidth: 2 },
      { d: "M9 15 L16 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M9 15 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0", strokeOnly: false },
      { d: "M15 20 L15 15", strokeOnly: true, strokeWidth: 2 },
      { d: "M15 15 L22 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M15 15 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0", strokeOnly: false },
    ],
  },
  {
    id: "switch-3way",
    label: "3-Way Switch",
    category: "Switches",
    paths: [
      { d: "M12 20 L12 15", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 15 L19 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 15 L5 8", strokeOnly: true, strokeWidth: 1 },
      { d: "M12 15 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0", strokeOnly: false },
    ],
  },
  {
    id: "switch-4way",
    label: "4-Way Switch",
    category: "Switches",
    paths: [
      { d: "M12 20 L12 15", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 15 L19 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 15 L5 8", strokeOnly: true, strokeWidth: 1 },
      { d: "M12 15 L12 8", strokeOnly: true, strokeWidth: 1 },
      { d: "M12 15 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0", strokeOnly: false },
    ],
  },
  {
    id: "switch-dimmer",
    label: "Dimmer Switch",
    category: "Switches",
    paths: [
      { d: "M12 20 L12 15", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 15 L19 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 15 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0", strokeOnly: false },
      { d: "M16 12 Q17 10 18 12 Q19 14 20 12", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  {
    id: "switch-weatherproof",
    label: "Weatherproof Switch",
    category: "Switches",
    paths: [
      { d: "M12 20 L12 15", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 15 L19 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 15 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0", strokeOnly: false },
      { d: "M7 13 Q12 8 17 13", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "switch-low-voltage",
    label: "Low Voltage Switch",
    category: "Switches",
    paths: [
      { d: "M12 20 L12 15", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 15 L19 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 15 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0", strokeOnly: false },
      { d: "M16 10 L19 7 M17 10 L20 7", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "switch-motion",
    label: "Motion / Occupancy Sensor",
    category: "Switches",
    paths: [
      { d: "M12 20 L12 15", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 15 L19 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 15 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0", strokeOnly: false },
      { d: "M17 10 Q20 8 20 12", strokeOnly: true, strokeWidth: 1 },
      { d: "M17 8 Q22 7 22 13", strokeOnly: true, strokeWidth: 0.8 },
    ],
  },
  {
    id: "switch-timer",
    label: "Timer Switch",
    category: "Switches",
    paths: [
      { d: "M12 20 L12 15", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 15 L19 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 15 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0", strokeOnly: false },
      { d: "M18 10 m-2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0", strokeOnly: true, strokeWidth: 0.8 },
      { d: "M18 9 L18 10 L19.5 11.5", strokeOnly: true, strokeWidth: 0.8 },
    ],
  },
  {
    id: "switch-keyed",
    label: "Key-Operated Switch",
    category: "Switches",
    paths: [
      { d: "M12 20 L12 15", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 15 L19 8", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 15 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0", strokeOnly: false },
      { d: "M18 10 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0", strokeOnly: true, strokeWidth: 0.8 },
      { d: "M18 12 L18 15 M17 13.5 L19 13.5", strokeOnly: true, strokeWidth: 0.8 },
    ],
  },
  {
    id: "thermostat",
    label: "Thermostat",
    category: "Switches",
    paths: [
      { d: "M12 3 a9 9 0 1 0 0 18 a9 9 0 1 0 0-18", strokeOnly: true },
      { d: "M12 6 L12 14", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 15 m-2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0", strokeOnly: false },
    ],
  },
  {
    id: "humidistat",
    label: "Humidistat",
    category: "Switches",
    paths: [
      { d: "M12 3 a9 9 0 1 0 0 18 a9 9 0 1 0 0-18", strokeOnly: true },
      { d: "M8 15 Q12 7 16 15", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M8 15 Q12 19 16 15", strokeOnly: true, strokeWidth: 1 },
    ],
  },

  // ── Lighting ──────────────────────────────────────────────────────────────────

  {
    id: "fixture-ceiling",
    label: "Ceiling Light Outlet",
    category: "Lighting",
    paths: [
      { d: "M12 2 a10 10 0 1 0 0 20 a10 10 0 1 0 0-20", strokeOnly: true },
      { d: "M12 2 L12 22", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M2 12 L22 12", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "fixture-recessed",
    label: "Recessed Downlight",
    category: "Lighting",
    paths: [
      { d: "M12 3 a9 9 0 1 0 0 18 a9 9 0 1 0 0-18", strokeOnly: true },
      { d: "M12 9 a3 3 0 1 0 0 6 a3 3 0 1 0 0-6", strokeOnly: false },
    ],
  },
  {
    id: "fixture-troffer",
    label: "Fluorescent / Troffer",
    category: "Lighting",
    paths: [
      { d: "M3 8 L21 8 L21 16 L3 16 Z", strokeOnly: true },
      { d: "M3 10 L21 10", strokeOnly: true, strokeWidth: 0.8 },
      { d: "M3 14 L21 14", strokeOnly: true, strokeWidth: 0.8 },
      { d: "M12 11 a1 1 0 1 0 0 2 a1 1 0 1 0 0-2", strokeOnly: false },
    ],
  },
  {
    id: "fixture-wall",
    label: "Wall Light",
    category: "Lighting",
    paths: [
      { d: "M2 12 L12 12", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 12 a8 8 0 0 1 0 -8 L12 20 a8 8 0 0 1 0-8", strokeOnly: true },
    ],
  },
  {
    id: "fixture-exterior",
    label: "Exterior / Outdoor Light",
    category: "Lighting",
    paths: [
      { d: "M2 12 L22 12", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M4 12 a8 8 0 0 1 16 0 Z", strokeOnly: false },
    ],
  },
  {
    id: "fixture-emergency",
    label: "Emergency Light",
    category: "Lighting",
    paths: [
      { d: "M4 8 L20 8 L20 16 L4 16 Z", strokeOnly: true },
      { d: "M7 8 L5 5 M17 8 L19 5", strokeOnly: true, strokeWidth: 2 },
      { d: "M4 4 L6 6 M8 3 L7 6", strokeOnly: true, strokeWidth: 1 },
      { d: "M20 4 L18 6 M16 3 L17 6", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "fixture-exit",
    label: "Exit Sign",
    category: "Lighting",
    paths: [
      { d: "M3 7 L21 7 L21 17 L3 17 Z", strokeOnly: true },
      { d: "M3 7 L21 17 M21 7 L3 17", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "fixture-exit-arrow",
    label: "Exit Sign with Arrow",
    category: "Lighting",
    paths: [
      { d: "M3 8 L18 8 L18 16 L3 16 Z", strokeOnly: true },
      { d: "M3 8 L18 16 M18 8 L3 16", strokeOnly: true, strokeWidth: 1.2 },
      { d: "M18 12 L23 12 M21 10 L23 12 L21 14", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "fixture-ceiling-fan",
    label: "Ceiling Fan",
    category: "Lighting",
    paths: [
      { d: "M12 3 a9 9 0 1 0 0 18 a9 9 0 1 0 0-18", strokeOnly: true },
      { d: "M12 3 L12 22", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M2 12 L22 12", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M7 7 Q12 4 17 7", strokeOnly: true, strokeWidth: 1.2 },
      { d: "M17 17 Q12 20 7 17", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  {
    id: "fixture-exhaust-fan",
    label: "Exhaust Fan",
    category: "Lighting",
    paths: [
      { d: "M12 3 a9 9 0 1 0 0 18 a9 9 0 1 0 0-18", strokeOnly: true },
      { d: "M12 7 a5 5 0 1 0 0 10 a5 5 0 1 0 0-10", strokeOnly: true },
      { d: "M12 7 L12 9 Q14 10 12 12 Q10 10 12 7", strokeOnly: false },
      { d: "M17 12 L15 12 Q14 14 12 12 Q14 10 17 12", strokeOnly: false },
      { d: "M12 17 L12 15 Q10 14 12 12 Q14 14 12 17", strokeOnly: false },
      { d: "M7 12 L9 12 Q10 10 12 12 Q10 14 7 12", strokeOnly: false },
    ],
  },
  {
    id: "fixture-pendant",
    label: "Pendant Light",
    category: "Lighting",
    paths: [
      { d: "M12 2 L12 7", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 7 a6 6 0 1 0 0 12 a6 6 0 1 0 0-12", strokeOnly: true },
      { d: "M12 7 L12 19", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M6 13 L18 13", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "fixture-track",
    label: "Track Lighting",
    category: "Lighting",
    paths: [
      { d: "M2 8 L22 8", strokeOnly: true, strokeWidth: 3 },
      { d: "M7 8 L7 13", strokeOnly: true, strokeWidth: 1 },
      { d: "M7 13 a2 2 0 1 0 0 .01", strokeOnly: true, strokeWidth: 1 },
      { d: "M12 8 L12 13", strokeOnly: true, strokeWidth: 1 },
      { d: "M12 13 a2 2 0 1 0 0 .01", strokeOnly: true, strokeWidth: 1 },
      { d: "M17 8 L17 13", strokeOnly: true, strokeWidth: 1 },
      { d: "M17 13 a2 2 0 1 0 0 .01", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "light-pole",
    label: "Post / Pole Light",
    category: "Lighting",
    paths: [
      { d: "M12 22 L12 8", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 8 a4 4 0 1 0 0 .01", strokeOnly: true },
      { d: "M8 12 L16 12", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "fixture-floodlight",
    label: "Exterior Floodlight",
    category: "Lighting",
    paths: [
      { d: "M6 6 L18 12 L6 18 Z", strokeOnly: false },
      { d: "M4 4 L6 6 M4 12 L6 12 M4 20 L6 18", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "fixture-sconce",
    label: "Wall Sconce",
    category: "Lighting",
    paths: [
      { d: "M2 12 L8 12", strokeOnly: true, strokeWidth: 2 },
      { d: "M8 6 L8 18 Q18 18 18 12 Q18 6 8 6 Z", strokeOnly: true },
      { d: "M8 12 a3 3 0 1 0 0 .01", strokeOnly: false },
    ],
  },

  // ── Power / Distribution ──────────────────────────────────────────────────────

  {
    id: "panel-power",
    label: "Power Panelboard",
    category: "Power / Distribution",
    paths: [
      { d: "M4 4 L20 4 L20 20 L4 20 Z", strokeOnly: true },
      { d: "M4 4 L20 20", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M4 4 L20 4 L20 20 L4 20 Z", strokeOnly: false },
    ],
  },
  {
    id: "panel-lighting",
    label: "Lighting Panelboard",
    category: "Power / Distribution",
    paths: [
      { d: "M4 4 L20 4 L20 20 L4 20 Z", strokeOnly: false },
    ],
  },
  {
    id: "transformer",
    label: "Transformer",
    category: "Power / Distribution",
    paths: [
      { d: "M7 12 a5 5 0 1 0 0 .01", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M17 12 a5 5 0 1 0 0 .01", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "motor",
    label: "Motor",
    category: "Power / Distribution",
    paths: [
      { d: "M12 3 a9 9 0 1 0 0 18 a9 9 0 1 0 0-18", strokeOnly: true },
      { d: "M7 16 L7 8 L12 13 L17 8 L17 16", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "generator",
    label: "Generator",
    category: "Power / Distribution",
    paths: [
      { d: "M12 3 a9 9 0 1 0 0 18 a9 9 0 1 0 0-18", strokeOnly: true },
      { d: "M16 10 Q12 7 9 10 Q7 12 9 14 Q12 17 16 14 L16 12 L13 12", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "meter-base",
    label: "Utility Meter (kWh)",
    category: "Power / Distribution",
    paths: [
      { d: "M3 16 L21 16", strokeOnly: true, strokeWidth: 2 },
      { d: "M3 16 a9 9 0 0 1 18 0 Z", strokeOnly: true },
      { d: "M9 12 L12 8 L15 12 M9 14 L15 14", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "disconnect-fused",
    label: "Fused Disconnect",
    category: "Power / Distribution",
    paths: [
      { d: "M5 5 L19 5 L19 19 L5 19 Z", strokeOnly: true },
      { d: "M9 16 L9 12", strokeOnly: true, strokeWidth: 2 },
      { d: "M9 12 L16 7", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M9 12 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0", strokeOnly: false },
      { d: "M13 14 L18 14 L18 18 L13 18 Z", strokeOnly: true, strokeWidth: 1 },
      { d: "M15 14 L15 18", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "disconnect-nonfused",
    label: "Non-Fused Disconnect",
    category: "Power / Distribution",
    paths: [
      { d: "M5 5 L19 5 L19 19 L5 19 Z", strokeOnly: true },
      { d: "M9 16 L9 12", strokeOnly: true, strokeWidth: 2 },
      { d: "M9 12 L16 7", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M9 12 m-2 0 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0", strokeOnly: false },
    ],
  },
  {
    id: "vfd",
    label: "Variable Frequency Drive",
    category: "Power / Distribution",
    paths: [
      { d: "M4 6 L20 6 L20 18 L4 18 Z", strokeOnly: true },
      { d: "M7 9 L11 9 L11 15 L7 15 Z", strokeOnly: true, strokeWidth: 1 },
      { d: "M13 9 L19 9", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M13 12 L19 12", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M13 15 L19 15", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "ats",
    label: "Automatic Transfer Switch",
    category: "Power / Distribution",
    paths: [
      { d: "M4 6 L20 6 L20 18 L4 18 Z", strokeOnly: true },
      { d: "M7 12 L17 12", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M7 9 L7 15 M17 9 L17 15", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M11 9 L14 12 L11 15", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  {
    id: "mcc",
    label: "Motor Control Center",
    category: "Power / Distribution",
    paths: [
      { d: "M4 4 L20 4 L20 20 L4 20 Z", strokeOnly: true },
      { d: "M4 9 L20 9 M4 14 L20 14", strokeOnly: true, strokeWidth: 1 },
      { d: "M9 4 L9 20 M15 4 L15 20", strokeOnly: true, strokeWidth: 1 },
      { d: "M6 6 a1.5 1.5 0 1 0 0 .01", strokeOnly: false },
      { d: "M12 6 a1.5 1.5 0 1 0 0 .01", strokeOnly: false },
      { d: "M18 6 a1.5 1.5 0 1 0 0 .01", strokeOnly: false },
    ],
  },
  {
    id: "spd",
    label: "Surge Protection (SPD)",
    category: "Power / Distribution",
    paths: [
      { d: "M5 5 L19 5 L19 19 L5 19 Z", strokeOnly: true },
      { d: "M12 7 L9 12 L12 12 L10 17", strokeOnly: true, strokeWidth: 2 },
      { d: "M15 7 L12 12 L15 12 L13 17", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  {
    id: "ground-rod",
    label: "Grounding Point",
    category: "Power / Distribution",
    paths: [
      { d: "M12 3 L12 13", strokeOnly: true, strokeWidth: 2 },
      { d: "M7 13 L17 13", strokeOnly: true, strokeWidth: 2 },
      { d: "M9 16 L15 16", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M11 19 L13 19", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "capacitor",
    label: "Capacitor Bank",
    category: "Power / Distribution",
    paths: [
      { d: "M12 3 L12 10", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M5 10 L19 10", strokeOnly: true, strokeWidth: 2.5 },
      { d: "M5 13 L19 13", strokeOnly: true, strokeWidth: 2.5 },
      { d: "M12 13 L12 21", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "ev-charger",
    label: "EV Charger",
    category: "Power / Distribution",
    paths: [
      { d: "M7 3 L17 3 L17 21 L7 21 Z", strokeOnly: true },
      { d: "M13 7 L10 12 L13 12 L11 17 L14 10 L11 10 Z", strokeOnly: false },
    ],
  },
  {
    id: "solar-panel",
    label: "Solar / PV Panel",
    category: "Power / Distribution",
    paths: [
      { d: "M3 6 L21 6 L21 18 L3 18 Z", strokeOnly: true },
      { d: "M3 10 L21 10 M3 14 L21 14", strokeOnly: true, strokeWidth: 1 },
      { d: "M8 6 L8 18 M13 6 L13 18 M18 6 L18 18", strokeOnly: true, strokeWidth: 1 },
    ],
  },

  // ── Fire Alarm ────────────────────────────────────────────────────────────────

  {
    id: "smoke-detector",
    label: "Smoke Detector",
    category: "Fire Alarm",
    paths: [
      { d: "M12 4 a8 8 0 1 0 0 16 a8 8 0 1 0 0-16", strokeOnly: true },
      { d: "M12 9 a3 3 0 1 0 0 6 a3 3 0 1 0 0-6", strokeOnly: false },
      { d: "M8 6 Q12 3 16 6", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  {
    id: "co-detector",
    label: "CO Detector",
    category: "Fire Alarm",
    paths: [
      { d: "M12 4 a8 8 0 1 0 0 16 a8 8 0 1 0 0-16", strokeOnly: true },
      { d: "M8 10 Q6 10 6 12 Q6 14 8 14 Q10 14 10 12 Q10 10 8 10", strokeOnly: true, strokeWidth: 1.2 },
      { d: "M14 10 Q16 10 16 12 Q16 14 14 14 Q14 14 14 12 Q14 10 14 10", strokeOnly: true, strokeWidth: 1.2 },
      { d: "M14 12 L16 12", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  {
    id: "heat-detector",
    label: "Heat Detector",
    category: "Fire Alarm",
    paths: [
      { d: "M12 4 a8 8 0 1 0 0 16 a8 8 0 1 0 0-16", strokeOnly: true },
      { d: "M8 9 Q12 7 16 9", strokeOnly: true, strokeWidth: 1.2 },
      { d: "M8 12 Q12 10 16 12", strokeOnly: true, strokeWidth: 1.2 },
      { d: "M8 15 Q12 13 16 15", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  {
    id: "duct-smoke",
    label: "Duct Smoke Detector",
    category: "Fire Alarm",
    paths: [
      { d: "M3 8 L21 8 L21 16 L3 16 Z", strokeOnly: true },
      { d: "M12 11 a2 2 0 1 0 0 4 a2 2 0 1 0 0-4", strokeOnly: false },
      { d: "M1 12 L3 12 M21 12 L23 12", strokeOnly: true, strokeWidth: 2 },
    ],
  },
  {
    id: "fire-pull",
    label: "Fire Alarm Pull Station",
    category: "Fire Alarm",
    paths: [
      { d: "M6 5 L18 5 L18 19 L6 19 Z", strokeOnly: true },
      { d: "M8 13 L16 13", strokeOnly: true, strokeWidth: 2 },
      { d: "M8 13 L8 17 L16 17 L16 13", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M8 7 L12 11 L16 7 M10 9.5 L14 9.5", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  {
    id: "horn-strobe",
    label: "Horn / Strobe Combo",
    category: "Fire Alarm",
    paths: [
      { d: "M5 8 L5 16 L12 20 L12 4 Z", strokeOnly: true },
      { d: "M14 8 Q18 12 14 16", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M16 6 Q21 12 16 18", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "strobe-only",
    label: "Strobe Only",
    category: "Fire Alarm",
    paths: [
      { d: "M6 5 L18 5 L18 19 L6 19 Z", strokeOnly: true },
      { d: "M12 7 L10 12 L12 12 L10 17 M15 7 L13 12 L15 12 L13 17", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  {
    id: "horn-only",
    label: "Horn Only",
    category: "Fire Alarm",
    paths: [
      { d: "M5 8 L5 16 L12 20 L12 4 Z", strokeOnly: true },
      { d: "M14 9 Q18 12 14 15", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "facp",
    label: "Fire Alarm Control Panel",
    category: "Fire Alarm",
    paths: [
      { d: "M3 3 L21 3 L21 21 L3 21 Z", strokeOnly: true },
      { d: "M3 7 L21 7 M3 11 L21 11 M3 15 L21 15", strokeOnly: true, strokeWidth: 1 },
      { d: "M7 3 L7 7 M12 3 L12 7 M17 3 L17 7", strokeOnly: true, strokeWidth: 1 },
      { d: "M6 9 a1 1 0 1 0 0 .01", strokeOnly: false },
      { d: "M12 9 a1 1 0 1 0 0 .01", strokeOnly: false },
      { d: "M18 9 a1 1 0 1 0 0 .01", strokeOnly: false },
    ],
  },
  {
    id: "faa",
    label: "Fire Alarm Annunciator",
    category: "Fire Alarm",
    paths: [
      { d: "M4 5 L20 5 L20 19 L4 19 Z", strokeOnly: true },
      { d: "M6 8 L18 8 M6 12 L18 12 M6 16 L18 16", strokeOnly: true, strokeWidth: 1 },
      { d: "M8 5 L8 8 M12 5 L12 8 M16 5 L16 8", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "flow-switch",
    label: "Flow Switch",
    category: "Fire Alarm",
    paths: [
      { d: "M12 4 a8 8 0 1 0 0 16 a8 8 0 1 0 0-16", strokeOnly: true },
      { d: "M6 12 L18 12", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M14 9 L18 12 L14 15", strokeOnly: true, strokeWidth: 1.2 },
    ],
  },
  {
    id: "tamper-switch",
    label: "Tamper Switch",
    category: "Fire Alarm",
    paths: [
      { d: "M12 4 a8 8 0 1 0 0 16 a8 8 0 1 0 0-16", strokeOnly: true },
      { d: "M8 8 L16 16 M16 8 L8 16", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "eol-resistor",
    label: "End of Line Resistor",
    category: "Fire Alarm",
    paths: [
      { d: "M3 12 L6 12", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M6 9 L18 9 L18 15 L6 15 Z", strokeOnly: true },
      { d: "M8 12 L9 9 L10 15 L11 9 L12 15 L13 9 L14 12", strokeOnly: true, strokeWidth: 1 },
      { d: "M18 12 L21 12", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },

  // ── Low Voltage ───────────────────────────────────────────────────────────────

  {
    id: "data-outlet",
    label: "Data / Telecom Drop",
    category: "Low Voltage",
    paths: [
      { d: "M8 4 L16 4 L16 20 L8 20 Z", strokeOnly: true },
      { d: "M8 8 L16 8 M8 12 L16 12 M8 16 L16 16", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "floor-data",
    label: "Floor Data Drop",
    category: "Low Voltage",
    paths: [
      { d: "M5 5 L19 5 L19 19 L5 19 Z", strokeOnly: true },
      { d: "M8 8 L16 8 L16 16 L8 16 Z", strokeOnly: true, strokeWidth: 1 },
      { d: "M8 10 L16 10 M8 13 L16 13", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "tv-outlet",
    label: "TV / Cable Outlet",
    category: "Low Voltage",
    paths: [
      { d: "M5 5 L19 5 L19 19 L5 19 Z", strokeOnly: true },
      { d: "M7 8 L17 8 L17 14 L7 14 Z", strokeOnly: true, strokeWidth: 1 },
      { d: "M10 14 L10 17 M14 14 L14 17 M8 17 L16 17", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "wap",
    label: "Wireless Access Point",
    category: "Low Voltage",
    paths: [
      { d: "M12 15 a2 2 0 1 0 0 .01", strokeOnly: false },
      { d: "M9 12 Q12 9 15 12", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M7 10 Q12 5 17 10", strokeOnly: true, strokeWidth: 1.2 },
      { d: "M5 8 Q12 2 19 8", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "telecom-board",
    label: "Telecom Backboard",
    category: "Low Voltage",
    paths: [
      { d: "M3 4 L21 4 L21 20 L3 20 Z", strokeOnly: true },
      { d: "M5 6 L19 6 L19 18 L5 18 Z", strokeOnly: true, strokeWidth: 0.8 },
      { d: "M5 9 L19 9 M5 12 L19 12 M5 15 L13 15", strokeOnly: true, strokeWidth: 0.5 },
    ],
  },
  {
    id: "card-reader",
    label: "Card Reader",
    category: "Low Voltage",
    paths: [
      { d: "M7 5 L17 5 L17 19 L7 19 Z", strokeOnly: true },
      { d: "M9 8 L15 8 L15 12 L9 12 Z", strokeOnly: true, strokeWidth: 1 },
      { d: "M10 14 L14 14", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M11 16 L13 16", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "biometric",
    label: "Biometric Scanner",
    category: "Low Voltage",
    paths: [
      { d: "M7 5 L17 5 L17 19 L7 19 Z", strokeOnly: true },
      { d: "M10 8 Q12 7 14 8 Q14 12 12 13 Q10 12 10 8", strokeOnly: true, strokeWidth: 1.2 },
      { d: "M11 10 Q12 9.5 13 10", strokeOnly: true, strokeWidth: 0.8 },
      { d: "M9 15 L15 15", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "door-strike",
    label: "Electric Door Strike",
    category: "Low Voltage",
    paths: [
      { d: "M17 3 L21 3 L21 21 L17 21 Z", strokeOnly: true },
      { d: "M3 9 L17 9 L17 15 L3 15 Z", strokeOnly: true },
      { d: "M6 9 L10 12 L6 15", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "maglock",
    label: "Magnetic Lock",
    category: "Low Voltage",
    paths: [
      { d: "M17 3 L21 3 L21 21 L17 21 Z", strokeOnly: true },
      { d: "M3 8 L17 8 L17 16 L3 16 Z", strokeOnly: true },
      { d: "M6 8 L6 16 M9 8 L9 16 M12 8 L12 16", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "door-contact",
    label: "Door Position Switch",
    category: "Low Voltage",
    paths: [
      { d: "M12 8 a4 4 0 1 0 0 8 a4 4 0 1 0 0-8", strokeOnly: true },
      { d: "M12 10 a2 2 0 1 0 0 4 a2 2 0 1 0 0-4", strokeOnly: false },
      { d: "M16 8 L20 4 M16 8 L20 8 M16 8 L16 12", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "camera-fixed",
    label: "Security Camera (Fixed)",
    category: "Low Voltage",
    paths: [
      { d: "M3 8 L14 8 L14 16 L3 16 Z", strokeOnly: true },
      { d: "M14 10 L21 7 L21 17 L14 14 Z", strokeOnly: true },
    ],
  },
  {
    id: "camera-ptz",
    label: "Security Camera (PTZ)",
    category: "Low Voltage",
    paths: [
      { d: "M12 7 a5 5 0 1 0 0 10 a5 5 0 1 0 0-10", strokeOnly: true },
      { d: "M15 9 L20 6 L20 16 L15 13 Z", strokeOnly: true },
      { d: "M12 10 a2 2 0 1 0 0 4 a2 2 0 1 0 0-4", strokeOnly: false },
    ],
  },
  {
    id: "intercom",
    label: "Intercom / Speaker",
    category: "Low Voltage",
    paths: [
      { d: "M5 5 L19 5 L19 19 L5 19 Z", strokeOnly: true },
      { d: "M7 8 L17 8 M7 11 L17 11 M7 14 L17 14", strokeOnly: true, strokeWidth: 1 },
      { d: "M12 16 a1.5 1.5 0 1 0 0 .01", strokeOnly: false },
    ],
  },
  {
    id: "pa-horn",
    label: "PA Horn",
    category: "Low Voltage",
    paths: [
      { d: "M5 8 L5 16 L12 20 L12 4 Z", strokeOnly: true },
      { d: "M14 8 Q18 12 14 16", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M16 6 Q21 12 16 18", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "bell",
    label: "Bell / Buzzer",
    category: "Low Voltage",
    paths: [
      { d: "M7 17 L17 17 Q17 9 12 7 Q7 9 7 17 Z", strokeOnly: true },
      { d: "M12 17 L12 20", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 20 a2 2 0 1 0 0 .01", strokeOnly: false },
    ],
  },
  {
    id: "chime",
    label: "Chime",
    category: "Low Voltage",
    paths: [
      { d: "M6 5 L18 5 L18 19 L6 19 Z", strokeOnly: true },
      { d: "M9 8 L9 16 M12 7 L12 17 M15 8 L15 16", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "pushbutton",
    label: "Pushbutton / Doorbell",
    category: "Low Voltage",
    paths: [
      { d: "M12 4 a8 8 0 1 0 0 16 a8 8 0 1 0 0-16", strokeOnly: true },
      { d: "M12 8 a4 4 0 1 0 0 8 a4 4 0 1 0 0-8", strokeOnly: false },
    ],
  },

  // ── Civil / Site ──────────────────────────────────────────────────────────────

  {
    id: "junction-box",
    label: "Junction Box",
    category: "Civil / Site",
    paths: [
      { d: "M4 4 L20 4 L20 20 L4 20 Z", strokeOnly: true },
      { d: "M4 4 L20 20 M20 4 L4 20", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "pull-box",
    label: "Pull Box / Handhole",
    category: "Civil / Site",
    paths: [
      { d: "M4 4 L20 4 L20 20 L4 20 Z", strokeOnly: true },
      { d: "M6 6 L18 6 L18 18 L6 18 Z", strokeOnly: true, strokeWidth: 0.8 },
      { d: "M6 12 L18 12 M12 6 L12 18", strokeOnly: true, strokeWidth: 0.8 },
    ],
  },
  {
    id: "manhole",
    label: "Manhole",
    category: "Civil / Site",
    paths: [
      { d: "M12 3 a9 9 0 1 0 0 18 a9 9 0 1 0 0-18", strokeOnly: true },
      { d: "M12 7 a5 5 0 1 0 0 10 a5 5 0 1 0 0-10", strokeOnly: true },
      { d: "M12 7 L12 17 M7 12 L17 12", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "duct-bank",
    label: "Duct Bank",
    category: "Civil / Site",
    paths: [
      { d: "M3 6 L21 6 L21 18 L3 18 Z", strokeOnly: true },
      { d: "M7 10 a2 2 0 1 0 0 .01", strokeOnly: true, strokeWidth: 1 },
      { d: "M12 10 a2 2 0 1 0 0 .01", strokeOnly: true, strokeWidth: 1 },
      { d: "M17 10 a2 2 0 1 0 0 .01", strokeOnly: true, strokeWidth: 1 },
      { d: "M7 15 a2 2 0 1 0 0 .01", strokeOnly: true, strokeWidth: 1 },
      { d: "M12 15 a2 2 0 1 0 0 .01", strokeOnly: true, strokeWidth: 1 },
      { d: "M17 15 a2 2 0 1 0 0 .01", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "traffic-signal",
    label: "Traffic Signal Pole",
    category: "Civil / Site",
    paths: [
      { d: "M12 22 L12 10", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 10 L18 10", strokeOnly: true, strokeWidth: 2 },
      { d: "M16 6 L21 6 L21 17 L16 17 Z", strokeOnly: true },
      { d: "M17.5 8.5 a1 1 0 1 0 0 .01", strokeOnly: false },
      { d: "M17.5 12 a1 1 0 1 0 0 .01", strokeOnly: false },
      { d: "M17.5 15.5 a1 1 0 1 0 0 .01", strokeOnly: false },
    ],
  },
  {
    id: "street-light-base",
    label: "Street Light Pedestal",
    category: "Civil / Site",
    paths: [
      { d: "M12 22 L12 8", strokeOnly: true, strokeWidth: 2 },
      { d: "M8 8 L16 8 L16 3 L8 3 Z", strokeOnly: false },
      { d: "M7 22 L17 22", strokeOnly: true, strokeWidth: 2 },
    ],
  },
  {
    id: "utility-pole",
    label: "Utility Pole",
    category: "Civil / Site",
    paths: [
      { d: "M12 22 L12 3", strokeOnly: true, strokeWidth: 2 },
      { d: "M6 8 L18 8", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 3 a2 2 0 1 0 0 .01", strokeOnly: true },
    ],
  },
  {
    id: "guy-wire",
    label: "Guy Wire / Anchor",
    category: "Civil / Site",
    paths: [
      { d: "M12 3 L12 14", strokeOnly: true, strokeWidth: 2 },
      { d: "M12 8 L3 19", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M1 17 L5 21 L7 17 Z", strokeOnly: false },
    ],
  },
  {
    id: "xfmr-pad",
    label: "Transformer Pad",
    category: "Civil / Site",
    paths: [
      { d: "M3 7 L21 7 L21 17 L3 17 Z", strokeOnly: true },
      { d: "M7 12 a4 4 0 1 0 0 .01", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M17 12 a4 4 0 1 0 0 .01", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "underground-conduit",
    label: "Underground Conduit",
    category: "Civil / Site",
    paths: [
      { d: "M3 12 L21 12", strokeOnly: true, strokeWidth: 2.5 },
      { d: "M5 9 L5 15 M9 9 L9 15 M13 9 L13 15 M17 9 L17 15 M21 9 L21 15", strokeOnly: true, strokeWidth: 0.8 },
    ],
  },
  {
    id: "direct-burial",
    label: "Direct Burial Cable",
    category: "Civil / Site",
    paths: [
      { d: "M3 11 L7 11 M9 11 L13 11 M15 11 L19 11 M21 11 L23 11", strokeOnly: true, strokeWidth: 2 },
      { d: "M3 14 L7 14 M9 14 L13 14 M15 14 L19 14 M21 14 L23 14", strokeOnly: true, strokeWidth: 1 },
    ],
  },
  {
    id: "trench",
    label: "Trench Route",
    category: "Civil / Site",
    paths: [
      { d: "M3 12 L21 12", strokeOnly: true, strokeWidth: 2 },
      { d: "M5 10 L5 14 M8 10 L8 14 M11 10 L11 14 M14 10 L14 14 M17 10 L17 14 M20 10 L20 14", strokeOnly: true, strokeWidth: 1 },
    ],
  },

  // ── Healthcare ────────────────────────────────────────────────────────────────

  {
    id: "nurse-call-btn",
    label: "Nurse Call Button",
    category: "Healthcare",
    paths: [
      { d: "M6 5 L18 5 L18 19 L6 19 Z", strokeOnly: true },
      { d: "M12 8 L12 16 M9 12 L15 12", strokeOnly: true, strokeWidth: 2 },
    ],
  },
  {
    id: "nurse-call-dome",
    label: "Nurse Call Dome Light",
    category: "Healthcare",
    paths: [
      { d: "M12 5 a7 7 0 1 0 0 14 a7 7 0 1 0 0-14", strokeOnly: true },
      { d: "M12 8 L12 16 M9 12 L15 12", strokeOnly: true, strokeWidth: 1.5 },
      { d: "M12 19 L12 22 M9 22 L15 22", strokeOnly: true, strokeWidth: 1.5 },
    ],
  },
  {
    id: "bedhead-trunking",
    label: "Bedhead Trunking",
    category: "Healthcare",
    paths: [
      { d: "M3 7 L21 7 L21 17 L3 17 Z", strokeOnly: true },
      { d: "M3 11 L21 11 M3 14 L21 14", strokeOnly: true, strokeWidth: 1 },
      { d: "M7 7 L7 17 M12 7 L12 17 M17 7 L17 17", strokeOnly: true, strokeWidth: 0.8 },
    ],
  },
  {
    id: "floor-heating",
    label: "Floor Heating Mat",
    category: "Healthcare",
    paths: [
      { d: "M4 4 L20 4 L20 20 L4 20 Z", strokeOnly: true },
      { d: "M7 7 Q9 11 7 15 Q9 19 12 15 Q15 11 12 7 Q15 3 18 7 Q20 11 18 15", strokeOnly: true, strokeWidth: 1.5 },
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
