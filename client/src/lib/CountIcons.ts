/**
 * BidPhase — Electrical Symbol Library
 * ─────────────────────────────────────────────────────────────────────────────
 * All symbols follow ANSI Y32.9 / NFPA 70 (NEC) standard floor-plan notation.
 * Reference: ANSI Y32.9-1972 (reaffirmed 1989), IEEE 315, and common US
 * electrical construction drawing practice.
 *
 * Coordinate system: 24×24 viewBox.
 * Rendering: stroke/fill applied with the session color at runtime.
 * Multiple sub-paths are joined with "|||" and split before rendering.
 *
 * ANSI standard conventions used here:
 *   Receptacles  – circle (r≈6) with vertical line(s) through center + stem down
 *   Switches     – letter "S" (with subscript modifier) on a short angled line
 *   Lighting     – circle with cross (ceiling), half-circle (wall/exterior),
 *                  rectangle with center dot (fluorescent/troffer)
 *   Panels       – rectangle half-filled with diagonal (power) or solid (lighting)
 *   Junction Box – circle with letter "J" inside
 *   Motor        – circle with letter "M" inside
 *   Generator    – circle with letter "G" inside
 *   Transformer  – two tangent circles
 *   Ground       – horizontal lines descending in size
 */

export interface CountIcon {
  id: string;
  label: string;
  category: string;
  /**
   * SVG path/shape data for a 24×24 viewBox.
   * Multiple independent paths are separated by "|||".
   * Text elements use a special prefix: "TEXT:x,y,size,content"
   */
  path: string;
  render: "fill" | "stroke" | "both";
}

// ─── RECEPTACLES ─────────────────────────────────────────────────────────────
// ANSI: circle (r=6) centered at (12,9), stem down to bottom, vertical line(s)
// through circle center.
// Singleplex = 1 line, Duplex = 2 lines, Triplex = 3 lines, Fourplex = grid

