/**
 * BidPhase — Electrical Symbol Library
 * Based on NFPA 70 / NEC standard electrical plan symbols.
 * Each icon is a 24×24 viewBox SVG path (or paths separated by "|||").
 * Rendering: scale to desired size, fill/stroke with session color.
 */

export interface CountIcon {
  id: string;
  label: string;
  category: string;
  /** SVG path data. Multiple paths separated by "|||". */
  path: string;
  /** "fill" | "stroke" | "both" — how to apply the session color */
  render: "fill" | "stroke" | "both";
}

// ─── Receptacles ──────────────────────────────────────────────────────────────
const RECEPTACLES: CountIcon[] = [
  {
    id: "outlet-duplex",
    label: "Duplex Receptacle",
    category: "Receptacles",
    // Circle with two vertical slots
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-2 6h1v4h-1V8zm3 0h1v4h-1V8z",
    render: "both",
  },
  {
    id: "outlet-quad",
    label: "Quad Receptacle",
    category: "Receptacles",
    // Circle with four slots (2×2 grid)
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-3 5h1v3H9V7zm4 0h1v3h-1V7zM9 13h1v3H9v-3zm4 0h1v3h-1v-3z",
    render: "both",
  },
  {
    id: "outlet-gfci",
    label: "GFCI Receptacle",
    category: "Receptacles",
    // Circle with two slots + horizontal bar (GFI indicator)
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-2 5h1v4h-1V7zm3 0h1v4h-1V7zm-4 6h6v1.5H9V13z",
    render: "both",
  },
  {
    id: "outlet-afci",
    label: "AFCI Receptacle",
    category: "Receptacles",
    // Circle with two slots + arc indicator
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-2 5h1v4h-1V7zm3 0h1v4h-1V7zM8.5 14.5 Q12 12 15.5 14.5",
    render: "both",
  },
  {
    id: "outlet-20a",
    label: "20A Receptacle",
    category: "Receptacles",
    // Circle with T-slot (20A indicator)
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-2.5 6h1v4h-1V8zm0 0h-1.5v1.5h1.5zm3.5 0h1v4h-1V8z",
    render: "both",
  },
  {
    id: "outlet-30a",
    label: "30A Receptacle",
    category: "Receptacles",
    // Circle with L-shaped slot (30A/dryer style)
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 5 l-3 3 h2 v4 h2 v-4 h2 z",
    render: "both",
  },
  {
    id: "outlet-50a",
    label: "50A Receptacle",
    category: "Receptacles",
    // Circle with diamond slot (50A/range style)
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 6 l2 3 l-2 3 l-2-3 z",
    render: "both",
  },
  {
    id: "outlet-dryer",
    label: "Dryer Outlet (240V)",
    category: "Receptacles",
    // Circle with three prong slots
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-3 6h1.5v3.5H9V8zm4.5 0H15v3.5h-1.5V8zM11 14h2v2h-2v-2z",
    render: "both",
  },
  {
    id: "outlet-range",
    label: "Range Outlet (240V)",
    category: "Receptacles",
    // Circle with four prong slots
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-3.5 5.5H10v3H8.5v-3zm5 0H15v3h-1.5v-3zM11 13h2v1.5h-2V13zm0 3h2v1.5h-2V16z",
    render: "both",
  },
  {
    id: "outlet-floor",
    label: "Floor Receptacle",
    category: "Receptacles",
    // Circle with horizontal lines (floor mount indicator)
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-2 6h1v4h-1V8zm3 0h1v4h-1V8zM6 18h12v1.5H6V18z",
    render: "both",
  },
  {
    id: "outlet-weatherproof",
    label: "Weatherproof Receptacle",
    category: "Receptacles",
    // Circle with WP arc cover
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-2 7h1v3h-1v-3zm3 0h1v3h-1v-3zM7 9 Q12 5 17 9",
    render: "both",
  },
  {
    id: "outlet-usb",
    label: "USB Receptacle",
    category: "Receptacles",
    // Circle with USB trident symbol
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 5v7m-3-5h6m-5 0v-1.5h1.5V7m3.5 0v1.5H13V7",
    render: "both",
  },
];

