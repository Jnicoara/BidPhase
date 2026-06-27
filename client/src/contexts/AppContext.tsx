/**
 * BidPhase — Global App Context
 *
 * Multi-project support for all three tabs.
 * Each tab (civil / commercial / residential) has its own list of named projects.
 * The active project per tab is stored in localStorage.
 * Each project stores its own calculator state independently.
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
  { value: "1/2", label: '½"' },
  { value: "3/4", label: '¾"' },
  { value: "1",   label: '1"' },
  { value: "1-1/4", label: '1¼"' },
  { value: "1-1/2", label: '1½"' },
  { value: "2",   label: '2"' },
  { value: "2-1/2", label: '2½"' },
  { value: "3",   label: '3"' },
  { value: "3-1/2", label: '3½"' },
  { value: "4",   label: '4"' },
] as const;

export type ConduitSize = typeof CONDUIT_SIZES[number]["value"];

// ─── Civil / Underground ─────────────────────────────────────────────────────
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

  // ── Plan → calculator push ──────────────────────────────────────────────────
  pushDistanceToCivil: (ft: number) => void;

  // ── UI settings ────────────────────────────────────────────────────────────
  uiFontScale: number;           // 0.8 – 1.4, default 1.1
  setUiFontScale: (v: number) => void;

  // ── Legacy single-state accessors for ExportButton ─────────────────────────
  civilState: CivilState;
  assemblyState: AssemblyState;
  roomState: RoomState;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Helper: ensure at least one project exists ───────────────────────────────
function ensureOne<T extends { id: string }>(
  list: T[],
  makeDefault: () => T
): T[] {
  return list.length > 0 ? list : [makeDefault()];
}

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
  const activeCivilProject =
    safeCP.find((p) => p.id === activeCivilId) ?? safeCP[0];

  const setCivilState = useCallback(
    (s: CivilState) => {
      setCivilProjects((prev) =>
        prev.map((p) => (p.id === activeCivilId ? { ...p, state: s } : p))
      );
    },
    [activeCivilId, setCivilProjects]
  );

  const addCivilProject = useCallback(
    (name?: string) => {
      const proj = defaultCivilProject(name ?? `Job ${civilProjects.length + 1}`);
      setCivilProjects((prev) => [...prev, proj]);
      setActiveCivilId(proj.id);
    },
    [civilProjects.length, setCivilProjects, setActiveCivilId]
  );

  const renameCivilProject = useCallback(
    (id: string, name: string) => {
      setCivilProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name } : p))
      );
    },
    [setCivilProjects]
  );

  const deleteCivilProject = useCallback(
    (id: string) => {
      setCivilProjects((prev) => {
        const next = prev.filter((p) => p.id !== id);
        const safe = ensureOne(next, defaultCivilProject);
        if (activeCivilId === id) setActiveCivilId(safe[0].id);
        return safe;
      });
    },
    [activeCivilId, setCivilProjects, setActiveCivilId]
  );

  const switchCivilProject = useCallback(
    (id: string) => setActiveCivilId(id),
    [setActiveCivilId]
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
  const activeCommercialProject =
    safeCmP.find((p) => p.id === activeCommercialId) ?? safeCmP[0];

  const setAssemblyState = useCallback(
    (s: AssemblyState) => {
      setCommercialProjects((prev) =>
        prev.map((p) => (p.id === activeCommercialId ? { ...p, state: s } : p))
      );
    },
    [activeCommercialId, setCommercialProjects]
  );

  const addCommercialProject = useCallback(
    (name?: string) => {
      const proj = defaultCommercialProject(name ?? `Job ${commercialProjects.length + 1}`);
      setCommercialProjects((prev) => [...prev, proj]);
      setActiveCommercialId(proj.id);
    },
    [commercialProjects.length, setCommercialProjects, setActiveCommercialId]
  );

  const renameCommercialProject = useCallback(
    (id: string, name: string) => {
      setCommercialProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name } : p))
      );
    },
    [setCommercialProjects]
  );

  const deleteCommercialProject = useCallback(
    (id: string) => {
      setCommercialProjects((prev) => {
        const next = prev.filter((p) => p.id !== id);
        const safe = ensureOne(next, defaultCommercialProject);
        if (activeCommercialId === id) setActiveCommercialId(safe[0].id);
        return safe;
      });
    },
    [activeCommercialId, setCommercialProjects, setActiveCommercialId]
  );

  const switchCommercialProject = useCallback(
    (id: string) => setActiveCommercialId(id),
    [setActiveCommercialId]
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
  const activeResidentialProject =
    safeRP.find((p) => p.id === activeResidentialId) ?? safeRP[0];

  const setRoomState = useCallback(
    (s: RoomState) => {
      setResidentialProjects((prev) =>
        prev.map((p) => (p.id === activeResidentialId ? { ...p, state: s } : p))
      );
    },
    [activeResidentialId, setResidentialProjects]
  );

  const addResidentialProject = useCallback(
    (name?: string) => {
      const proj = defaultResidentialProject(name ?? `Job ${residentialProjects.length + 1}`);
      setResidentialProjects((prev) => [...prev, proj]);
      setActiveResidentialId(proj.id);
    },
    [residentialProjects.length, setResidentialProjects, setActiveResidentialId]
  );

  const renameResidentialProject = useCallback(
    (id: string, name: string) => {
      setResidentialProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name } : p))
      );
    },
    [setResidentialProjects]
  );

  const deleteResidentialProject = useCallback(
    (id: string) => {
      setResidentialProjects((prev) => {
        const next = prev.filter((p) => p.id !== id);
        const safe = ensureOne(next, defaultResidentialProject);
        if (activeResidentialId === id) setActiveResidentialId(safe[0].id);
        return safe;
      });
    },
    [activeResidentialId, setResidentialProjects, setActiveResidentialId]
  );

  const switchResidentialProject = useCallback(
    (id: string) => setActiveResidentialId(id),
    [setActiveResidentialId]
  );

  // ── Push distance to civil ────────────────────────────────────────────────
  const pushDistanceToCivil = useCallback(
    (ft: number) => {
      setCivilState({ ...activeCivilProject.state, distance: ft });
    },
    [activeCivilProject.state, setCivilState]
  );

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,

        civilProjects: safeCP,
        activeCivilId,
        activeCivilProject,
        setCivilState,
        addCivilProject,
        renameCivilProject,
        deleteCivilProject,
        switchCivilProject,

        commercialProjects: safeCmP,
        activeCommercialId,
        activeCommercialProject,
        setAssemblyState,
        addCommercialProject,
        renameCommercialProject,
        deleteCommercialProject,
        switchCommercialProject,

        residentialProjects: safeRP,
        activeResidentialId,
        activeResidentialProject,
        setRoomState,
        addResidentialProject,
        renameResidentialProject,
        deleteResidentialProject,
        switchResidentialProject,

        pushDistanceToCivil,

        uiFontScale,
        setUiFontScale,

        // Legacy accessors for ExportButton
        civilState: activeCivilProject.state,
        assemblyState: activeCommercialProject.state,
        roomState: activeResidentialProject.state,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