const RECEPTACLES: CountIcon[] = [
  {
    id: "outlet-duplex",
    label: "Duplex Receptacle",
    category: "Receptacles",
    // Circle + two vertical lines + stem
    path: "M12 3 a6 6 0 1 0 0 12 a6 6 0 0 0 0-12 M10 3 v12 M14 3 v12 M12 15 v6",
    render: "stroke",
  },
  {
    id: "outlet-singleplex",
    label: "Singleplex Receptacle",
    category: "Receptacles",
    path: "M12 3 a6 6 0 1 0 0 12 a6 6 0 0 0 0-12 M12 3 v12 M12 15 v6",
    render: "stroke",
  },
  {
    id: "outlet-triplex",
    label: "Triplex Receptacle",
    category: "Receptacles",
    path: "M12 3 a6 6 0 1 0 0 12 a6 6 0 0 0 0-12 M9 3.8 v10.4 M12 3 v12 M15 3.8 v10.4 M12 15 v6",
    render: "stroke",
  },
  {
    id: "outlet-quad",
    label: "Fourplex (Quad) Receptacle",
    category: "Receptacles",
    // Grid: two vertical + one horizontal through circle
    path: "M12 3 a6 6 0 1 0 0 12 a6 6 0 0 0 0-12 M10 3 v12 M14 3 v12 M6 9 h12 M12 15 v6",
    render: "stroke",
  },
  {
    id: "outlet-gfci",
    label: "GFCI Receptacle",
    category: "Receptacles",
    // Duplex circle + "GFCI" text label below stem
    path: "M12 3 a6 6 0 1 0 0 12 a6 6 0 0 0 0-12 M10 3 v12 M14 3 v12 M12 15 v4|||TEXT:12,22,3.5,GFCI",
    render: "stroke",
  },
  {
    id: "outlet-afci",
    label: "AFCI Receptacle",
    category: "Receptacles",
    path: "M12 3 a6 6 0 1 0 0 12 a6 6 0 0 0 0-12 M10 3 v12 M14 3 v12 M12 15 v4|||TEXT:12,22,3.5,AFCI",
    render: "stroke",
  },
  {
    id: "outlet-half-hot",
    label: "Half-Hot / Switched Receptacle",
    category: "Receptacles",
    // Duplex with right half filled
    path: "M12 3 a6 6 0 1 0 0 12 a6 6 0 0 0 0-12 M10 3 v12 M14 3 v12 M12 3 a6 6 0 0 1 0 12 z M12 15 v6",
    render: "both",
  },
  {
    id: "outlet-20a",
    label: "20A Receptacle",
    category: "Receptacles",
    // Duplex + T-slot notch on left slot (NFPA 20A symbol)
    path: "M12 3 a6 6 0 1 0 0 12 a6 6 0 0 0 0-12 M10 3 v12 M14 3 v12 M8 9 h2 M12 15 v6",
    render: "stroke",
  },
  {
    id: "outlet-30a",
    label: "30A Receptacle",
    category: "Receptacles",
    path: "M12 3 a6 6 0 1 0 0 12 a6 6 0 0 0 0-12 M10 3 v12 M14 3 v12 M12 15 v4|||TEXT:12,22,3.5,30A",
    render: "stroke",
  },
  {
    id: "outlet-50a",
    label: "50A Receptacle",
    category: "Receptacles",
    path: "M12 3 a6 6 0 1 0 0 12 a6 6 0 0 0 0-12 M10 3 v12 M14 3 v12 M12 15 v4|||TEXT:12,22,3.5,50A",
    render: "stroke",
  },
  {
    id: "outlet-dryer",
    label: "Dryer Outlet (240V/30A)",
    category: "Receptacles",
    // Range/dryer: circle with 3 lines + R subscript
    path: "M12 3 a6 6 0 1 0 0 12 a6 6 0 0 0 0-12 M9 3.8 v10.4 M12 3 v12 M15 3.8 v10.4 M12 15 v4|||TEXT:14,22,3.5,D",
    render: "stroke",
  },
  {
    id: "outlet-range",
    label: "Range Outlet (240V/50A)",
    category: "Receptacles",
    path: "M12 3 a6 6 0 1 0 0 12 a6 6 0 0 0 0-12 M9 3.8 v10.4 M12 3 v12 M15 3.8 v10.4 M12 15 v4|||TEXT:14,22,3.5,R",
    render: "stroke",
  },
  {
    id: "outlet-floor",
    label: "Floor Receptacle",
    category: "Receptacles",
    // Small circle with dot inside (floor-mounted)
    path: "M12 7 a5 5 0 1 0 0 10 a5 5 0 0 0 0-10 M12 10 a2 2 0 1 0 0 4 a2 2 0 0 0 0-4",
    render: "stroke",
  },
  {
    id: "outlet-weatherproof",
    label: "Weatherproof Receptacle",
    category: "Receptacles",
    path: "M12 3 a6 6 0 1 0 0 12 a6 6 0 0 0 0-12 M10 3 v12 M14 3 v12 M12 15 v4|||TEXT:14,22,3.5,WP",
    render: "stroke",
  },
  {
    id: "outlet-isolated-ground",
    label: "Isolated Ground Receptacle",
    category: "Receptacles",
    // Duplex inside a triangle (ANSI IG symbol)
    path: "M12 1 L22 19 H2 z M10 8 v8 M14 8 v8 M12 19 v3",
    render: "stroke",
  },
  {
    id: "outlet-usb",
    label: "USB Receptacle",
    category: "Receptacles",
    path: "M12 3 a6 6 0 1 0 0 12 a6 6 0 0 0 0-12 M10 3 v12 M14 3 v12 M12 15 v4|||TEXT:12,22,3,USB",
    render: "stroke",
  },
  {
    id: "outlet-clock",
    label: "Clock Receptacle",
    category: "Receptacles",
    path: "M12 3 a6 6 0 1 0 0 12 a6 6 0 0 0 0-12 M10 3 v12 M14 3 v12 M12 15 v4|||TEXT:14,22,3.5,C",
    render: "stroke",
  },
  {
    id: "outlet-twistlock",
    label: "Twist-Lock Receptacle",
    category: "Receptacles",
    // Circle with arc inside indicating locking
    path: "M12 3 a6 6 0 1 0 0 12 a6 6 0 0 0 0-12 M10 3 v12 M14 3 v12 M9 7 a5 3 0 0 1 6 0 M12 15 v4|||TEXT:14,22,3.5,L",
    render: "stroke",
  },
];

