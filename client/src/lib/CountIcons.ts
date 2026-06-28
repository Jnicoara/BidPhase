/**
 * BidPhase — Electrical Symbol Library
 * Based on NFPA 70 / NEC standard electrical plan symbols.
 * Each icon is a 24×24 viewBox SVG path (or paths separated by "|||").
 * Rendering: scale to desired size, fill/stroke with session color.
 * Categories ordered most-common → least-common within each group.
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
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-2 6h1v4h-1V8zm3 0h1v4h-1V8z",
    render: "both",
  },
  {
    id: "outlet-quad",
    label: "Quad Receptacle",
    category: "Receptacles",
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-3 5h1v3H9V7zm4 0h1v3h-1V7zM9 13h1v3H9v-3zm4 0h1v3h-1v-3z",
    render: "both",
  },
  {
    id: "outlet-gfci",
    label: "GFCI Receptacle",
    category: "Receptacles",
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-2 5h1v4h-1V7zm3 0h1v4h-1V7zm-4 6h6v1.5H9V13z",
    render: "both",
  },
  {
    id: "outlet-afci",
    label: "AFCI Receptacle",
    category: "Receptacles",
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-2 5h1v4h-1V7zm3 0h1v4h-1V7zM8.5 14.5 Q12 12 15.5 14.5",
    render: "both",
  },
  {
    id: "outlet-half-hot",
    label: "Half-Hot / Switched Receptacle",
    category: "Receptacles",
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM12 2 A10 10 0 0 1 22 12 L12 12z|||M10 7h1v4h-1V7zm3 0h1v4h-1V7z",
    render: "both",
  },
  {
    id: "outlet-20a",
    label: "20A Receptacle",
    category: "Receptacles",
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-2.5 6h1v4h-1V8zm0 0h-1.5v1.5h1.5zm3.5 0h1v4h-1V8z",
    render: "both",
  },
  {
    id: "outlet-30a",
    label: "30A Receptacle",
    category: "Receptacles",
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 5l-3 3h2v4h2v-4h2z",
    render: "both",
  },
  {
    id: "outlet-50a",
    label: "50A Receptacle",
    category: "Receptacles",
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 6l2 3-2 3-2-3z",
    render: "both",
  },
  {
    id: "outlet-dryer",
    label: "Dryer Outlet (240V / 30A)",
    category: "Receptacles",
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-3 6h1.5v3.5H9V8zm4.5 0H15v3.5h-1.5V8zM11 14h2v2h-2v-2z",
    render: "both",
  },
  {
    id: "outlet-range",
    label: "Range Outlet (240V / 50A)",
    category: "Receptacles",
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-3.5 5.5H10v3H8.5v-3zm5 0H15v3h-1.5v-3zM11 13h2v1.5h-2V13zm0 3h2v1.5h-2V16z",
    render: "both",
  },
  {
    id: "outlet-floor",
    label: "Floor Receptacle",
    category: "Receptacles",
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-2 6h1v4h-1V8zm3 0h1v4h-1V8zM6 18h12v1.5H6V18z",
    render: "both",
  },
  {
    id: "outlet-weatherproof",
    label: "Weatherproof Receptacle",
    category: "Receptacles",
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-2 7h1v3h-1v-3zm3 0h1v3h-1v-3zM7 9 Q12 5 17 9",
    render: "both",
  },
  {
    id: "outlet-isolated-ground",
    label: "Isolated Ground Receptacle",
    category: "Receptacles",
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-2 6h1v4h-1V8zm3 0h1v4h-1V8zM12 15l-2 3h4z",
    render: "both",
  },
  {
    id: "outlet-usb",
    label: "USB Receptacle",
    category: "Receptacles",
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 5v7m-3-5h6m-5 0v-1.5h1.5V7m3.5 0v1.5H13V7",
    render: "both",
  },
  {
    id: "outlet-clock",
    label: "Clock Receptacle",
    category: "Receptacles",
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 4v6l3.5 2",
    render: "both",
  },
  {
    id: "outlet-twistlock",
    label: "Twist-Lock Receptacle",
    category: "Receptacles",
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm-2 6h1v4h-1V8zm3 0h1v4h-1V8zM8 14 Q12 17 16 14",
    render: "both",
  },
];

// ─── Switches & Controls ──────────────────────────────────────────────────────
const SWITCHES: CountIcon[] = [
  {
    id: "switch-single",
    label: "Single-Pole Switch",
    category: "Switches",
    path: "M8 18 L16 6 M16 6 L16 9",
    render: "stroke",
  },
  {
    id: "switch-double",
    label: "Double-Pole Switch",
    category: "Switches",
    path: "M8 18 L16 6 M16 6 L16 9 M14 6 L18 6",
    render: "stroke",
  },
  {
    id: "switch-3way",
    label: "3-Way Switch",
    category: "Switches",
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
    path: "M8 18 L16 6 M16 6 L16 9 M9 14 Q12 11 15 14",
    render: "stroke",
  },
  {
    id: "switch-keyed",
    label: "Key-Operated Switch",
    category: "Switches",
    path: "M8 18 L16 6 M16 6 L16 9 M13 5 a2 2 0 1 1 0 .01 M14.4 6.4 L17 9 L16 10 L15 9",
    render: "stroke",
  },
  {
    id: "switch-motion",
    label: "Motion/Occupancy Sensor",
    category: "Switches",
    path: "M8 18 L14 8 M17 5 Q20 8 17 11 M15.5 6.5 Q17.5 8 15.5 9.5",
    render: "stroke",
  },
  {
    id: "switch-timer",
    label: "Timer Switch",
    category: "Switches",
    path: "M8 18 L14 8 M17 7 a3 3 0 1 1 0 .01 M17 5.5 L17 7 L18.5 8",
    render: "stroke",
  },
  {
    id: "switch-weatherproof",
    label: "Weatherproof Switch",
    category: "Switches",
    path: "M8 18 L16 6 M16 6 L16 9 M6 4 Q12 1 18 4",
    render: "stroke",
  },
  {
    id: "thermostat",
    label: "Thermostat",
    category: "Switches",
    path: "M4 4 h16 v16 H4 z M8 8 h8 M12 8 v8",
    render: "both",
  },
  {
    id: "humidistat",
    label: "Humidistat",
    category: "Switches",
    path: "M12 2 a10 10 0 1 0 0 20 A10 10 0 0 0 12 2 M8 9 v6 M16 9 v6 M8 12 h8",
    render: "both",
  },
];

// ─── Lighting ─────────────────────────────────────────────────────────────────
const LIGHTING: CountIcon[] = [
  {
    id: "fixture-ceiling",
    label: "Surface Mount Fixture",
    category: "Lighting",
    path: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 4v12M6 12h12",
    render: "both",
  },
  {
    id: "fixture-recessed",
    label: "Recessed Can Light",
    category: "Lighting",
    path: "M12 4a8 8 0 1 0 0 16A8 8 0 0 0 12 4z",
    render: "fill",
  },
  {
    id: "fixture-troffer",
    label: "Linear / Troffer Light",
    category: "Lighting",
    path: "M4 9h16v6H4z M12 12 a1 1 0 1 1 0 .01",
    render: "both",
  },
  {
    id: "fixture-sconce",
    label: "Wall Sconce",
    category: "Lighting",
    path: "M12 4 a8 8 0 0 1 0 16 M12 4 L12 20 M4 12 h8",
    render: "both",
  },
  {
    id: "fixture-track",
    label: "Track Lighting",
    category: "Lighting",
    path: "M3 12 h18 M7 12 a2 2 0 1 1 0 .01 M17 12 a2 2 0 1 1 0 .01",
    render: "both",
  },
  {
    id: "fixture-emergency",
    label: "Emergency Light",
    category: "Lighting",
    path: "M4 10 h16 v4 H4 z M2 12 L5 10 M2 12 L5 14 M22 12 L19 10 M22 12 L19 14",
    render: "both",
  },
  {
    id: "fixture-exit",
    label: "Exit Sign",
    category: "Lighting",
    path: "M3 8 h18 v8 H3 z M8 10 L16 14 M16 10 L8 14",
    render: "both",
  },
  {
    id: "fixture-exit-arrow",
    label: "Exit Sign with Arrow",
    category: "Lighting",
    path: "M3 8 h16 v8 H3 z M7 10 L15 14 M15 10 L7 14 M19 12 h4 M21 10 l2 2 -2 2",
    render: "both",
  },
  {
    id: "fixture-ceiling-fan",
    label: "Ceiling Fan",
    category: "Lighting",
    path: "M12 12 a1.5 1.5 0 1 0 0 .01 M12 10.5 Q14 7 17 8 Q14 10 12 10.5 M13.5 12 Q17 14 16 17 Q14 14 13.5 12 M12 13.5 Q10 17 7 16 Q10 14 12 13.5 M10.5 12 Q7 10 8 7 Q10 10 10.5 12",
    render: "both",
  },
  {
    id: "fixture-exhaust-fan",
    label: "Exhaust Fan",
    category: "Lighting",
    path: "M4 4 h16 v16 H4 z M12 12 a4 4 0 1 0 0 .01 M9 9 L15 15 M15 9 L9 15",
    render: "both",
  },
  {
    id: "fixture-pendant",
    label: "Pendant Light",
    category: "Lighting",
    path: "M12 2 L12 7 M12 7 a5 5 0 1 0 0 .01",
    render: "both",
  },
  {
    id: "fixture-floodlight",
    label: "Exterior Floodlight",
    category: "Lighting",
    path: "M8 6 h8 l4 12 H4 z M12 6 v2",
    render: "both",
  },
  {
    id: "light-pole",
    label: "Post / Pole Light",
    category: "Lighting",
    path: "M12 22 L12 6 M12 6 L18 6 M18 6 a2 2 0 1 1 0 .01",
    render: "both",
  },
];

// ─── Panels & Distribution ────────────────────────────────────────────────────
const PANELS: CountIcon[] = [
  {
    id: "panel-surface",
    label: "Surface Mount Panelboard",
    category: "Panels",
    path: "M4 3 h16 v18 H4 z M8 3 v18 M12 6 h4 M12 9 h4 M12 12 h4 M12 15 h4 M12 18 h4",
    render: "both",
  },
  {
    id: "panel-flush",
    label: "Flush Mount Panelboard",
    category: "Panels",
    path: "M5 5 h14 v14 H5 z M9 5 v14 M12 8 h4 M12 11 h4 M12 14 h4",
    render: "both",
  },
  {
    id: "transformer",
    label: "Transformer",
    category: "Panels",
    path: "M5 12 a4 4 0 1 0 0 .01 M15 12 a4 4 0 1 0 0 .01 M9 12 h2 M13 12 h2",
    render: "both",
  },
  {
    id: "motor",
    label: "Motor",
    category: "Panels",
    path: "M12 2 a10 10 0 1 0 0 20 A10 10 0 0 0 12 2 M7 16 L7 8 L12 13 L17 8 L17 16",
    render: "both",
  },
  {
    id: "vfd",
    label: "Variable Frequency Drive (VFD)",
    category: "Panels",
    path: "M3 6 h18 v12 H3 z M6 9 l2 6 M8 9 h3 l-1.5 3 1.5 3 M13 9 v6 h3",
    render: "both",
  },
  {
    id: "generator",
    label: "Generator",
    category: "Panels",
    path: "M12 2 a10 10 0 1 0 0 20 A10 10 0 0 0 12 2 M15 9 Q13 7 10 9 Q8 11 10 13 Q12 15 14 14 L14 12 h-2",
    render: "both",
  },
  {
    id: "ats",
    label: "Automatic Transfer Switch (ATS)",
    category: "Panels",
    path: "M3 6 h7 v5 H3 z M14 13 h7 v5 h-7 z M10 8.5 h4 M12 7 L14 8.5 L12 10 M14 15.5 h-4 M12 14 L10 15.5 L12 17",
    render: "both",
  },
  {
    id: "mcc",
    label: "Motor Control Center (MCC)",
    category: "Panels",
    path: "M2 4 h20 v16 H2 z M2 10 h20 M2 14 h20 M8 4 v16 M14 4 v16",
    render: "both",
  },
  {
    id: "disconnect-fused",
    label: "Fused Disconnect Switch",
    category: "Panels",
    path: "M4 4 h16 v16 H4 z M12 4 v6 M12 14 v6 M9 10 h6 v4 H9 z",
    render: "both",
  },
  {
    id: "disconnect-nonfused",
    label: "Non-Fused Disconnect",
    category: "Panels",
    path: "M4 4 h16 v16 H4 z M12 4 v7 M12 13 v7 M12 11 l3-3",
    render: "both",
  },
  {
    id: "meter-base",
    label: "Utility Meter",
    category: "Panels",
    path: "M12 2 a10 10 0 1 0 0 20 A10 10 0 0 0 12 2 M8 16 L8 8 L12 13 L16 8 L16 16",
    render: "both",
  },
  {
    id: "spd",
    label: "Surge Protection Device (SPD)",
    category: "Panels",
    path: "M4 4 h16 v16 H4 z M13 4 l-4 8 h5 l-4 8",
    render: "both",
  },
  {
    id: "ground-rod",
    label: "Grounding Point / Ground Rod",
    category: "Panels",
    path: "M12 2 L12 16 M8 16 h8 M9 18.5 h6 M10.5 21 h3",
    render: "both",
  },
  {
    id: "capacitor-bank",
    label: "Capacitor Bank",
    category: "Panels",
    path: "M12 3 v7 M12 14 v7 M8 10 h8 M8 14 h8",
    render: "stroke",
  },
  {
    id: "ev-charger",
    label: "EV Charger",
    category: "Panels",
    path: "M4 4 h16 v12 H4 z M8 16 v4 M16 16 v4 M8 18 h8 M13 7 l-3 5 h4 l-3 5",
    render: "both",
  },
  {
    id: "solar-panel",
    label: "Photovoltaic (Solar) Panel",
    category: "Panels",
    path: "M2 6 h20 v12 H2 z M2 10 h20 M2 14 h20 M8 6 v12 M14 6 v12",
    render: "both",
  },
];

// ─── Devices & Alarms ─────────────────────────────────────────────────────────
const DEVICES: CountIcon[] = [
  {
    id: "smoke-alarm",
    label: "Smoke Detector",
    category: "Devices",
    path: "M12 2 a10 10 0 1 0 0 20 A10 10 0 0 0 12 2 M9 9 Q12 6 15 9 Q12 12 9 9 M12 14 a1 1 0 1 1 0 .01",
    render: "both",
  },
  {
    id: "co-detector",
    label: "Carbon Monoxide Detector",
    category: "Devices",
    path: "M12 2 a10 10 0 1 0 0 20 A10 10 0 0 0 12 2 M8 10 Q8 8 10 8 Q12 8 12 10 Q12 12 10 12 Q8 12 8 10 M13 8 h3 M13 12 h3 M15 8 v4",
    render: "both",
  },
  {
    id: "heat-detector",
    label: "Heat Detector",
    category: "Devices",
    path: "M12 2 a10 10 0 1 0 0 20 A10 10 0 0 0 12 2 M8 9 v6 M16 9 v6 M8 12 h8",
    render: "both",
  },
  {
    id: "duct-smoke",
    label: "Duct Smoke Detector",
    category: "Devices",
    path: "M12 6 a6 6 0 1 0 0 12 A6 6 0 0 0 12 6 M2 12 h4 M18 12 h4 M9 9 Q12 6 15 9 Q12 12 9 9",
    render: "both",
  },
  {
    id: "pull-station",
    label: "Fire Alarm Pull Station",
    category: "Devices",
    path: "M4 4 h16 v16 H4 z M8 8 h8 M8 8 v8 M8 12 h5",
    render: "both",
  },
  {
    id: "horn-strobe",
    label: "Horn / Strobe Combo",
    category: "Devices",
    path: "M3 6 h18 v12 H3 z M6 9 l3 3 -3 3 M13 7 l-2 5 h3 l-2 5",
    render: "both",
  },
  {
    id: "strobe-only",
    label: "Strobe Only",
    category: "Devices",
    path: "M4 4 h16 v16 H4 z M13 4 l-3 8 h4 l-3 8",
    render: "both",
  },
  {
    id: "horn-only",
    label: "Horn Only",
    category: "Devices",
    path: "M4 4 h16 v16 H4 z M6 9 l4 3 -4 3 M10 12 h4",
    render: "both",
  },
  {
    id: "facp",
    label: "Fire Alarm Control Panel (FACP)",
    category: "Devices",
    path: "M2 4 h20 v16 H2 z M2 10 h20 M5 7 h3 M5 13 h3 M11 13 h3 M17 13 h3",
    render: "both",
  },
  {
    id: "flow-switch",
    label: "Flow Switch (Sprinkler)",
    category: "Devices",
    path: "M12 2 a10 10 0 1 0 0 20 A10 10 0 0 0 12 2 M7 9 Q7 12 10 12 Q13 12 13 15 Q13 18 10 18 M14 9 v6 h3",
    render: "both",
  },
  {
    id: "tamper-switch",
    label: "Tamper Switch",
    category: "Devices",
    path: "M12 2 a10 10 0 1 0 0 20 A10 10 0 0 0 12 2 M8 9 h4 M10 9 v6 M14 9 v6 h3",
    render: "both",
  },
  {
    id: "eol-resistor",
    label: "End of Line Resistor (EOL)",
    category: "Devices",
    path: "M2 12 h4 M18 12 h4 M6 9 h12 v6 H6 z M8 12 l1.5-2 1.5 4 1.5-4 1.5 4 1.5-2",
    render: "stroke",
  },
  {
    id: "doorbell",
    label: "Bell / Buzzer / Chime",
    category: "Devices",
    path: "M12 3 Q7 3 7 9 L7 15 H17 L17 9 Q17 3 12 3 M10 15 Q10 18 12 18 Q14 18 14 15 M9 3 Q12 1 15 3",
    render: "both",
  },
  {
    id: "pushbutton",
    label: "Pushbutton / Doorbell",
    category: "Devices",
    path: "M12 5 a7 7 0 1 0 0 14 A7 7 0 0 0 12 5 M12 10 a2 2 0 1 0 0 4 A2 2 0 0 0 12 10",
    render: "both",
  },
  {
    id: "fan-ceiling",
    label: "Ceiling Fan",
    category: "Devices",
    path: "M12 12 a1.5 1.5 0 1 0 0 .01 M12 10.5 Q14 7 17 8 Q14 10 12 10.5 M13.5 12 Q17 14 16 17 Q14 14 13.5 12 M12 13.5 Q10 17 7 16 Q10 14 12 13.5 M10.5 12 Q7 10 8 7 Q10 10 10.5 12",
    render: "both",
  },
  {
    id: "junction-box",
    label: "Junction Box",
    category: "Devices",
    path: "M4 4 h16 v16 H4 z M8 8 v5 Q8 13 10 13 Q12 13 12 11 M13 8 h3 M14.5 8 v8",
    render: "both",
  },
  {
    id: "junction-box-inground",
    label: "In-Ground Junction Box",
    category: "Devices",
    path: "M4 4 h16 v12 H4 z M4 16 L4 20 M20 16 L20 20 M7 20 h10 M8 8 v5 Q8 13 10 13 Q12 13 12 11 M13 8 h3 M14.5 8 v5",
    render: "both",
  },
  {
    id: "gfci-breaker",
    label: "GFCI Breaker",
    category: "Devices",
    path: "M5 6 h14 v12 H5 z M8 9 h3 M8 12 h5 M8 15 h3 M15 9 v6",
    render: "both",
  },
  {
    id: "nurse-call",
    label: "Nurse Call Button",
    category: "Devices",
    path: "M4 4 h16 v16 H4 z M12 8 v8 M8 12 h8",
    render: "both",
  },
  {
    id: "nurse-call-dome",
    label: "Nurse Call Dome Light",
    category: "Devices",
    path: "M12 5 a7 7 0 1 0 0 14 A7 7 0 0 0 12 5 M19 8 v6 M16 11 h6",
    render: "both",
  },
];

// ─── Motors & Equipment ───────────────────────────────────────────────────────
const MOTORS: CountIcon[] = [
  {
    id: "motor-unit",
    label: "Motor",
    category: "Motors",
    path: "M12 2 a10 10 0 1 0 0 20 A10 10 0 0 0 12 2 M7 16 L7 8 L12 13 L17 8 L17 16",
    render: "both",
  },
  {
    id: "hvac-unit",
    label: "HVAC Unit",
    category: "Motors",
    path: "M3 5 h18 v14 H3 z M12 12 a4 4 0 1 0 0 .01 M12 8 v2 M12 14 v2 M8 12 h2 M14 12 h2",
    render: "both",
  },
  {
    id: "transfer-switch",
    label: "Transfer Switch",
    category: "Motors",
    path: "M3 6 h7 v5 H3 z M14 13 h7 v5 h-7 z M10 8.5 h4 M12 7 L14 8.5 L12 10 M14 15.5 h-4 M12 14 L10 15.5 L12 17",
    render: "both",
  },
];

// ─── Telecom & Low Voltage ────────────────────────────────────────────────────
const TELECOM: CountIcon[] = [
  {
    id: "data-outlet",
    label: "Data / Network Outlet",
    category: "Telecom",
    path: "M4 4 h16 v16 H4 z M8 8 h3 Q14 8 14 12 Q14 16 11 16 H8 z",
    render: "both",
  },
  {
    id: "floor-data-drop",
    label: "Floor Data Drop",
    category: "Telecom",
    path: "M3 3 h18 v18 H3 z M12 7 l7 12 H5 z",
    render: "both",
  },
  {
    id: "phone-outlet",
    label: "Telephone Outlet",
    category: "Telecom",
    path: "M4 4 h16 v16 H4 z M8 8 h8 M12 8 v8",
    render: "both",
  },
  {
    id: "tv-outlet",
    label: "TV / Cable Outlet",
    category: "Telecom",
    path: "M4 6 h16 v12 H4 z M12 6 L9 3 M12 6 L15 3 M12 6 v3",
    render: "both",
  },
  {
    id: "wap",
    label: "Wireless Access Point (WAP)",
    category: "Telecom",
    path: "M12 14 a2 2 0 1 0 0 .01 M8 11 A6 6 0 0 1 16 11 M5 8 A10 10 0 0 1 19 8 M12 16 v5",
    render: "both",
  },
  {
    id: "telecom-backboard",
    label: "Telecom Backboard",
    category: "Telecom",
    path: "M3 4 h18 v16 H3 z M3 4 l4 4 M7 4 l4 4 M11 4 l4 4 M15 4 l4 4 M3 8 l4 4 M3 12 l4 4 M3 16 l4 4",
    render: "both",
  },
  {
    id: "card-reader",
    label: "Card Reader",
    category: "Telecom",
    path: "M5 5 h14 v14 H5 z M7 9 h2 v2 H7 z M11 9 v6 h2 Q16 15 16 12 Q16 9 13 9 h-2 z",
    render: "both",
  },
  {
    id: "biometric",
    label: "Biometric Scanner",
    category: "Telecom",
    path: "M4 4 h16 v16 H4 z M12 8 A4 4 0 0 1 16 12 M12 10 A2 2 0 0 1 14 12 M12 12 v4 M8 12 A4 4 0 0 0 12 16",
    render: "both",
  },
  {
    id: "door-strike",
    label: "Electric Door Strike",
    category: "Telecom",
    path: "M3 8 h5 v8 H3 z M8 12 h13 M14 9 l-3 6 h4 l-3 6",
    render: "both",
  },
  {
    id: "maglock",
    label: "Magnetic Lock (Maglock)",
    category: "Telecom",
    path: "M3 8 h5 v8 H3 z M8 12 h13 M11 9 v6 l2-3 2 3 V9",
    render: "both",
  },
  {
    id: "door-position-switch",
    label: "Door Position Switch",
    category: "Telecom",
    path: "M12 8 a4 4 0 1 0 0 8 A4 4 0 0 0 12 8 M12 10 v4 M10 12 h4",
    render: "both",
  },
  {
    id: "camera",
    label: "Security Camera (Fixed)",
    category: "Telecom",
    path: "M3 8 h12 v8 H3 z M15 10 L21 7 v10 L15 14 M7 12 a3 3 0 1 1 0 .01",
    render: "both",
  },
  {
    id: "camera-ptz",
    label: "Security Camera (PTZ)",
    category: "Telecom",
    path: "M12 8 a4 4 0 1 0 0 8 A4 4 0 0 0 12 8 M16 12 l5-2 v4 z M9 9 A4 4 0 0 0 9 15",
    render: "both",
  },
  {
    id: "speaker",
    label: "Intercom / Speaker",
    category: "Telecom",
    path: "M5 9 h4 L13 5 v14 L9 15 H5 z M15 8 Q18 12 15 16",
    render: "both",
  },
  {
    id: "pa-horn",
    label: "PA Horn",
    category: "Telecom",
    path: "M4 10 h4 l7-5 v14 l-7-5 H4 z M18 9 A5 5 0 0 1 18 15 M4 10 v4",
    render: "both",
  },
  {
    id: "access-control",
    label: "Access Control Panel",
    category: "Telecom",
    path: "M6 4 h12 v16 H6 z M9 9 h6 M9 12 h6 M9 15 h3",
    render: "both",
  },
];

// ─── Civil / Site ─────────────────────────────────────────────────────────────
const CIVIL: CountIcon[] = [
  {
    id: "handhole",
    label: "Handhole / Pull Box",
    category: "Civil",
    path: "M3 3 h18 v18 H3 z M8 7 v10 M16 7 v10 M8 12 h8",
    render: "both",
  },
  {
    id: "manhole",
    label: "Manhole",
    category: "Civil",
    path: "M12 2 a10 10 0 1 0 0 20 A10 10 0 0 0 12 2 M7 16 L7 8 L10 13 L13 8 L13 16 M15 8 h2 M16 8 v8 M15 16 h2",
    render: "both",
  },
  {
    id: "duct-bank",
    label: "Duct Bank",
    category: "Civil",
    path: "M2 7 h20 v10 H2 z M6 12 a2 2 0 1 0 0 .01 M12 12 a2 2 0 1 0 0 .01 M18 12 a2 2 0 1 0 0 .01",
    render: "both",
  },
  {
    id: "pull-box",
    label: "In-Ground Pull Box",
    category: "Civil",
    path: "M3 6 h18 v12 H3 z M7 9 h2 Q11 9 11 11 Q11 13 9 13 H7 M13 9 h2 Q16 9 16 10 Q16 11 14 11 h-1 M13 11 h2 Q16 11 16 13 h-3",
    render: "both",
  },
  {
    id: "traffic-signal",
    label: "Traffic Signal Pole",
    category: "Civil",
    path: "M12 3 v6 M9 9 h6 v10 H9 z M12 11 a1 1 0 1 0 0 .01 M12 14 a1 1 0 1 0 0 .01 M12 17 a1 1 0 1 0 0 .01",
    render: "both",
  },
  {
    id: "street-light-base",
    label: "Street Light Pedestal",
    category: "Civil",
    path: "M7 14 h10 v7 H7 z M12 3 v11 M9 6 h6",
    render: "both",
  },
  {
    id: "utility-pole",
    label: "Utility Pole",
    category: "Civil",
    path: "M12 3 a3 3 0 1 0 0 6 A3 3 0 0 0 12 3 M12 9 v12 M8 6 h8",
    render: "both",
  },
  {
    id: "guy-wire",
    label: "Guy Wire / Anchor",
    category: "Civil",
    path: "M12 4 v12 M12 16 l-6 4 h12 z M6 20 h12",
    render: "both",
  },
  {
    id: "transformer-pad",
    label: "Transformer Pad",
    category: "Civil",
    path: "M3 7 h18 v10 H3 z M3 7 l18 10 M21 7 L3 17",
    render: "both",
  },
  {
    id: "underground-conduit",
    label: "Underground Conduit",
    category: "Civil",
    path: "M2 12 h3 M7 12 h3 M12 12 h3 M17 12 h3 M2 14 h3 M7 14 h3 M12 14 h3 M17 14 h3",
    render: "stroke",
  },
  {
    id: "direct-burial",
    label: "Direct Burial Cable",
    category: "Civil",
    path: "M2 12 h4 M8 12 h4 M14 12 h4 M20 12 h2 M5 9 v6 M11 9 v6",
    render: "stroke",
  },
  {
    id: "trench-route",
    label: "Trench Route",
    category: "Civil",
    path: "M2 12 h20 M5 9 v6 M9 9 v6 M13 9 v6 M17 9 v6",
    render: "stroke",
  },
  {
    id: "conduit-stub",
    label: "Conduit Stub-Up",
    category: "Civil",
    path: "M12 20 L12 8 M12 8 a4 4 0 1 0 0 .01",
    render: "both",
  },
  {
    id: "ground-rod-civil",
    label: "Ground Rod",
    category: "Civil",
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
