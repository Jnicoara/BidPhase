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
  Plus, Minus, ChevronLeft,
  Link2
} from "lucide-react";

// ─── Custom section icons (realistic but clean line-art style) ──────────────────
function ConduitPipeIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  // Conduit viewed from the end (annular cross-section) + side profile showing the bore
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Outer wall of pipe body */}
      <line x1="5" y1="7" x2="20" y2="7" />
      <line x1="5" y1="17" x2="20" y2="17" />
      {/* Inner bore walls */}
      <line x1="5" y1="10" x2="20" y2="10" strokeOpacity="0.55" />
      <line x1="5" y1="14" x2="20" y2="14" strokeOpacity="0.55" />
      {/* Left end face — annular ring (outer arc + inner arc) */}
      <path d="M5 7 Q2 9 2 12 Q2 15 5 17" />
      <path d="M5 10 Q3.5 11 3.5 12 Q3.5 13 5 14" strokeOpacity="0.55" />
      {/* Right end face — annular ring */}
      <path d="M20 7 Q23 9 23 12 Q23 15 20 17" />
      <path d="M20 10 Q21.5 11 21.5 12 Q21.5 13 20 14" strokeOpacity="0.55" />
    </svg>
  );
}

function MaleAdapterIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  // Threaded male adapter: wide conduit body → shoulder taper → narrower threaded male nipple
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Wide conduit body */}
      <line x1="1" y1="7" x2="12" y2="7" />
      <line x1="1" y1="17" x2="12" y2="17" />
      <line x1="1" y1="7" x2="1" y2="17" />
      {/* Inner bore on body end */}
      <line x1="1" y1="10" x2="4" y2="10" strokeOpacity="0.5" />
      <line x1="1" y1="14" x2="4" y2="14" strokeOpacity="0.5" />
      {/* Shoulder taper */}
      <line x1="12" y1="7" x2="15" y2="9.5" />
      <line x1="12" y1="17" x2="15" y2="14.5" />
      {/* Threaded male nipple — outer walls */}
      <line x1="15" y1="9.5" x2="23" y2="9.5" />
      <line x1="15" y1="14.5" x2="23" y2="14.5" />
      <line x1="23" y1="9.5" x2="23" y2="14.5" />
      {/* Thread rings (evenly spaced vertical lines across nipple) */}
      <line x1="16.5" y1="9.5" x2="16.5" y2="14.5" strokeOpacity="0.5" />
      <line x1="18.5" y1="9.5" x2="18.5" y2="14.5" strokeOpacity="0.5" />
      <line x1="20.5" y1="9.5" x2="20.5" y2="14.5" strokeOpacity="0.5" />
    </svg>
  );
}

function StrippedWireIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  // Wire cross-section: outer jacket → inner insulation layer → copper conductor core
  // Plus side view: insulated section on left, stripped copper conductor on right
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Outer jacket (thick insulation) */}
      <line x1="1" y1="7" x2="14" y2="7" />
      <line x1="1" y1="17" x2="14" y2="17" />
      <line x1="1" y1="7" x2="1" y2="17" />
      {/* Inner insulation layer */}
      <line x1="1" y1="9.5" x2="14" y2="9.5" strokeOpacity="0.5" />
      <line x1="1" y1="14.5" x2="14" y2="14.5" strokeOpacity="0.5" />
      {/* Insulation cut face */}
      <line x1="14" y1="7" x2="14" y2="17" />
      {/* Conductor core inside insulation (center line) */}
      <line x1="3" y1="12" x2="14" y2="12" strokeWidth="1" strokeOpacity="0.6" />
      {/* Stripped conductor — bare copper strands (wider, exposed) */}
      <line x1="14" y1="12" x2="22" y2="12" strokeWidth="2.5" />
      {/* Strand texture marks on bare section */}
      <line x1="16" y1="10.5" x2="16" y2="13.5" strokeWidth="1" strokeOpacity="0.55" />
      <line x1="18" y1="10.5" x2="18" y2="13.5" strokeWidth="1" strokeOpacity="0.55" />
      <line x1="20" y1="10.5" x2="20" y2="13.5" strokeWidth="1" strokeOpacity="0.55" />
      {/* Conductor tip */}
      <circle cx="22" cy="12" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}