// ─── SWITCHES ────────────────────────────────────────────────────────────────
// ANSI: letter "S" with subscript on a short angled line from wall.
// Rendered as the letter S + subscript text + a short diagonal line.

const SWITCHES: CountIcon[] = [
  {
    id: "switch-single",
    label: "Single-Pole Switch",
    category: "Switches",
    // S on angled line
    path: "M6 20 L14 8|||TEXT:14,8,9,S",
    render: "stroke",
  },
  {
    id: "switch-double",
    label: "Double-Pole Switch",
    category: "Switches",
    path: "M6 20 L14 8|||TEXT:14,8,9,S|||TEXT:19,14,5,2",
    render: "stroke",
  },
  {
    id: "switch-3way",
    label: "3-Way Switch",
    category: "Switches",
    path: "M6 20 L14 8|||TEXT:14,8,9,S|||TEXT:19,14,5,3",
    render: "stroke",
  },
  {
    id: "switch-4way",
    label: "4-Way Switch",
    category: "Switches",
    path: "M6 20 L14 8|||TEXT:14,8,9,S|||TEXT:19,14,5,4",
    render: "stroke",
  },
  {
    id: "switch-dimmer",
    label: "Dimmer Switch",
    category: "Switches",
    // D in a square box (ANSI dimmer symbol)
    path: "M5 6 h14 v12 H5 z|||TEXT:12,14,8,D",
    render: "both",
  },
  {
    id: "switch-weatherproof",
    label: "Weatherproof Switch",
    category: "Switches",
    path: "M6 20 L14 8|||TEXT:14,8,9,S|||TEXT:16,18,4,WP",
    render: "stroke",
  },
  {
    id: "switch-low-voltage",
    label: "Low Voltage Switch",
    category: "Switches",
    path: "M6 20 L14 8|||TEXT:14,8,9,S|||TEXT:16,18,4,LV",
    render: "stroke",
  },
  {
    id: "switch-motion",
    label: "Motion / Occupancy Sensor",
    category: "Switches",
    // Infrared motion: inverted triangle with radiating lines
    path: "M12 4 L20 18 H4 z M12 4 L12 1 M8 5.5 L6 3 M16 5.5 L18 3",
    render: "stroke",
  },
  {
    id: "switch-timer",
    label: "Timer Switch",
    category: "Switches",
    path: "M6 20 L14 8|||TEXT:14,8,9,S|||TEXT:16,18,4,T",
    render: "stroke",
  },
  {
    id: "switch-keyed",
    label: "Key-Operated Switch",
    category: "Switches",
    path: "M6 20 L14 8|||TEXT:14,8,9,S|||TEXT:16,18,4,K",
    render: "stroke",
  },
  {
    id: "thermostat",
    label: "Thermostat",
    category: "Switches",
    // Circle with T inside
    path: "M12 3 a9 9 0 1 0 0 18 a9 9 0 0 0 0-18|||TEXT:12,15,9,T",
    render: "stroke",
  },
  {
    id: "humidistat",
    label: "Humidistat",
    category: "Switches",
    path: "M12 3 a9 9 0 1 0 0 18 a9 9 0 0 0 0-18|||TEXT:12,15,9,H",
    render: "stroke",
  },
];

// ─── LIGHTING ────────────────────────────────────────────────────────────────
// ANSI: circle with cross = ceiling outlet; half-circle = wall/exterior;
// rectangle with center dot = fluorescent; filled triangle = emergency

