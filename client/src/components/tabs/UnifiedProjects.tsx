/**
 * BidPhase — Unified Projects Tab
 * Single tab replacing Civil / Commercial / Residential.
 * Uses CivilState/CivilProject as the canonical project type.
 * Each run has a runType toggle: "conduit" (pipe sticks + fittings) or "wire" (bare conductor).
 */
import { useState, useCallback, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import {
  CONDUIT_SIZES,
  CONDUCTOR_MATERIALS,
  CONDUCTOR_SIZES,
  CIVIL_CONDUIT_TYPES,
  FITTING_TYPES,
} from "@/contexts/AppContext";
import type {
  CivilState,
  RunItem,
  FittingCounts,
  FittingId,
  ConductorMaterial,
  ConductorSize,
  CivilConduitType as ConduitType,
  CountPin,
  CountSession,
} from "@/contexts/AppContext";
import { COUNT_ICONS, PIN_COLORS, DEFAULT_ICON_ID, DEFAULT_PIN_COLOR, type PinShape } from "@/lib/CountIcons";
import { toast } from "sonner";
import CatalogPicker from "@/components/CatalogPicker";
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
  Plus, Minus, ChevronLeft, ChevronDown, ChevronUp,
  Link2, Trash2, Pencil, Check, X, Undo2, Save,
} from "lucide-react";
import type { CatalogItem } from "@/lib/materialCatalog";
import type { SavedMaterialRow } from "@/contexts/AppContext";

// ─── Custom section icons (Lucide-style: strokeWidth 2, round caps/joins, no fill) ─
function ConduitPipeIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  // Simple conduit: two parallel horizontal lines (walls) with vertical end caps
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <line x1="2" y1="9" x2="22" y2="9" />
      <line x1="2" y1="15" x2="22" y2="15" />
      <line x1="2" y1="9" x2="2" y2="15" />
      <line x1="22" y1="9" x2="22" y2="15" />
    </svg>
  );
}

function MaleAdapterIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  // Electrical conduit connector (set-screw type):
  // left pipe stub → wider connector body with set-screw on top → right pipe stub
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Left pipe stub */}
      <line x1="2" y1="10" x2="8" y2="10" />
      <line x1="2" y1="14" x2="8" y2="14" />
      <line x1="2" y1="10" x2="2" y2="14" />
      {/* Connector body (taller/wider than pipe) */}
      <rect x="8" y="7" width="8" height="10" rx="1" />
      {/* Set-screw on top of body */}
      <line x1="11" y1="7" x2="11" y2="4" />
      <line x1="13" y1="7" x2="13" y2="4" />
      <line x1="11" y1="4" x2="13" y2="4" />
      {/* Right pipe stub */}
      <line x1="16" y1="10" x2="22" y2="10" />
      <line x1="16" y1="14" x2="22" y2="14" />
      <line x1="22" y1="10" x2="22" y2="14" />
    </svg>
  );
}

function StrippedWireIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  // Single conductor: insulated wire (tube) on left, stripped end on right showing bare conductor circle
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Insulated wire body */}
      <line x1="2" y1="9" x2="17" y2="9" />
      <line x1="2" y1="15" x2="17" y2="15" />
      <line x1="2" y1="9" x2="2" y2="15" />
      {/* Insulation cut end */}
      <line x1="17" y1="9" x2="17" y2="15" />
      {/* Bare conductor circle (cross-section of stripped end) */}
      <circle cx="21" cy="12" r="2.5" />
    </svg>
  );
}

// ─── Civil & Underground icon ────────────────────────────────────────────────
// Exported so BidPhaseShell can import it directly instead of duplicating the
// SVG definition. Both the sidebar nav and the editor header use this icon.
export function CivilIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
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

export function CommercialIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="9" x2="9" y2="21" />
      <line x1="3" y1="15" x2="9" y2="15" />
      <rect x="12" y="12" width="4" height="3" rx="0.5" />
      <rect x="12" y="17" width="4" height="3" rx="0.5" />
    </svg>
  );
}