import { toast } from "sonner";

// ─── Civil & Underground icon (shared with BidPhaseShell) ─────────────────────
function CivilIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <rect x="3" y="2" width="18" height="10" rx="1.5" />
      <line x1="6" y1="7" x2="18" y2="7" />
      <line x1="7.5" y1="12" x2="7.5" y2="16" />
      <line x1="7.5" y1="16" x2="7.5" y2="21" strokeDasharray="1.5 1.5" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="12" y1="16" x2="12" y2="21" strokeDasharray="1.5 1.5" />
      <line x1="16.5" y1="12" x2="16.5" y2="16" />
      <line x1="16.5" y1="16" x2="16.5" y2="21" strokeDasharray="1.5 1.5" />
      <line x1="2" y1="16" x2="22" y2="16" />
    </svg>
  );
}

// ─── Conductor materials & sizes ────────────────────────────────────────────
const CONDUCTOR_MATERIALS = [
  { id: "CU", label: "Copper",   short: "Cu" },
  { id: "AL", label: "Aluminum", short: "Al" },
] as const;
type ConductorMaterial = typeof CONDUCTOR_MATERIALS[number]["id"];

// Standard AWG + kcmil conductor sizes (NEC Table 310.12)
const CONDUCTOR_SIZES = [
  "14", "12", "10", "8", "6", "4", "3", "2", "1",
  "1/0", "2/0", "3/0", "4/0",
  "250", "300", "350", "400", "500", "600", "750", "1000",
] as const;
type ConductorSize = typeof CONDUCTOR_SIZES[number];

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
  pageNumber?: number;  // which PDF page this run came from
  feet: number;
  conduitSize: string;
  conduitType: ConduitType;
  conductors: number;
  conductorMaterial: ConductorMaterial;
  conductorSize: ConductorSize;
  fittings: FittingCounts;
}

function defaultFittings(): FittingCounts {
  return { connector: 0, coupling: 0, lb: 0, elbow90: 0, elbow45: 0, sweep: 0, offset: 0 };
}

function calcWire(feet: number, conductors: number) {
  return parseFloat((feet * conductors * 1.1).toFixed(1));
}

