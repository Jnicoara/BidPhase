/**
 * BidPhase — Civil & Underground Conduit Calculator
 * Design: Tactical Dark Mode SaaS · Space Grotesk headers · JetBrains Mono outputs
 *
 * Features:
 * - Multi-project manager (add / rename / delete / switch)
 * - Embedded PlanPanel (resizable split pane)
 * - Conduit size selector
 * - Auto-calculated outputs: pipe sticks, couplings, wire length w/ 10% slack
 */
import { useState, useRef, useEffect } from "react";
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
import { cn } from "@/lib/utils";
import { Zap, Package, Link2, Cable, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

function calcOutputs(distance: number, conductors: number) {
  if (distance <= 0) return { sticks: 0, couplings: 0, wireLength: 0 };
  const sticks = Math.ceil(distance / 10);
  const couplings = Math.max(sticks - 1, 0);
  const wireLength = parseFloat((distance * conductors * 1.1).toFixed(1));
  return { sticks, couplings, wireLength };
}

// ─── Project Manager Strip ────────────────────────────────────────────────────
function ProjectStrip() {
  const {
    civilProjects,
    activeCivilId,
    switchCivilProject,
    addCivilProject,
    renameCivilProject,
    deleteCivilProject,
  } = useApp();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  const commitEdit = (id: string) => {
    const t = editName.trim();
    if (t) renameCivilProject(id, t);
    setEditingId(null);
  };

  const handleAdd = () => {
    const name = newName.trim() || `Job ${civilProjects.length + 1}`;
    addCivilProject(name);
    setNewName("");
    setShowNew(false);
    toast.success(`Project "${name}" created.`);
  };

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/20 shrink-0 overflow-x-auto">
      <span className="text-[10px] font-semibold text-muted-foreground mr-1 shrink-0 uppercase tracking-wide">Jobs:</span>
      {civilProjects.map((proj) => (
        <div
          key={proj.id}
          className={cn(
            "flex items-center gap-0.5 rounded border transition-all shrink-0",
            proj.id === activeCivilId
              ? "bg-yellow-400/10 border-yellow-400/40"
              : "border-transparent hover:border-border"
          )}
        >
          {editingId === proj.id ? (
            <div className="flex items-center gap-0.5 px-1">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit(proj.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="h-5 w-24 text-[10px] bg-background border border-border rounded px-1 text-foreground"
              />
              <button onClick={() => commitEdit(proj.id)} className="text-green-400 hover:text-green-300"><Check size={10} /></button>
              <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground"><X size={10} /></button>
            </div>
          ) : (
            <>
              <button
                onClick={() => switchCivilProject(proj.id)}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-medium whitespace-nowrap transition-colors",
                  proj.id === activeCivilId ? "text-yellow-400" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {proj.name}
              </button>
              <button
                onClick={() => { setEditingId(proj.id); setEditName(proj.name); }}
                className="px-0.5 text-muted-foreground hover:text-foreground transition-colors"
                title="Rename"
              >
                <Pencil size={9} />
              </button>
              {civilProjects.length > 1 && (
                <button
                  onClick={() => { deleteCivilProject(proj.id); toast.info(`Deleted "${proj.name}".`); }}
                  className="px-0.5 text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete project"
                >
                  <Trash2 size={9} />
                </button>
              )}
            </>
          )}
        </div>
      ))}

      {showNew ? (
        <div className="flex items-center gap-0.5 shrink-0">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setShowNew(false);
            }}
            placeholder="Job name…"
            className="h-5 w-24 text-[10px] bg-background border border-border rounded px-1 text-foreground"
          />
          <button onClick={handleAdd} className="text-green-400 hover:text-green-300"><Check size={10} /></button>
          <button onClick={() => setShowNew(false)} className="text-muted-foreground hover:text-foreground"><X size={10} /></button>
        </div>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <Plus size={10} /> New Job
        </button>
      )}
    </div>
  );
}

