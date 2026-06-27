/**
 * BidPhase — Civil & Underground Conduit Calculator
 * Design: Tactical Dark Mode SaaS · Space Grotesk headers · JetBrains Mono outputs
 *
 * Features:
 * - Project homepage (card grid) → open project editor
 * - Multi-project manager (add / rename / delete / switch)
 * - Embedded PlanPanel (resizable split pane)
 * - Per-run line items auto-pushed from the plan panel
 * - Conduit size selector per run
 * - Manual fittings selector (connectors, couplings, LBs, elbows, sweeps, etc.)
 * - Total wire length with 10% slack
 */
import { useState, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import { CONDUIT_SIZES } from "@/contexts/AppContext";
import type { CivilState } from "@/contexts/AppContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import PlanPanel from "@/components/PlanPanel";
import ProjectHomepage from "@/components/ProjectHomepage";
import { cn } from "@/lib/utils";
import {
  Zap, Package, Cable, Plus, Minus, ChevronLeft,
  Wrench, Link2
} from "lucide-react";
import { toast } from "sonner";

// ─── Conduit material types ───────────────────────────────────────────────────
const CONDUIT_TYPES = [
  { id: "EMT",  label: "EMT"  },
  { id: "IMC",  label: "IMC"  },
  { id: "RMC",  label: "RMC"  },
  { id: "PVC",  label: "PVC"  },
  { id: "LFMC", label: "LFMC" },
  { id: "LFNC", label: "LFNC" },
] as const;

type ConduitType = typeof CONDUIT_TYPES[number]["id"];

// ─── Fitting types ────────────────────────────────────────────────────────────
const FITTING_TYPES = [
  { id: "connector",  label: "Connectors",   short: "CONN" },
  { id: "coupling",   label: "Couplings",    short: "COUP" },
  { id: "lb",         label: "LBs",          short: "LB"   },
  { id: "elbow90",    label: "90° Elbows",   short: "90°"  },
  { id: "elbow45",    label: "45° Elbows",   short: "45°"  },
  { id: "sweep",      label: "Sweeps",       short: "SWP"  },
  { id: "offset",     label: "Offsets",      short: "OFF"  },
] as const;

type FittingId = typeof FITTING_TYPES[number]["id"];

interface FittingCounts {
  connector: number;
  coupling: number;
  lb: number;
  elbow90: number;
  elbow45: number;
  sweep: number;
  offset: number;
}

// ─── Per-run item (auto-pushed from plan panel) ───────────────────────────────
interface RunItem {
  id: string;
  name: string;
  feet: number;
  conduitSize: string;
  conduitType: ConduitType;
  conductors: number;
  fittings: FittingCounts;
}

function defaultFittings(): FittingCounts {
  return { connector: 0, coupling: 0, lb: 0, elbow90: 0, elbow45: 0, sweep: 0, offset: 0 };
}

function calcWire(feet: number, conductors: number) {
  return parseFloat((feet * conductors * 1.1).toFixed(1));
}

function calcSticks(feet: number) {
  return Math.ceil(feet / 10);
}

// ─── Fitting Counter ──────────────────────────────────────────────────────────
function FittingCounter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground font-mono">{label}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-5 h-5 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-[#F5C518]/50 transition-colors"
        >
          <Minus size={10} />
        </button>
        <span className="w-7 text-center text-xs font-mono font-semibold text-foreground">
          {value}
        </span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-5 h-5 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-[#F5C518]/50 transition-colors"
        >
          <Plus size={10} />
        </button>
      </div>
    </div>
  );
}