function conductorLabel(mat: ConductorMaterial, size: ConductorSize) {
  const isKcmil = Number(size) >= 250 || ["1/0","2/0","3/0","4/0"].includes(size);
  const unit = isKcmil && !size.includes("/") ? " kcmil" : " AWG";
  return `#${size}${unit} ${mat === "CU" ? "Cu" : "Al"}`;
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
          {run.pageNumber !== undefined && (
            <span className="text-[10px] font-mono text-muted-foreground/60 bg-muted/20 px-1.5 py-0.5 rounded">
              pg {run.pageNumber}
            </span>
          )}
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

        {/* Conductor material */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Conductor Material</Label>
          <div className="flex gap-2">
            {CONDUCTOR_MATERIALS.map((cm) => (
              <button
                key={cm.id}
                onClick={() => onUpdate(run.id, { conductorMaterial: cm.id as ConductorMaterial })}
                className={cn(
                  "flex-1 py-1.5 rounded text-xs font-mono font-semibold border transition-all",
                  (run.conductorMaterial ?? "CU") === cm.id
                    ? "bg-yellow-400 text-black border-yellow-400"
                    : "bg-muted/30 text-muted-foreground border-border hover:border-yellow-400/50 hover:text-foreground"
                )}
              >
                {cm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conductor size */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Conductor Size</Label>
          <div className="grid grid-cols-5 gap-1">
            {CONDUCTOR_SIZES.map((sz) => (
              <button
                key={sz}
                onClick={() => onUpdate(run.id, { conductorSize: sz as ConductorSize })}
                className={cn(
                  "py-1 rounded text-[10px] font-mono font-medium border transition-all",
                  (run.conductorSize ?? "12") === sz
                    ? "bg-yellow-400 text-black border-yellow-400"
                    : "bg-muted/30 text-muted-foreground border-border hover:border-yellow-400/50 hover:text-foreground"
                )}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* Calculated outputs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/20 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              <ConduitPipeIcon size={10} /> Pipe Sticks
            </div>
            <div className="text-xl font-bold font-mono text-foreground">{sticks}</div>
            <div className="text-[10px] text-muted-foreground font-mono">10-ft sticks</div>
          </div>
          <div className="bg-muted/20 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              <StrippedWireIcon size={10} /> Wire Length
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
            <MaleAdapterIcon size={12} />
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

// ─── Cross-page totals ────────────────────────────────────────────────────────
function CrossPageTotals({ runs }: { runs: RunItem[] }) {
  if (runs.length === 0) return null;

  const pages = Array.from(new Set(runs.map((r) => r.pageNumber).filter((p): p is number => p !== undefined))).sort((a, b) => a - b);

  // ── Conduit breakdown by type+size ──────────────────────────────────────────
  type ConduitKey = string; // e.g. "EMT 3/4""
  const conduitMap = new Map<ConduitKey, { type: string; size: string; feet: number; sticks: number }>();
  for (const r of runs) {
    const key = `${r.conduitType ?? "EMT"} ${r.conduitSize}"`;
    const existing = conduitMap.get(key);
    if (existing) {
      existing.feet   += r.feet;
      existing.sticks += calcSticks(r.feet);
    } else {
      conduitMap.set(key, { type: r.conduitType ?? "EMT", size: r.conduitSize, feet: r.feet, sticks: calcSticks(r.feet) });
    }
  }
  const conduitRows = Array.from(conduitMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  // ── Wire breakdown by conductor spec ────────────────────────────────────────
  type WireKey = string; // e.g. "#12 AWG Cu"
  const wireMap = new Map<WireKey, { label: string; qty: number; feet: number }>();
  for (const r of runs) {
    if (r.conductors < 1) continue;
    const mat  = r.conductorMaterial ?? "CU";
    const size = r.conductorSize ?? "12";
    const label = conductorLabel(mat as ConductorMaterial, size as ConductorSize);
    const wireFt = calcWire(r.feet, r.conductors);
    const existing = wireMap.get(label);
    if (existing) {
      existing.feet += wireFt;
      existing.qty  += r.conductors;
    } else {
      wireMap.set(label, { label, qty: r.conductors, feet: wireFt });
    }
  }
  const wireRows = Array.from(wireMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  // ── Fittings breakdown by type ───────────────────────────────────────────────
  // Group by conduit type+size so you know which fittings go where
  type FittingKey = string; // e.g. "EMT 3/4" — Connectors"
  const fittingMap = new Map<FittingKey, { conduitSpec: string; fittingLabel: string; count: number }>();
  for (const r of runs) {
    const spec = `${r.conduitType ?? "EMT"} ${r.conduitSize}"`;
    for (const ft of FITTING_TYPES) {
      const count = r.fittings[ft.id];
      if (count === 0) continue;
      const key = `${spec}__${ft.id}`;
      const existing = fittingMap.get(key);
      if (existing) {
        existing.count += count;
      } else {
        fittingMap.set(key, { conduitSpec: spec, fittingLabel: ft.label, count });
      }
    }
  }
  const fittingRows = Array.from(fittingMap.values()).sort((a, b) =>
    a.conduitSpec.localeCompare(b.conduitSpec) || a.fittingLabel.localeCompare(b.fittingLabel)
  );

  const totalFeet   = runs.reduce((a, r) => a + r.feet, 0);
  const totalSticks = runs.reduce((a, r) => a + calcSticks(r.feet), 0);
  const totalWire   = runs.reduce((a, r) => a + calcWire(r.feet, r.conductors), 0);

  const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="flex items-center gap-2 mt-4 mb-2 pb-1 border-b border-border/40">
      <span className="text-[#F5C518]">{icon}</span>
      <span className="text-[10px] font-semibold text-[#F5C518] uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</span>
    </div>
  );

  return (
    <div className="bp-card p-4 border-[#F5C518]/30 bg-[#F5C518]/5">
      <h3
        className="text-xs font-semibold text-[#F5C518] uppercase tracking-wider mb-1 flex items-center gap-2"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        ∑ Project Material List
        {pages.length > 0 && (
          <span className="text-[10px] font-mono text-muted-foreground normal-case tracking-normal">
            {runs.length} run{runs.length !== 1 ? "s" : ""} · {pages.length} page{pages.length !== 1 ? "s" : ""}
          </span>
        )}
      </h3>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2 mb-1 mt-3">
        <div className="bg-muted/20 rounded p-2 text-center">
          <div className="text-lg font-bold font-mono text-[#F5C518]">{totalFeet.toFixed(0)}</div>
          <div className="text-[9px] text-muted-foreground font-mono uppercase">Total ft</div>
        </div>
        <div className="bg-muted/20 rounded p-2 text-center">
          <div className="text-lg font-bold font-mono text-[#F5C518]">{totalSticks}</div>
          <div className="text-[9px] text-muted-foreground font-mono uppercase">Sticks</div>
        </div>
        <div className="bg-muted/20 rounded p-2 text-center">
          <div className="text-lg font-bold font-mono text-[#F5C518]">{totalWire.toFixed(0)}</div>
          <div className="text-[9px] text-muted-foreground font-mono uppercase">Wire ft</div>
        </div>
      </div>

      {/* ── Conduit ── */}
      <SectionHeader icon={<ConduitPipeIcon size={11} />} title="Conduit" />
      <div className="space-y-1">
        {conduitRows.map(([key, row]) => (
          <div key={key} className="flex items-center justify-between text-[11px] py-0.5">
            <span className="font-mono text-foreground font-semibold">{row.type} {row.size}"</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[#F5C518]">{row.feet.toFixed(1)} ft</span>
              <span className="font-mono text-muted-foreground">{row.sticks} sticks</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Fittings ── */}
      {fittingRows.length > 0 && (
        <>
          <SectionHeader icon={<MaleAdapterIcon size={11} />} title="Fittings" />
          <div className="space-y-1">
            {fittingRows.map((row, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] py-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-muted-foreground text-[10px]">{row.conduitSpec}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="font-mono text-foreground">{row.fittingLabel}</span>
                </div>
                <span className="font-mono text-[#F5C518] font-bold">{row.count}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Wire / Conductors ── */}
      {wireRows.length > 0 && (
        <>
          <SectionHeader icon={<StrippedWireIcon size={11} />} title="Conductors" />
          <div className="space-y-1">
            {wireRows.map(([key, row]) => (
              <div key={key} className="flex items-center justify-between text-[11px] py-0.5">
                <span className="font-mono text-foreground font-semibold">{row.label}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[#F5C518]">{row.feet.toFixed(1)} ft</span>
                  <span className="font-mono text-muted-foreground text-[10px]">w/ 10% slack</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Per-page breakdown ── */}
      {pages.length > 1 && (
        <>
          <SectionHeader icon={<Link2 size={11} />} title="Per-Page Breakdown" />
          <div className="space-y-1">
            {pages.map((pg) => {
              const pgRuns = runs.filter((r) => r.pageNumber === pg);
              const pgFeet = pgRuns.reduce((a, r) => a + r.feet, 0);
              const pgSticks = pgRuns.reduce((a, r) => a + calcSticks(r.feet), 0);
              return (
                <div key={pg} className="flex items-center justify-between text-[11px] py-0.5">
                  <span className="text-muted-foreground font-mono">Page {pg}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-foreground">{pgFeet.toFixed(1)} ft</span>
                    <span className="font-mono text-muted-foreground">{pgSticks} sticks</span>
                    <span className="text-muted-foreground">{pgRuns.length} run{pgRuns.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

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

  // Track which PDF page is currently active in PlanPanel
  const [activePage, setActivePage] = useState<number>(1);

  // Runs visible in the right panel = only those belonging to the current page
  const pageRuns = runs.filter((r) => (r.pageNumber ?? 1) === activePage);

  const syncRuns = useCallback(
    (next: RunItem[]) => {
      setRuns(next);
      // Persist runs into civilState so CSV export can read them
      setCivilState({ ...s, ...(({ runs: next }) as any) } as CivilState);
    },
    [s, setCivilState]
  );

  const handlePush = useCallback(
    (ft: number, runName: string, conduitSize?: string, pageNumber?: number) => {
      const existingIdx = runs.findIndex((r) => r.name === runName && r.pageNumber === pageNumber);
      if (existingIdx !== -1) {
        const updated = runs.map((r) =>
          (r.name === runName && r.pageNumber === pageNumber)
            ? { ...r, feet: ft, conduitSize: conduitSize ?? r.conduitSize }
            : r
        );
        syncRuns(updated);
        const pageLabel = pageNumber ? ` (pg ${pageNumber})` : "";
        toast.success(`"${runName}"${pageLabel} updated — ${ft} ft.`);
      } else {
        const newRun: RunItem = {
          id: `run-${Date.now()}`,
          name: runName,
          pageNumber,
          feet: ft,
          conduitSize: conduitSize ?? "3/4",
          conduitType: "EMT",
          conductors: 2,
          conductorMaterial: "CU",
          conductorSize: "12",
          fittings: defaultFittings(),
        };
        syncRuns([newRun, ...runs]);
        const pageLabel = pageNumber ? ` from page ${pageNumber}` : "";
        toast.success(`"${runName}"${pageLabel} — ${ft} ft added.`);
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
    (runName: string, pageNumber?: number) => {
      // If pageNumber is provided, only delete the run on that specific page
      syncRuns(runs.filter((r) => !(r.name === runName && (pageNumber == null || r.pageNumber === pageNumber))));
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
        {/* ── Plan Panel — always gets at least 55% so the right panel can never cover the PDF ── */}
        <ResizablePanel defaultSize={60} minSize={55} maxSize={80}>
          <PlanPanel
            tabKey={`civil_${projectId}`}
            onPushDistance={(ft: number, runName: string, conduitSize?: string, pageNumber?: number) => handlePush(ft, runName, conduitSize, pageNumber)}
            onDeleteRun={(name, page) => handleDeleteRun(name, page)}
            onCurrentPageChange={(page) => setActivePage(page)}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* ── Calculator / Runs — max 45% so it stays to the right of the PDF ── */}
        <ResizablePanel defaultSize={40} minSize={20} maxSize={45}>
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-border bg-card shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F5C518]/15 flex items-center justify-center">
                  <CivilIcon size={16} className="text-[#F5C518]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1
                    className="text-base font-bold text-foreground"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    Civil & Underground
                  </h1>
                  <p className="text-xs text-muted-foreground">{projectName}</p>
                </div>
                <span className="shrink-0 text-xs font-mono px-2 py-0.5 rounded bg-[#F5C518]/15 text-[#F5C518] border border-[#F5C518]/30">
                  Page {activePage}
                </span>
              </div>
            </div>

            {/* Runs list */}
            <div className="flex-1 overflow-auto p-4 pb-24 space-y-4">
              {pageRuns.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center">
                    <Link2 size={20} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">No runs on page {activePage}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Measure a conduit run on this page, then push it here.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Newest first — already prepended on push */}
                  {pageRuns.map((run, i) => (
                    <RunCard
                      key={run.id}
                      run={run}
                      index={i}
                      onUpdate={updateRun}
                      onRemove={removeRun}
                    />
                  ))}

                  {/* Cross-page totals summary (always shows all pages) */}
                  <CrossPageTotals runs={runs} />
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
        icon={<CivilIcon size={18} className="text-[#F5C518]" />}
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