// ─── Switches ─────────────────────────────────────────────────────────────────
const SWITCHES: CountIcon[] = [
  {
    id: "switch-single",
    label: "Single Pole Switch",
    category: "Switches",
    // S with a line
    path: "M8 18 L16 6 M16 6 L16 9",
    render: "stroke",
  },
  {
    id: "switch-3way",
    label: "3-Way Switch",
    category: "Switches",
    // S3
    path: "M8 18 L16 6 M16 6 L16 9 M14 7.5 L18 7.5",
    render: "stroke",
  },
  {
    id: "switch-4way",
    label: "4-Way Switch",
    category: "Switches",
    path: "M8 18 L16 6 M16 6 L16 9 M14 7.5 L18 7.5 M14 6 L18 9",
    render: "stroke",
  },
  {
    id: "switch-dimmer",
    label: "Dimmer Switch",
    category: "Switches",
    // S with a rheostat arc
    path: "M8 18 L16 6 M16 6 L16 9 M9 14 Q12 11 15 14",
    render: "stroke",
  },
  {
    id: "switch-timer",
    label: "Timer Switch",
    category: "Switches",
    // S with clock circle
    path: "M8 18 L14 8 M17 7 a3 3 0 1 1 0 .01 M17 5.5 L17 7 L18.5 8",
    render: "stroke",
  },
  {
    id: "switch-motion",
    label: "Motion Sensor Switch",
    category: "Switches",
    // S with motion arcs
    path: "M8 18 L14 8 M17 5 Q20 8 17 11 M15.5 6.5 Q17.5 8 15.5 9.5",
    render: "stroke",
  },
  {
    id: "switch-keyed",
    label: "Key Switch",
    category: "Switches",
    // S with key symbol
    path: "M8 18 L16 6 M16 6 L16 9 M13 5 a2 2 0 1 1 0 .01 M14.4 6.4 L17 9 L16 10 L15 9",
    render: "stroke",
  },
];

// ─── Lighting ─────────────────────────────────────────────────────────────────
const LIGHTING: CountIcon[] = [
  {
    id: "fixture-ceiling",
    label: "Ceiling Fixture",
    category: "Lighting",
    // Circle with cross
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 4v12M6 12h12",
    render: "both",
  },
  {
    id: "fixture-recessed",
    label: "Recessed Can Light",
    category: "Lighting",
    // Filled circle
    path: "M12 4a8 8 0 1 0 0 16A8 8 0 0 0 12 4z",
    render: "fill",
  },
  {
    id: "fixture-surface",
    label: "Surface Mount Fixture",
    category: "Lighting",
    // Rectangle with center dot
    path: "M4 9h16v6H4z M12 12 a1 1 0 1 1 0 .01",
    render: "both",
  },
  {
    id: "fixture-pendant",
    label: "Pendant Light",
    category: "Lighting",
    // Circle hanging from line
    path: "M12 2 L12 7 M12 7 a5 5 0 1 0 0 .01",
    render: "both",
  },
  {
    id: "fixture-track",
    label: "Track Lighting",
    category: "Lighting",
    // Horizontal bar with circles
    path: "M3 12 h18 M7 12 a2 2 0 1 1 0 .01 M17 12 a2 2 0 1 1 0 .01",
    render: "both",
  },
  {
    id: "fixture-exit",
    label: "Exit Sign",
    category: "Lighting",
    // Rectangle with X
    path: "M3 8 h18 v8 H3 z M8 10 L16 14 M16 10 L8 14",
    render: "both",
  },
  {
    id: "fixture-emergency",
    label: "Emergency Light",
    category: "Lighting",
    // Rectangle with two beams
    path: "M4 10 h16 v4 H4 z M2 12 L5 10 M2 12 L5 14 M22 12 L19 10 M22 12 L19 14",
    render: "both",
  },
  {
    id: "fixture-exterior",
    label: "Exterior Wall Light",
    category: "Lighting",
    // Half circle on wall
    path: "M12 4 a8 8 0 0 1 0 16 M12 4 L12 20 M4 12 h8",
    render: "both",
  },
  {
    id: "light-pole",
    label: "Light Pole",
    category: "Lighting",
    // Tall vertical line with overhang and circle
    path: "M12 22 L12 6 M12 6 L18 6 M18 6 a2 2 0 1 1 0 .01",
    render: "both",
  },
  {
    id: "fixture-under-cabinet",
    label: "Under Cabinet Light",
    category: "Lighting",
    // Thin rectangle
    path: "M4 14 h16 v2.5 H4 z",
    render: "both",
  },
];