const LIGHTING: CountIcon[] = [
  {
    id: "fixture-ceiling",
    label: "Ceiling Light Outlet",
    category: "Lighting",
    // Circle with cross (standard ANSI ceiling outlet)
    path: "M12 2 a10 10 0 1 0 0 20 a10 10 0 0 0 0-20 M12 2 v20 M2 12 h20",
    render: "stroke",
  },
  {
    id: "fixture-recessed",
    label: "Recessed Downlight",
    category: "Lighting",
    // Circle with dot in center
    path: "M12 2 a10 10 0 1 0 0 20 a10 10 0 0 0 0-20 M12 10 a2 2 0 1 0 0 4 a2 2 0 0 0 0-4",
    render: "stroke",
  },
  {
    id: "fixture-troffer",
    label: "Fluorescent / Troffer",
    category: "Lighting",
    // Rectangle with circle dot (ANSI fluorescent symbol)
    path: "M3 9 h18 v6 H3 z M12 12 a1.5 1.5 0 1 0 0 3 a1.5 1.5 0 0 0 0-3",
    render: "stroke",
  },
  {
    id: "fixture-wall",
    label: "Wall Light",
    category: "Lighting",
    // Half circle on a line (wall-mounted)
    path: "M12 12 a8 8 0 0 1 8 0 H4 a8 8 0 0 1 8 0 M4 12 h16",
    render: "stroke",
  },
  {
    id: "fixture-exterior",
    label: "Exterior / Outdoor Light",
    category: "Lighting",
    // Filled half-circle (ANSI exterior light)
    path: "M4 12 h16 M12 12 a8 8 0 0 1 8 0 H4 z",
    render: "both",
  },
  {
    id: "fixture-emergency",
    label: "Emergency Light",
    category: "Lighting",
    // Filled downward triangle (ANSI emergency light)
    path: "M12 20 L3 5 h18 z",
    render: "fill",
  },
  {
    id: "fixture-exit",
    label: "Exit Sign",
    category: "Lighting",
    // Rectangle with X inside
    path: "M3 7 h18 v10 H3 z M3 7 L21 17 M21 7 L3 17",
    render: "stroke",
  },
  {
    id: "fixture-exit-arrow",
    label: "Exit Sign with Arrow",
    category: "Lighting",
    path: "M3 7 h18 v10 H3 z M3 7 L21 17 M21 7 L3 17 M21 12 h3 M22 10 l2 2 -2 2",
    render: "stroke",
  },
  {
    id: "fixture-ceiling-fan",
    label: "Ceiling Fan",
    category: "Lighting",
    // Circle with cross + arc blades
    path: "M12 2 a10 10 0 1 0 0 20 a10 10 0 0 0 0-20 M12 2 v20 M2 12 h20 M7 7 Q12 4 17 7 M17 17 Q12 20 7 17",
    render: "stroke",
  },
  {
    id: "fixture-exhaust-fan",
    label: "Exhaust Fan",
    category: "Lighting",
    // Circle with F inside
    path: "M12 2 a10 10 0 1 0 0 20 a10 10 0 0 0 0-20|||TEXT:12,15,9,F",
    render: "stroke",
  },
  {
    id: "fixture-pendant",
    label: "Pendant Light",
    category: "Lighting",
    // Circle with cross + stem up
    path: "M12 8 a6 6 0 1 0 0 12 a6 6 0 0 0 0-12 M12 8 v12 M6 14 h12 M12 2 v6",
    render: "stroke",
  },
  {
    id: "fixture-track",
    label: "Track Lighting",
    category: "Lighting",
    // Line with two circles on it
    path: "M2 12 h20 M7 12 a3 3 0 1 0 0 .01 M17 12 a3 3 0 1 0 0 .01",
    render: "stroke",
  },
  {
    id: "light-pole",
    label: "Post / Pole Light",
    category: "Lighting",
    // Vertical line + circle at top
    path: "M12 22 v-14 M12 8 a4 4 0 1 0 0 .01 M8 12 h8",
    render: "stroke",
  },
  {
    id: "fixture-floodlight",
    label: "Exterior Floodlight",
    category: "Lighting",
    // Filled triangle pointing right (flood/spot)
    path: "M6 6 L18 12 L6 18 z",
    render: "fill",
  },
  {
    id: "fixture-sconce",
    label: "Wall Sconce",
    category: "Lighting",
    path: "M2 12 h10 M12 12 a6 6 0 0 1 0 -12 v12 a6 6 0 0 1 0 12",
    render: "stroke",
  },
];

// ─── PANELS & DISTRIBUTION ───────────────────────────────────────────────────
// ANSI: Power panel = rectangle half-filled with diagonal; Lighting panel = solid black rect