export function ResidentialIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 8.5V21h14V8.5" />
      <rect x="9" y="14" width="6" height="7" rx="1" />
      <circle cx="10.5" cy="17.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="17.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IndustrialIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Factory building */}
      <rect x="2" y="10" width="20" height="12" rx="1" />
      {/* Chimney stacks */}
      <rect x="5" y="4" width="3" height="6" rx="0.5" />
      <rect x="11" y="6" width="3" height="4" rx="0.5" />
      {/* Door */}
      <rect x="10" y="16" width="4" height="6" rx="0.5" />
      {/* Windows */}
      <rect x="4" y="13" width="3" height="3" rx="0.5" />
      <rect x="17" y="13" width="3" height="3" rx="0.5" />
    </svg>
  );
}

// Types and constants (RunItem, FittingCounts, FITTING_TYPES, etc.) are
// imported from AppContext.tsx — see imports at the top of this file.
// Local alias so existing JSX references to CONDUIT_TYPES still work:
const CONDUIT_TYPES = CIVIL_CONDUIT_TYPES;

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
/**
 * RunCard — editable card for a single conduit run pushed from PlanPanel.
 *
 * Data flow:
 *   PlanPanel (canvas) → onPushDistance callback → CivilEditor.handlePush
 *   → syncRuns → RunItem[] stored in local state + persisted via setCivilState.
 *   RunCard receives a single RunItem and fires onUpdate/onRemove to mutate
 *   the parent's runs array, which re-syncs to context on every change.
 *
 * The color dot in the header uses the run index mod 6 to cycle through a
 *   fixed palette — it is purely decorative and does not affect calculations.
 */
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
            {(run.runType ?? "conduit") === "wire"
              ? `Wire · ${run.conductors}c`
              : `${run.conduitType ?? "EMT"} ${run.conduitSize}"`}
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

        {/* Run type toggle: Conduit vs Wire */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Run Type</Label>
          <div className="flex gap-2">
            {(["conduit", "wire"] as const).map((rt) => (
              <button
                key={rt}
                onClick={() => onUpdate(run.id, { runType: rt })}
                className={cn(
                  "flex-1 py-1.5 rounded text-xs font-medium border transition-all capitalize",
                  (run.runType ?? "conduit") === rt
                    ? "bg-yellow-400 text-black border-yellow-400"
                    : "bg-muted/30 text-muted-foreground border-border hover:border-yellow-400/50 hover:text-foreground"
                )}
              >
                {rt}
              </button>
            ))}
          </div>
        </div>
                {/* Conduit type + size — only shown for conduit runs */}
        {(run.runType ?? "conduit") === "conduit" && (
          <>
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
          </>
        )}
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
          {(run.runType ?? "conduit") === "conduit" && (
            <div className="bg-muted/20 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                <ConduitPipeIcon size={10} /> Pipe Sticks
              </div>
              <div className="text-xl font-bold font-mono text-foreground">{sticks}</div>
              <div className="text-[10px] text-muted-foreground font-mono">10-ft sticks</div>
            </div>
          )}
          <div className="bg-muted/20 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              <StrippedWireIcon size={10} /> Wire Length
            </div>
            <div className="text-xl font-bold font-mono text-foreground">{wire}</div>
            <div className="text-[10px] text-muted-foreground font-mono">ft w/ 10% slack</div>
          </div>
        </div>

                {/* Fittings toggle — only for conduit runs */}
        {(run.runType ?? "conduit") === "conduit" && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

// ─── Cross-page totals ────────────────────────────────────────────────────────
/**
 * CrossPageTotals — read-only project-wide material summary.
 *
 * Receives the full `runs` array (all pages) and aggregates:
 *   - Conduit footage + sticks, grouped by type+size (e.g. "EMT 3/4"")
 *   - Fittings count, grouped by conduit spec + fitting type
 *   - Wire footage, grouped by conductor spec (e.g. "#12 AWG Cu")
 *   - Per-page breakdown strip (only shown when there are ≥2 pages)
 *
 * This component is always rendered with the full cross-page run list even
 * when the right panel is filtered to a single page — it intentionally shows
 * the whole-project picture, not just the current page.
 */
function CrossPageTotals({ runs, countSessions = [] }: { runs: RunItem[]; countSessions?: CountSession[] }) {
  const { setShowMaterialList } = useApp();

  const pages = Array.from(new Set(runs.map((r) => r.pageNumber).filter((p): p is number => p !== undefined))).sort((a, b) => a - b);

  // ── Conduit breakdown by type+size ──────────────────────────────────────────
  type ConduitKey = string; // e.g. "EMT 3/4""
  const conduitMap = new Map<ConduitKey, { type: string; size: string; feet: number; sticks: number }>();
  for (const r of runs) {
    if ((r.runType ?? "conduit") === "wire") continue; // wire runs handled separately
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
        ∑ Labor & Material
        {pages.length > 0 && (
          <span className="text-[10px] font-mono text-muted-foreground normal-case tracking-normal">
            {runs.length} run{runs.length !== 1 ? "s" : ""} · {pages.length} page{pages.length !== 1 ? "s" : ""}
          </span>
        )}
        <button
          onClick={() => setShowMaterialList(true)}
          className="ml-auto text-[10px] font-mono text-[#F5C518]/70 hover:text-[#F5C518] transition-colors flex items-center gap-1 normal-case tracking-normal"
          title="Open full-screen material list"
        >
          Labor & Material →
        </button>
      </h3>

      {/* Summary strip — only shown once runs exist */}
      {runs.length > 0 && (
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
      )}

      {/* ── Labor & Material Summary ── */}
      <SectionHeader icon={<span />} title="Labor & Material Summary" />
      <div className="space-y-1">
        {conduitRows.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/50 italic font-mono">No runs yet — push measurements to populate</p>
        ) : conduitRows.map(([key, row]) => (
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
      {/* ── Unit Count ── */}
      {countSessions.filter((cs) => cs.pins.length > 0).length > 0 && (
        <>
          <SectionHeader icon={<span className="text-[10px]">⊕</span>} title="Unit Count" />
          <div className="space-y-1">
            {countSessions.filter((cs) => cs.pins.length > 0).map((cs) => {
              const extCost = cs.unitCost != null ? cs.unitCost * cs.pins.length : null;
              return (
                <div key={cs.id} className="flex items-center justify-between text-[11px] py-0.5">
                  <div className="flex items-center gap-1.5">
                    <PinShapeSwatch shape={cs.iconId as PinShape} color={cs.color} size={11} />
                    <span className="font-mono text-foreground">{cs.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[#F5C518] font-bold">{cs.pins.length} EA</span>
                    {extCost != null && (
                      <span className="font-mono text-muted-foreground">${extCost.toFixed(2)}</span>
                    )}
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
  categoryLabel,
  onBack,
}: {
  projectId: string;
  projectName: string;
  categoryLabel: string;
  onBack: () => void;
}) {
  const {
    activeCategory,
    activeCivilCatProject,
    setCivilCatState,
    activeCommercialCatProject,
    setCommercialCatState,
    activeResidentialCatProject,
    setResidentialCatState,
  } = useApp();
  const activeCivilProject = categoryLabel === "Civil & Underground" ? activeCivilCatProject : categoryLabel === "Commercial Assembly" ? activeCommercialCatProject : activeResidentialCatProject;
  const setCivilState = categoryLabel === "Civil & Underground" ? setCivilCatState : categoryLabel === "Commercial Assembly" ? setCommercialCatState : setResidentialCatState;
  const s = activeCivilProject.state;

  // Per-run items — stored in component state (persisted via AppContext civilState.runs)
  // We keep runs in local state here and sync to civilState for CSV export.
  // CivilState.runs is typed as RunItem[] | undefined so no cast is needed.
  const [runs, setRuns] = useState<RunItem[]>(() => s.runs ?? []);

  // Track which PDF page is currently active in PlanPanel
  const [activePage, setActivePage] = useState<number>(1);

  // ── Count session state ─────────────────────────────────────────────────────
  const countSessions: CountSession[] = s.countSessions ?? [];
  const activeCountSessionId = s.activeCountSessionId;
  const activeCountSession = countSessions.find((cs) => cs.id === activeCountSessionId) ?? null;

  const [newSessionName, setNewSessionName] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [countSessionsOpen, setCountSessionsOpen] = useState(true);
  const [countModeRequest, setCountModeRequest] = useState(0);

  const updateSessions = useCallback(
    (sessions: CountSession[], activeId?: string) => {
      setCivilState({
        ...s,
        runs,
        countSessions: sessions,
        activeCountSessionId: activeId !== undefined ? activeId : activeCountSessionId,
      });
    },
    [s, runs, setCivilState, activeCountSessionId]
  );

  const handleAddCountSession = () => {
    const name = newSessionName.trim() || `Count ${countSessions.length + 1}`;
    const newSession: CountSession = {
      id: `cs-${Date.now().toString(36)}`,
      name,
      iconId: DEFAULT_ICON_ID,
      color: DEFAULT_PIN_COLOR,
      pins: [],
    };
    updateSessions([...countSessions, newSession], newSession.id);
    setNewSessionName("");
    toast.success(`Session "${name}" created.`);
  };

  const handleSaveCountToLM = useCallback((cs: CountSession) => {
    if (cs.pins.length === 0) {
      toast.error(`"${cs.name}" has no pins yet — drop pins first.`);
      return;
    }
    const newRow: SavedMaterialRow = {
      id: `smr-${Date.now().toString(36)}-${cs.id}`,
      sessionId: cs.id,
      description: cs.name,
      qty: cs.pins.length,
      unitCost: cs.unitCost ?? 0,
      unit: "EA",
      savedAt: Date.now(),
    };
    const existing = s.savedMaterialRows ?? [];
    setCivilState({ ...s, runs, countSessions, activeCountSessionId, savedMaterialRows: [...existing, newRow] });
    toast.success(`"${cs.name}" (${cs.pins.length} EA) saved to Labor & Material.`);
  }, [s, runs, countSessions, activeCountSessionId, setCivilState]);

  const handleAddCountSessionFromCatalog = useCallback((item: CatalogItem | null) => {
    if (!item) return;
    const newSession: CountSession = {
      id: `cs-${Date.now().toString(36)}`,
      name: item.description,
      iconId: DEFAULT_ICON_ID,
      color: DEFAULT_PIN_COLOR,
      pins: [],
      unitCost: item.unitPrice,
      priceMode: "per-unit",
    };
    updateSessions([...countSessions, newSession], newSession.id);
    toast.success(`"${item.description}" added to Unit Count.`);
  }, [countSessions, updateSessions]);

  const handleDeleteCountSession = (id: string) => {
    const updated = countSessions.filter((cs) => cs.id !== id);
    const newActive = activeCountSessionId === id ? (updated[0]?.id ?? undefined) : activeCountSessionId;
    updateSessions(updated, newActive);
  };

  const handleRenameCountSession = (id: string) => {
    const name = editingName.trim();
    if (!name) { setEditingSessionId(null); return; }
    updateSessions(countSessions.map((cs) => cs.id === id ? { ...cs, name } : cs));
    setEditingSessionId(null);
  };

  const handleCountPinAdded = useCallback((pin: CountPin) => {
    if (!activeCountSessionId) return;
    const updated = countSessions.map((cs) =>
      cs.id === activeCountSessionId ? { ...cs, pins: [...cs.pins, pin] } : cs
    );
    setCivilState({ ...s, runs, countSessions: updated, activeCountSessionId });
  }, [activeCountSessionId, countSessions, s, runs, setCivilState]);

  const handleCountPinRemoved = useCallback((pinId: string) => {
    if (!activeCountSessionId) return;
    const updated = countSessions.map((cs) =>
      cs.id === activeCountSessionId
        ? { ...cs, pins: cs.pins.filter((p) => p.id !== pinId) }
        : cs
    );
    setCivilState({ ...s, runs, countSessions: updated, activeCountSessionId });
  }, [activeCountSessionId, countSessions, s, runs, setCivilState]);

  const handleClearPageCountPins = useCallback((pageNumber: number) => {
    if (!activeCountSessionId) return;
    const updated = countSessions.map((cs) =>
      cs.id === activeCountSessionId
        ? { ...cs, pins: cs.pins.filter((p) => p.pageNumber !== pageNumber) }
        : cs
    );
    setCivilState({ ...s, runs, countSessions: updated, activeCountSessionId });
  }, [activeCountSessionId, countSessions, s, runs, setCivilState]);

  const handleUndoLastPin = useCallback(() => {
    if (!activeCountSessionId) return;
    const session = countSessions.find((cs) => cs.id === activeCountSessionId);
    if (!session) return;
    const pagePins = session.pins.filter((p) => (p.pageNumber ?? 1) === activePage);
    if (pagePins.length === 0) { toast.info("No pins to undo on this page."); return; }
    const lastPin = pagePins[pagePins.length - 1];
    const updated = countSessions.map((cs) =>
      cs.id === activeCountSessionId
        ? { ...cs, pins: cs.pins.filter((p) => p.id !== lastPin.id) }
        : cs
    );
    setCivilState({ ...s, runs, countSessions: updated, activeCountSessionId });
    toast.info("Last pin removed.");
  }, [activeCountSessionId, countSessions, activePage, s, runs, setCivilState]);

  // Runs visible in the right panel = only those belonging to the current page
  const pageRuns = runs.filter((r) => (r.pageNumber ?? 1) === activePage);

  const syncRuns = useCallback(
    (next: RunItem[]) => {
      setRuns(next);
      // Persist runs into civilState so CSV export can read them.
      // CivilState.runs is now properly typed as RunItem[] | undefined.
      setCivilState({ ...s, runs: next });
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
          runType: "conduit",
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
            tabKey={`unified_${projectId}`}
            onPushDistance={(ft: number, runName: string, conduitSize?: string, pageNumber?: number) => handlePush(ft, runName, conduitSize, pageNumber)}
            onDeleteRun={(name, page) => handleDeleteRun(name, page)}
            onCurrentPageChange={(page) => setActivePage(page)}
            activeCountSession={activeCountSession}
            allCountSessions={countSessions}
            onPinAdded={handleCountPinAdded}
            onPinRemoved={handleCountPinRemoved}
            onClearPagePins={handleClearPageCountPins}
            onUnitCountToggle={(open) => setCountSessionsOpen(open)}
            countModeRequest={countModeRequest}
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
                    {projectName}
                  </h1>
                  <p className="text-xs text-muted-foreground">{categoryLabel}</p>
                </div>
                <span className="shrink-0 text-xs font-mono px-2 py-0.5 rounded bg-[#F5C518]/15 text-[#F5C518] border border-[#F5C518]/30">
                  Page {activePage}
                </span>
              </div>
            </div>

              {/* ── Unit Count ──────────────────────────────────────────── */}
              <div className="bp-card overflow-hidden">
                <button
                  onClick={() => setCountSessionsOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/10 transition-colors"
                >
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Unit Count
                    {countSessions.length > 0 && (
                      <span className="ml-2 text-[#F5C518] normal-case tracking-normal font-mono">{countSessions.length} session{countSessions.length !== 1 ? 's' : ''} · {countSessions.reduce((a, cs) => a + cs.pins.length, 0)} pins</span>
                    )}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setCountModeRequest((v) => v + 1); setCountSessionsOpen(true); }}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#F5C518]/20 text-[#F5C518] hover:bg-[#F5C518]/30 border border-[#F5C518]/30 transition-colors font-mono"
                      title="Activate count mode on the plan"
                    >
                      Start Counting
                    </button>
                    {countSessionsOpen ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  </div>
                </button>
                {countSessionsOpen && <div className="px-4 pb-4 space-y-3">

                {countSessions.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No sessions yet. Create one below to start counting.</p>
                ) : (
                  <div className="space-y-1.5">
                    {countSessions.map((cs) => {
                      const isActive = cs.id === activeCountSessionId;
                      const isEditing = editingSessionId === cs.id;
                      return (
                        <div
                          key={cs.id}
                          onClick={() => !isEditing && updateSessions(countSessions, cs.id)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-all",
                            isActive ? "border-[#F5C518] bg-[#F5C518]/8" : "border-border bg-muted/5 hover:border-border/80"
                          )}
                        >
                          <PinShapeSwatch shape={cs.iconId as PinShape} color={cs.color} size={16} />
                          {isEditing ? (
                            <input autoFocus value={editingName} onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleRenameCountSession(cs.id); if (e.key === "Escape") setEditingSessionId(null); }}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 bg-transparent border-b border-[#F5C518] text-xs text-foreground outline-none font-mono" />
                          ) : (
                            <span className="flex-1 text-xs text-foreground font-medium truncate">{cs.name}</span>
                          )}
                          {/* Price mode toggle + cost input */}
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              title={cs.priceMode === "total" ? "Switch to per-unit price" : "Switch to total cost"}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateSessions(countSessions.map((x) =>
                                  x.id === cs.id ? { ...x, priceMode: (x.priceMode === "total" ? "per-unit" : "total") as "per-unit" | "total" } : x
                                ));
                              }}
                              className="text-[9px] font-mono text-muted-foreground hover:text-[#F5C518] transition-colors border border-border rounded px-1 py-0.5 leading-none"
                            >{cs.priceMode === "total" ? "total" : "$/ea"}</button>
                            <span className="text-[9px] text-muted-foreground font-mono">$</span>
                            <input
                              type="number" min={0} step={0.01} placeholder="0.00"
                              value={cs.unitCost ?? ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                updateSessions(countSessions.map((x) =>
                                  x.id === cs.id ? { ...x, unitCost: isNaN(val) ? undefined : val } : x
                                ));
                              }}
                              className="w-14 bg-transparent border-b border-border text-[10px] font-mono text-foreground outline-none focus:border-[#F5C518]/60 text-right"
                            />
                          </div>
                          <span className="font-mono text-[10px] text-muted-foreground shrink-0">{cs.pins.length} pin{cs.pins.length !== 1 ? "s" : ""}</span>
                          {isEditing ? (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); handleRenameCountSession(cs.id); }} className="text-[#F5C518] hover:opacity-70"><Check size={12} /></button>
                              <button onClick={(e) => { e.stopPropagation(); setEditingSessionId(null); }} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>
                            </>
                          ) : (
                            <>
                              <button
                                title="Save this count as a line item in Labor & Material"
                                onClick={(e) => { e.stopPropagation(); handleSaveCountToLM(cs); }}
                                className="text-muted-foreground hover:text-[#F5C518] transition-colors"
                              ><Save size={11} /></button>
                              <button onClick={(e) => { e.stopPropagation(); setEditingSessionId(cs.id); setEditingName(cs.name); }} className="text-muted-foreground hover:text-foreground"><Pencil size={11} /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteCountSession(cs.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 size={11} /></button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* New session row */}
                <div className="flex gap-2 pt-1">
                  <input value={newSessionName} onChange={(e) => setNewSessionName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCountSession()}
                    placeholder="Session name (e.g. Handholes)"
                    className="flex-1 bg-input border border-border rounded-md px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-[#F5C518]/60 transition-colors font-mono" />
                  <button onClick={handleAddCountSession}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#F5C518]/15 text-[#F5C518] text-xs font-medium hover:bg-[#F5C518]/25 transition-colors shrink-0">
                    <Plus size={12} /> New
                  </button>
                </div>

                {/* Active session config */}
                {activeCountSession && (
                  <div className="pt-2 border-t border-border space-y-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Active: <span className="text-foreground">{activeCountSession.name}</span>
                    </p>
                    {/* Color picker */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Pin Color</Label>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {PIN_COLORS.map((c) => (
                          <button key={c.hex} title={c.label}
                            onClick={() => updateSessions(countSessions.map((cs) => cs.id === activeCountSession.id ? { ...cs, color: c.hex } : cs))}
                            className={cn("w-6 h-6 rounded-full border-2 transition-all", activeCountSession.color === c.hex ? "border-white scale-110" : "border-transparent hover:border-white/50")}
                            style={{ backgroundColor: c.hex }} />
                        ))}
                        <label className="relative w-6 h-6 rounded-full overflow-hidden border-2 border-dashed border-border hover:border-white/50 cursor-pointer" title="Custom color">
                          <input type="color" value={activeCountSession.color}
                            onChange={(e) => updateSessions(countSessions.map((cs) => cs.id === activeCountSession.id ? { ...cs, color: e.target.value } : cs))}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                          <span className="flex items-center justify-center w-full h-full text-[8px] text-muted-foreground">+</span>
                        </label>
                        <span className="font-mono text-[10px] text-muted-foreground ml-1">{activeCountSession.color}</span>
                      </div>
                    </div>
                    {/* Shape picker */}
                    <CivilShapeSelector
                      activeIconId={activeCountSession.iconId}
                      activeColor={activeCountSession.color}
                      onSelect={(id) => updateSessions(countSessions.map((cs) => cs.id === activeCountSession.id ? { ...cs, iconId: id } : cs))}
                    />
                    {/* Undo last pin on current page */}
                    <div className="pt-1 border-t border-border/50">
                      <button
                        onClick={handleUndoLastPin}
                        disabled={!activeCountSession || activeCountSession.pins.filter((p) => (p.pageNumber ?? 1) === activePage).length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        title="Remove last dropped pin on this page (U key also works)"
                      >
                        <Undo2 size={12} />
                        Undo last pin
                        {activeCountSession && activeCountSession.pins.filter((p) => (p.pageNumber ?? 1) === activePage).length > 0 && (
                          <span className="ml-auto font-mono text-[10px] text-[#F5C518]">
                            {activeCountSession.pins.filter((p) => (p.pageNumber ?? 1) === activePage).length} on pg {activePage}
                          </span>
                        )}
                      </button>
                    </div>
                    {/* Searchable material quick-add for unit counts */}
                    <div className="pt-1 border-t border-border/50 space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">Search material to start a count</Label>
                        <CatalogPicker
                          value={null}
                          onChange={handleAddCountSessionFromCatalog}
                          placeholder="Search catalog and create a prefilled count…"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Picking a material creates a new count session with the item name and price loaded automatically.
                        You can still change the price in the session row before or after dropping pins.
                      </p>
                    </div>
                  </div>
                )}
                </div>}
              </div>

            {/* Runs list */}
            <div className="flex-1 overflow-auto p-4 pb-24 space-y-4">
              {pageRuns.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center gap-3">
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
                </>
              )}

              {/* Cross-page totals — always visible, shows zeros until runs are added */}
              <CrossPageTotals runs={runs} countSessions={countSessions} />

            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

// ─── Pin shape swatch (inline SVG preview) ──────────────────────────────────
function PinShapeSwatch({ shape, color, size = 16 }: { shape: PinShape; color: string; size?: number }) {
  const icon = COUNT_ICONS.find((ic) => ic.id === shape) ?? COUNT_ICONS[0];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" className="shrink-0">
      {icon.paths.map((seg, pi) => (
        <path key={pi} d={seg.d}
          fill={seg.strokeOnly ? "none" : color}
          stroke={color}
          strokeWidth={seg.strokeWidth ?? 1.5}
          strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

// ─── Simple 4-shape picker ───────────────────────────────────────────────────
function CivilShapeSelector({
  activeIconId,
  activeColor,
  onSelect,
}: {
  activeIconId: string;
  activeColor: string;
  onSelect: (id: PinShape) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">Pin Shape</Label>
      <div className="flex gap-2">
        {COUNT_ICONS.map((icon) => (
          <button key={icon.id} title={icon.label} onClick={() => onSelect(icon.id)}
            className={cn("flex flex-col items-center gap-1 p-2 rounded-md border text-[9px] transition-all flex-1",
              activeIconId === icon.id ? "border-[#F5C518] bg-[#F5C518]/10 text-foreground" : "border-border bg-muted/10 text-muted-foreground hover:border-border/80 hover:text-foreground")}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
              {icon.paths.map((seg, pi) => (
                <path key={pi} d={seg.d}
                  fill={seg.strokeOnly ? "none" : (activeIconId === icon.id ? activeColor : "currentColor")}
                  stroke={activeIconId === icon.id ? activeColor : "currentColor"}
                  strokeWidth={seg.strokeWidth ?? 1.5} strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </svg>
            <span className="leading-tight text-center">{icon.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  civil: "Civil & Underground",
  commercial: "Commercial Assembly",
  residential: "Residential Rough-In",
  industrial: "Industrial",
};
export default function UnifiedProjects({ category = "civil" }: { category?: "civil" | "commercial" | "residential" | "industrial" }) {
  const {
    civilCatProjects,
    activeCivilCatId,
    activeCivilCatProject,
    addCivilCatProject,
    renameCivilCatProject,
    deleteCivilCatProject,
    switchCivilCatProject,
    commercialCatProjects,
    activeCommercialCatId,
    activeCommercialCatProject,
    addCommercialCatProject,
    renameCommercialCatProject,
    deleteCommercialCatProject,
    switchCommercialCatProject,
    residentialCatProjects,
    activeResidentialCatId,
    activeResidentialCatProject,
    addResidentialCatProject,
    renameResidentialCatProject,
    deleteResidentialCatProject,
    switchResidentialCatProject,
    industrialCatProjects,
    activeIndustrialCatId,
    activeIndustrialCatProject,
    addIndustrialCatProject,
    renameIndustrialCatProject,
    deleteIndustrialCatProject,
    switchIndustrialCatProject,
  } = useApp();
  // Pick the right store based on category
  const civilProjects = category === "civil" ? civilCatProjects : category === "commercial" ? commercialCatProjects : category === "industrial" ? industrialCatProjects : residentialCatProjects;
  const activeCivilId = category === "civil" ? activeCivilCatId : category === "commercial" ? activeCommercialCatId : category === "industrial" ? activeIndustrialCatId : activeResidentialCatId;
  const activeCivilProject = category === "civil" ? activeCivilCatProject : category === "commercial" ? activeCommercialCatProject : category === "industrial" ? activeIndustrialCatProject : activeResidentialCatProject;
  const addCivilProject = category === "civil" ? addCivilCatProject : category === "commercial" ? addCommercialCatProject : category === "industrial" ? addIndustrialCatProject : addResidentialCatProject;
  const renameCivilProject = category === "civil" ? renameCivilCatProject : category === "commercial" ? renameCommercialCatProject : category === "industrial" ? renameIndustrialCatProject : renameResidentialCatProject;
  const deleteCivilProject = category === "civil" ? deleteCivilCatProject : category === "commercial" ? deleteCommercialCatProject : category === "industrial" ? deleteIndustrialCatProject : deleteResidentialCatProject;
  const switchCivilProject = category === "civil" ? switchCivilCatProject : category === "commercial" ? switchCommercialCatProject : category === "industrial" ? switchIndustrialCatProject : switchResidentialCatProject;
    const categoryLabel = CATEGORY_LABELS[category] ?? "Projects";

  // ── Hash-based sub-routing so browser back/forward works ──────────────────
  // Hash format: #/residential/project-id  (project list = #/residential)
  function getProjectIdFromHash(): string | null {
    const hash = window.location.hash.replace(/^#\/?/, "");
    const parts = hash.split("/");
    // parts[0] = category, parts[1] = project id (if present)
    if (parts[0] === category && parts[1] && parts[1] !== "") return parts[1];
    return null;
  }

  const [openProjectId, setOpenProjectId] = useState<string | null>(() => getProjectIdFromHash());

  // Listen for browser back/forward to sync openProjectId
  useEffect(() => {
    const onHashChange = () => {
      setOpenProjectId(getProjectIdFromHash());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const handleOpen = (id: string) => {
    switchCivilProject(id);
    // Push sub-route so browser back returns to project list
    window.location.hash = `/${category}/${id}`;
    setOpenProjectId(id);
  };
  const handleNew = (name?: string) => {
    addCivilProject(name);
    // After adding, the new project becomes active — open it immediately
    setTimeout(() => {
      setOpenProjectId(null);
      setTimeout(() => {
        // Push sub-route with "__new__" sentinel
        window.location.hash = `/${category}/__new__`;
        setOpenProjectId("__new__");
      }, 50);
    }, 50);
  };
  // When openProjectId is "__new__", resolve to actual activeCivilId
  const resolvedOpenId =
    openProjectId === "__new__" ? activeCivilId : openProjectId;

  if (!resolvedOpenId) {
    return (
      <ProjectHomepage
        projects={civilProjects}
        activeId={activeCivilId}
        onOpen={handleOpen}
        onNew={handleNew}
        onRename={renameCivilProject}
        onDelete={deleteCivilProject}
        onSwitch={switchCivilProject}
        category={category}
      />
    );
  }

  const proj = civilProjects.find((p) => p.id === resolvedOpenId) ?? activeCivilProject;

  return (
    <CivilEditor
      projectId={proj.id}
      projectName={proj.name}
      categoryLabel={categoryLabel}
      onBack={() => {
        // Use browser history.back() so the URL sub-route is popped
        // and the hashchange listener above will set openProjectId to null
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.hash = `/${category}`;
          setOpenProjectId(null);
        }
      }}
    />
  );
}