// ─── Output Card ──────────────────────────────────────────────────────────────
function OutputCard({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string | number; unit: string }) {
  return (
    <div className="bp-card p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
        {icon}{label}
      </div>
      <div className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground font-mono">{unit}</div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CivilCalculator() {
  const { activeCivilProject, setCivilState } = useApp();
  const s = activeCivilProject.state;
  const { sticks, couplings, wireLength } = calcOutputs(s.distance, s.conductors);

  const update = (partial: Partial<CivilState>) => setCivilState({ ...s, ...partial });

  const handlePush = (ft: number) => {
    update({ distance: ft });
    toast.success(`${ft} ft pushed to Civil calculator.`);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ProjectStrip />
      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* ── Plan Panel ── */}
        <ResizablePanel defaultSize={50} minSize={25} maxSize={75}>
          <PlanPanel tabKey="civil" onPushDistance={handlePush} />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* ── Calculator ── */}
        <ResizablePanel defaultSize={50} minSize={25}>
          <div className="flex flex-col h-full overflow-auto">
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-border bg-card shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F5C518]/15 flex items-center justify-center">
                  <Zap size={16} className="text-[#F5C518]" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Civil & Underground
                  </h1>
                  <p className="text-xs text-muted-foreground">{activeCivilProject.name}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="max-w-lg mx-auto space-y-6">
                {/* Inputs */}
                <div className="bp-card p-4 space-y-5">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Inputs
                  </h2>

                  {/* Distance */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Total Distance</Label>
                      <span className="text-xs text-muted-foreground font-mono">feet</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={s.distance || ""}
                        onChange={(e) => update({ distance: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="font-mono text-base h-10 bg-input border-border text-foreground"
                      />
                      <span className="text-muted-foreground text-sm font-mono shrink-0">ft</span>
                    </div>
                    {s.distance === 0 && (
                      <p className="text-[10px] text-[#F5C518] font-mono">↑ Type distance or push from the plan on the left</p>
                    )}
                  </div>

                  {/* Conductors */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Conductors</Label>
                      <span className="text-xl font-bold text-[#F5C518]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {s.conductors}
                      </span>
                    </div>
                    <Slider
                      min={1} max={12} step={1}
                      value={[s.conductors]}
                      onValueChange={([v]) => update({ conductors: v })}
                      className="[&_[role=slider]]:bg-[#F5C518] [&_[role=slider]]:border-[#F5C518] [&_.bg-primary]:bg-[#F5C518]"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>1</span><span>3</span><span>6</span><span>9</span><span>12</span>
                    </div>
                  </div>

                  {/* Conduit Size */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Conduit Size</Label>
                    <div className="grid grid-cols-5 gap-1">
                      {CONDUIT_SIZES.map((cs) => (
                        <button
                          key={cs.value}
                          onClick={() => update({ conduitSize: cs.value })}
                          className={cn(
                            "py-1.5 rounded text-[11px] font-mono font-medium border transition-all",
                            s.conduitSize === cs.value
                              ? "bg-yellow-400 text-black border-yellow-400"
                              : "bg-muted/30 text-muted-foreground border-border hover:border-yellow-400/50 hover:text-foreground"
                          )}
                        >
                          {cs.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Outputs */}
                <div>
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Calculated Outputs
                  </h2>
                  <div className="grid grid-cols-1 gap-3">
                    <OutputCard icon={<Package size={12} />} label="10-ft Pipe Sticks" value={sticks} unit={`⌈${s.distance} ÷ 10⌉ = ${sticks} sticks`} />
                    <OutputCard icon={<Link2 size={12} />} label="Couplings Required" value={couplings} unit={`${sticks} sticks − 1 = ${couplings}`} />
                    <OutputCard icon={<Cable size={12} />} label="Total Wire Length" value={wireLength} unit={`${s.distance} ft × ${s.conductors} cond. × 1.10 slack`} />
                  </div>
                </div>

                {/* Formula reference */}
                <div className="bp-card p-3 space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Formula Reference
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-muted-foreground">
                    <div className="space-y-0.5"><p className="text-foreground font-semibold">Pipe Sticks</p><p>⌈ Distance ÷ 10 ⌉</p></div>
                    <div className="space-y-0.5"><p className="text-foreground font-semibold">Couplings</p><p>Sticks − 1</p></div>
                    <div className="space-y-0.5"><p className="text-foreground font-semibold">Wire Length</p><p>Dist × Cond × 1.10</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