// ─── Panels & Distribution ────────────────────────────────────────────────────
const PANELS: CountIcon[] = [
  {
    id: "panel-main",
    label: "Main Panel / Load Center",
    category: "Panels",
    // Rectangle with vertical lines (breakers)
    path: "M4 3 h16 v18 H4 z M8 3 v18 M12 6 h4 M12 9 h4 M12 12 h4 M12 15 h4 M12 18 h4",
    render: "both",
  },
  {
    id: "panel-sub",
    label: "Sub Panel",
    category: "Panels",
    // Smaller rectangle with SP label lines
    path: "M5 5 h14 v14 H5 z M9 5 v14 M12 8 h4 M12 11 h4 M12 14 h4",
    render: "both",
  },
  {
    id: "disconnect-switch",
    label: "Disconnect Switch",
    category: "Panels",
    // Square with diagonal slash
    path: "M4 4 h16 v16 H4 z M8 16 L16 8",
    render: "both",
  },
  {
    id: "meter-base",
    label: "Meter Base",
    category: "Panels",
    // Circle with M
    path: "M12 2 a10 10 0 1 0 0 20 A10 10 0 0 0 12 2 M8 16 L8 8 L12 13 L16 8 L16 16",
    render: "both",
  },
  {
    id: "transfer-switch",
    label: "Transfer Switch",
    category: "Panels",
    // Two rectangles with arrow
    path: "M3 6 h7 v5 H3 z M14 13 h7 v5 h-7 z M10 8.5 h4 M12 7 L14 8.5 L12 10 M14 15.5 h-4 M12 14 L10 15.5 L12 17",
    render: "both",
  },
];