const PANELS: CountIcon[] = [
  {
    id: "panel-power",
    label: "Power Panelboard",
    category: "Panels",
    // Rectangle with diagonal fill in right half (ANSI power panel)
    path: "M3 5 h18 v14 H3 z M3 5 L21 19",
    render: "both",
  },
  {
    id: "panel-lighting",
    label: "Lighting Panelboard",
    category: "Panels",
    // Solid black rectangle (ANSI lighting panel)
    path: "M3 5 h18 v14 H3 z",
    render: "fill",
  },
  {
    id: "transformer",
    label: "Transformer",
    category: "Panels",
    // Two tangent circles (ANSI transformer)
    path: "M7 12 a5 5 0 1 0 0 .01 M17 12 a5 5 0 1 0 0 .01",
    render: "stroke",
  },
  {
    id: "motor",
    label: "Motor",
    category: "Panels",
    // Circle with M inside
    path: "M12 2 a10 10 0 1 0 0 20 a10 10 0 0 0 0-20|||TEXT:12,15,9,M",
    render: "stroke",
  },
  {
    id: "generator",
    label: "Generator",
    category: "Panels",
    // Circle with G inside
    path: "M12 2 a10 10 0 1 0 0 20 a10 10 0 0 0 0-20|||TEXT:12,15,9,G",
    render: "stroke",
  },
  {
    id: "meter-base",
    label: "Utility Meter (kWh)",
    category: "Panels",
    // Half-circle with M (kilowatt-hour meter ANSI symbol)
    path: "M3 16 h18 M3 16 a9 9 0 0 1 18 0|||TEXT:12,15,7,M",
    render: "both",
  },
  {
    id: "disconnect-fused",
    label: "Fused Disconnect",
    category: "Panels",
    // Rectangle with fuse symbol inside
    path: "M4 4 h16 v16 H4 z M12 4 v4 M12 16 v4 M9 8 h6 v8 H9 z M10 12 h4",
    render: "stroke",
  },
  {
    id: "disconnect-nonfused",
    label: "Non-Fused Disconnect",
    category: "Panels",
    path: "M4 4 h16 v16 H4 z M12 4 v7 M12 13 v7 M12 11 l3 -3",
    render: "stroke",
  },
  {
    id: "vfd",
    label: "Variable Frequency Drive (VFD)",
    category: "Panels",
    path: "M3 5 h18 v14 H3 z|||TEXT:12,14,5,VFD",
    render: "both",
  },
  {
    id: "ats",
    label: "Automatic Transfer Switch (ATS)",
    category: "Panels",
    path: "M3 5 h18 v14 H3 z|||TEXT:12,14,5,ATS",
    render: "both",
  },
  {
    id: "mcc",
    label: "Motor Control Center (MCC)",
    category: "Panels",
    path: "M3 5 h18 v14 H3 z|||TEXT:12,14,5,MCC",
    render: "both",
  },
  {
    id: "spd",
    label: "Surge Protection Device (SPD)",
    category: "Panels",
    path: "M3 5 h18 v14 H3 z|||TEXT:12,14,5,SPD",
    render: "both",
  },
  {
    id: "ev-charger",
    label: "EV Charger",
    category: "Panels",
    path: "M3 5 h18 v14 H3 z|||TEXT:12,14,5,EV",
    render: "both",
  },
  {
    id: "solar-panel",
    label: "Solar / PV Panel",
    category: "Panels",
    path: "M3 5 h18 v14 H3 z|||TEXT:12,14,5,PV",
    render: "both",
  },
  {
    id: "ground-rod",
    label: "Grounding / Ground Rod",
    category: "Panels",
    // ANSI ground: vertical line + three horizontal lines descending
    path: "M12 2 v12 M7 14 h10 M8.5 17 h7 M10 20 h4",
    render: "stroke",
  },
  {
    id: "capacitor-bank",
    label: "Capacitor Bank",
    category: "Panels",
    // Two parallel plates (ANSI capacitor)
    path: "M12 3 v7 M12 14 v7 M6 10 h12 M6 14 h12",
    render: "stroke",
  },
];

// ─── DEVICES & ALARMS ────────────────────────────────────────────────────────

