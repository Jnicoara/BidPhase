/**
 * Lighting and the hardware that hangs it.
 *
 * Fixtures are generic on purpose. A shipped catalog cannot know whether a job
 * takes a 3000K or 4000K wafer, and a row that pretends to be a specific part
 * number is worse than one the estimator prices from their own quote — so these
 * are named by what they are and what size, and nothing else.
 */
import { aliases, UNPRICED, type BaselineMaterial } from "./types";

const fixture = {
  unitOfSale: "each" as const,
  costPerUnit: UNPRICED,
  category: "Lighting Hardware" as const,
};

const recessed: BaselineMaterial[] = [
  { size: '4"', slang: "4 four" },
  { size: '5/6"', slang: "5 6 five six" },
  { size: '6"', slang: "6 six" },
].map(({ size, slang }) => ({
  ...fixture,
  name: `${size} wafer LED downlight`,
  searchAliases: aliases(
    slang,
    "recessed can pot light slim canless retrofit trim housing"
  ),
}));

const linear: BaselineMaterial[] = ["4 ft", "8 ft"].map(length => ({
  ...fixture,
  name: `${length} LED strip fixture`,
  searchAliases: aliases(
    length.replace(" ", ""),
    length.startsWith("4") ? "four foot 48" : "eight foot 96",
    "shop light linear wrap industrial surface tube"
  ),
}));

const track: BaselineMaterial[] = ["4 ft", "8 ft"].map(length => ({
  ...fixture,
  name: `${length} lighting track`,
  searchAliases: aliases(
    length.replace(" ", ""),
    length.startsWith("4") ? "four foot 48" : "eight foot 96",
    "rail head monorail retail accent"
  ),
}));

const underCabinet: BaselineMaterial[] = ['18"', '24"', '36"'].map(length => ({
  ...fixture,
  name: `${length} under-cabinet light`,
  searchAliases: aliases(
    length.replace('"', ""),
    "undercabinet counter kitchen puck linkable led bar task"
  ),
}));

const poles: BaselineMaterial[] = ["12 ft", "20 ft", "30 ft"].map(height => ({
  ...fixture,
  name: `${height} light pole`,
  searchAliases: aliases(
    height.replace(" ", ""),
    "parking lot site square round steel aluminum base anchor bolt exterior"
  ),
}));

export const LIGHTING: BaselineMaterial[] = [
  ...recessed,
  ...linear,
  ...track,
  ...underCabinet,
  ...poles,
  {
    ...fixture,
    name: "Surface-mount ceiling fixture",
    searchAliases: aliases("flush mount drum dome closet utility round led"),
  },
  {
    ...fixture,
    name: "Wall pack",
    searchAliases: aliases(
      "wallpack exterior building mounted security dusk dawn led outdoor"
    ),
  },
  {
    ...fixture,
    name: "Flood light",
    searchAliases: aliases(
      "floodlight security exterior knuckle mount aimable led outdoor"
    ),
  },
  {
    ...fixture,
    name: "High bay",
    searchAliases: aliases(
      "highbay ufo warehouse shop ceiling industrial led linear"
    ),
  },
  {
    ...fixture,
    name: "Exit sign",
    searchAliases: aliases(
      "egress emergency running man red green led battery backup"
    ),
  },
  {
    ...fixture,
    name: "Emergency light",
    searchAliases: aliases(
      "egress bug eye battery backup unit equipment twin head"
    ),
  },
  {
    ...fixture,
    name: "Bollard light",
    searchAliases: aliases(
      "path walkway landscape site short pole exterior led"
    ),
  },
  {
    ...fixture,
    name: "Ceiling fan",
    searchAliases: aliases(
      "paddle fan blade downrod flush mount bedroom porch"
    ),
  },
  {
    ...fixture,
    name: "Fixture mounting bracket",
    searchAliases: aliases(
      "bar hanger crossbar cross strap stud hickey saddle"
    ),
  },
  {
    ...fixture,
    name: "6ft MC whip",
    searchAliases: aliases(
      "fixture light 6 foot flex armored metal clad pigtail greenfield"
    ),
  },
];