// ─── Devices & Alarms ─────────────────────────────────────────────────────────
const DEVICES: CountIcon[] = [
  {
    id: "smoke-alarm",
    label: "Smoke Alarm",
    category: "Devices",
    // Circle with S and dots
    path: "M12 2 a10 10 0 1 0 0 20 A10 10 0 0 0 12 2 M9 9 Q12 6 15 9 Q12 12 9 9 M12 14 a1 1 0 1 1 0 .01",
    render: "both",
  },
  {
    id: "co-detector",
    label: "CO Detector",
    category: "Devices",
    // Circle with CO text lines
    path: "M12 2 a10 10 0 1 0 0 20 A10 10 0 0 0 12 2 M8 10 Q8 8 10 8 Q12 8 12 10 Q12 12 10 12 Q8 12 8 10 M13 8 h3 M13 12 h3 M15 8 v4",
    render: "both",
  },
  {
    id: "thermostat",
    label: "Thermostat",
    category: "Devices",
    // Square with T
    path: "M4 4 h16 v16 H4 z M8 8 h8 M12 8 v8",
    render: "both",
  },
  {
    id: "doorbell",
    label: "Doorbell / Chime",
    category: "Devices",
    // Bell shape
    path: "M12 3 Q7 3 7 9 L7 15 H17 L17 9 Q17 3 12 3 M10 15 Q10 18 12 18 Q14 18 14 15 M9 3 Q12 1 15 3",
    render: "both",
  },
  {
    id: "fan-ceiling",
    label: "Ceiling Fan",
    category: "Devices",
    // Circle with 4 blades
    path: "M12 12 a1.5 1.5 0 1 0 0 .01 M12 10.5 Q14 7 17 8 Q14 10 12 10.5 M13.5 12 Q17 14 16 17 Q14 14 13.5 12 M12 13.5 Q10 17 7 16 Q10 14 12 13.5 M10.5 12 Q7 10 8 7 Q10 10 10.5 12",
    render: "both",
  },
  {
    id: "junction-box",
    label: "Junction Box",
    category: "Devices",
    // Square with JB
    path: "M4 4 h16 v16 H4 z M8 8 v5 Q8 13 10 13 Q12 13 12 11 M13 8 h3 M14.5 8 v8",
    render: "both",
  },
  {
    id: "junction-box-inground",
    label: "In-Ground Junction Box",
    category: "Devices",
    // Square with dashed bottom
    path: "M4 4 h16 v12 H4 z M4 16 L4 20 M20 16 L20 20 M7 20 h10 M8 8 v5 Q8 13 10 13 Q12 13 12 11 M13 8 h3 M14.5 8 v5",
    render: "both",
  },
  {
    id: "gfci-breaker",
    label: "GFCI Breaker",
    category: "Devices",
    // Rectangle with GFI lines
    path: "M5 6 h14 v12 H5 z M8 9 h3 M8 12 h5 M8 15 h3 M15 9 v6",
    render: "both",
  },
];

// ─── Motors & Equipment ───────────────────────────────────────────────────────
const MOTORS: CountIcon[] = [
  {
    id: "motor",
    label: "Motor",
    category: "Motors",
    // Circle with M
    path: "M12 2 a10 10 0 1 0 0 20 A10 10 0 0 0 12 2 M7 16 L7 8 L12 13 L17 8 L17 16",
    render: "both",
  },
  {
    id: "transformer",
    label: "Transformer",
    category: "Motors",
    // Two circles linked
    path: "M5 12 a4 4 0 1 0 0 .01 M15 12 a4 4 0 1 0 0 .01 M9 12 h2 M13 12 h2",
    render: "both",
  },
  {
    id: "generator",
    label: "Generator",
    category: "Motors",
    // Circle with G
    path: "M12 2 a10 10 0 1 0 0 20 A10 10 0 0 0 12 2 M15 9 Q13 7 10 9 Q8 11 10 13 Q12 15 14 14 L14 12 h-2",
    render: "both",
  },
  {
    id: "hvac-unit",
    label: "HVAC Unit",
    category: "Motors",
    // Rectangle with fan circle
    path: "M3 5 h18 v14 H3 z M12 12 a4 4 0 1 0 0 .01 M12 8 v2 M12 14 v2 M8 12 h2 M14 12 h2",
    render: "both",
  },
];