// ─── Run Card ─────────────────────────────────────────────────────────────────
function RunCard({
  run,
  index,
  onUpdate,
  onRemove,
}: {
  run: RunItem;
  index: number;
  onUpdate: (id: string, partial: Partial<RunItem>) => void;
  onRemove: (id: string) => void;
}) {
  const [showFittings, setShowFittings] = useState(false);
  const sticks = calcSticks(run.feet);
  const wire = calcWire(run.feet, run.conductors);

  const updateFitting = (key: FittingId, val: number) => {
    onUpdate(run.id, { fittings: { ...run.fittings, [key]: val } });
  };

  const totalFittings = Object.values(run.fittings).reduce((a, b) => a + b, 0);

  return (
    <div className="bp-card overflow-hidden">
      {/* Run header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/10">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              background: ["#22C55E","#3B82F6","#F97316","#A855F7","#EC4899","#14B8A6"][index % 6],
            }}
          />
          <span
            className="text-sm font-semibold text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {run.name}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
            {run.conduitType ?? "EMT"} {run.conduitSize}"
          </span>
        </div>
        <button
          onClick={() => onRemove(run.id)}
          className="text-muted-foreground hover:text-destructive transition-colors"
          title="Remove run"
        >
          <Minus size={12} />
        </button>
      </div>

      {/* Run body */}
      <div className="p-4 space-y-4">
        {/* Distance + Conductors row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Distance (ft)</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={run.feet || ""}
              onChange={(e) => onUpdate(run.id, { feet: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="h-8 font-mono text-sm bg-input border-border"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Conductors</Label>
              <span className="text-sm font-bold text-[#F5C518] font-mono">{run.conductors}</span>
            </div>
            <Slider
              min={1} max={12} step={1}
              value={[run.conductors]}
              onValueChange={([v]) => onUpdate(run.id, { conductors: v })}
              className="[&_[role=slider]]:bg-[#F5C518] [&_[role=slider]]:border-[#F5C518] [&_.bg-primary]:bg-[#F5C518]"
            />
          </div>
        </div>

        {/* Conduit type */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Conduit Type</Label>
          <div className="flex flex-wrap gap-1">
            {CONDUIT_TYPES.map((ct) => (
              <button
                key={ct.id}
                onClick={() => onUpdate(run.id, { conduitType: ct.id as ConduitType })}
                className={cn(
                  "px-2.5 py-1 rounded text-[10px] font-mono font-semibold border transition-all",
                  (run.conduitType ?? "EMT") === ct.id
                    ? "bg-yellow-400 text-black border-yellow-400"
                    : "bg-muted/30 text-muted-foreground border-border hover:border-yellow-400/50 hover:text-foreground"
                )}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conduit size */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Conduit Size</Label>
          <div className="grid grid-cols-5 gap-1">
            {CONDUIT_SIZES.map((cs) => (
              <button
                key={cs.value}
                onClick={() => onUpdate(run.id, { conduitSize: cs.value })}
                className={cn(
                  "py-1 rounded text-[10px] font-mono font-medium border transition-all",
                  run.conduitSize === cs.value
                    ? "bg-yellow-400 text-black border-yellow-400"
                    : "bg-muted/30 text-muted-foreground border-border hover:border-yellow-400/50 hover:text-foreground"
                )}
              >
                {cs.label}
              </button>
            ))}
          </div>
        </div>

        {/* Calculated outputs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/20 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              <Package size={10} /> Pipe Sticks
            </div>
            <div className="text-xl font-bold font-mono text-foreground">{sticks}</div>
            <div className="text-[10px] text-muted-foreground font-mono">10-ft sticks</div>
          </div>
          <div className="bg-muted/20 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              <Cable size={10} /> Wire Length
            </div>
            <div className="text-xl font-bold font-mono text-foreground">{wire}</div>
            <div className="text-[10px] text-muted-foreground font-mono">ft w/ 10% slack</div>
          </div>
        </div>

        {/* Fittings toggle */}
        <button
          onClick={() => setShowFittings((v) => !v)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-xs font-medium",
            showFittings
              ? "border-[#F5C518]/40 bg-[#F5C518]/5 text-[#F5C518]"
              : "border-border bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border/80"
          )}
        >
          <div className="flex items-center gap-2">
            <Wrench size={12} />
            <span>Fittings</span>
            {totalFittings > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#F5C518]/20 text-[#F5C518] text-[10px] font-bold">
                {totalFittings}
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">{showFittings ? "▲" : "▼"}</span>
        </button>

        {showFittings && (
          <div className="bg-muted/10 rounded-lg px-3 py-2 border border-border/50">
            {FITTING_TYPES.map((ft) => (
              <FittingCounter
                key={ft.id}
                label={ft.label}
                value={run.fittings[ft.id]}
                onChange={(v) => updateFitting(ft.id, v)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Editor view ─────────────────────────────────────────────────────────────
function CivilEditor({
  projectId,
  projectName,
  onBack,
}: {
  projectId: string;
  projectName: string;
  onBack: () => void;
}) {
  const { activeCivilProject, setCivilState } = useApp();
  const s = activeCivilProject.state;

  // Per-run items — stored in component state (persisted via AppContext civilState.runs)
  // We keep runs in local state here and sync to civilState for CSV export
  const [runs, setRuns] = useState<RunItem[]>(() => {
    // If civilState has runs, restore them; otherwise start empty
    const stored = (s as any).runs as RunItem[] | undefined;
    return stored ?? [];
  });

  const syncRuns = useCallback(
    (next: RunItem[]) => {
      setRuns(next);
      // Persist runs into civilState so CSV export can read them
      setCivilState({ ...s, ...(({ runs: next }) as any) } as CivilState);
    },
    [s, setCivilState]
  );

  const handlePush = useCallback(
    (ft: number, runName: string, conduitSize?: string) => {
      const existingIdx = runs.findIndex((r) => r.name === runName);
      if (existingIdx !== -1) {
        // Replace existing run — update footage + conduit size, keep other settings
        const updated = runs.map((r) =>
          r.name === runName
            ? { ...r, feet: ft, conduitSize: conduitSize ?? r.conduitSize }
            : r
        );
        syncRuns(updated);
        toast.success(`"${runName}" updated — ${ft} ft.`);
      } else {
        const newRun: RunItem = {
          id: `run-${Date.now()}`,
          name: runName,
          feet: ft,
          conduitSize: conduitSize ?? "3/4",
          conduitType: "EMT",
          conductors: 2,
          fittings: defaultFittings(),
        };
        // Newest first — prepend
        syncRuns([newRun, ...runs]);
        toast.success(`"${runName}" pushed — ${ft} ft added as a new run.`);
      }
    },
    [runs, syncRuns]
  );

  const updateRun = (id: string, partial: Partial<RunItem>) => {
    syncRuns(runs.map((r) => (r.id === id ? { ...r, ...partial } : r)));
  };

  const removeRun = (id: string) => {
    syncRuns(runs.filter((r) => r.id !== id));
  };

  // Called when a run is deleted from PlanPanel's run strip
  const handleDeleteRun = useCallback(
    (runName: string) => {
      syncRuns(runs.filter((r) => r.name !== runName));
    },
    [runs, syncRuns]
  );

  const totalWire = runs.reduce((acc, r) => acc + calcWire(r.feet, r.conductors), 0);
  const totalSticks = runs.reduce((acc, r) => acc + calcSticks(r.feet), 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Back bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/10 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} /> All Projects
        </button>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-xs font-medium text-foreground">{projectName}</span>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* ── Plan Panel ── */}
        <ResizablePanel defaultSize={50} minSize={25} maxSize={75}>
          <PlanPanel
            tabKey={`civil_${projectId}`}
            onPushDistance={(ft, runName, conduitSize) => handlePush(ft, runName, conduitSize)}
            onDeleteRun={handleDeleteRun}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* ── Calculator / Runs ── */}
        <ResizablePanel defaultSize={50} minSize={25}>
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-border bg-card shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F5C518]/15 flex items-center justify-center">
                  <Zap size={16} className="text-[#F5C518]" />
                </div>
                <div>
                  <h1
                    className="text-base font-bold text-foreground"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Civil & Underground
                  </h1>
                  <p className="text-xs text-muted-foreground">{projectName}</p>
                </div>
              </div>
            </div>

            {/* Runs list */}
            <div className="flex-1 overflow-auto p-4 pb-24 space-y-4">
              {runs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center">
                    <Link2 size={20} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">No runs yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Load a PDF, measure a conduit run, then push it here.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Newest first — already prepended on push */}
                  {runs.map((run, i) => (
                    <RunCard
                      key={run.id}
                      run={run}
                      index={i}
                      onUpdate={updateRun}
                      onRemove={removeRun}
                    />
                  ))}

                  {/* Totals summary */}
                  <div className="bp-card p-4 border-[#F5C518]/20">
                    <h3
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      Project Totals
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Pipe Sticks</div>
                        <div className="text-2xl font-bold font-mono text-[#F5C518]">{totalSticks}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Total Wire</div>
                        <div className="text-2xl font-bold font-mono text-[#F5C518]">{totalWire.toFixed(1)} ft</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CivilCalculator() {
  const {
    civilProjects,
    activeCivilId,
    activeCivilProject,
    addCivilProject,
    renameCivilProject,
    deleteCivilProject,
    switchCivilProject,
  } = useApp();

  // "null" means show homepage; a project id means show editor
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);

  const handleOpen = (id: string) => {
    switchCivilProject(id);
    setOpenProjectId(id);
  };

  const handleNew = (name: string) => {
    addCivilProject(name);
    // After adding, the new project becomes active — open it immediately
    // We need a small delay since addCivilProject is async state update
    setTimeout(() => {
      // The new project is the last one
      setOpenProjectId(null); // trigger re-render to pick up new activeCivilId
      // Actually open it after state settles
      setTimeout(() => setOpenProjectId("__new__"), 50);
    }, 50);
  };

  // When openProjectId is "__new__", resolve to actual activeCivilId
  const resolvedOpenId =
    openProjectId === "__new__" ? activeCivilId : openProjectId;

  const projectCards = civilProjects.map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: p.createdAt,
    summary:
      (p.state as any).runs?.length > 0
        ? `${(p.state as any).runs.length} run${(p.state as any).runs.length !== 1 ? "s" : ""}`
        : "No runs yet",
  }));

  if (!resolvedOpenId) {
    return (
      <ProjectHomepage
        title="Civil & Underground"
        icon={<Zap size={18} className="text-[#F5C518]" />}
        projects={projectCards}
        activeId={activeCivilId}
        onOpen={handleOpen}
        onNew={handleNew}
        onRename={renameCivilProject}
        onDelete={deleteCivilProject}
      />
    );
  }

  const proj = civilProjects.find((p) => p.id === resolvedOpenId) ?? activeCivilProject;

  return (
    <CivilEditor
      projectId={proj.id}
      projectName={proj.name}
      onBack={() => setOpenProjectId(null)}
    />
  );
}
