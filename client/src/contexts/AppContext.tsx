/**
 * BidPhase — Global App Context
 *
 * Multi-project support for all three tabs (Civil, Commercial, Residential).
 * Each tab has its own list of named projects; the active project per tab is
 * stored in localStorage. Each project stores its own calculator state.
 *
 * Architecture note — CivilState vs. actual run data:
 *   CivilState is intentionally kept as a minimal "legacy scalar" interface
 *   (distance / conductors / conduitSize) so that the type stays stable and
 *   the localStorage key "bp_civil_projects" remains backward-compatible.
 *   The richer per-run array (RunItem[]) is stored by CivilEditor at runtime
 *   by spreading `{ runs: RunItem[] }` onto the state object via an `as any`
 *   cast. ExportButton reads it back the same way. This is a known trade-off:
 *   the type is intentionally loose here to avoid a breaking schema migration.
 *   If the schema needs to evolve, update CivilState, defaultCivilProject, and
 *   the CivilEditor initializer together.
 *
 * Project CRUD pattern:
 *   All three tabs share identical project management logic (add / rename /
 *   delete / switch / set-state). Rather than duplicating ~55 lines three
 *   times, we use a `makeProjectStore` factory that closes over the per-tab
 *   localStorage setters and returns the five callbacks.
 */
import React, { createContext, useContext, useCallback } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { nanoid } from "nanoid";

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

// ─── Civil / Underground ─────────────────────────────────────────────────────
// NOTE: This interface only declares the legacy scalar fields for type safety.
// At runtime, CivilEditor appends `{ runs: RunItem[] }` to this object via an
// `as any` cast (see CivilCalculator.tsx → syncRuns). ExportButton reads the
// same `runs` array back with the same cast. Do NOT add `runs` here unless
// you also update the localStorage migration logic.
export interface CivilState {
  distance: number;
  conductors: number;
  conduitSize: ConduitSize;
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

export interface AssemblyState {
  assemblyId: string;
  quantity: number;
  materials: AssemblyMaterialLine[];
  totalLaborHours: number;
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
    state: { assemblyId: "receptacle-20a", quantity: 1, materials: [], totalLaborHours: 0 },
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

        // Legacy helpers
        pushDistanceToCivil,

        // UI settings
        uiFontScale,
        setUiFontScale,

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
