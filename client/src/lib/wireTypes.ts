/**
 * HelixBid — Wire Type Library
 *
 * 50 common wire and cable types used in residential, commercial, and
 * industrial electrical work. Types that are available in both stranded
 * and solid have `hasStrandedChoice: true`. The `defaultStranded` field
 * indicates which form is most commonly used in practice.
 *
 * All descriptions are original authorship — not copied from any
 * manufacturer catalog, NEC handbook, or other copyrighted publication.
 */

export interface WireType {
  id: string;
  label: string;
  category: WireCategory;
  /** True when this wire is available in both solid and stranded forms */
  hasStrandedChoice: boolean;
  /** Default form when hasStrandedChoice is true */
  defaultStranded?: boolean;
  description: string;
}

export type WireCategory =
  | "NM Cable (Romex)"
  | "MC Cable"
  | "Service Entrance"
  | "THHN / THWN"
  | "XHHW"
  | "USE / URD"
  | "Bare / Ground"
  | "Low Voltage"
  | "Specialty";

export const WIRE_CATEGORIES: WireCategory[] = [
  "NM Cable (Romex)",
  "MC Cable",
  "Service Entrance",
  "THHN / THWN",
  "XHHW",
  "USE / URD",
  "Bare / Ground",
  "Low Voltage",
  "Specialty",
];