const DEVICES: CountIcon[] = [
  {
    id: "smoke-alarm",
    label: "Smoke Detector",
    category: "Devices",
    // Circle with SD inside (ANSI smoke detector)
    path: "M12 2 a10 10 0 1 0 0 20 a10 10 0 0 0 0-20|||TEXT:12,15,6,SD",
    render: "stroke",
  },
  {
    id: "co-detector",
    label: "CO Detector",
    category: "Devices",
    path: "M12 2 a10 10 0 1 0 0 20 a10 10 0 0 0 0-20|||TEXT:12,15,6,CO",
    render: "stroke",
  },
  {
    id: "heat-detector",
    label: "Heat Detector",
    category: "Devices",
    path: "M12 2 a10 10 0 1 0 0 20 a10 10 0 0 0 0-20|||TEXT:12,15,6,HD",
    render: "stroke",
  },
  {
    id: "duct-smoke",
    label: "Duct Smoke Detector",
    category: "Devices",
    // Circle with DS + horizontal lines through it (duct)
    path: "M12 2 a10 10 0 1 0 0 20 a10 10 0 0 0 0-20 M2 12 h20|||TEXT:12,15,5,DS",
    render: "stroke",
  },
  {
    id: "pull-station",
    label: "Fire Alarm Pull Station",
    category: "Devices",
    // Rectangle with P inside (manual pull)
    path: "M4 4 h16 v16 H4 z|||TEXT:12,15,9,P",
    render: "both",
  },
  {
    id: "horn-strobe",
    label: "Horn / Strobe Combo",
    category: "Devices",
    // Rectangle with HS inside
    path: "M3 6 h18 v12 H3 z|||TEXT:12,14,5,HS",
    render: "both",
  },
  {
    id: "strobe-only",
    label: "Strobe Only",
    category: "Devices",
    path: "M3 6 h18 v12 H3 z|||TEXT:12,14,6,STR",
    render: "both",
  },
  {
    id: "horn-only",
    label: "Horn Only",
    category: "Devices",
    // Speaker/horn shape (ANSI)
    path: "M4 9 h5 L14 4 v16 L9 15 H4 z M14 8 Q18 12 14 16",
    render: "stroke",
  },
  {
    id: "facp",
    label: "Fire Alarm Control Panel (FACP)",
    category: "Devices",
    path: "M2 4 h20 v16 H2 z|||TEXT:12,14,4,FACP",
    render: "both",
  },
  {
    id: "flow-switch",
    label: "Flow Switch (Sprinkler)",
    category: "Devices",
    path: "M12 2 a10 10 0 1 0 0 20 a10 10 0 0 0 0-20|||TEXT:12,15,6,FS",
    render: "stroke",
  },
  {
    id: "tamper-switch",
    label: "Tamper Switch",
    category: "Devices",
    path: "M12 2 a10 10 0 1 0 0 20 a10 10 0 0 0 0-20|||TEXT:12,15,6,TS",
    render: "stroke",
  },
  {
    id: "junction-box",
    label: "Junction Box",
    category: "Devices",
    // Circle with J inside (ANSI junction box)
    path: "M12 2 a10 10 0 1 0 0 20 a10 10 0 0 0 0-20|||TEXT:12,15,9,J",
    render: "stroke",
  },
  {
    id: "junction-box-inground",
    label: "In-Ground Junction Box",
    category: "Devices",
    // Square with JB inside
    path: "M3 3 h18 v18 H3 z|||TEXT:12,14,6,JB",
    render: "both",
  },
  {
    id: "gfci-breaker",
    label: "GFCI Breaker",
    category: "Devices",
    path: "M4 4 h16 v16 H4 z|||TEXT:12,14,4,GFCI",
    render: "both",
  },
  {
    id: "doorbell",
    label: "Bell / Buzzer / Chime",
    category: "Devices",
    // Bell shape (ANSI)
    path: "M12 3 Q6 3 6 10 L6 16 H18 L18 10 Q18 3 12 3 M9 16 Q9 20 12 20 Q15 20 15 16 M8 3 Q12 1 16 3",
    render: "stroke",
  },
  {
    id: "pushbutton",
    label: "Pushbutton",
    category: "Devices",
    // Circle with dot (pushbutton ANSI)
    path: "M12 4 a8 8 0 1 0 0 16 a8 8 0 0 0 0-16 M12 9 a3 3 0 1 0 0 6 a3 3 0 0 0 0-6",
    render: "stroke",
  },
  {
    id: "nurse-call",
    label: "Nurse Call Button",
    category: "Devices",
    path: "M3 3 h18 v18 H3 z|||TEXT:12,14,5,NC",
    render: "both",
  },
  {
    id: "nurse-call-dome",
    label: "Nurse Call Dome Light",
    category: "Devices",
    path: "M12 2 a10 10 0 1 0 0 20 a10 10 0 0 0 0-20|||TEXT:12,15,5,NCD",
    render: "stroke",
  },
  {
    id: "eol-resistor",
    label: "End of Line Resistor (EOL)",
    category: "Devices",
    // Resistor zigzag (ANSI)
    path: "M2 12 h3 M19 12 h3 M5 12 l1.5-3 3 6 3-6 3 6 1.5-3",
    render: "stroke",
  },
];

