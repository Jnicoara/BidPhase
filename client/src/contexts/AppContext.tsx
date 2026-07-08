/**
 * BidPhase — Global App Context
 *
 * Multi-project support for all three tabs (Civil, Commercial, Residential).
 * Each tab has its own list of named projects; the active project per tab is
 * stored in localStorage. Each project stores its own calculator state.
 *
 * Architecture note — CivilState and run data:
 *   CivilState includes both legacy scalar fields (distance / conductors /
 *   conduitSize, kept for backward-compat with old localStorage data) and a
 *   typed `runs?: RunItem[]` field managed by CivilEditor. CivilEditor writes
 *   runs via `setCivilState({ ...s, runs: next })` and ExportButton reads
 *   `civilState.runs` directly — no type casts needed.
 *   If the schema needs to evolve, update CivilState, defaultCivilProject, and
 *   the CivilEditor initializer together.
 *
 * Project CRUD pattern:
 *   All three tabs share identical project management logic (add / rename /
 *   delete / switch / set-state). Rather than duplicating ~55 lines three
 *   times, we use a `makeProjectStore` factory that closes over the per-tab
 *   localStorage setters and returns the five callbacks.
 */
import React, { createContext, useContext, useCallback, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { nanoid } from "nanoid";

// ─── Trash type ─────────────────────────────────────────────────────────────
export interface TrashedProject {
  project: CivilProject;
  category: "civil" | "commercial" | "residential" | "industrial";
  deletedAt: number;
}

// ─── Labor line type ────────────────────────────────────────────────────────
export interface LaborLine {
  id: string;
  description: string;  // e.g. "Rough-in", "Panel install"
  hours: number;
}

// ─── Conduit types ──────────────────────────────────────────────────────────
export const CONDUIT_TYPES = [
  { value: "EMT",  label: "EMT"  },
  { value: "IMC",  label: "IMC"  },
  { value: "RMC",  label: "RMC"  },
  { value: "PVC",  label: "PVC"  },
  { value: "LFMC", label: "LFMC" },
] as const;
export type ConduitType = typeof CONDUIT_TYPES[number]["value"];

// ─── Conduit sizes ────────────────────────────────────────────────────────────
export const CONDUIT_SIZES = [
  { value: "1/2",   label: '½"'  },
  { value: "3/4",   label: '¾"'  },
  { value: "1",     label: '1"'  },
  { value: "1-1/4", label: '1¼"' },
  { value: "1-1/2", label: '1½"' },
  { value: "2",     label: '2"'  },
  { value: "2-1/2", label: '2½"' },
  { value: "3",     label: '3"'  },
  { value: "3-1/2", label: '3½"' },
  { value: "4",     label: '4"'  },
] as const;

export type ConduitSize = typeof CONDUIT_SIZES[number]["value"];

// ─── Civil run types (shared between CivilCalculator and ExportButton) ────────
// These are defined here so CivilState can reference RunItem[] without
// a circular import. CivilCalculator imports and re-uses these types.

export const CONDUCTOR_MATERIALS = [
  { id: "CU", label: "Copper",   short: "Cu" },
  { id: "AL", label: "Aluminum", short: "Al" },
] as const;
export type ConductorMaterial = typeof CONDUCTOR_MATERIALS[number]["id"];

// Standard AWG + kcmil conductor sizes (NEC Table 310.12)
export const CONDUCTOR_SIZES = [
  "14", "12", "10", "8", "6", "4", "3", "2", "1",
  "1/0", "2/0", "3/0", "4/0",
  "250", "300", "350", "400", "500", "600", "750", "1000",
] as const;
export type ConductorSize = typeof CONDUCTOR_SIZES[number];

// Conduit material types used in Civil runs (superset of the AppContext CONDUIT_TYPES)
export const CIVIL_CONDUIT_TYPES = [
  { id: "EMT",  label: "EMT"  },
  { id: "IMC",  label: "IMC"  },
  { id: "RMC",  label: "RMC"  },
  { id: "PVC",  label: "PVC"  },
  { id: "LFMC", label: "LFMC" },
  { id: "LFNC", label: "LFNC" },
] as const;
export type CivilConduitType = typeof CIVIL_CONDUIT_TYPES[number]["id"];

// Fitting types used in Civil runs
export const FITTING_TYPES = [
  { id: "connector",  label: "Connectors",   short: "CONN" },
  { id: "coupling",   label: "Couplings",    short: "COUP" },
  { id: "lb",         label: "LBs",          short: "LB"   },
  { id: "elbow90",    label: "90° Elbows",   short: "90°"  },
  { id: "elbow45",    label: "45° Elbows",   short: "45°"  },
  { id: "sweep",      label: "Sweeps",       short: "SWP"  },
  { id: "offset",     label: "Offsets",      short: "OFF"  },
] as const;
export type FittingId = typeof FITTING_TYPES[number]["id"];

export interface FittingCounts {
  connector: number;
  coupling: number;
  lb: number;
  elbow90: number;
  elbow45: number;
  sweep: number;
  offset: number;
}

/** A single measured conduit run pushed from PlanPanel into CivilCalculator. */
export interface RunItem {
  id: string;
  name: string;
  pageNumber?: number;        // which PDF page this run came from
  feet: number;              // Measured Takeoff (base linear footage from plan)
  segmentFeet?: number[];     // Per-segment footage breakdown (when run has multiple pen-lift segments)
  /** "conduit" = EMT/IMC/RMC/PVC etc. with pipe sticks + fittings; "wire" = Jacketed/Romex bare conductor */
  runType?: "conduit" | "wire";
  conduitSize: string;        // e.g. "1/2"
  conduitType: CivilConduitType;
  conductors: number;
  conductorMaterial: ConductorMaterial;
  conductorSize: ConductorSize;
  fittings: FittingCounts;
  /** Wire type ID from wireTypes.ts — used when runType === "wire" */
  wireTypeId?: string;
  /** Whether to use stranded form (only applies when wireType.hasStrandedChoice === true) */
  wireStranded?: boolean;

  // ── Jacketed / Romex module fields ─────────────────────────────────────────────
  /** Fixed length added per termination/box (ft). Default 2 ft. */
  makeupAllowance?: number;
  /** Fixed length added per run for intentional service loop (ft). Default 3 ft. */
  serviceLoop?: number;
  /** Number of terminations/boxes on this run. Default 2. */
  numTerminations?: number;
  /** Waste factor % for scrap and routing (Jacketed/Romex). Default 10. */
  wirewasteFactor?: number;

  // ── Conduit module fields ──────────────────────────────────────────────────────────
  /** Conduit waste factor % for pipe cutting scrap. Default 10. */
  conduitWasteFactor?: number;
  /** Wire makeup allowance per termination/pull point (ft). Default 2 ft. */
  wireTermMakeup?: number;
  /** Wire waste factor % for pulling waste and head scrap. Default 10. */
  wireWasteFactor?: number;
  /** Number of terminations/pull points for conduit wire calc. Default 2. */
  numPullPoints?: number;
  /**
   * When true, this is a conduit-only run (future pull / empty conduit).
   * Wire section is hidden and wire cost is excluded from totals.
   */
  conduitOnly?: boolean;

  // ── Grounding conductor ────────────────────────────────────────────────────────
  /** When true, include a separate grounding conductor in this run. */
  includeGround?: boolean;
  /** AWG size of the grounding conductor. Default "12" (matches NEC 250.122 for 20A). */
  groundSize?: ConductorSize;

  /** @deprecated Use wirewasteFactor / wireWasteFactor instead */
  wireSlackPct?: number;
  /** @deprecated Use conduitWasteFactor instead */
  conduitSlackPct?: number;
}

// ─── Saved material row (count session saved to L&M) ───────────────────────
export interface SavedMaterialRow {
  id: string;
  sessionId: string;    // source count session id
  description: string;  // item name
  qty: number;          // pin count at save time
  unitCost: number;     // price per unit
  unit: string;         // e.g. "EA"
  savedAt: number;      // timestamp
}

// ─── Civil / Underground ─────────────────────────────────────────────────────
export interface CivilState {
  /** Legacy scalar — distance of the first/only run (kept for backward-compat). */
  distance: number;
  /** Legacy scalar — conductor count (kept for backward-compat). */
  conductors: number;
  /** Legacy scalar — conduit size (kept for backward-compat). */
  conduitSize: ConduitSize;
  /**
   * Per-run items managed by CivilEditor.
   * Optional so that old localStorage data (without `runs`) still deserialises
   * correctly — CivilEditor defaults to [] when this is undefined.
   */
  runs?: RunItem[];
  /** Named count sessions for Count Mode — project-scoped, cross-page */
  countSessions?: CountSession[];
  /** ID of the currently active count session */
  activeCountSessionId?: string;
  /** Rows saved from count sessions to the Labor & Material list */
  savedMaterialRows?: SavedMaterialRow[];
}

export interface CivilProject {
  id: string;
  name: string;
  state: CivilState;
  createdAt: number;
}

// ─── Commercial Assembly ─────────────────────────────────────────────────────
export interface AssemblyMaterialLine {
  description: string;
  unit: string;
  unitCost: number;
  quantity: number;
}

/** A single count pin dropped in Count Mode. Carries page number so totals span all pages. */
export interface CountPin {
  id: string;
  nx: number;       // normalised x ∈ [0,1] relative to page width
  ny: number;       // normalised y ∈ [0,1] relative to page height
  pageNumber: number; // 1-indexed page where the pin was placed
}

/**
 * A named counting session — groups pins under a user-defined label.
 * Replaces the old per-page PagePinsMap. Sessions persist across pages so
 * the total count is project-wide, not page-scoped.
 */
export interface CountSession {
  id: string;
  name: string;     // user-set label, e.g. "Outlets - Room 101"
  iconId: string;   // SVG icon id from COUNT_ICONS
  color: string;    // hex pin color
  pins: CountPin[];
  /** Optional unit cost per pin — used to calculate extended cost in the BOM */
  unitCost?: number;
  /**
   * Price entry mode:
   * - "per-unit" (default): unitCost is price per pin; extCost = unitCost * pins.length
   * - "total": unitCost is the total cost; unitPrice = unitCost / pins.length
   */
  priceMode?: "per-unit" | "total";
}

export interface AssemblyState {
  assemblyId: string;
  quantity: number;
  materials: AssemblyMaterialLine[];
  totalLaborHours: number;
  /** SVG icon id from COUNT_ICONS (used in Count Mode canvas rendering) */
  iconId?: string;
  /** Hex color for count pins (high-visibility, chosen by user) */
  pinColor?: string;
  /** Named count sessions for Count Mode — project-scoped, cross-page */
  countSessions?: CountSession[];
  /** ID of the currently active count session */
  activeCountSessionId?: string;
}

export interface CommercialProject {
  id: string;
  name: string;
  state: AssemblyState;
  createdAt: number;
}

// ─── Residential Room ────────────────────────────────────────────────────────
export interface RoomMaterialLine {
  description: string;
  unit: string;
  quantity: number;
}

export interface RoomState {
  roomId: string;
  materials: RoomMaterialLine[];
  /** Named count sessions for Count Mode — project-scoped, cross-page */
  countSessions?: CountSession[];
  /** ID of the currently active count session */
  activeCountSessionId?: string;
}

export interface ResidentialProject {
  id: string;
  name: string;
  state: RoomState;
  createdAt: number;
}

// ─── Default factories ────────────────────────────────────────────────────────
export function defaultCivilProject(name = "New Project"): CivilProject {
  return {
    id: nanoid(8),
    name,
    createdAt: Date.now(),
    state: { distance: 0, conductors: 2, conduitSize: "3/4" },
  };
}

export function defaultCommercialProject(name = "New Project"): CommercialProject {
  return {
    id: nanoid(8),
    name,
    createdAt: Date.now(),
    state: { assemblyId: "receptacle-20a", quantity: 1, materials: [], totalLaborHours: 0, iconId: "dot", pinColor: "#39FF14" },
  };
}

export function defaultResidentialProject(name = "New Project"): ResidentialProject {
  return {
    id: nanoid(8),
    name,
    createdAt: Date.now(),
    state: { roomId: "bedroom", materials: [] },
  };
}

// ─── Context shape ────────────────────────────────────────────────────────────
interface AppContextValue {
  // Active tab
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeCategory: "civil" | "commercial" | "residential" | "industrial";
  setActiveCategory: (c: "civil" | "commercial" | "residential" | "industrial") => void;
  // Per-category project stores (all use CivilProject/CivilState type)
  civilCatProjects: CivilProject[];
  activeCivilCatId: string;
  activeCivilCatProject: CivilProject;
  setCivilCatState: (s: CivilState) => void;
  addCivilCatProject: (name?: string) => void;
  renameCivilCatProject: (id: string, name: string) => void;
  deleteCivilCatProject: (id: string) => void;
  switchCivilCatProject: (id: string) => void;
  commercialCatProjects: CivilProject[];
  activeCommercialCatId: string;
  activeCommercialCatProject: CivilProject;
  setCommercialCatState: (s: CivilState) => void;
  addCommercialCatProject: (name?: string) => void;
  renameCommercialCatProject: (id: string, name: string) => void;
  deleteCommercialCatProject: (id: string) => void;
  switchCommercialCatProject: (id: string) => void;
  residentialCatProjects: CivilProject[];
  activeResidentialCatId: string;
  activeResidentialCatProject: CivilProject;
  setResidentialCatState: (s: CivilState) => void;
  addResidentialCatProject: (name?: string) => void;
  renameResidentialCatProject: (id: string, name: string) => void;
  deleteResidentialCatProject: (id: string) => void;
  switchResidentialCatProject: (id: string) => void;
  // ── Industrial category store ────────────────────────────────────────────────
  industrialCatProjects: CivilProject[];
  activeIndustrialCatId: string;
  activeIndustrialCatProject: CivilProject;
  setIndustrialCatState: (s: CivilState) => void;
  addIndustrialCatProject: (name?: string) => void;
  renameIndustrialCatProject: (id: string, name: string) => void;
  deleteIndustrialCatProject: (id: string) => void;
  switchIndustrialCatProject: (id: string) => void;

  // ── Civil projects ──────────────────────────────────────────────────────────
  civilProjects: CivilProject[];
  activeCivilId: string;
  activeCivilProject: CivilProject;
  setCivilState: (s: CivilState) => void;
  addCivilProject: (name?: string) => void;
  renameCivilProject: (id: string, name: string) => void;
  deleteCivilProject: (id: string) => void;
  switchCivilProject: (id: string) => void;

  // ── Commercial projects ─────────────────────────────────────────────────────
  commercialProjects: CommercialProject[];
  activeCommercialId: string;
  activeCommercialProject: CommercialProject;
  setAssemblyState: (s: AssemblyState) => void;
  addCommercialProject: (name?: string) => void;
  renameCommercialProject: (id: string, name: string) => void;
  deleteCommercialProject: (id: string) => void;
  switchCommercialProject: (id: string) => void;

  // ── Residential projects ────────────────────────────────────────────────────
  residentialProjects: ResidentialProject[];
  activeResidentialId: string;
  activeResidentialProject: ResidentialProject;
  setRoomState: (s: RoomState) => void;
  addResidentialProject: (name?: string) => void;
  renameResidentialProject: (id: string, name: string) => void;
  deleteResidentialProject: (id: string) => void;
  switchResidentialProject: (id: string) => void;

  // ── UI settings ────────────────────────────────────────────────────────────
  uiFontScale: number;           // 0.8 – 1.4, default 1.1
  setUiFontScale: (v: number) => void;

  // ── Material List page toggle ───────────────────────────────────────────────
  showMaterialList: boolean;
  setShowMaterialList: (v: boolean) => void;

  // ── Material List labor + markup (persisted across sessions) ────────────────
  /** @deprecated use journeymanLines / traineeLines instead */
  laborHours: number;
  setLaborHours: (v: number) => void;
  /** @deprecated use journeymanLines / traineeLines instead */
  laborRate: number;
  setLaborRate: (v: number) => void;
  markupPct: number;
  setMarkupPct: (v: number) => void;

  // ── Journeyman & Trainee labor lines (persisted) ────────────────────────────
  journeymanLines: LaborLine[];
  setJourneymanLines: (lines: LaborLine[]) => void;
  traineeLines: LaborLine[];
  setTraineeLines: (lines: LaborLine[]) => void;
  journeymanRate: number;
  setJourneymanRate: (v: number) => void;
  traineeRate: number;
  setTraineeRate: (v: number) => void;

  // ── Unified projects (single project list replacing the three separate tabs) ─
  unifiedProjects: CivilProject[];
  activeUnifiedId: string;
  activeUnifiedProject: CivilProject;
  setUnifiedState: (s: CivilState) => void;
  addUnifiedProject: (name?: string) => void;
  renameUnifiedProject: (id: string, name: string) => void;
  deleteUnifiedProject: (id: string) => void;
  switchUnifiedProject: (id: string) => void;

  // ── Legacy single-state accessors (used by ExportButton) ───────────────────
  // These are convenience aliases for activeCivilProject.state etc.
  // They exist so ExportButton can destructure a flat object without knowing
  // which project is active.
  civilState: CivilState;
  assemblyState: AssemblyState;
  roomState: RoomState;

  // ── Legacy push helper (kept for API stability; no longer called internally) ─
  // CivilEditor now uses its own onPushDistance callback via PlanPanel props.
  // This remains in the context shape so any external code that still imports
  // it does not break at the TypeScript level.
  pushDistanceToCivil: (ft: number) => void;

  // ── Master project totals (read-only aggregate across all commercial projects) ─
  // Automatically re-computed whenever any commercial project state changes.
  // Used by the global master list view and PDF export.
  masterTotals: MasterTotals;

  // ── Trash ──────────────────────────────────────────────────────────────────
  trashedProjects: TrashedProject[];
  trashProject: (project: CivilProject, category: "civil" | "commercial" | "residential" | "industrial") => void;
  restoreProject: (id: string) => void;
  permanentlyDeleteProject: (id: string) => void;
  emptyTrash: () => void;
}

/** Aggregated totals across all commercial projects. */
export interface MasterTotals {
  totalLaborHours: number;
  totalMaterialCost: number;
  /** Per-assembly line items summed across all projects */
  lineItems: Array<{
    description: string;
    unit: string;
    totalQty: number;
    unitCost: number;
    extCost: number;
  }>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

// ─── Helper: ensure at least one project exists ───────────────────────────────
// NOTE: We no longer enforce a minimum of 1. Users can delete all projects.
// The UI will show a "New Project" CTA when the list is empty.
function ensureOne<T extends { id: string }>(list: T[], _makeDefault: () => T): T[] {
  return list;
}

// ─── Generic project-store factory ───────────────────────────────────────────
/**
 * makeProjectStore — eliminates the three near-identical project CRUD blocks.
 *
 * Given the per-tab localStorage setter and the current active-id setter, this
 * returns five stable callbacks: setState, add, rename, delete, switch.
 *
 * @param projects       Current project list (used only for length in `add`)
 * @param activeId       Currently active project id
 * @param setProjects    localStorage setter for the project list
 * @param setActiveId    localStorage setter for the active id
 * @param makeDefault    Factory that creates a blank project with a given name
 */
function makeProjectStore<TProject extends { id: string; name: string; state: TState }, TState>(
  projects: TProject[],
  activeId: string,
  setProjects: (updater: (prev: TProject[]) => TProject[]) => void,
  setActiveId: (id: string) => void,
  makeDefault: (name?: string) => TProject
) {
  const setState = (s: TState) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === activeId ? { ...p, state: s } : p))
    );
  };

  const add = (name?: string) => {
    const proj = makeDefault(name ?? `Job ${projects.length + 1}`);
    setProjects((prev) => [...prev, proj]);
    setActiveId(proj.id);
  };

  const rename = (id: string, name: string) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const remove = (id: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      // If the deleted project was active, switch to another or clear the active id
      if (activeId === id) {
        setActiveId(next.length > 0 ? next[next.length - 1].id : "");
      }
      return next;
    });
  };

  const switchTo = (id: string) => setActiveId(id);

  return { setState, add, rename, remove, switchTo };
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useLocalStorage<string>("bp_active_tab", "residential");
  const [uiFontScale, setUiFontScale] = useLocalStorage<number>("bp_ui_font_scale", 1.0);
  const [showMaterialList, _setShowMaterialList] = useState(false);
  // Intercept setShowMaterialList(true) to also push the #/material hash so
  // BidPhaseShell's hashchange listener picks it up and the sidebar stays
  // navigable + browser back/forward works correctly.
  const setShowMaterialList = (v: boolean) => {
    _setShowMaterialList(v);
    if (v) {
      window.location.hash = "/material";
    } else {
      // Only pop back if we are currently on the material hash
      if (window.location.hash === "#/material") {
        window.history.back();
      }
    }
  };
  const [laborHours, setLaborHours] = useLocalStorage<number>("bp_labor_hours", 0);
  const [laborRate, setLaborRate] = useLocalStorage<number>("bp_labor_rate", 85);
  const [markupPct, setMarkupPct] = useLocalStorage<number>("bp_markup_pct", 0);
  const [journeymanLines, setJourneymanLines] = useLocalStorage<LaborLine[]>("bp_journeyman_lines", []);
  const [traineeLines, setTraineeLines] = useLocalStorage<LaborLine[]>("bp_trainee_lines", []);
  const [journeymanRate, setJourneymanRate] = useLocalStorage<number>("bp_journeyman_rate", 95);
  const [traineeRate, setTraineeRate] = useLocalStorage<number>("bp_trainee_rate", 55);
  const [trashedProjects, setTrashedProjects] = useLocalStorage<TrashedProject[]>("bp_trash", []);

  // ── Unified projects (single list, uses CivilProject/CivilState type) ──────
  const [unifiedProjects, setUnifiedProjects] = useLocalStorage<CivilProject[]>(
    "bp_unified_projects",
    []
  );
  const safeUP = ensureOne(unifiedProjects, defaultCivilProject);
  const [activeUnifiedId, setActiveUnifiedId] = useLocalStorage<string>(
    "bp_active_unified",
    safeUP[0]?.id ?? ""
  );
  const activeUnifiedProject = safeUP.find((p) => p.id === activeUnifiedId) ?? safeUP[0] ?? defaultCivilProject();

  const unifiedStore = useCallback(
    () => makeProjectStore(safeUP, activeUnifiedId, setUnifiedProjects, setActiveUnifiedId, defaultCivilProject),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeUnifiedId, safeUP.length, setUnifiedProjects, setActiveUnifiedId]
  );

  // ── Active category (landing page selection) ──────────────────────────────
  const [activeCategory, setActiveCategory] = useLocalStorage<"civil" | "commercial" | "residential" | "industrial">("bp_active_category", "civil");
  // ── Industrial category store ─────────────────────────────────────────────
  const [industrialCatProjects, setIndustrialCatProjects] = useLocalStorage<CivilProject[]>("bp_industrial_cat_projects", []);
  const safeICP = ensureOne(industrialCatProjects, defaultCivilProject);
  const [activeIndustrialCatId, setActiveIndustrialCatId] = useLocalStorage<string>("bp_active_industrial_cat", safeICP[0]?.id ?? "");
  const activeIndustrialCatProject = safeICP.find((p) => p.id === activeIndustrialCatId) ?? safeICP[0] ?? defaultCivilProject();
  const industrialCatStore = useCallback(
    () => makeProjectStore(safeICP, activeIndustrialCatId, setIndustrialCatProjects, setActiveIndustrialCatId, defaultCivilProject),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeIndustrialCatId, safeICP.length, setIndustrialCatProjects, setActiveIndustrialCatId]
  );
  // ── Civil category store ──────────────────────────────────────────────────
  const [civilCatProjects, setCivilCatProjects] = useLocalStorage<CivilProject[]>("bp_civil_cat_projects", []);
  const safeCCP = ensureOne(civilCatProjects, defaultCivilProject);
  const [activeCivilCatId, setActiveCivilCatId] = useLocalStorage<string>("bp_active_civil_cat", safeCCP[0]?.id ?? "");
  const activeCivilCatProject = safeCCP.find((p) => p.id === activeCivilCatId) ?? safeCCP[0] ?? defaultCivilProject();
  const civilCatStore = useCallback(
    () => makeProjectStore(safeCCP, activeCivilCatId, setCivilCatProjects, setActiveCivilCatId, defaultCivilProject),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeCivilCatId, safeCCP.length, setCivilCatProjects, setActiveCivilCatId]
  );
  // ── Commercial category store ─────────────────────────────────────────────
  const [commercialCatProjects, setCommercialCatProjects] = useLocalStorage<CivilProject[]>("bp_commercial_cat_projects", []);
  const safeCmCP = ensureOne(commercialCatProjects, defaultCivilProject);
  const [activeCommercialCatId, setActiveCommercialCatId] = useLocalStorage<string>("bp_active_commercial_cat", safeCmCP[0]?.id ?? "");
  const activeCommercialCatProject = safeCmCP.find((p) => p.id === activeCommercialCatId) ?? safeCmCP[0] ?? defaultCivilProject();
  const commercialCatStore = useCallback(
    () => makeProjectStore(safeCmCP, activeCommercialCatId, setCommercialCatProjects, setActiveCommercialCatId, defaultCivilProject),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeCommercialCatId, safeCmCP.length, setCommercialCatProjects, setActiveCommercialCatId]
  );
  // ── Residential category store ────────────────────────────────────────────
  const [residentialCatProjects, setResidentialCatProjects] = useLocalStorage<CivilProject[]>("bp_residential_cat_projects", []);
  const safeRCP = ensureOne(residentialCatProjects, defaultCivilProject);
  const [activeResidentialCatId, setActiveResidentialCatId] = useLocalStorage<string>("bp_active_residential_cat", safeRCP[0]?.id ?? "");
  const activeResidentialCatProject = safeRCP.find((p) => p.id === activeResidentialCatId) ?? safeRCP[0] ?? defaultCivilProject();
  const residentialCatStore = useCallback(
    () => makeProjectStore(safeRCP, activeResidentialCatId, setResidentialCatProjects, setActiveResidentialCatId, defaultCivilProject),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeResidentialCatId, safeRCP.length, setResidentialCatProjects, setActiveResidentialCatId]
  );
  // ── Civil ─────────────────────────────────────────────────────────────────
  const [civilProjects, setCivilProjects] = useLocalStorage<CivilProject[]>(
    "bp_civil_projects",
    []
  );
  const safeCP = ensureOne(civilProjects, defaultCivilProject);
  const [activeCivilId, setActiveCivilId] = useLocalStorage<string>(
    "bp_active_civil",
    safeCP[0]?.id ?? ""
  );
  const activeCivilProject = safeCP.find((p) => p.id === activeCivilId) ?? safeCP[0] ?? defaultCivilProject();

  const civilStore = useCallback(
    () => makeProjectStore(safeCP, activeCivilId, setCivilProjects, setActiveCivilId, defaultCivilProject),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeCivilId, safeCP.length, setCivilProjects, setActiveCivilId]
  );

  // ── Commercial ────────────────────────────────────────────────────────────
  const [commercialProjects, setCommercialProjects] = useLocalStorage<CommercialProject[]>(
    "bp_commercial_projects",
    []
  );
  const safeCmP = ensureOne(commercialProjects, defaultCommercialProject);
  const [activeCommercialId, setActiveCommercialId] = useLocalStorage<string>(
    "bp_active_commercial",
    safeCmP[0]?.id ?? ""
  );
  const activeCommercialProject = safeCmP.find((p) => p.id === activeCommercialId) ?? safeCmP[0] ?? defaultCommercialProject();

  const commercialStore = useCallback(
    () => makeProjectStore(safeCmP, activeCommercialId, setCommercialProjects, setActiveCommercialId, defaultCommercialProject),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeCommercialId, safeCmP.length, setCommercialProjects, setActiveCommercialId]
  );

  // ── Residential ───────────────────────────────────────────────────────────
  const [residentialProjects, setResidentialProjects] = useLocalStorage<ResidentialProject[]>(
    "bp_residential_projects",
    []
  );
  const safeRP = ensureOne(residentialProjects, defaultResidentialProject);
  const [activeResidentialId, setActiveResidentialId] = useLocalStorage<string>(
    "bp_active_residential",
    safeRP[0]?.id ?? ""
  );
  const activeResidentialProject = safeRP.find((p) => p.id === activeResidentialId) ?? safeRP[0] ?? defaultResidentialProject();

  const residentialStore = useCallback(
    () => makeProjectStore(safeRP, activeResidentialId, setResidentialProjects, setActiveResidentialId, defaultResidentialProject),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeResidentialId, safeRP.length, setResidentialProjects, setActiveResidentialId]
  );

  // ── Legacy push helper (no longer called internally) ─────────────────────
  // CivilEditor uses its own onPushDistance prop on PlanPanel. This helper is
  // retained only to avoid breaking any external code that may reference it.
  const pushDistanceToCivil = useCallback(
    (ft: number) => {
      civilStore().setState({ ...activeCivilProject.state, distance: ft });
    },
    [activeCivilProject.state, civilStore]
  );


  // ── Master totals ──────────────────────────────────────────────────────────
  // Aggregates BOM materials + labor hours across ALL commercial projects.
  // Re-computed on every render where safeCmP changes (cheap — just array reduce).
  const masterTotals: MasterTotals = (() => {
    const lineMap = new Map<string, { description: string; unit: string; totalQty: number; unitCost: number; extCost: number }>();
    let totalLaborHours = 0;
    let totalMaterialCost = 0;
    for (const proj of safeCmP) {
      const { materials, totalLaborHours: lh } = proj.state;
      totalLaborHours += lh ?? 0;
      for (const m of materials ?? []) {
        const key = `${m.description}||${m.unit}||${m.unitCost}`;
        const existing = lineMap.get(key);
        if (existing) {
          existing.totalQty += m.quantity;
          existing.extCost  += m.unitCost * m.quantity;
        } else {
          lineMap.set(key, {
            description: m.description,
            unit: m.unit,
            totalQty: m.quantity,
            unitCost: m.unitCost,
            extCost: m.unitCost * m.quantity,
          });
        }
        totalMaterialCost += m.unitCost * m.quantity;
      }
    }
    return {
      totalLaborHours: parseFloat(totalLaborHours.toFixed(2)),
      totalMaterialCost: parseFloat(totalMaterialCost.toFixed(2)),
      lineItems: Array.from(lineMap.values()),
    };
  })();

  // ── Trash helpers ────────────────────────────────────────────────────────
  const trashProject = useCallback((project: CivilProject, category: "civil" | "commercial" | "residential" | "industrial") => {
    setTrashedProjects((prev) => [...prev, { project, category, deletedAt: Date.now() }]);
  }, [setTrashedProjects]);
  const restoreProject = useCallback((id: string) => {
    const item = trashedProjects.find((t) => t.project.id === id);
    if (!item) return;
    // Re-add to the correct category store
    if (item.category === "civil") {
      setCivilCatProjects((prev) => [...prev, item.project]);
    } else if (item.category === "commercial") {
      setCommercialCatProjects((prev) => [...prev, item.project]);
    } else if (item.category === "industrial") {
      setIndustrialCatProjects((prev) => [...prev, item.project]);
    } else {
      setResidentialCatProjects((prev) => [...prev, item.project]);
    }
    setTrashedProjects((prev) => prev.filter((t) => t.project.id !== id));
  }, [trashedProjects, setTrashedProjects, setCivilCatProjects, setCommercialCatProjects, setResidentialCatProjects, setIndustrialCatProjects]);
  const permanentlyDeleteProject = useCallback((id: string) => {
    setTrashedProjects((prev) => prev.filter((t) => t.project.id !== id));
  }, [setTrashedProjects]);
  const emptyTrash = useCallback(() => {
    // Only permanently remove items older than 30 days or all if user confirms
    setTrashedProjects([]);
  }, [setTrashedProjects]);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        activeCategory,
        setActiveCategory,

        // Category-specific project stores
        civilCatProjects: safeCCP,
        activeCivilCatId,
        activeCivilCatProject,
        setCivilCatState:        civilCatStore().setState,
        addCivilCatProject:      civilCatStore().add,
        renameCivilCatProject:   civilCatStore().rename,
        deleteCivilCatProject:   civilCatStore().remove,
        switchCivilCatProject:   civilCatStore().switchTo,
        commercialCatProjects: safeCmCP,
        activeCommercialCatId,
        activeCommercialCatProject,
        setCommercialCatState:        commercialCatStore().setState,
        addCommercialCatProject:      commercialCatStore().add,
        renameCommercialCatProject:   commercialCatStore().rename,
        deleteCommercialCatProject:   commercialCatStore().remove,
        switchCommercialCatProject:   commercialCatStore().switchTo,
        residentialCatProjects: safeRCP,
        activeResidentialCatId,
        activeResidentialCatProject,
        setResidentialCatState:        residentialCatStore().setState,
        addResidentialCatProject:      residentialCatStore().add,
        renameResidentialCatProject:   residentialCatStore().rename,
        deleteResidentialCatProject:   residentialCatStore().remove,
                switchResidentialCatProject:   residentialCatStore().switchTo,
        // Industrial category store
        industrialCatProjects: safeICP,
        activeIndustrialCatId,
        activeIndustrialCatProject,
        setIndustrialCatState:        industrialCatStore().setState,
        addIndustrialCatProject:      industrialCatStore().add,
        renameIndustrialCatProject:   industrialCatStore().rename,
        deleteIndustrialCatProject:   industrialCatStore().remove,
        switchIndustrialCatProject:   industrialCatStore().switchTo,
        // Unified projects
        unifiedProjects: safeUP,
        activeUnifiedId,
        activeUnifiedProject,
        setUnifiedState:        unifiedStore().setState,
        addUnifiedProject:      unifiedStore().add,
        renameUnifiedProject:   unifiedStore().rename,
        deleteUnifiedProject:   unifiedStore().remove,
        switchUnifiedProject:   unifiedStore().switchTo,

        // Civil
        civilProjects: safeCP,
        activeCivilId,
        activeCivilProject,
        setCivilState:        civilStore().setState,
        addCivilProject:      civilStore().add,
        renameCivilProject:   civilStore().rename,
        deleteCivilProject:   civilStore().remove,
        switchCivilProject:   civilStore().switchTo,

        // Commercial
        commercialProjects: safeCmP,
        activeCommercialId,
        activeCommercialProject,
        setAssemblyState:        commercialStore().setState,
        addCommercialProject:    commercialStore().add,
        renameCommercialProject: commercialStore().rename,
        deleteCommercialProject: commercialStore().remove,
        switchCommercialProject: commercialStore().switchTo,

        // Residential
        residentialProjects: safeRP,
        activeResidentialId,
        activeResidentialProject,
        setRoomState:              residentialStore().setState,
        addResidentialProject:     residentialStore().add,
        renameResidentialProject:  residentialStore().rename,
        deleteResidentialProject:  residentialStore().remove,
        switchResidentialProject:  residentialStore().switchTo,

        // Master totals (aggregate across all commercial projects)
        masterTotals,

        // Legacy helpers
        pushDistanceToCivil,

        // UI settings
        uiFontScale,
        setUiFontScale,

        // Material List page toggle
        showMaterialList,
        setShowMaterialList,

        // Labor + markup (persisted)
        laborHours,
        setLaborHours,
        laborRate,
        setLaborRate,
        markupPct,
        setMarkupPct,

        // Journeyman & Trainee labor lines
        journeymanLines,
        setJourneymanLines,
        traineeLines,
        setTraineeLines,
        journeymanRate,
        setJourneymanRate,
        traineeRate,
        setTraineeRate,
        // Trash
        trashedProjects,
        trashProject,
        restoreProject,
        permanentlyDeleteProject,
        emptyTrash,

        // Legacy single-state accessors for ExportButton
        civilState:      activeCivilProject.state,
        assemblyState:   activeCommercialProject.state,
        roomState:       activeResidentialProject.state,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