export const WIRE_TYPES: WireType[] = [
  // ── NM Cable (Romex) ──────────────────────────────────────────────────────
  {
    id: "nm-14-2",
    label: "14/2 NM-B (Romex)",
    category: "NM Cable (Romex)",
    hasStrandedChoice: false,
    description: "14 AWG, 2-conductor + ground, 15A circuits",
  },
  {
    id: "nm-12-2",
    label: "12/2 NM-B (Romex)",
    category: "NM Cable (Romex)",
    hasStrandedChoice: false,
    description: "12 AWG, 2-conductor + ground, 20A circuits",
  },
  {
    id: "nm-10-2",
    label: "10/2 NM-B (Romex)",
    category: "NM Cable (Romex)",
    hasStrandedChoice: false,
    description: "10 AWG, 2-conductor + ground, 30A circuits",
  },
  {
    id: "nm-14-3",
    label: "14/3 NM-B (Romex)",
    category: "NM Cable (Romex)",
    hasStrandedChoice: false,
    description: "14 AWG, 3-conductor + ground, 3-way switches / multi-wire",
  },
  {
    id: "nm-12-3",
    label: "12/3 NM-B (Romex)",
    category: "NM Cable (Romex)",
    hasStrandedChoice: false,
    description:
      "12 AWG, 3-conductor + ground, 20A multi-wire / split receptacles",
  },
  {
    id: "nm-10-3",
    label: "10/3 NM-B (Romex)",
    category: "NM Cable (Romex)",
    hasStrandedChoice: false,
    description: "10 AWG, 3-conductor + ground, dryers / ranges",
  },
  {
    id: "nm-8-3",
    label: "8/3 NM-B (Romex)",
    category: "NM Cable (Romex)",
    hasStrandedChoice: false,
    description: "8 AWG, 3-conductor + ground, large appliances",
  },
  {
    id: "nm-6-3",
    label: "6/3 NM-B (Romex)",
    category: "NM Cable (Romex)",
    hasStrandedChoice: false,
    description: "6 AWG, 3-conductor + ground, 60A sub-panels / ranges",
  },

  // ── Service Entrance ──────────────────────────────────────────────────────
  {
    id: "ser-6-3",
    label: "6/3 SER",
    category: "Service Entrance",
    hasStrandedChoice: false,
    description: "Service entrance round cable, 6 AWG, 3-conductor + neutral",
  },
  {
    id: "ser-4-3",
    label: "4/3 SER",
    category: "Service Entrance",
    hasStrandedChoice: false,
    description: "Service entrance round cable, 4 AWG, 3-conductor + neutral",
  },
  {
    id: "ser-2-3",
    label: "2/3 SER",
    category: "Service Entrance",
    hasStrandedChoice: false,
    description: "Service entrance round cable, 2 AWG, 3-conductor + neutral",
  },
  {
    id: "seu-2-0",
    label: "2/0 SEU",
    category: "Service Entrance",
    hasStrandedChoice: false,
    description:
      "Service entrance unarmored, 2/0 AWG, 2-conductor + neutral braid",
  },
  {
    id: "seu-3-0",
    label: "3/0 SEU",
    category: "Service Entrance",
    hasStrandedChoice: false,
    description:
      "Service entrance unarmored, 3/0 AWG, 2-conductor + neutral braid",
  },
  {
    id: "seu-4-0",
    label: "4/0 SEU",
    category: "Service Entrance",
    hasStrandedChoice: false,
    description:
      "Service entrance unarmored, 4/0 AWG, 2-conductor + neutral braid, 200A service",
  },

  // ── THHN / THWN ───────────────────────────────────────────────────────────
  {
    id: "thhn-14",
    label: "#14 THHN/THWN-2",
    category: "THHN / THWN",
    hasStrandedChoice: true,
    defaultStranded: false,
    description: "14 AWG, 15A, conduit wire",
  },
  {
    id: "thhn-12",
    label: "#12 THHN/THWN-2",
    category: "THHN / THWN",
    hasStrandedChoice: true,
    defaultStranded: false,
    description: "12 AWG, 20A, conduit wire",
  },
  {
    id: "thhn-10",
    label: "#10 THHN/THWN-2",
    category: "THHN / THWN",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "10 AWG, 30A, conduit wire",
  },
  {
    id: "thhn-8",
    label: "#8 THHN/THWN-2",
    category: "THHN / THWN",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "8 AWG, 40A, conduit wire",
  },
  {
    id: "thhn-6",
    label: "#6 THHN/THWN-2",
    category: "THHN / THWN",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "6 AWG, 55A, conduit wire",
  },
  {
    id: "thhn-4",
    label: "#4 THHN/THWN-2",
    category: "THHN / THWN",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "4 AWG, 70A, conduit wire",
  },
  {
    id: "thhn-2",
    label: "#2 THHN/THWN-2",
    category: "THHN / THWN",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "2 AWG, 95A, conduit wire",
  },
  {
    id: "thhn-1",
    label: "#1 THHN/THWN-2",
    category: "THHN / THWN",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "1 AWG, 110A, conduit wire",
  },
  {
    id: "thhn-1-0",
    label: "1/0 THHN/THWN-2",
    category: "THHN / THWN",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "1/0 AWG, 125A, conduit wire",
  },
  {
    id: "thhn-2-0",
    label: "2/0 THHN/THWN-2",
    category: "THHN / THWN",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "2/0 AWG, 145A, conduit wire",
  },
  {
    id: "thhn-3-0",
    label: "3/0 THHN/THWN-2",
    category: "THHN / THWN",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "3/0 AWG, 165A, conduit wire",
  },
  {
    id: "thhn-4-0",
    label: "4/0 THHN/THWN-2",
    category: "THHN / THWN",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "4/0 AWG, 195A, conduit wire",
  },
  {
    id: "thhn-250",
    label: "250 kcmil THHN/THWN-2",
    category: "THHN / THWN",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "250 kcmil, 215A, conduit wire",
  },
  {
    id: "thhn-350",
    label: "350 kcmil THHN/THWN-2",
    category: "THHN / THWN",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "350 kcmil, 260A, conduit wire",
  },
  {
    id: "thhn-500",
    label: "500 kcmil THHN/THWN-2",
    category: "THHN / THWN",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "500 kcmil, 310A, conduit wire",
  },

  // ── XHHW ──────────────────────────────────────────────────────────────────
  {
    id: "xhhw-2",
    label: "#2 XHHW-2",
    category: "XHHW",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "2 AWG XHHW-2, wet/dry rated, conduit",
  },
  {
    id: "xhhw-1-0",
    label: "1/0 XHHW-2",
    category: "XHHW",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "1/0 AWG XHHW-2, wet/dry rated, conduit",
  },
  {
    id: "xhhw-4-0",
    label: "4/0 XHHW-2",
    category: "XHHW",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "4/0 AWG XHHW-2, wet/dry rated, conduit",
  },
  {
    id: "xhhw-350",
    label: "350 kcmil XHHW-2",
    category: "XHHW",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "350 kcmil XHHW-2, large feeder",
  },

  // ── USE / URD ─────────────────────────────────────────────────────────────
  {
    id: "use-2-2",
    label: "#2 USE-2",
    category: "USE / URD",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "Underground service entrance, 2 AWG",
  },
  {
    id: "urd-4-0",
    label: "4/0 URD",
    category: "USE / URD",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "Underground residential distribution, 4/0 AWG",
  },

  // ── Bare / Ground ─────────────────────────────────────────────────────────
  {
    id: "bare-14",
    label: "#14 Bare Copper",
    category: "Bare / Ground",
    hasStrandedChoice: true,
    defaultStranded: false,
    description: "14 AWG bare copper ground wire",
  },
  {
    id: "bare-12",
    label: "#12 Bare Copper",
    category: "Bare / Ground",
    hasStrandedChoice: true,
    defaultStranded: false,
    description: "12 AWG bare copper ground wire",
  },
  {
    id: "bare-10",
    label: "#10 Bare Copper",
    category: "Bare / Ground",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "10 AWG bare copper ground wire",
  },
  {
    id: "bare-6",
    label: "#6 Bare Copper",
    category: "Bare / Ground",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "6 AWG bare copper ground, grounding electrode conductor",
  },
  {
    id: "bare-4",
    label: "#4 Bare Copper",
    category: "Bare / Ground",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "4 AWG bare copper, grounding electrode conductor",
  },
  {
    id: "bare-2",
    label: "#2 Bare Copper",
    category: "Bare / Ground",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "2 AWG bare copper, service grounding electrode conductor",
  },

  // ── Low Voltage ───────────────────────────────────────────────────────────
  {
    id: "cat6",
    label: "Cat 6 UTP",
    category: "Low Voltage",
    hasStrandedChoice: false,
    description: "Category 6 unshielded twisted pair, data/voice",
  },
  {
    id: "cat6a",
    label: "Cat 6A STP",
    category: "Low Voltage",
    hasStrandedChoice: false,
    description: "Category 6A shielded twisted pair, 10GbE",
  },
  {
    id: "coax-rg6",
    label: "RG-6 Coax",
    category: "Low Voltage",
    hasStrandedChoice: false,
    description: "RG-6 coaxial cable, CATV / satellite",
  },
  {
    id: "coax-rg11",
    label: "RG-11 Coax",
    category: "Low Voltage",
    hasStrandedChoice: false,
    description: "RG-11 coaxial cable, long-run CATV",
  },
  {
    id: "fire-alarm-18-2",
    label: "18/2 Fire Alarm Cable",
    category: "Low Voltage",
    hasStrandedChoice: false,
    description: "18 AWG, 2-conductor, FPLR fire alarm cable",
  },
  {
    id: "fire-alarm-16-2",
    label: "16/2 Fire Alarm Cable",
    category: "Low Voltage",
    hasStrandedChoice: false,
    description: "16 AWG, 2-conductor, FPLR fire alarm cable",
  },
  {
    id: "security-22-4",
    label: "22/4 Security Cable",
    category: "Low Voltage",
    hasStrandedChoice: false,
    description: "22 AWG, 4-conductor, alarm / access control",
  },
  {
    id: "speaker-16-2",
    label: "16/2 Speaker Wire",
    category: "Low Voltage",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "16 AWG, 2-conductor, in-wall speaker cable",
  },
  {
    id: "cl2-18-2",
    label: "18/2 CL2 Control Cable",
    category: "Low Voltage",
    hasStrandedChoice: false,
    description: "18 AWG, 2-conductor, CL2 rated control wiring",
  },
  {
    id: "thermostat-18-5",
    label: "18/5 Thermostat Wire",
    category: "Low Voltage",
    hasStrandedChoice: false,
    description: "18 AWG, 5-conductor, HVAC thermostat cable",
  },

  // ── MC Cable ─────────────────────────────────────────────────────────────────
  {
    id: "mc-14-2",
    label: "14/2 MC Cable",
    category: "MC Cable",
    hasStrandedChoice: false,
    description: "Metal-clad armored cable, 14 AWG, 2-conductor + ground, 15A",
  },
  {
    id: "mc-14-3",
    label: "14/3 MC Cable",
    category: "MC Cable",
    hasStrandedChoice: false,
    description: "Metal-clad armored cable, 14 AWG, 3-conductor + ground, 15A",
  },
  {
    id: "mc-12-2",
    label: "12/2 MC Cable",
    category: "MC Cable",
    hasStrandedChoice: false,
    description: "Metal-clad armored cable, 12 AWG, 2-conductor + ground, 20A",
  },
  {
    id: "mc-12-3",
    label: "12/3 MC Cable",
    category: "MC Cable",
    hasStrandedChoice: false,
    description: "Metal-clad armored cable, 12 AWG, 3-conductor + ground, 20A",
  },
  {
    id: "mc-12-4",
    label: "12/4 MC Cable",
    category: "MC Cable",
    hasStrandedChoice: false,
    description: "Metal-clad armored cable, 12 AWG, 4-conductor + ground, 20A",
  },
  {
    id: "mc-10-2",
    label: "10/2 MC Cable",
    category: "MC Cable",
    hasStrandedChoice: false,
    description: "Metal-clad armored cable, 10 AWG, 2-conductor + ground, 30A",
  },
  {
    id: "mc-10-3",
    label: "10/3 MC Cable",
    category: "MC Cable",
    hasStrandedChoice: false,
    description: "Metal-clad armored cable, 10 AWG, 3-conductor + ground, 30A",
  },
  {
    id: "mc-8-2",
    label: "8/2 MC Cable",
    category: "MC Cable",
    hasStrandedChoice: false,
    description: "Metal-clad armored cable, 8 AWG, 2-conductor + ground, 40A",
  },
  {
    id: "mc-8-3",
    label: "8/3 MC Cable",
    category: "MC Cable",
    hasStrandedChoice: false,
    description: "Metal-clad armored cable, 8 AWG, 3-conductor + ground, 40A",
  },
  {
    id: "mc-6-2",
    label: "6/2 MC Cable",
    category: "MC Cable",
    hasStrandedChoice: false,
    description: "Metal-clad armored cable, 6 AWG, 2-conductor + ground, 55A",
  },
  {
    id: "mc-6-3",
    label: "6/3 MC Cable",
    category: "MC Cable",
    hasStrandedChoice: false,
    description: "Metal-clad armored cable, 6 AWG, 3-conductor + ground, 55A",
  },
  {
    id: "mc-4-3",
    label: "4/3 MC Cable",
    category: "MC Cable",
    hasStrandedChoice: false,
    description: "Metal-clad armored cable, 4 AWG, 3-conductor + ground, 70A",
  },
  {
    id: "mc-2-3",
    label: "2/3 MC Cable",
    category: "MC Cable",
    hasStrandedChoice: false,
    description: "Metal-clad armored cable, 2 AWG, 3-conductor + ground, 95A",
  },
  {
    id: "mc-2-4",
    label: "2/4 MC Cable",
    category: "MC Cable",
    hasStrandedChoice: false,
    description: "Metal-clad armored cable, 2 AWG, 4-conductor + ground, 95A",
  },

  // ── Specialty ─────────────────────────────────────────────────────────────
  {
    id: "ac-12-2",
    label: "12/2 AC-90 (BX)",
    category: "Specialty",
    hasStrandedChoice: false,
    description: "Armored cable (BX), 12 AWG, 2-conductor + bond",
  },
  {
    id: "so-cord-12-3",
    label: "12/3 SO Cord",
    category: "Specialty",
    hasStrandedChoice: true,
    defaultStranded: true,
    description: "12 AWG, 3-conductor flexible cord, portable equipment",
  },
];

/** Default wire type for new runs */
export const DEFAULT_WIRE_TYPE_ID = "thhn-12";
