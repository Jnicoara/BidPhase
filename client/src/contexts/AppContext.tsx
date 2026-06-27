/**
 * BidPhase — Global App Context
 * Manages cross-tab state: measured distance from Plan Viewer → Civil Calculator,
 * civil outputs, assembly outputs, and room outputs for CSV export.
 */
import React, { createContext, useContext, useCallback } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

// ─── Civil / Underground ─────────────────────────────────────────────────────
export interface CivilState {
  distance: number;
  conductors: number;
}

// ─── Commercial Assembly ─────────────────────────────────────────────────────
export interface AssemblyMaterialLine {
  description: string;
  unit: string;
  unitCost: number;
  quantity: number; // per-assembly qty × user qty
}

export interface AssemblyState {
  assemblyId: string;
  quantity: number;
  materials: AssemblyMaterialLine[];
  totalLaborHours: number;
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

// ─── Context shape ────────────────────────────────────────────────────────────
interface AppContextValue {
  // Plan Viewer → Civil push
  pushedDistance: number;
  pushDistanceToCivil: (ft: number) => void;

  // Active tab
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Civil outputs (for export)
  civilState: CivilState;
  setCivilState: (s: CivilState) => void;

  // Assembly outputs (for export)
  assemblyState: AssemblyState;
  setAssemblyState: (s: AssemblyState) => void;

  // Room outputs (for export)
  roomState: RoomState;
  setRoomState: (s: RoomState) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [pushedDistance, setPushedDistance] = useLocalStorage<number>("bp_pushed_distance", 0);
  const [activeTab, setActiveTab] = useLocalStorage<string>("bp_active_tab", "plan");
  const [civilState, setCivilState] = useLocalStorage<CivilState>("bp_civil", {
    distance: 0,
    conductors: 2,
  });
  const [assemblyState, setAssemblyState] = useLocalStorage<AssemblyState>("bp_assembly", {
    assemblyId: "receptacle-20a",
    quantity: 1,
    materials: [],
    totalLaborHours: 0,
  });
  const [roomState, setRoomState] = useLocalStorage<RoomState>("bp_room", {
    roomId: "bedroom",
    materials: [],
  });

  const pushDistanceToCivil = useCallback(
    (ft: number) => {
      setPushedDistance(ft);
      setCivilState((prev) => ({ ...prev, distance: ft }));
      setActiveTab("civil");
    },
    [setPushedDistance, setCivilState, setActiveTab]
  );

  return (
    <AppContext.Provider
      value={{
        pushedDistance,
        pushDistanceToCivil,
        activeTab,
        setActiveTab,
        civilState,
        setCivilState,
        assemblyState,
        setAssemblyState,
        roomState,
        setRoomState,
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
