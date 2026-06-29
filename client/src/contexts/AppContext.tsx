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
  feet: number;
  conduitSize: string;        // e.g. "3/4"
  conduitType: CivilConduitType;
  conductors: number;
  conductorMaterial: ConductorMaterial;
  conductorSize: ConductorSize;
  fittings: FittingCounts;
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
export function defaultCivilProject(name = "Job 1"): CivilProject {
  return {
    id: nanoid(8),
    name,
    createdAt: Date.now(),
    state: { distance: 0, conductors: 2, conduitSize: "3/4" },
  };
}

export function defaultCommercialProject(name = "Job 1"): CommercialProject {
  return {
    id: nanoid(8),
    name,
    createdAt: Date.now(),
    state: { assemblyId: "receptacle-20a", quantity: 1, materials: [], totalLaborHours: 0, iconId: "dot", pinColor: "#39FF14" },
  };
}

export function defaultResidentialProject(name = "Job 1"): ResidentialProject {
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
function ensureOne<T extends { id: string }>(list: T[], makeDefault: () => T): T[] {
  return list.length > 0 ? list : [makeDefault()];
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
      const safe = ensureOne(next, makeDefault);
      if (activeId === id) setActiveId(safe[0].id);
      return safe;
    });
  };

  const switchTo = (id: string) => setActiveId(id);

  return { setState, add, rename, remove, switchTo };
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useLocalStorage<string>("bp_active_tab", "residential");
  const [uiFontScale, setUiFontScale] = useLocalStorage<number>("bp_ui_font_scale", 1.1);
  const [showMaterialList, setShowMaterialList] = useState(false);
  const [laborHours, setLaborHours] = useLocalStorage<number>("bp_labor_hours", 0);
  const [laborRate, setLaborRate] = useLocalStorage<number>("bp_labor_rate", 85);
  const [markupPct, setMarkupPct] = useLocalStorage<number>("bp_markup_pct", 0);
  const [journeymanLines, setJourneymanLines] = useLocalStorage<LaborLine[]>("bp_journeyman_lines", []);
  const [traineeLines, setTraineeLines] = useLocalStorage<LaborLine[]>("bp_trainee_lines", []);
  const [journeymanRate, setJourneymanRate] = useLocalStorage<number>("bp_journeyman_rate", 95);
  const [traineeRate, setTraineeRate] = useLocalStorage<number>("bp_trainee_rate", 55);

  // ── Civil ─────────────────────────────────────────────────────────────────
  const [civilProjects, setCivilProjects] = useLocalStorage<CivilProject[]>(
    "bp_civil_projects",
    [defaultCivilProject()]
  );
  const safeCP = ensureOne(civilProjects, defaultCivilProject);
  const [activeCivilId, setActiveCivilId] = useLocalStorage<string>(
    "bp_active_civil",
    safeCP[0].id
  );
  const activeCivilProject = safeCP.find((p) => p.id === activeCivilId) ?? safeCP[0];

  const civilStore = useCallback(
    () => makeProjectStore(safeCP, activeCivilId, setCivilProjects, setActiveCivilId, defaultCivilProject),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeCivilId, safeCP.length, setCivilProjects, setActiveCivilId]
  );

  // ── Commercial ────────────────────────────────────────────────────────────
  const [commercialProjects, setCommercialProjects] = useLocalStorage<CommercialProject[]>(
    "bp_commercial_projects",
    [defaultCommercialProject()]
  );
  const safeCmP = ensureOne(commercialProjects, defaultCommercialProject);
  const [activeCommercialId, setActiveCommercialId] = useLocalStorage<string>(
    "bp_active_commercial",
    safeCmP[0].id
  );
  const activeCommercialProject = safeCmP.find((p) => p.id === activeCommercialId) ?? safeCmP[0];

  const commercialStore = useCallback(
    () => makeProjectStore(safeCmP, activeCommercialId, setCommercialProjects, setActiveCommercialId, defaultCommercialProject),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeCommercialId, safeCmP.length, setCommercialProjects, setActiveCommercialId]
  );

  // ── Residential ───────────────────────────────────────────────────────────
  const [residentialProjects, setResidentialProjects] = useLocalStorage<ResidentialProject[]>(
    "bp_residential_projects",
    [defaultResidentialProject()]
  );
  const safeRP = ensureOne(residentialProjects, defaultResidentialProject);
  const [activeResidentialId, setActiveResidentialId] = useLocalStorage<string>(
    "bp_active_residential",
    safeRP[0].id
  );
  const activeResidentialProject = safeRP.find((p) => p.id === activeResidentialId) ?? safeRP[0];

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

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,

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
