/**
 * Layers: which marks and runs are showing right now.
 *
 * ── Two axes, deliberately not one list ──────────────────────────────────────
 * SYSTEM is what a thing IS — a duplex receptacle is "Devices" on every job,
 * forever, and that travels with the library assembly. LOCATION is where a
 * particular one SITS, tagged on the placed item because the same receptacle
 * is in a wall on one job and a ceiling on another.
 *
 * Collapsing them into one checklist would force a false choice between "show
 * me the devices" and "show me the underground", when the useful question is
 * usually both at once. So they filter independently and combine — see
 * ASSEMBLIES_PLAN.md § LAYERS.
 *
 * ── Absent is a layer, not a hiding place ────────────────────────────────────
 * An item with no Location tagged yet gets its own band rather than being
 * quietly excluded or quietly always-shown. Anything that can be filtered has
 * to be visible in the filter, or a user turns off two boxes and cannot work
 * out why their count dropped by more than those two.
 *
 * ── Runs are on the System axis too ──────────────────────────────────────────
 * A traced run has no assembly and so no Category. It still has to be
 * filterable alongside everything else on the sheet, so conduit and cable get
 * their own System keys. One checklist covers the sheet; nothing on it is
 * unreachable.
 */

/** Everything with no Location tagged. A real band, not a fallback. */
export const UNASSIGNED_LOCATION = "__unassigned__";

/** System keys a traced run falls under, by its raceway type. */
export const RUN_SYSTEM_KEYS = {
  conduit: "Conduit runs",
  cable: "Cable runs",
} as const;

/** A layer the checklist can toggle. */
export type LayerKey = string;

/** What is currently switched on. Absent from the set means hidden. */
export type LayerState = {
  systems: Set<LayerKey>;
  locations: Set<LayerKey>;
};

/** The two facts any placed thing carries for filtering. */
export type LayeredItem = {
  systemKey: LayerKey;
  /** Null when the user has not tagged it — filtered as UNASSIGNED_LOCATION. */
  location: string | null;
};

/** The System key for a stamp: its assembly's Category at drop time. */
export function systemKeyForStamp(assemblyCategory: string | null): LayerKey {
  // A stamp whose assembly predates category snapshotting, or whose assembly
  // is gone, still needs somewhere to live — and somewhere VISIBLE, so it can
  // be turned off deliberately rather than disappearing without explanation.
  return assemblyCategory?.trim() ? assemblyCategory : "Uncategorised";
}

/** The System key for a traced run. */
export function systemKeyForRun(pathType: "conduit" | "cable"): LayerKey {
  return RUN_SYSTEM_KEYS[pathType];
}

/** The Location key for anything placed. */
export function locationKeyOf(location: string | null): LayerKey {
  return location?.trim() ? location : UNASSIGNED_LOCATION;
}

/**
 * Every layer actually present on a sheet, with how many things are in it.
 *
 * Built from what is there rather than from the full vocabulary: a checklist
 * offering six Locations when the sheet only uses two is six rows of noise, and
 * the two that matter are harder to find among them.
 */
export function layersPresent(items: LayeredItem[]): {
  systems: { key: LayerKey; count: number }[];
  locations: { key: LayerKey; count: number }[];
} {
  const systems = new Map<LayerKey, number>();
  const locations = new Map<LayerKey, number>();

  for (const item of items) {
    systems.set(item.systemKey, (systems.get(item.systemKey) ?? 0) + 1);
    const locationKey = locationKeyOf(item.location);
    locations.set(locationKey, (locations.get(locationKey) ?? 0) + 1);
  }

  const toList = (map: Map<LayerKey, number>) =>
    Array.from(map.entries()).map(([key, count]) => ({ key, count }));

  return { systems: toList(systems), locations: toList(locations) };
}

/** Every layer on, which is the state a sheet opens in. */
export function allLayersOn(items: LayeredItem[]): LayerState {
  const present = layersPresent(items);
  return {
    systems: new Set(present.systems.map(s => s.key)),
    locations: new Set(present.locations.map(l => l.key)),
  };
}

/**
 * Whether one item is showing.
 *
 * BOTH axes must pass — that is what "independently toggleable and combining"
 * means in practice. An item in a hidden System stays hidden however its
 * Location is set, and vice versa.
 */
export function isVisible(item: LayeredItem, state: LayerState): boolean {
  if (!state.systems.has(item.systemKey)) return false;
  return state.locations.has(locationKeyOf(item.location));
}

/** Filter any collection of placed things by the current layer state. */
export function filterByLayers<T extends LayeredItem>(
  items: T[],
  state: LayerState
): T[] {
  return items.filter(item => isVisible(item, state));
}

/**
 * Toggle one layer, returning a new state.
 *
 * Pure rather than mutating, so a component can hold it in state and React
 * actually notices the change — a mutated Set is the same object and re-renders
 * nothing, which reads as the checkbox being broken.
 */
export function toggleLayer(
  state: LayerState,
  axis: "systems" | "locations",
  key: LayerKey
): LayerState {
  const next = new Set(state[axis]);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return axis === "systems"
    ? { systems: next, locations: state.locations }
    : { systems: state.systems, locations: next };
}

/** Turn every layer on one axis on or off at once. */
export function setAxis(
  state: LayerState,
  axis: "systems" | "locations",
  keys: LayerKey[],
  on: boolean
): LayerState {
  const next = on ? new Set(keys) : new Set<LayerKey>();
  return axis === "systems"
    ? { systems: next, locations: state.locations }
    : { systems: state.systems, locations: next };
}

/** Whether anything is filtered out — drives the "showing a subset" warning. */
export function isFiltered(items: LayeredItem[], state: LayerState): boolean {
  return filterByLayers(items, state).length !== items.length;
}

/**
 * A stable colour per layer key.
 *
 * Hashed from the key rather than assigned by position, so a layer keeps its
 * colour as others appear and disappear. A checklist whose colours reshuffle
 * when a new system shows up teaches the user not to rely on them.
 */
const LAYER_COLORS = [
  "#F5C518",
  "#4ADE80",
  "#60A5FA",
  "#F472B6",
  "#FB923C",
  "#A78BFA",
  "#2DD4BF",
  "#FACC15",
];

export function layerColor(key: LayerKey): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return LAYER_COLORS[hash % LAYER_COLORS.length];
}

/** How a layer key reads in the checklist. */
export function layerLabel(key: LayerKey): string {
  return key === UNASSIGNED_LOCATION ? "Not tagged" : key;
}
