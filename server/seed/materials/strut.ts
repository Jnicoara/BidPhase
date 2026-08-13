/**
 * Strut, all-thread and the hardware that hangs a raceway off a structure.
 *
 * ── Channel is bought by profile, not by "strut" ─────────────────────────────
 * Every one of these is "unistrut" on site regardless of who made it, and the
 * thing that actually differs — and that gets a job rejected when it is wrong —
 * is the depth. A 13/16" shallow channel and a 3-1/4" deep channel carry
 * loads an order of magnitude apart. So the profile is in the name, and the
 * brand names everyone says instead are aliases on all five.
 */
import {
  aliases,
  sizeAliases,
  TRADE_SIZES,
  UNPRICED,
  type BaselineMaterial,
} from "./types";

/** Brand names used generically, the way Marrette is for a wire nut. */
const STRUT_SLANG = "unistrut strut kindorf superstrut b-line channel";

const channel: BaselineMaterial[] = [
  {
    profile: '1-5/8" x 1-5/8"',
    note: "Standard depth — the default for most runs.",
  },
  {
    profile: '1-5/8" x 13/16"',
    note: "Shallow. Light loads and tight spaces.",
  },
  { profile: '1-5/8" x 1-1/4"', note: "Medium depth." },
  {
    profile: '1-5/8" x 3-1/4"',
    note: "Deep section for heavy loads and long spans.",
  },
  { profile: '1-1/4" x 1-1/4"', note: "Light-duty section." },
].map(({ profile, note }) => ({
  name: `${profile} strut channel, 10 ft`,
  unitOfSale: "each" as const,
  costPerUnit: UNPRICED,
  category: "Strut & Supports" as const,
  searchAliases: aliases(STRUT_SLANG, "slotted solid stick length p1000 p3300"),
  description: note,
}));

/**
 * Straps that clamp a raceway to channel, sized by the trade size of the pipe
 * they hold — never by the channel, which is why one set covers all profiles.
 */
const strutStraps: BaselineMaterial[] = TRADE_SIZES.map(size => ({
  name: `${size} strut conduit strap`,
  unitOfSale: "each",
  costPerUnit: UNPRICED,
  category: "Strut & Supports",
  searchAliases: aliases(
    sizeAliases(size),
    STRUT_SLANG,
    "clamp pipe hold down"
  ),
  defaultQty: 2,
}));

const strutAccessories: BaselineMaterial[] = [
  {
    // Asked for at the counter as a "spring nut" far more often than a
    // "channel nut". Only "spring" is aliased, not "spring nut": the name
    // already carries "nut", so a search for "spring nut" matches "spring"
    // here and "nut" there — repeating a name word is dead weight.
    name: "Strut channel nut",
    searchAliases: aliases(
      "spring unistrut kindorf superstrut b-line square 1/4-20 3/8-16"
    ),
    defaultQty: 4,
  },
  {
    name: "Strut angle bracket",
    searchAliases: aliases(STRUT_SLANG, "90 corner gusset fitting l shape"),
    defaultQty: 2,
  },
  {
    name: "Strut post base",
    searchAliases: aliases(STRUT_SLANG, "foot plate floor mount stand upright"),
  },
  {
    name: "Strut end cap",
    searchAliases: aliases(STRUT_SLANG, "plastic closure cover finish"),
    defaultQty: 2,
  },
].map(item => ({
  ...item,
  unitOfSale: "each" as const,
  costPerUnit: UNPRICED,
  category: "Strut & Supports" as const,
}));

// ─── All-thread ───────────────────────────────────────────────────────────────

const ROD_SIZES = ['1/4"', '3/8"', '1/2"', '5/8"'];

/** Rod sizes are not trade sizes — these are real thread diameters. */
const ROD_ALIASES: Record<string, string> = {
  '1/4"': "1/4 quarter 0.25 .25 1/4-20",
  '3/8"': "3/8 0.375 .375 3/8-16",
  '1/2"': "1/2 half 0.5 .5 1/2-13",
  '5/8"': "5/8 0.625 .625 5/8-11",
};

const allThread: BaselineMaterial[] = [
  ...ROD_SIZES.map(size => ({
    name: `${size} all-thread rod, 10 ft`,
    unitOfSale: "each" as const,
    costPerUnit: UNPRICED,
    category: "Strut & Supports" as const,
    searchAliases: aliases(
      ROD_ALIASES[size],
      "allthread threaded rod hanger drop stick length"
    ),
  })),
  ...ROD_SIZES.flatMap(size =>
    [
      { suffix: "hex nut", slang: "nut", qty: 4 },
      { suffix: "flat washer", slang: "washer", qty: 4 },
      { suffix: "lock washer", slang: "split washer star", qty: 4 },
      {
        suffix: "rod coupler",
        slang: "coupling nut extend splice",
        qty: undefined,
      },
    ].map(part => ({
      name: `${size} ${part.suffix}`,
      unitOfSale: "each" as const,
      costPerUnit: UNPRICED,
      category: "Strut & Supports" as const,
      searchAliases: aliases(
        ROD_ALIASES[size],
        part.slang,
        "allthread threaded rod"
      ),
      ...(part.qty ? { defaultQty: part.qty } : {}),
    }))
  ),
];

export const STRUT: BaselineMaterial[] = [
  ...channel,
  ...strutStraps,
  ...strutAccessories,
  ...allThread,
];