// ─── MOTORS & EQUIPMENT ───────────────────────────────────────────────────────

const MOTORS: CountIcon[] = [
  {
    id: "motor-unit",
    label: "Motor",
    category: "Motors",
    path: "M12 2 a10 10 0 1 0 0 20 a10 10 0 0 0 0-20|||TEXT:12,15,9,M",
    render: "stroke",
  },
  {
    id: "hvac-unit",
    label: "HVAC Unit",
    category: "Motors",
    path: "M3 5 h18 v14 H3 z|||TEXT:12,14,5,HVAC",
    render: "both",
  },
  {
    id: "transfer-switch",
    label: "Transfer Switch",
    category: "Motors",
    path: "M3 5 h18 v14 H3 z|||TEXT:12,14,5,XFR",
    render: "both",
  },
];

// ─── TELECOM & LOW VOLTAGE ───────────────────────────────────────────────────

const TELECOM: CountIcon[] = [
  {
    id: "data-outlet",
    label: "Data / Network Outlet",
    category: "Telecom",
    // T-shape (ANSI telephone/data outlet)
    path: "M12 4 v16 M5 4 h14",
    render: "stroke",
  },
  {
    id: "phone-outlet",
    label: "Telephone Outlet",
    category: "Telecom",
    // T with circle
    path: "M12 6 v14 M5 6 h14 M12 6 a4 4 0 1 0 0 .01",
    render: "stroke",
  },
  {
    id: "tv-outlet",
    label: "TV / Cable Outlet",
    category: "Telecom",
    // Rectangle with TV inside
    path: "M3 6 h18 v12 H3 z|||TEXT:12,14,7,TV",
    render: "both",
  },
  {
    id: "wap",
    label: "Wireless Access Point (WAP)",
    category: "Telecom",
    // Radiating arcs (WiFi symbol)
    path: "M12 16 a2 2 0 1 0 0 .01 M8 13 a6 6 0 0 1 8 0 M5 10 a10 10 0 0 1 14 0 M12 18 v4",
    render: "stroke",
  },
  {
    id: "floor-data-drop",
    label: "Floor Data Drop",
    category: "Telecom",
    // Square with arrow up
    path: "M3 3 h18 v18 H3 z M12 18 v-8 M8 14 l4-4 4 4",
    render: "stroke",
  },
  {
    id: "card-reader",
    label: "Card Reader",
    category: "Telecom",
    path: "M4 4 h16 v16 H4 z|||TEXT:12,14,4,CR",
    render: "both",
  },
  {
    id: "biometric",
    label: "Biometric Scanner",
    category: "Telecom",
    path: "M4 4 h16 v16 H4 z|||TEXT:12,14,4,BIO",
    render: "both",
  },
  {
    id: "door-strike",
    label: "Electric Door Strike",
    category: "Telecom",
    path: "M4 4 h16 v16 H4 z|||TEXT:12,14,4,DS",
    render: "both",
  },
  {
    id: "maglock",
    label: "Magnetic Lock (Maglock)",
    category: "Telecom",
    path: "M4 4 h16 v16 H4 z|||TEXT:12,14,4,ML",
    render: "both",
  },
  {
    id: "door-position-switch",
    label: "Door Position Switch",
    category: "Telecom",
    path: "M12 2 a10 10 0 1 0 0 20 a10 10 0 0 0 0-20|||TEXT:12,15,5,DPS",
    render: "stroke",
  },
  {
    id: "camera",
    label: "Security Camera (Fixed)",
    category: "Telecom",
    // Camera shape: rectangle + triangle lens
    path: "M3 8 h12 v8 H3 z M15 10 L21 7 v10 L15 14",
    render: "stroke",
  },
  {
    id: "camera-ptz",
    label: "Security Camera (PTZ)",
    category: "Telecom",
    path: "M12 6 a6 6 0 1 0 0 12 a6 6 0 0 0 0-12 M16 10 L21 7 v10 L16 14|||TEXT:12,14,4,PTZ",
    render: "stroke",
  },
  {
    id: "speaker",
    label: "Intercom / Speaker",
    category: "Telecom",
    // Speaker shape (ANSI)
    path: "M4 9 h5 L14 4 v16 L9 15 H4 z M14 8 Q18 12 14 16",
    render: "stroke",
  },
  {
    id: "pa-horn",
    label: "PA Horn",
    category: "Telecom",
    path: "M3 10 h5 l8-6 v16 l-8-6 H3 z M19 9 A5 5 0 0 1 19 15",
    render: "stroke",
  },
  {
    id: "access-control",
    label: "Access Control Panel",
    category: "Telecom",
    path: "M4 4 h16 v16 H4 z|||TEXT:12,14,4,ACP",
    render: "both",
  },
  {
    id: "telecom-backboard",
    label: "Telecom Backboard",
    category: "Telecom",
    path: "M3 4 h18 v16 H3 z|||TEXT:12,14,4,TB",
    render: "both",
  },
];