// ─── Telecom & Low Voltage ────────────────────────────────────────────────────
const TELECOM: CountIcon[] = [
  {
    id: "data-outlet",
    label: "Data / Network Outlet",
    category: "Telecom",
    // Square with D
    path: "M4 4 h16 v16 H4 z M8 8 h3 Q14 8 14 12 Q14 16 11 16 H8 z",
    render: "both",
  },
  {
    id: "phone-outlet",
    label: "Telephone Outlet",
    category: "Telecom",
    // Square with T
    path: "M4 4 h16 v16 H4 z M8 8 h8 M12 8 v8",
    render: "both",
  },
  {
    id: "tv-outlet",
    label: "TV / Cable Outlet",
    category: "Telecom",
    // Square with antenna
    path: "M4 6 h16 v12 H4 z M12 6 L9 3 M12 6 L15 3 M12 6 v3",
    render: "both",
  },
  {
    id: "speaker",
    label: "Speaker / Intercom",
    category: "Telecom",
    // Speaker cone
    path: "M5 9 h4 L13 5 v14 L9 15 H5 z M15 8 Q18 12 15 16",
    render: "both",
  },
  {
    id: "camera",
    label: "Security Camera",
    category: "Telecom",
    // Camera body with lens
    path: "M3 8 h12 v8 H3 z M15 10 L21 7 v10 L15 14 M7 12 a3 3 0 1 1 0 .01",
    render: "both",
  },
  {
    id: "access-control",
    label: "Access Control / Card Reader",
    category: "Telecom",
    // Rectangle with key card
    path: "M6 4 h12 v16 H6 z M9 9 h6 M9 12 h6 M9 15 h3",
    render: "both",
  },
];

// ─── Civil / Site ─────────────────────────────────────────────────────────────
const CIVIL: CountIcon[] = [
  {
    id: "handhole",
    label: "Handhole",
    category: "Civil",
    // Square with H
    path: "M3 3 h18 v18 H3 z M8 7 v10 M16 7 v10 M8 12 h8",
    render: "both",
  },
  {
    id: "manhole",
    label: "Manhole",
    category: "Civil",
    // Circle with MH
    path: "M12 2 a10 10 0 1 0 0 20 A10 10 0 0 0 12 2 M7 16 L7 8 L10 13 L13 8 L13 16 M15 8 h2 M16 8 v8 M15 16 h2",
    render: "both",
  },
  {
    id: "pull-box",
    label: "Pull Box",
    category: "Civil",
    // Rectangle with PB
    path: "M3 6 h18 v12 H3 z M7 9 h2 Q11 9 11 11 Q11 13 9 13 H7 M13 9 h2 Q16 9 16 10 Q16 11 14 11 h-1 M13 11 h2 Q16 11 16 13 h-3",
    render: "both",
  },
  {
    id: "conduit-stub",
    label: "Conduit Stub-Up",
    category: "Civil",
    // Vertical line with circle at top
    path: "M12 20 L12 8 M12 8 a4 4 0 1 0 0 .01",
    render: "both",
  },
  {
    id: "ground-rod",
    label: "Ground Rod",
    category: "Civil",
    // Vertical line with horizontal bars (ground symbol)
    path: "M12 2 L12 16 M8 16 h8 M9 18.5 h6 M10.5 21 h3",
    render: "both",
  },
];

// ─── Master list & helpers ────────────────────────────────────────────────────
export const COUNT_ICONS: CountIcon[] = [
  ...RECEPTACLES,
  ...SWITCHES,
  ...LIGHTING,
  ...PANELS,
  ...DEVICES,
  ...MOTORS,
  ...TELECOM,
  ...CIVIL,
];

export const ICON_CATEGORIES = [
  "Receptacles",
  "Switches",
  "Lighting",
  "Panels",
  "Devices",
  "Motors",
  "Telecom",
  "Civil",
] as const;

export type IconCategory = (typeof ICON_CATEGORIES)[number];

export const PIN_COLORS: { hex: string; label: string }[] = [
  { hex: "#39FF14", label: "Neon Green" },
  { hex: "#FF00FF", label: "Magenta" },
  { hex: "#00FFFF", label: "Cyan" },
  { hex: "#FFE600", label: "Yellow" },
  { hex: "#FF6600", label: "Orange" },
  { hex: "#BF00FF", label: "Purple" },
  { hex: "#FF2222", label: "Red" },
  { hex: "#00CCAA", label: "Teal" },
  { hex: "#FFFFFF", label: "White" },
  { hex: "#FFD700", label: "Gold" },
];

export const DEFAULT_ICON_ID = "outlet-duplex";
export const DEFAULT_PIN_COLOR = "#39FF14";