// ─── CIVIL / SITE ─────────────────────────────────────────────────────────────

const CIVIL: CountIcon[] = [
  {
    id: "handhole",
    label: "Handhole / Pull Box",
    category: "Civil",
    // Square with HH inside
    path: "M3 3 h18 v18 H3 z|||TEXT:12,14,6,HH",
    render: "both",
  },
  {
    id: "manhole",
    label: "Manhole",
    category: "Civil",
    // Circle with MH inside
    path: "M12 2 a10 10 0 1 0 0 20 a10 10 0 0 0 0-20|||TEXT:12,15,6,MH",
    render: "stroke",
  },
  {
    id: "duct-bank",
    label: "Duct Bank",
    category: "Civil",
    // Rectangle with three circles inside
    path: "M2 7 h20 v10 H2 z M6 12 a2 2 0 1 0 0 .01 M12 12 a2 2 0 1 0 0 .01 M18 12 a2 2 0 1 0 0 .01",
    render: "stroke",
  },
  {
    id: "pull-box",
    label: "In-Ground Pull Box",
    category: "Civil",
    path: "M3 6 h18 v12 H3 z|||TEXT:12,14,5,PB",
    render: "both",
  },
  {
    id: "traffic-signal",
    label: "Traffic Signal Pole",
    category: "Civil",
    // Pole + signal head rectangle
    path: "M12 3 v6 M9 9 h6 v10 H9 z M12 11 a1 1 0 1 0 0 .01 M12 14 a1 1 0 1 0 0 .01 M12 17 a1 1 0 1 0 0 .01",
    render: "stroke",
  },
  {
    id: "street-light-base",
    label: "Street Light Pedestal",
    category: "Civil",
    path: "M7 14 h10 v7 H7 z M12 3 v11 M9 6 h6",
    render: "stroke",
  },
  {
    id: "utility-pole",
    label: "Utility Pole",
    category: "Civil",
    // Circle (top) + vertical line + crossarm
    path: "M12 2 a3 3 0 1 0 0 6 a3 3 0 0 0 0-6 M12 8 v14 M7 11 h10",
    render: "stroke",
  },
  {
    id: "transformer-pad",
    label: "Transformer Pad",
    category: "Civil",
    path: "M3 7 h18 v10 H3 z|||TEXT:12,14,5,XFMR",
    render: "both",
  },
  {
    id: "underground-conduit",
    label: "Underground Conduit",
    category: "Civil",
    // Dashed line
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
    path: "M12 20 v-12 M12 8 a4 4 0 1 0 0 .01",
    render: "stroke",
  },
  {
    id: "ground-rod-civil",
    label: "Ground Rod",
    category: "Civil",
    path: "M12 2 v14 M7 16 h10 M8.5 19 h7 M10 22 h4",
    render: "stroke",
  },
  {
    id: "guy-wire",
    label: "Guy Wire / Anchor",
    category: "Civil",
    path: "M12 4 v12 M12 16 l-6 4 h12 z",
    render: "stroke",
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
