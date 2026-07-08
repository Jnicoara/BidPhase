/**
 * BidPhase — Unified Projects Tab
 * Single tab replacing Civil / Commercial / Residential.
 * Uses CivilState/CivilProject as the canonical project type.
 * Each run has a runType toggle: "conduit" (pipe sticks + fittings) or "wire" (bare conductor).
 */
import React, { useState, useCallback, useEffect, useRef } from "react";
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
import { COUNT_ICONS, ICON_CATEGORIES, PIN_COLORS, DEFAULT_ICON_ID, DEFAULT_PIN_COLOR, type PinShape } from "@/lib/CountIcons";
import { WIRE_TYPES, WIRE_CATEGORIES, type WireCategory } from "@/lib/wireTypes";
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
import type { ImperativePanelHandle } from "react-resizable-panels";
import PlanPanel from "@/components/PlanPanel";
import ProjectHomepage from "@/components/ProjectHomepage";
import { cn } from "@/lib/utils";
import {
  Plus, Minus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Link2, Trash2, Pencil, Check, X, Undo2, Maximize2, Download,
} from "lucide-react";
import type { CatalogItem, UserMaterialRow } from "@/lib/materialCatalog";
import { getConduitPricePerFoot, getWirePricePerFoot } from "@/lib/materialCatalog";
import { trpc } from "@/lib/trpc";
import type { SavedMaterialRow } from "@/contexts/AppContext";
import { PriceSyncDialog } from "@/components/PriceSyncDialog";

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

// ─── Infrastructure icon ────────────────────────────────────────────────
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

// ── Electrical (combined) icon — lightning bolt ─────────────────────────────
export function ElectricalIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Bolt shape */}
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// ── Projects icon — folder with blueprint grid inside (matches early-phase icon style) ─────────
export function ElectricalPanelIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      {/* Folder tab */}
      <path d="M2 7.5C2 6.67 2.67 6 3.5 6H9l2 2h9.5c.83 0 1.5.67 1.5 1.5V18c0 .83-.67 1.5-1.5 1.5h-17C2.67 19.5 2 18.83 2 18V7.5Z" />
      {/* Blueprint grid: horizontal rules */}
      <line x1="6.5" y1="11.5" x2="17.5" y2="11.5" />
      <line x1="6.5" y1="14.5" x2="17.5" y2="14.5" />
      <line x1="6.5" y1="17" x2="13" y2="17" />
      {/* Blueprint grid: vertical rule */}
      <line x1="11" y1="10" x2="11" y2="17.5" />
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

// ── Jacketed / Romex wire calculation ────────────────────────────────────────
// Net Length = feet + (makeupAllowance × numTerminations) + serviceLoop
// Total Billable Wire = Net Length × (1 + wirewasteFactor/100)
function calcWire(
  feet: number,
  conductors: number,
  makeupAllowance = 2,
  serviceLoop = 3,
  numTerminations = 2,
  wirewasteFactor = 10,
) {
  const netLength = feet + makeupAllowance * numTerminations + serviceLoop;
  return parseFloat((netLength * (1 + wirewasteFactor / 100)).toFixed(1));
}

// ── Conduit calculations ──────────────────────────────────────────────────────
// Total Billable Conduit = feet × (1 + conduitWasteFactor/100)
// Net Wire Length = feet + (wireTermMakeup × numPullPoints)
// Total Billable Wire (per conductor) = Net Wire Length × (1 + wireWasteFactor/100)
function calcConduitBillable(feet: number, conduitWasteFactor = 10) {
  return parseFloat((feet * (1 + conduitWasteFactor / 100)).toFixed(1));
}
function calcConduitWire(
  feet: number,
  conductors: number,
  wireTermMakeup = 2,
  numPullPoints = 2,
  wireWasteFactor = 10,
) {
  const netWireLength = feet + wireTermMakeup * numPullPoints;
  return parseFloat((netWireLength * (1 + wireWasteFactor / 100) * conductors).toFixed(1));
}
/** @deprecated Use calcConduitBillable instead */
function calcConduitWithSlack(feet: number, slackPct = 10) {
  return calcConduitBillable(feet, slackPct);
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

// ─── Wire Type Picker ────────────────────────────────────────────────────────
function WireTypePicker({
  value,
  stranded,
  onChange,
  availableCategories,
}: {
  value?: string;
  stranded?: boolean;
  onChange: (id: string, stranded: boolean) => void;
  availableCategories?: WireCategory[];
}) {
  const cats = availableCategories && availableCategories.length > 0 ? availableCategories : WIRE_CATEGORIES;
  const [activeCategory, setActiveCategory] = useState<WireCategory>("THHN / THWN");
  const filtered = WIRE_TYPES.filter((w) => w.category === activeCategory);
  const selected = WIRE_TYPES.find((w) => w.id === value);

  return (
    <div className="space-y-2">
      <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Wire Type</Label>
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1">
        {cats.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-2 py-0.5 rounded text-[9px] font-medium border transition-all",
              activeCategory === cat
                ? "bg-yellow-400 text-black border-yellow-400"
                : "bg-muted/30 text-muted-foreground border-border hover:border-yellow-400/50"
            )}
          >
            {cat}
          </button>
        ))}
      </div>
      {/* Wire list */}
      <div className="max-h-32 overflow-y-auto space-y-0.5 pr-0.5" style={{ scrollbarWidth: "thin" }}>
        {filtered.map((wt) => {
          const isSelected = value === wt.id;
          return (
            <button
              key={wt.id}
              onClick={() => onChange(wt.id, wt.hasStrandedChoice ? (wt.defaultStranded ?? false) : false)}
              className={cn(
                "w-full text-left px-2 py-1.5 rounded text-[10px] border transition-all",
                isSelected
                  ? "bg-yellow-400/20 border-yellow-400 text-foreground"
                  : "bg-muted/20 border-transparent hover:border-yellow-400/40 text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="font-mono font-semibold">{wt.label}</span>
              <span className="ml-1.5 text-[9px] opacity-70">{wt.description}</span>
            </button>
          );
        })}
      </div>
      {/* Stranded / Solid toggle — only shown when selected wire supports it */}
      {selected?.hasStrandedChoice && (
        <div className="flex gap-2">
          {([false, true] as const).map((isStranded) => (
            <button
              key={String(isStranded)}
              onClick={() => onChange(selected.id, isStranded)}
              className={cn(
                "flex-1 py-1 rounded text-[10px] font-medium border transition-all",
                (stranded ?? selected.defaultStranded ?? false) === isStranded
                  ? "bg-yellow-400 text-black border-yellow-400"
                  : "bg-muted/30 text-muted-foreground border-border hover:border-yellow-400/50"
              )}
            >
              {isStranded ? "Stranded" : "Solid"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Compact Run Row ─────────────────────────────────────────────────────────
/**
 * CompactRunRow — a single table row for a conduit run in the compact table view.
 * Shows: color dot + name (click to rename) | footage | conduit type+size | remove
 */
function CompactRunRow({
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
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(run.name);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const isWire = (run.runType ?? "conduit") === "wire";
  const palette = ["#22C55E","#3B82F6","#F97316","#A855F7","#EC4899","#14B8A6"];

  const startEditName = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNameInput(run.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 30);
  };
  const commitName = () => {
    const trimmed = nameInput.trim();
    if (trimmed) onUpdate(run.id, { name: trimmed });
    setEditingName(false);
  };

  return (
    <tr className="border-b border-border/20 hover:bg-muted/10 transition-colors group">
      {/* Name cell */}
      <td className="px-4 py-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: palette[index % palette.length] }}
          />
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") setEditingName(false);
              }}
              className="text-xs font-medium bg-transparent border-b border-[#F5C518] outline-none text-foreground w-24"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="text-xs font-medium text-foreground cursor-text hover:text-[#F5C518] transition-colors truncate max-w-[100px]"
              onClick={startEditName}
              title="Click to rename"
            >
              {run.name}
            </span>
          )}
        </div>
      </td>
      {/* Footage cell — total only; per-segment breakdown shows on canvas */}
      <td className="px-2 py-1.5 text-right">
        <span className="font-mono text-[#F5C518] font-semibold">{run.feet > 0 ? `${run.feet.toFixed(0)}'` : "—"}</span>
      </td>
      {/* Type cell */}
      <td className="px-2 py-1.5">
        <span className="text-[10px] font-mono text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
          {isWire ? `Wire ${run.conductors}c` : `${run.conduitType ?? "EMT"} ${run.conduitSize}"`}
        </span>
      </td>
      {/* Remove cell */}
      <td className="px-2 py-1.5 w-6">
        <button
          onClick={() => onRemove(run.id)}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground/50 hover:text-destructive transition-all rounded hover:bg-destructive/10"
          title="Remove run"
        >
          <X size={11} />
        </button>
      </td>
    </tr>
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
  userMaterials = [],
}: {
  run: RunItem;
  index: number;
  onUpdate: (id: string, partial: Partial<RunItem>) => void;
  onRemove: (id: string) => void;
  userMaterials?: UserMaterialRow[];
}) {
  const [showFittings, setShowFittings] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(run.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const startEditName = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNameInput(run.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 30);
  };
  const commitName = () => {
    const trimmed = nameInput.trim();
    if (trimmed) onUpdate(run.id, { name: trimmed });
    setEditingName(false);
  };

  const isWire = (run.runType ?? "conduit") === "wire";
  const conduitOnly = !isWire && (run.conduitOnly ?? false);

  // ── Derive available conduit types from user DB, ordered most-to-least common ──
  // Priority order: EMT, PVC, RMC, IMC, FMC, LFMC, ENT, LFNC, GRC
  const CONDUIT_ORDER = ["EMT", "PVC", "RMC", "IMC", "FMC", "LFMC", "ENT", "LFNC", "GRC"];
  const DB_CONDUIT_KEYWORDS: Record<string, string[]> = {
    EMT:  ["emt"],
    RMC:  ["rmc", "rigid metal"],
    IMC:  ["imc"],
    PVC:  ["pvc"],
    FMC:  ["fmc", "flex conduit", "flexible metal"],
    LFMC: ["lfmc", "liquidtight"],
    LFNC: ["lfnc"],
    ENT:  ["ent", "smurf"],
    GRC:  ["grc"],
  };
  const dbConduitTypes = CONDUIT_ORDER.filter((ct) => {
    if (userMaterials.length === 0) return true; // show all when no DB
    const kws = DB_CONDUIT_KEYWORDS[ct] ?? [ct.toLowerCase()];
    return userMaterials.some((m) => {
      const d = m.description.toLowerCase();
      return kws.some((k) => d.includes(k));
    });
  });
  // Always include at least EMT as fallback
  const availableConduitTypes = dbConduitTypes.length > 0 ? dbConduitTypes : ["EMT"];

  // ── Wire-only mode: derive available wire types from user DB ──
  // Group by category label for the picker tabs
  const DB_WIRE_KEYWORDS: Record<string, string[]> = {
    "THHN / THWN":    ["thhn", "thwn"],
    "NM Cable (Romex)": ["nm-b", "nm", "romex"],
    "Specialty":       ["mc", "bx", "ac-90", "metal clad"],
    "Service Entrance": ["ser", "seu", "service entrance"],
    "XHHW":            ["xhhw"],
    "USE / URD":       ["urd", "use-2", "use "],
    "Bare / Ground":   ["bare", "ground wire"],
    "Low Voltage":     ["cat6", "cat 6", "coax", "fire alarm", "security", "speaker", "thermostat", "cl2"],
  };
  const dbWireCategories = userMaterials.length === 0
    ? WIRE_CATEGORIES
    : WIRE_CATEGORIES.filter((cat) => {
        const kws = DB_WIRE_KEYWORDS[cat] ?? [];
        return kws.length === 0 || userMaterials.some((m) => {
          const d = m.description.toLowerCase();
          return kws.some((k) => d.includes(k));
        });
      });
  const availableWireCategories = dbWireCategories.length > 0 ? dbWireCategories : WIRE_CATEGORIES;

  // ── Wire-only mode calculations ──
  const makeupAllowance = run.makeupAllowance ?? 0;   // default 0 — user sets per-job
  const serviceLoop     = run.serviceLoop     ?? 0;   // default 0 — user sets per-job
  const numTerminations = run.numTerminations ?? 0;   // default 0 — user sets per-job
  const wirewasteFactor = run.wirewasteFactor ?? 10;
  const wireNetLength   = run.feet + makeupAllowance * numTerminations + serviceLoop;
  const wireBillable    = calcWire(run.feet, run.conductors, makeupAllowance, serviceLoop, numTerminations, wirewasteFactor);

  // ── Conduit mode calculations ──
  const conduitWasteFactor  = run.conduitWasteFactor ?? 10;
  const wireWasteFactor     = run.wireWasteFactor    ?? 10;  // separate from conduit
  const wireTermMakeup      = run.wireTermMakeup     ?? 0;   // default 0 — user sets per-job
  const numPullPoints       = run.numPullPoints      ?? 0;   // default 0 — user sets per-job
  const conduitBillable     = calcConduitBillable(run.feet, conduitWasteFactor);
  const conduitWireBillable = conduitOnly
    ? 0
    : calcConduitWire(run.feet, run.conductors, wireTermMakeup, numPullPoints, wireWasteFactor);

  // ── Conduit sizes filtered per conduit type ──
  // Real NEC trade sizes available for each conduit type
  const CONDUIT_SIZES_BY_TYPE: Record<string, { value: string; label: string }[]> = {
    EMT:  [
      { value: "1/2",   label: '½"'  }, { value: "3/4",   label: '¾"'  },
      { value: "1",     label: '1"'  }, { value: "1-1/4", label: '1¼"' },
      { value: "1-1/2", label: '1½"' }, { value: "2",     label: '2"'  },
      { value: "2-1/2", label: '2½"' }, { value: "3",     label: '3"'  },
      { value: "3-1/2", label: '3½"' }, { value: "4",     label: '4"'  },
    ],
    RMC:  [
      { value: "1/2",   label: '½"'  }, { value: "3/4",   label: '¾"'  },
      { value: "1",     label: '1"'  }, { value: "1-1/4", label: '1¼"' },
      { value: "1-1/2", label: '1½"' }, { value: "2",     label: '2"'  },
      { value: "2-1/2", label: '2½"' }, { value: "3",     label: '3"'  },
      { value: "3-1/2", label: '3½"' }, { value: "4",     label: '4"'  },
    ],
    IMC:  [
      { value: "1/2",   label: '½"'  }, { value: "3/4",   label: '¾"'  },
      { value: "1",     label: '1"'  }, { value: "1-1/4", label: '1¼"' },
      { value: "1-1/2", label: '1½"' }, { value: "2",     label: '2"'  },
      { value: "2-1/2", label: '2½"' }, { value: "3",     label: '3"'  },
    ],
    PVC:  [
      { value: "1/2",   label: '½"'  }, { value: "3/4",   label: '¾"'  },
      { value: "1",     label: '1"'  }, { value: "1-1/4", label: '1¼"' },
      { value: "1-1/2", label: '1½"' }, { value: "2",     label: '2"'  },
      { value: "2-1/2", label: '2½"' }, { value: "3",     label: '3"'  },
      { value: "3-1/2", label: '3½"' }, { value: "4",     label: '4"'  },
      { value: "5",     label: '5"'  }, { value: "6",     label: '6"'  },
    ],
    FMC:  [
      { value: "3/8",   label: '⅜"'  }, { value: "1/2",   label: '½"'  },
      { value: "3/4",   label: '¾"'  }, { value: "1",     label: '1"'  },
      { value: "1-1/4", label: '1¼"' }, { value: "1-1/2", label: '1½"' },
      { value: "2",     label: '2"'  },
    ],
    LFMC: [
      { value: "3/8",   label: '⅜"'  }, { value: "1/2",   label: '½"'  },
      { value: "3/4",   label: '¾"'  }, { value: "1",     label: '1"'  },
      { value: "1-1/4", label: '1¼"' }, { value: "1-1/2", label: '1½"' },
      { value: "2",     label: '2"'  },
    ],
    LFNC: [
      { value: "3/8",   label: '⅜"'  }, { value: "1/2",   label: '½"'  },
      { value: "3/4",   label: '¾"'  }, { value: "1",     label: '1"'  },
      { value: "1-1/4", label: '1¼"' }, { value: "1-1/2", label: '1½"' },
      { value: "2",     label: '2"'  },
    ],
    ENT:  [
      { value: "1/2",   label: '½"'  }, { value: "3/4",   label: '¾"'  },
      { value: "1",     label: '1"'  }, { value: "1-1/4", label: '1¼"' },
      { value: "1-1/2", label: '1½"' }, { value: "2",     label: '2"'  },
    ],
    GRC:  [
      { value: "1/2",   label: '½"'  }, { value: "3/4",   label: '¾"'  },
      { value: "1",     label: '1"'  }, { value: "1-1/4", label: '1¼"' },
      { value: "1-1/2", label: '1½"' }, { value: "2",     label: '2"'  },
      { value: "2-1/2", label: '2½"' }, { value: "3",     label: '3"'  },
      { value: "3-1/2", label: '3½"' }, { value: "4",     label: '4"'  },
    ],
  };
  const conduitSizesForType = CONDUIT_SIZES_BY_TYPE[run.conduitType ?? "EMT"] ?? CONDUIT_SIZES_BY_TYPE["EMT"];

  // ── Cost-per-foot lookup: user DB price > built-in catalog ──
  // For jacketed cables (MC, NM), parse the AWG size from the wireTypeId (e.g. "mc-12-2" → "12")
  const parseWireIdSize = (id?: string): string => {
    if (!id) return "12";
    // IDs like "mc-12-2", "nm-14-2", "thhn-12-cu" → extract first numeric segment after type prefix
    const parts = id.split("-");
    for (const p of parts) {
      if (/^\d+$/.test(p) || /^\d+\/\d+$/.test(p)) return p;
    }
    return "12";
  };
  const conduitCostPerFt = !isWire
    ? getConduitPricePerFoot(run.conduitType ?? "EMT", run.conduitSize ?? "1/2", userMaterials)
    : null;
  const wireTypeStr = (() => {
    const id = run.wireTypeId ?? "";
    if (id.startsWith("nm") || id.includes("nm-b") || id.includes("romex")) return "NM";
    if (id.startsWith("mc") || id.includes("mc-")) return "MC";
    if (id.startsWith("xhhw")) return "XHHW";
    if (id.startsWith("bare") || id.startsWith("ground")) return "BARE";
    return "THHN";
  })();
  // For jacketed cables, size comes from wireTypeId; for THHN/XHHW, use conductorSize picker
  const effectiveWireSize = (wireTypeStr === "MC" || wireTypeStr === "NM")
    ? parseWireIdSize(run.wireTypeId)
    : (run.conductorSize ?? "12");
  const wireCostPerFt = (!conduitOnly)
    ? getWirePricePerFoot(wireTypeStr, effectiveWireSize, run.conductorMaterial ?? "CU", userMaterials, run.wireTypeId)
    : null;

  const conduitMaterialCost = conduitCostPerFt != null ? conduitCostPerFt * conduitBillable : null;
  // wireBillable (calcWire) returns per-conductor footage — multiply by conductors for total
  // conduitWireBillable (calcConduitWire) already includes conductors — do NOT multiply again
  const wireMaterialCost    = (!conduitOnly && wireCostPerFt != null)
    ? wireCostPerFt * (isWire ? wireBillable * run.conductors : conduitWireBillable)
    : null;
  const totalMaterialCost   = (conduitMaterialCost ?? 0) + (wireMaterialCost ?? 0);

  const updateFitting = (key: FittingId, val: number) => {
    onUpdate(run.id, { fittings: { ...run.fittings, [key]: val } });
  };
  const totalFittings = Object.values(run.fittings).reduce((a, b) => a + b, 0);

  // Helper: safe numeric input that allows 0
  const numInput = (val: number, onChange: (n: number) => void, step = 1, placeholder = "0") => (
    <Input
      type="number"
      min={0}
      step={step}
      value={val === 0 ? "" : val}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? 0 : parseFloat(raw) || 0);
      }}
      className="h-7 font-mono text-xs bg-input border-border"
    />
  );

  return (
    <div className="bp-card overflow-hidden">
      {/* Delete confirmation overlay */}
      {confirmDelete && (
        <div className="absolute inset-0 z-10 bg-background/90 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="bg-card border border-border rounded-xl shadow-xl p-4 max-w-[240px] w-full space-y-3">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-destructive">Remove Run?</h3>
              <p className="text-xs text-muted-foreground">
                Remove <strong>{run.name}</strong> from the right panel? The measurement on the plan is not affected.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { onRemove(run.id); setConfirmDelete(false); }}
                className="flex-1 py-1.5 rounded text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
                Remove
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-1.5 rounded text-xs font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Run header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/10 cursor-pointer select-none"
        onClick={() => setIsCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0"
            style={{ background: ["#22C55E","#3B82F6","#F97316","#A855F7","#EC4899","#14B8A6"][index % 6] }} />
          {editingName ? (
            <input ref={nameInputRef} value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") setEditingName(false); }}
              className="text-sm font-semibold bg-transparent border-b border-[#F5C518] outline-none text-foreground w-28"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              onClick={(e) => e.stopPropagation()} />
          ) : (
            <span className="text-sm font-semibold text-foreground cursor-text hover:text-[#F5C518] transition-colors"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              onClick={startEditName} title="Click to rename">
              {run.name}
            </span>
          )}
          <span className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">
            {isWire
              ? `Wire · ${run.conductors}c`
              : conduitOnly
                ? `${run.conduitType ?? "EMT"} ${run.conduitSize}" · empty`
                : `${run.conduitType ?? "EMT"} ${run.conduitSize}"`}
          </span>
          {run.pageNumber !== undefined && (
            <span className="text-[10px] font-mono text-muted-foreground/60 bg-muted/20 px-1.5 py-0.5 rounded">pg {run.pageNumber}</span>
          )}
          {isCollapsed && (
            <span className="text-[10px] font-mono text-[#F5C518] bg-[#F5C518]/10 px-1.5 py-0.5 rounded">{run.feet} ft</span>
          )}
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setIsCollapsed((v) => !v)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            title={isCollapsed ? "Expand" : "Collapse"}>
            {isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
          <button onClick={() => setConfirmDelete(true)}
            className="p-1 text-muted-foreground/50 hover:text-destructive transition-colors rounded hover:bg-destructive/10"
            title="Remove run">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Run body */}
      <div className={cn("p-4 space-y-4", isCollapsed ? "hidden" : "")}>

        {/* Measured Takeoff + Conductors */}
        <div className={isWire ? "space-y-1.5" : "grid grid-cols-2 gap-3"}>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Measured Takeoff (ft)</Label>
            <Input type="number" min={0} step={1}
              value={run.feet === 0 ? "" : run.feet}
              onChange={(e) => onUpdate(run.id, { feet: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="h-8 font-mono text-sm bg-input border-border" />
          </div>
          {!isWire && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Current Carrying Conductors</Label>
                <span className="text-sm font-bold text-[#F5C518] font-mono">{run.conductors}</span>
              </div>
              <Slider min={1} max={12} step={1} value={[run.conductors]}
                onValueChange={([v]) => onUpdate(run.id, { conductors: v })}
                className="[&_[role=slider]]:bg-[#F5C518] [&_[role=slider]]:border-[#F5C518] [&_.bg-primary]:bg-[#F5C518]" />
            </div>
          )}
        </div>

        {/* Equipment Grounding Conductor (EGC) — directly below Current Carrying Conductors */}
        {!isWire && (
          <div className={cn(
            "rounded-lg border px-3 py-2.5 transition-all",
            run.includeGround
              ? "border-green-500/60 bg-green-500/8"
              : "border-border/50 bg-muted/10"
          )}>
            {/* Header row: label + toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className={cn(
                  "text-[11px] font-semibold uppercase tracking-wide",
                  run.includeGround ? "text-green-400" : "text-muted-foreground"
                )}>Equipment Grounding Conductor (EGC)</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Add bare/green EGC to this run</div>
              </div>
              <button
                onClick={() => onUpdate(run.id, { includeGround: !run.includeGround })}
                className={cn(
                  "relative w-9 h-5 rounded-full border transition-all ml-3 shrink-0",
                  run.includeGround
                    ? "bg-green-500 border-green-500"
                    : "bg-muted/40 border-border"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
                  run.includeGround ? "left-4" : "left-0.5"
                )} />
              </button>
            </div>

            {/* EGC options — only when enabled */}
            {run.includeGround && (
              <div className="mt-3 space-y-2.5">
                {/* Cu / Al material toggle */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">EGC Material</Label>
                  <div className="flex gap-2">
                    {CONDUCTOR_MATERIALS.map((cm) => (
                      <button key={cm.id}
                        onClick={() => onUpdate(run.id, { groundMaterial: cm.id as ConductorMaterial })}
                        className={cn(
                          "flex-1 py-1.5 rounded text-xs font-mono font-semibold border transition-all",
                          (run.groundMaterial ?? "CU") === cm.id
                            ? "bg-green-500 text-black border-green-500"
                            : "bg-muted/30 text-muted-foreground border-border hover:border-green-500/50 hover:text-foreground"
                        )}>
                        {cm.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* EGC size grid */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">EGC Size (AWG)</Label>
                  <div className="grid grid-cols-5 gap-1">
                    {(["14","12","10","8","6","4","2","1/0","2/0","3/0","4/0"] as const).map((sz) => (
                      <button key={sz}
                        onClick={() => onUpdate(run.id, { groundSize: sz })}
                        className={cn(
                          "py-1 rounded text-[10px] font-mono font-medium border transition-all",
                          (run.groundSize ?? "12") === sz
                            ? "bg-green-500 text-black border-green-500"
                            : "bg-muted/30 text-muted-foreground border-border hover:border-green-500/50 hover:text-foreground"
                        )}>
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Run type toggle: Conduit vs Wire Only */}
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Run Type</Label>
          <div className="flex gap-2">
            {(["conduit", "wire"] as const).map((rt) => (
              <button key={rt}
                onClick={() => onUpdate(run.id, { runType: rt, conduitOnly: false })}
                className={cn(
                  "flex-1 py-1.5 rounded text-xs font-medium border transition-all",
                  (run.runType ?? "conduit") === rt
                    ? "bg-yellow-400 text-black border-yellow-400"
                    : "bg-muted/30 text-muted-foreground border-border hover:border-yellow-400/50 hover:text-foreground"
                )}>
                {rt === "wire" ? "Wire Only" : "Conduit / Wire"}
              </button>
            ))}
          </div>
        </div>

        {/* ───────────────────────── CONDUIT MODE ───────────────────────── */}
        {!isWire && (
          <>
            {/* Conduit Type — DB-synced, ordered most-to-least common */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Conduit Type</Label>
              <div className="flex flex-wrap gap-1">
                {availableConduitTypes.map((ct) => (
                  <button key={ct}
                    onClick={() => onUpdate(run.id, { conduitType: ct as ConduitType })}
                    className={cn(
                      "px-2.5 py-1 rounded text-[10px] font-mono font-semibold border transition-all",
                      (run.conduitType ?? "EMT") === ct
                        ? "bg-yellow-400 text-black border-yellow-400"
                        : "bg-muted/30 text-muted-foreground border-border hover:border-yellow-400/50 hover:text-foreground"
                    )}>
                    {ct}
                  </button>
                ))}
              </div>
            </div>

            {/* Conduit Size */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Conduit Size</Label>
              <div className="grid grid-cols-5 gap-1">
                {conduitSizesForType.map((cs) => (
                  <button key={cs.value}
                    onClick={() => onUpdate(run.id, { conduitSize: cs.value })}
                    className={cn(
                      "py-1 rounded text-[10px] font-mono font-medium border transition-all",
                      run.conduitSize === cs.value
                        ? "bg-yellow-400 text-black border-yellow-400"
                        : "bg-muted/30 text-muted-foreground border-border hover:border-yellow-400/50 hover:text-foreground"
                    )}>
                    {cs.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conduit-Only toggle (future pull / empty conduit) */}
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/10 px-3 py-2">
              <div>
                <div className="text-[11px] font-medium text-foreground">Empty / Future Pull</div>
                <div className="text-[10px] text-muted-foreground">No wire — conduit only (stub-out)</div>
              </div>
              <button
                onClick={() => onUpdate(run.id, { conduitOnly: !conduitOnly })}
                className={cn(
                  "relative w-9 h-5 rounded-full border transition-all",
                  conduitOnly
                    ? "bg-yellow-400 border-yellow-400"
                    : "bg-muted/40 border-border"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
                  conduitOnly ? "left-4" : "left-0.5"
                )} />
              </button>
            </div>

            {/* Wire type + conductor material/size — hidden in conduit-only mode */}
            {!conduitOnly && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Conductor Material</Label>
                  <div className="flex gap-2">
                    {CONDUCTOR_MATERIALS.map((cm) => (
                      <button key={cm.id}
                        onClick={() => onUpdate(run.id, { conductorMaterial: cm.id as ConductorMaterial })}
                        className={cn(
                          "flex-1 py-1.5 rounded text-xs font-mono font-semibold border transition-all",
                          (run.conductorMaterial ?? "CU") === cm.id
                            ? "bg-yellow-400 text-black border-yellow-400"
                            : "bg-muted/30 text-muted-foreground border-border hover:border-yellow-400/50 hover:text-foreground"
                        )}>
                        {cm.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Conductor Size (AWG)</Label>
                  <div className="grid grid-cols-5 gap-1">
                    {CONDUCTOR_SIZES.map((sz) => (
                      <button key={sz}
                        onClick={() => onUpdate(run.id, { conductorSize: sz as ConductorSize })}
                        className={cn(
                          "py-1 rounded text-[10px] font-mono font-medium border transition-all",
                          (run.conductorSize ?? "12") === sz
                            ? "bg-yellow-400 text-black border-yellow-400"
                            : "bg-muted/30 text-muted-foreground border-border hover:border-yellow-400/50 hover:text-foreground"
                        )}>
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Conduit Estimating Inputs */}
            <div className="space-y-3 rounded-lg border border-border/50 bg-muted/10 p-3">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Estimating Inputs</Label>
              <div className="grid grid-cols-2 gap-3">
                {/* Conduit waste factor */}
                <div className="space-y-1 col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] text-muted-foreground">Conduit Waste Factor</Label>
                    <span className="text-[10px] font-bold font-mono text-[#F5C518]">{conduitWasteFactor}%</span>
                  </div>
                  <Slider min={0} max={50} step={1} value={[conduitWasteFactor]}
                    onValueChange={([v]) => onUpdate(run.id, { conduitWasteFactor: v })}
                    className="[&_[role=slider]]:bg-[#F5C518] [&_[role=slider]]:border-[#F5C518] [&_.bg-primary]:bg-[#F5C518]" />
                </div>
                {/* Wire waste factor — only shown when wire is included */}
                {!conduitOnly && (
                  <div className="space-y-1 col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-muted-foreground">Wire Waste Factor</Label>
                      <span className="text-[10px] font-bold font-mono text-[#F5C518]">{wireWasteFactor}%</span>
                    </div>
                    <Slider min={0} max={50} step={1} value={[wireWasteFactor]}
                      onValueChange={([v]) => onUpdate(run.id, { wireWasteFactor: v })}
                      className="[&_[role=slider]]:bg-[#F5C518] [&_[role=slider]]:border-[#F5C518] [&_.bg-primary]:bg-[#F5C518]" />
                  </div>
                )}
                {/* Pull points */}
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">No. of Pull Points</Label>
                  {numInput(numPullPoints, (v) => onUpdate(run.id, { numPullPoints: v }))}
                </div>
                {/* Wire makeup per pull point — only when wire is included */}
                {!conduitOnly && (
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Wire Makeup / Pull Pt (ft)</Label>
                    {numInput(wireTermMakeup, (v) => onUpdate(run.id, { wireTermMakeup: v }), 0.5)}
                  </div>
                )}
              </div>
            </div>

            {/* Conduit Outputs */}
            <div className="space-y-2">
              <div className={cn("grid gap-2", conduitOnly ? "grid-cols-1" : "grid-cols-2")}>
                <div className="bg-[#F5C518]/10 rounded-lg p-2.5 border border-[#F5C518]/20">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#F5C518] uppercase tracking-wide mb-1">
                    <ConduitPipeIcon size={10} /> Billable Conduit
                  </div>
                  <div className="text-xl font-bold font-mono text-[#F5C518]">{conduitBillable}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">ft → {calcSticks(conduitBillable)} sticks</div>
                </div>
                {!conduitOnly && (
                  <div className="bg-[#F5C518]/10 rounded-lg p-2.5 border border-[#F5C518]/20">
                    <div className="flex items-center gap-1.5 text-[10px] text-[#F5C518] uppercase tracking-wide mb-1">
                      <StrippedWireIcon size={10} /> Billable Wire
                    </div>
                    <div className="text-xl font-bold font-mono text-[#F5C518]">{conduitWireBillable}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">ft w/ {wireWasteFactor}% waste</div>
                  </div>
                )}
              </div>
              {/* Compact price indicator — full cost breakdown lives in Labor & Material summary */}
              <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/70">
                {conduitCostPerFt != null ? (
                  <span>{run.conduitType ?? "EMT"} {run.conduitSize}": ${conduitCostPerFt.toFixed(3)}/ft</span>
                ) : (
                  <span className="text-muted-foreground/40">No price for {run.conduitType ?? "EMT"} {run.conduitSize}" — set in Material DB</span>
                )}
                {!conduitOnly && wireCostPerFt != null && (
                  <><span className="text-muted-foreground/30">·</span><span>Wire: ${wireCostPerFt.toFixed(3)}/ft</span></>
                )}
              </div>
            </div>

            {/* Fittings */}
            <button
              onClick={() => setShowFittings((v) => !v)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-xs font-medium",
                showFittings
                  ? "border-[#F5C518]/40 bg-[#F5C518]/5 text-[#F5C518]"
                  : "border-border bg-muted/20 text-muted-foreground hover:text-foreground hover:border-border/80"
              )}>
              <div className="flex items-center gap-2">
                <MaleAdapterIcon size={12} />
                <span>Fittings</span>
                {totalFittings > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#F5C518]/20 text-[#F5C518] text-[10px] font-bold">{totalFittings}</span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">{showFittings ? "▲" : "▼"}</span>
            </button>
            {showFittings && (
              <div className="bg-muted/10 rounded-lg px-3 py-2 border border-border/50">
                {FITTING_TYPES.map((ft) => (
                  <FittingCounter key={ft.id} label={ft.label} value={run.fittings[ft.id]} onChange={(v) => updateFitting(ft.id, v)} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ───────────────────────── WIRE ONLY MODE ───────────────────────── */}
        {isWire && (
          <>
            {/* Wire Type Picker — filtered to DB-available categories */}
            <WireTypePicker
              value={run.wireTypeId}
              stranded={run.wireStranded}
              availableCategories={availableWireCategories}
              onChange={(id, stranded) => onUpdate(run.id, { wireTypeId: id, wireStranded: stranded })}
            />

            {/* Wire-Only Estimating Inputs — no separate AWG picker; size is embedded in the wire type selection above */}
            <div className="space-y-3 rounded-lg border border-border/50 bg-muted/10 p-3">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">Estimating Inputs</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Makeup Allowance (ft/term)</Label>
                  {numInput(makeupAllowance, (v) => onUpdate(run.id, { makeupAllowance: v }), 0.5)}
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Service Loop (ft)</Label>
                  {numInput(serviceLoop, (v) => onUpdate(run.id, { serviceLoop: v }), 0.5)}
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">No. of Terminations</Label>
                  {numInput(numTerminations, (v) => onUpdate(run.id, { numTerminations: v }))}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] text-muted-foreground">Waste Factor</Label>
                    <span className="text-[10px] font-bold font-mono text-[#F5C518]">{wirewasteFactor}%</span>
                  </div>
                  <Slider min={0} max={50} step={1} value={[wirewasteFactor]}
                    onValueChange={([v]) => onUpdate(run.id, { wirewasteFactor: v })}
                    className="[&_[role=slider]]:bg-[#F5C518] [&_[role=slider]]:border-[#F5C518] [&_.bg-primary]:bg-[#F5C518]" />
                </div>
              </div>
            </div>

            {/* Wire-Only Outputs */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/20 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                    <StrippedWireIcon size={10} /> Net Length
                  </div>
                  <div className="text-xl font-bold font-mono text-foreground">{wireNetLength.toFixed(1)}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">ft before waste</div>
                </div>
                <div className="bg-[#F5C518]/10 rounded-lg p-2.5 border border-[#F5C518]/20">
                  <div className="flex items-center gap-1.5 text-[10px] text-[#F5C518] uppercase tracking-wide mb-1">
                    <StrippedWireIcon size={10} /> Billable Wire
                  </div>
                  <div className="text-xl font-bold font-mono text-[#F5C518]">{(wireBillable * run.conductors).toFixed(1)}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{run.conductors}c × {wireBillable} ft w/ {wirewasteFactor}% waste</div>
                </div>
              </div>
              {/* Compact price indicator — full cost breakdown lives in Labor & Material summary */}
              <div className="text-[10px] font-mono text-muted-foreground/70">
                {wireCostPerFt != null ? (
                  <span>Wire: ${wireCostPerFt.toFixed(3)}/ft · total est. ${(wireCostPerFt * wireBillable * run.conductors).toFixed(2)}</span>
                ) : (
                  <span className="text-muted-foreground/40">No price for this wire type — set in Material DB</span>
                )}
              </div>
            </div>
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
// ─── Summary Strip (with flash animation on change) ──────────────────────────
function SummaryStrip({ totalFeet, totalSticks, totalWire }: { totalFeet: number; totalSticks: number; totalWire: number }) {
  const feetKey = useFlashKey(totalFeet);
  const sticksKey = useFlashKey(totalSticks);
  const wireKey = useFlashKey(totalWire);
  return (
    <div className="grid grid-cols-3 gap-2 mb-1 mt-3">
      <div className="bg-muted/20 rounded p-2 text-center">
        <div key={feetKey} className="text-lg font-bold font-mono text-[#F5C518] num-flash">{totalFeet.toFixed(0)}</div>
        <div className="text-[9px] text-muted-foreground font-mono uppercase">Total ft</div>
      </div>
      <div className="bg-muted/20 rounded p-2 text-center">
        <div key={sticksKey} className="text-lg font-bold font-mono text-[#F5C518] num-flash">{totalSticks}</div>
        <div className="text-[9px] text-muted-foreground font-mono uppercase">Sticks</div>
      </div>
      <div className="bg-muted/20 rounded p-2 text-center">
        <div key={wireKey} className="text-lg font-bold font-mono text-[#F5C518] num-flash">{totalWire.toFixed(0)}</div>
        <div className="text-[9px] text-muted-foreground font-mono uppercase">Wire ft</div>
      </div>
    </div>
  );
}

// Helper: flash a key when a numeric value changes
function useFlashKey(value: number): string {
  const prevRef = useRef(value);
  const [flashKey, setFlashKey] = useState(0);
  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value;
      setFlashKey((k) => k + 1);
    }
  }, [value]);
  return String(flashKey);
}

function CrossPageTotals({ runs, countSessions = [], userMaterials = [] }: { runs: RunItem[]; countSessions?: CountSession[]; userMaterials?: UserMaterialRow[] }) {
  const { setShowMaterialList } = useApp();

  const pages = Array.from(new Set(runs.map((r) => r.pageNumber).filter((p): p is number => p !== undefined))).sort((a, b) => a - b);

  // ── Conduit breakdown by type+size ──────────────────────────────────────────
  type ConduitKey = string; // e.g. "EMT 3/4""
  const conduitMap = new Map<ConduitKey, { type: string; size: string; feet: number; sticks: number }>();
  for (const r of runs) {
    if ((r.runType ?? "conduit") === "wire") continue; // wire runs handled separately
    const key = `${r.conduitType ?? "EMT"} ${r.conduitSize}"`;
    const billableFt = calcConduitBillable(r.feet, r.conduitWasteFactor ?? 10);
    const existing = conduitMap.get(key);
    if (existing) {
      existing.feet   += billableFt;
      existing.sticks += calcSticks(billableFt);
    } else {
      conduitMap.set(key, { type: r.conduitType ?? "EMT", size: r.conduitSize, feet: billableFt, sticks: calcSticks(billableFt) });
    }
  }
  const conduitRows = Array.from(conduitMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  // ── Wire breakdown by conductor spec ────────────────────────────────────────
  type WireKey = string; // e.g. "#12 AWG Cu"
  const wireMap = new Map<WireKey, { label: string; qty: number; feet: number }>();
  for (const r of runs) {
    if (r.conductors < 1) continue;
    const isWireRun = (r.runType ?? "conduit") === "wire";
    const mat  = r.conductorMaterial ?? "CU";
    const size = r.conductorSize ?? "12";
    const label = conductorLabel(mat as ConductorMaterial, size as ConductorSize);
    // Use per-run estimating parameters for accurate billable totals
    let wireFt: number;
    if (isWireRun) {
      // calcWire returns per-conductor footage — multiply by conductors for total
      wireFt = calcWire(
        r.feet, r.conductors,
        r.makeupAllowance ?? 0,
        r.serviceLoop ?? 0,
        r.numTerminations ?? 0,
        r.wirewasteFactor ?? 10,
      ) * r.conductors;
    } else {
      // calcConduitWire already includes conductors
      wireFt = calcConduitWire(
        r.feet, r.conductors,
        r.wireTermMakeup ?? 0,
        r.numPullPoints ?? 0,
        r.wireWasteFactor ?? 10,
      );
    }
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
  const totalSticks = runs.reduce((a, r) => {
    if ((r.runType ?? "conduit") === "wire") return a;
    return a + calcSticks(calcConduitBillable(r.feet, r.conduitWasteFactor ?? 10));
  }, 0);
  const totalWire   = runs.reduce((a, r) => {
    const isWireRun = (r.runType ?? "conduit") === "wire";
    let runWire: number;
    if (isWireRun) {
      // calcWire returns per-conductor footage — multiply by conductors for total
      runWire = calcWire(r.feet, r.conductors, r.makeupAllowance ?? 0, r.serviceLoop ?? 0, r.numTerminations ?? 0, r.wirewasteFactor ?? 10) * r.conductors;
    } else {
      // calcConduitWire already includes conductors
      runWire = r.conduitOnly ? 0 : calcConduitWire(r.feet, r.conductors, r.wireTermMakeup ?? 0, r.numPullPoints ?? 0, r.wireWasteFactor ?? 10);
    }
    // Add EGC footage when enabled (1 conductor, same waste factor as wire)
    if (!isWireRun && !r.conduitOnly && r.includeGround) {
      runWire += calcConduitWire(r.feet, 1, r.wireTermMakeup ?? 0, r.numPullPoints ?? 0, r.wireWasteFactor ?? 10);
    }
    return a + runWire;
  }, 0);

  // ── Live material cost aggregation ──────────────────────────────────────────
  // Computes total estimated material cost for all runs using user DB prices.
  // Falls back to catalog prices when no user price is set.
  const totalMaterialCost = runs.reduce((total, r) => {
    const isWireRun = (r.runType ?? "conduit") === "wire";
    let runCost = 0;
    if (!isWireRun) {
      // Conduit cost
      const conduitCpf = getConduitPricePerFoot(r.conduitType ?? "EMT", r.conduitSize ?? "1/2", userMaterials);
      if (conduitCpf != null) {
        const billable = calcConduitBillable(r.feet, r.conduitWasteFactor ?? 10);
        runCost += conduitCpf * billable;
      }
      // Wire cost (skip if conduit-only)
      if (!r.conduitOnly) {
        const wireTypeStr = r.wireTypeId ? r.wireTypeId.replace(/^wir-/, "") : "thhn";
        const wireSize = r.conductorSize ?? "12";
        const wireCpf = getWirePricePerFoot(wireTypeStr, wireSize, r.conductorMaterial ?? "CU", userMaterials, r.wireTypeId);
        if (wireCpf != null) {
          // calcConduitWire already multiplies by conductors internally — do NOT multiply again
          const wireFt = calcConduitWire(r.feet, r.conductors, r.wireTermMakeup ?? 0, r.numPullPoints ?? 0, r.wireWasteFactor ?? 10);
          runCost += wireCpf * wireFt;
        }
        // Grounding conductor cost
        if (r.includeGround) {
          // Use groundMaterial for EGC pricing (defaults to CU if not set)
          const groundCpf = getWirePricePerFoot("thhn", r.groundSize ?? "12", r.groundMaterial ?? "CU", userMaterials, undefined);
          if (groundCpf != null) {
            const wireFt = calcConduitWire(r.feet, 1, r.wireTermMakeup ?? 0, r.numPullPoints ?? 0, r.wireWasteFactor ?? 10);
            runCost += groundCpf * wireFt;
          }
        }
      }
    } else {
      // Wire-only run
      const wireTypeStr = r.wireTypeId ? r.wireTypeId.replace(/^wir-/, "") : "thhn";
      const wireSize = r.conductorSize ?? "12";
      const wireCpf = getWirePricePerFoot(wireTypeStr, wireSize, r.conductorMaterial ?? "CU", userMaterials, r.wireTypeId);
      if (wireCpf != null) {
        const wireFt = calcWire(r.feet, r.conductors, r.makeupAllowance ?? 0, r.serviceLoop ?? 0, r.numTerminations ?? 0, r.wirewasteFactor ?? 10);
        runCost += wireCpf * wireFt * r.conductors;
      }
    }
    return total + runCost;
  }, 0);

  // Unit count material cost
  const unitCountCost = countSessions
    .filter((cs) => cs.pins.length > 0 && cs.unitCost != null)
    .reduce((a, cs) => a + (cs.unitCost! * cs.pins.length), 0);

  const grandTotalMaterialCost = totalMaterialCost + unitCountCost;

  const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="flex items-center gap-2 mt-4 mb-2 pb-1 border-b border-border/40">
      <span className="text-[#F5C518]">{icon}</span>
      <span className="text-[10px] font-semibold text-[#F5C518] uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</span>
    </div>
  );

  return (
    <div
      className="bp-card p-4 border-[#F5C518]/30 bg-[#F5C518]/5 cursor-pointer hover:bg-[#F5C518]/10 transition-colors"
      onClick={() => setShowMaterialList(true)}
      title="Open Labor & Material list"
    >
      <h3
        className="text-xs font-semibold text-[#F5C518] uppercase tracking-wider mb-1 flex items-center gap-2"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#F5C518]/20 text-[#F5C518] font-bold text-[9px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>BP</span>
        Labor & Material
        {pages.length > 0 && (
          <span className="text-[10px] font-mono text-muted-foreground normal-case tracking-normal">
            {runs.length} run{runs.length !== 1 ? "s" : ""} · {pages.length} page{pages.length !== 1 ? "s" : ""}
          </span>
        )}
        <span className="ml-auto text-[10px] font-mono text-[#F5C518]/70 flex items-center gap-1 normal-case tracking-normal">
          Open →
        </span>
      </h3>

      {/* Summary strip — only shown once runs exist */}
      {runs.length > 0 && (
        <SummaryStrip totalFeet={totalFeet} totalSticks={totalSticks} totalWire={totalWire} />
      )}

      {/* ── Labor & Material Summary ── */}
      <SectionHeader icon={<span />} title="Labor & Material Summary" />
      <div className="space-y-1">
        {conduitRows.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/50 italic font-mono">No runs or materials yet — push measurements or save count sessions to populate</p>
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
                  <span className="font-mono text-muted-foreground text-[10px]">billable ft</span>
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
  category,
  onBack,
}: {
  projectId: string;
  projectName: string;
  categoryLabel: string;
  category: "civil" | "commercial" | "residential" | "industrial";
  onBack: () => void;
}) {
  const {
    activeCivilCatProject,
    setCivilCatState,
    activeCommercialCatProject,
    setCommercialCatState,
    activeResidentialCatProject,
    setResidentialCatState,
    activeIndustrialCatProject,
    setIndustrialCatState,
  } = useApp();
  // Use the actual category prop (not the display label string) to select the right store
  const activeCivilProject =
    category === "civil" ? activeCivilCatProject
    : category === "commercial" ? activeCommercialCatProject
    : category === "industrial" ? activeIndustrialCatProject
    : activeResidentialCatProject;
  const setCivilState =
    category === "civil" ? setCivilCatState
    : category === "commercial" ? setCommercialCatState
    : category === "industrial" ? setIndustrialCatState
    : setResidentialCatState;
  const s = activeCivilProject.state;

  // Per-run items — stored in component state (persisted via AppContext civilState.runs)
  // We keep runs in local state here and sync to civilState for CSV export.
  // CivilState.runs is typed as RunItem[] | undefined so no cast is needed.
  const [runs, setRuns] = useState<RunItem[]>(() => s.runs ?? []);

  // Fetch user materials for run-tool price overrides (userPrice > catalog default)
  const { data: userMaterials = [] } = trpc.data.materials.list.useQuery(undefined, {
    staleTime: 60_000,
  });

  // ── Price sync dialog state ──────────────────────────────────────────────────
  // Shown when user edits a price in Unit Count that differs from the DB value
  const [priceSyncDialog, setPriceSyncDialog] = useState<{
    open: boolean;
    description: string;
    newPrice: number;
    category?: string;
    unit?: string;
  }>({ open: false, description: "", newPrice: 0 });

  // Track which PDF page is currently active in PlanPanel
  const [activePage, setActivePage] = useState<number>(1);

  // ── Count session state ─────────────────────────────────────────────────────
  const countSessions: CountSession[] = s.countSessions ?? [];
  const activeCountSessionId = s.activeCountSessionId;
  const activeCountSession = countSessions.find((cs) => cs.id === activeCountSessionId) ?? null;

  const [newSessionName, setNewSessionName] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  // Single activeSection drives the accordion — only one section open at a time; null = all closed
  type RightSection = "count" | "runs" | "materials" | null;
  const [activeSection, setActiveSection] = useState<RightSection>("runs");
  const countSessionsOpen = activeSection === "count";
  const setCountSessionsOpen = (open: boolean) => setActiveSection(open ? "count" : null);
  const [countModeRequest, setCountModeRequest] = useState(0);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [rightPanelSize, setRightPanelSize] = useState(40);

  const toggleRightPanel = () => {
    const rp = rightPanelRef.current;
    if (!rp) return;
    if (rightPanelCollapsed) {
      rp.expand();
    } else {
      rp.collapse();
    }
  };

  const resetRightPanelSize = () => {
    const rp = rightPanelRef.current;
    if (!rp) return;
    // Resize back to the default 40% width
    rp.resize(40);
  };

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
    // If there is an active session, update it with the selected material
    if (activeCountSessionId) {
      const updated = countSessions.map((cs) =>
        cs.id === activeCountSessionId
          ? { ...cs, name: item.description, unitCost: item.unitPrice, priceMode: "per-unit" as const }
          : cs
      );
      updateSessions(updated, activeCountSessionId);
      toast.success(`Active count updated to "${item.description}" @ $${item.unitPrice.toFixed(2)}/ea.`);
    } else {
      // No active session — create a new one
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
    }
  }, [countSessions, updateSessions, activeCountSessionId]);

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
    (ft: number, runName: string, conduitSize?: string, pageNumber?: number, segmentFeet?: number[]) => {
      const existingIdx = runs.findIndex((r) => r.name === runName && r.pageNumber === pageNumber);
      if (existingIdx !== -1) {
        const updated = runs.map((r) =>
          (r.name === runName && r.pageNumber === pageNumber)
            ? { ...r, feet: ft, conduitSize: conduitSize ?? r.conduitSize, segmentFeet }
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
          segmentFeet,
          runType: "conduit",
          conduitSize: conduitSize ?? "1/2",
          conduitType: "EMT",
          conductors: 2,
          conductorMaterial: "CU",
          conductorSize: "12",
          fittings: defaultFittings(),
          // Jacketed / Romex defaults
          makeupAllowance: 2,
          serviceLoop: 3,
          numTerminations: 2,
          wirewasteFactor: 10,
          // Conduit defaults
          conduitWasteFactor: 10,
          wireTermMakeup: 2,
          wireWasteFactor: 10,
          numPullPoints: 2,
          conduitOnly: false,
        };
        syncRuns([newRun, ...runs]);
        const pageLabel = pageNumber ? ` from page ${pageNumber}` : "";
        toast.success(`"${runName}"${pageLabel} — ${ft} ft added.`);
        // Expand the right panel so the new run is visible
        const rp = rightPanelRef.current;
        if (rp && rp.getSize() < 35) {
          rp.resize(40);
        }
      }
    },
    [runs, syncRuns]
  );

  const updateRun = (id: string, partial: Partial<RunItem>) => {
    syncRuns(runs.map((r) => (r.id === id ? { ...r, ...partial } : r)));
  };

  const removeRun = (id: string) => {
    const remaining = runs.filter((r) => r.id !== id);
    // Renumber remaining runs sequentially (Run 1, Run 2, …)
    const renumbered = remaining.map((r, i) => ({ ...r, name: `Run ${i + 1}` }));
    syncRuns(renumbered);
  };

  // Called when a run is deleted from PlanPanel's run strip
  const handleDeleteRun = useCallback(
    (runName: string, pageNumber?: number) => {
      // If pageNumber is provided, only delete the run on that specific page
      const remaining = runs.filter((r) => !(r.name === runName && (pageNumber == null || r.pageNumber === pageNumber)));
      // Renumber remaining runs sequentially (Run 1, Run 2, …)
      const renumbered = remaining.map((r, i) => ({ ...r, name: `Run ${i + 1}` }));
      syncRuns(renumbered);
    },
    [runs, syncRuns]
  );

  // ── Page-scoped clear + total reset state ────────────────────────────────
  // confirmClear: what destructive action is pending confirmation
  //   { type: "page-runs" | "page-counts" | "total-reset" }
  const [confirmClear, setConfirmClear] = useState<
    { type: "page-runs" } | { type: "page-counts" } | { type: "total-reset" } | null
  >(null);
  // Undo snapshot for total reset
  const [resetUndo, setResetUndo] = useState<{ runs: RunItem[]; countSessions: CountSession[] } | null>(null);
  const [resetUndoTimer, setResetUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Clear all runs on the current page
  const handleClearPageRuns = useCallback(() => {
    const next = runs.filter((r) => (r.pageNumber ?? 1) !== activePage);
    syncRuns(next);
    toast.info(`Cleared all runs on page ${activePage}.`);
  }, [runs, activePage, syncRuns]);

  // Clear all count pins on the current page (across all sessions)
  const handleClearPageAllCounts = useCallback(() => {
    const updated = countSessions.map((cs) => ({
      ...cs,
      pins: cs.pins.filter((p) => (p.pageNumber ?? 1) !== activePage),
    }));
    setCivilState({ ...s, runs, countSessions: updated, activeCountSessionId });
    toast.info(`Cleared all count pins on page ${activePage}.`);
  }, [countSessions, activePage, s, runs, activeCountSessionId, setCivilState]);

  // Total reset: wipe all runs and all count pins across all pages
  const handleTotalReset = useCallback(() => {
    // Save undo snapshot
    setResetUndo({ runs, countSessions });
    if (resetUndoTimer) clearTimeout(resetUndoTimer);
    const t = setTimeout(() => setResetUndo(null), 10000); // 10s undo window
    setResetUndoTimer(t);
    // Clear everything
    const clearedSessions = countSessions.map((cs) => ({ ...cs, pins: [] }));
    syncRuns([]);
    setCivilState({ ...s, runs: [], countSessions: clearedSessions, activeCountSessionId });
    toast.info("All marks cleared.");
  }, [runs, countSessions, s, activeCountSessionId, syncRuns, setCivilState, resetUndoTimer]);

  // Undo total reset
  const handleUndoTotalReset = useCallback(() => {
    if (!resetUndo) return;
    syncRuns(resetUndo.runs);
    setCivilState({ ...s, runs: resetUndo.runs, countSessions: resetUndo.countSessions, activeCountSessionId });
    setResetUndo(null);
    if (resetUndoTimer) clearTimeout(resetUndoTimer);
    toast.success("All marks restored.");
  }, [resetUndo, s, activeCountSessionId, syncRuns, setCivilState, resetUndoTimer]);

  // These are computed for potential future use in the header strip
  const totalWire = runs.reduce((acc, r) => {
    const isWireRun = (r.runType ?? "conduit") === "wire";
    if (isWireRun) return acc + calcWire(r.feet, r.conductors, r.makeupAllowance ?? 2, r.serviceLoop ?? 3, r.numTerminations ?? 2, r.wirewasteFactor ?? 10);
    return acc + calcConduitWire(r.feet, r.conductors, r.wireTermMakeup ?? 2, r.numPullPoints ?? 2, r.wireWasteFactor ?? 10);
  }, 0);
  const totalSticks = runs.reduce((acc, r) => {
    if ((r.runType ?? "conduit") === "wire") return acc;
    return acc + calcSticks(calcConduitBillable(r.feet, r.conduitWasteFactor ?? 10));
  }, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Price sync dialog — shown when user edits a price in Unit Count */}
      <PriceSyncDialog
        open={priceSyncDialog.open}
        onOpenChange={(open) => setPriceSyncDialog((prev) => ({ ...prev, open }))}
        description={priceSyncDialog.description}
        newPrice={priceSyncDialog.newPrice}
        category={priceSyncDialog.category}
        unit={priceSyncDialog.unit}
      />
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

      <div className="flex-1 overflow-hidden relative">

      <ResizablePanelGroup direction="horizontal" className="h-full overflow-hidden">
        {/* ── Plan Panel — always gets at least 55% so the right panel can never cover the PDF ── */}
        <ResizablePanel defaultSize={60} minSize={55} maxSize={80}>
          <PlanPanel
            tabKey={`unified_${projectId}`}
            onPushDistance={(ft, runName, conduitSize, pageNumber, segmentFeet) => handlePush(ft, runName, conduitSize, pageNumber, segmentFeet)}
            onDeleteRun={(name, page) => handleDeleteRun(name, page)}
            onCurrentPageChange={(page) => setActivePage(page)}
            activeCountSession={activeCountSession}
            allCountSessions={countSessions}
            onPinAdded={handleCountPinAdded}
            onPinRemoved={handleCountPinRemoved}
            onClearPagePins={handleClearPageCountPins}
            onClearPageAll={(page) => {
              handleClearPageRuns();
              handleClearPageAllCounts();
            }}
            onPdfReplaced={() => {
              // Silently clear all runs and count pins when PDF is replaced
              const clearedSessions = countSessions.map((cs) => ({ ...cs, pins: [] }));
              syncRuns([]);
              setCivilState({ ...s, runs: [], countSessions: clearedSessions, activeCountSessionId });
            }}
            onUnitCountToggle={(open) => {
              setCountSessionsOpen(open);
              // When Unit Count opens, collapse Runs to give it space

            }}
            countModeRequest={countModeRequest}
            onMeasureStart={() => {
              setActiveSection("runs");
              if (rightPanelCollapsed) toggleRightPanel();
            }}
            onRequestCountSession={() => {
              // Bootstrap a session if none exists (mirrors right-panel Start Counting behavior)
              if (countSessions.length === 0) {
                const defaultSession: CountSession = {
                  id: `cs-${Date.now().toString(36)}`,
                  name: "Count 1",
                  iconId: DEFAULT_ICON_ID,
                  color: DEFAULT_PIN_COLOR,
                  pins: [],
                };
                updateSessions([defaultSession], defaultSession.id);
                toast.success('Session "Count 1" created — click to place pins.');
              } else if (!activeCountSessionId && countSessions.length > 0) {
                updateSessions(countSessions, countSessions[0].id);
              }
              setCountSessionsOpen(true);
            }}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* ── Calculator / Runs — max 45% so it stays to the right of the PDF ── */}
        <ResizablePanel
          ref={rightPanelRef}
          defaultSize={40}
          minSize={20}
          maxSize={45}
          collapsible
          collapsedSize={3}
          onCollapse={() => setRightPanelCollapsed(true)}
          onExpand={() => setRightPanelCollapsed(false)}
          onResize={(size) => {
            setRightPanelSize(size);
            // Treat anything at or below collapsedSize+1 as collapsed
            if (size <= 4) setRightPanelCollapsed(true);
            else if (size > 10) setRightPanelCollapsed(false);
          }}
        >
          <div className="flex flex-col h-full relative">
            {/* ── Always-visible header bar with toggle button ── */}
            <div className="px-3 pt-2 pb-2 border-b border-border bg-card shrink-0">
              <div className="flex items-center gap-2">
                {/* BP badge */}
                <div className="w-7 h-7 rounded-lg bg-[#F5C518]/15 flex items-center justify-center shrink-0">
                  <span className="font-bold text-[#F5C518] text-[10px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>BP</span>
                </div>
                {/* Project name + page — only when expanded */}
                {!rightPanelCollapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-sm font-bold text-foreground truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {projectName}
                      </h1>
                    </div>
                    <span className="shrink-0 text-xs font-mono px-2 py-0.5 rounded bg-[#F5C518]/15 text-[#F5C518] border border-[#F5C518]/30">
                      Page {activePage}
                    </span>
                  </>
                )}
                {/* Export CSV button — only visible when expanded and there are runs */}
                {!rightPanelCollapsed && runs.length > 0 && (
                  <button
                    onClick={() => {
                      // Build a focused CSV for this project's runs + count sessions
                      const rows: string[][] = [];
                      rows.push(["BidPhase — Material Export", "", "", "", "", "", ""]);
                      rows.push([`Generated: ${new Date().toLocaleString()}`, "", "", "", "", "", ""]);
                      rows.push([`Project: ${projectName}`, "", "", "", "", "", ""]);
                      rows.push([]);
                      rows.push(["Run Name", "Page", "Conduit Type", "Conduit Size", "Distance (ft)", "Pipe Sticks", "Wire (ft)"]);
                      for (const run of runs) {
                        rows.push([
                          run.name,
                          run.pageNumber != null ? String(run.pageNumber) : "",
                          run.conduitType ?? "EMT",
                          `${run.conduitSize}"`,
                          String(run.feet),
                          String(Math.ceil(run.feet / 10)),
                          String(parseFloat((run.feet * (run.conductors || 1) * 1.1).toFixed(1))),
                        ]);
                      }
                      const totalFt = runs.reduce((a, r) => a + r.feet, 0);
                      const totalSticks = runs.reduce((a, r) => a + Math.ceil(r.feet / 10), 0);
                      rows.push(["TOTAL", "", "", "", String(totalFt.toFixed(0)), String(totalSticks), ""]);
                      // Count sessions
                      const activeSessions = countSessions.filter((cs) => cs.pins.length > 0);
                      if (activeSessions.length > 0) {
                        rows.push([]);
                        rows.push(["Unit Count", "", "", "", "", "", ""]);
                        rows.push(["Session", "EA", "Count", "", "", "", ""]);
                        for (const cs of activeSessions) {
                          rows.push([cs.name, "EA", String(cs.pins.length), "", "", "", ""]);
                        }
                      }
                      const csv = rows.map((row) => row.map((v) => {
                        const s = String(v);
                        return (s.includes(",") || s.includes('"') || s.includes("\n")) ? `"${s.replace(/"/g, '""')}"` : s;
                      }).join(",")).join("\n");
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${projectName.replace(/[^a-z0-9]/gi, "_")}_Export_${new Date().toISOString().slice(0, 10)}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast.success("Exported as CSV.");
                    }}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-[#F5C518]/10 border border-[#F5C518]/30 text-[#F5C518] hover:bg-[#F5C518]/20 transition-colors"
                    title="Export runs as CSV"
                  >
                    <Download size={12} />
                  </button>
                )}
                {/* Reset-size button — only visible when expanded, snaps panel back to 40% */}
                {!rightPanelCollapsed && (
                  <button
                    onClick={() => rightPanelRef.current?.resize(40)}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-[#F5C518]/10 border border-[#F5C518]/30 text-[#F5C518] hover:bg-[#F5C518]/20 transition-colors"
                    title="Reset panel to default size"
                  >
                    <Maximize2 size={12} />
                  </button>
                )}
                {/* Toggle button — collapse when expanded, expand when collapsed */}
                <button
                  onClick={toggleRightPanel}
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-[#F5C518]/10 border border-[#F5C518]/30 text-[#F5C518] hover:bg-[#F5C518]/20 transition-colors"
                  title={rightPanelCollapsed ? "Expand panel" : "Collapse panel"}
                >
                  {rightPanelCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>
              </div>
            </div>

            {/* ── Full panel content — hidden when collapsed ── */}
            {!rightPanelCollapsed && (
              <>

                {/* ── Scrollable accordion body ── */}
                <div className="flex-1 overflow-auto">

                  {/* ── UNIT COUNT accordion ── */}
                  <div className="bp-card overflow-hidden">
                    <button
                      onClick={() => {
                        const opening = activeSection !== "count";
                        setActiveSection(opening ? "count" : "runs");
                        if (opening) {
                          if (countSessions.length === 0) {
                            const defaultSession: CountSession = {
                              id: `cs-${Date.now().toString(36)}`,
                              name: "Count 1",
                              iconId: DEFAULT_ICON_ID,
                              color: DEFAULT_PIN_COLOR,
                              pins: [],
                            };
                            updateSessions([defaultSession], defaultSession.id);
                            toast.success('Session "Count 1" created — click to place pins.');
                          } else if (!activeCountSessionId && countSessions.length > 0) {
                            updateSessions(countSessions, countSessions[0].id);
                          }
                          setCountModeRequest((v) => v + 1);
                        }
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/10 transition-colors"
                    >
                      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Unit Count
                        {countSessions.length > 0 && (
                          <span className="ml-2 text-[#F5C518] normal-case tracking-normal font-mono">{countSessions.length} session{countSessions.length !== 1 ? 's' : ''} · {countSessions.reduce((a, cs) => a + cs.pins.length, 0)} pins</span>
                        )}
                      </h2>
                      {activeSection === "count" ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
                    </button>
                    {activeSection === "count" && (
                      <div className="px-4 pb-4 space-y-3">
                        {/* Material search — always visible at top of Unit Count */}
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-muted-foreground">
                            {activeCountSessionId
                              ? <span>Search material — <span className="text-[#F5C518]">updates active count</span></span>
                              : "Search material to create a count"}
                          </Label>
                          <CatalogPicker
                            value={null}
                            onChange={handleAddCountSessionFromCatalog}
                            placeholder={activeCountSessionId ? "Search to update active count…" : "Search catalog…"}
                          />
                        </div>
                        {countSessions.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No sessions yet. Search a material above or tap New Count Session to start.</p>
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
                                    // Click the name directly to start editing
                                    <span
                                      className="flex-1 text-xs text-foreground font-medium truncate cursor-text hover:text-[#F5C518] transition-colors"
                                      title="Click to rename"
                                      onClick={(e) => { e.stopPropagation(); setEditingSessionId(cs.id); setEditingName(cs.name); }}
                                    >{cs.name}</span>
                                  )}
                                  {/* Inline price-per-item field */}
                                  <div
                                    className="flex items-center gap-0.5 shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Custom price per item — blur to sync to Material Database"
                                  >
                                    <span className="text-[9px] text-muted-foreground font-mono">$</span>
                                    <input
                                      type="number"
                                      min={0}
                                      step={0.01}
                                      value={cs.unitCost ?? ""}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        updateSessions(
                                          countSessions.map((s2) =>
                                            s2.id === cs.id
                                              ? { ...s2, unitCost: isNaN(val) ? undefined : val, priceMode: "per-unit" as const }
                                              : s2
                                          )
                                        );
                                      }}
                                      onBlur={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (isNaN(val) || val <= 0) return;
                                        // Check if this price differs from what's in the Material Database
                                        const needle = cs.name.toLowerCase().trim();
                                        const dbRow = userMaterials.find(
                                          (m) => m.description.toLowerCase().includes(needle) ||
                                                 needle.includes(m.description.toLowerCase())
                                        );
                                        const dbPrice = dbRow?.userPrice ?? dbRow?.defaultPrice ?? null;
                                        if (dbPrice === null || Math.abs(val - dbPrice) > 0.001) {
                                          // Price differs (or not in DB yet) — prompt user
                                          setPriceSyncDialog({
                                            open: true,
                                            description: cs.name,
                                            newPrice: val,
                                            category: dbRow?.category ?? undefined,
                                            unit: dbRow?.unit ?? "EA",
                                          });
                                        }
                                      }}
                                      placeholder="0.00"
                                      className="w-14 h-5 text-[9px] font-mono bg-transparent border-b border-border/40 focus:border-[#F5C518] outline-none text-muted-foreground focus:text-foreground text-right px-0.5"
                                    />
                                    <span className="text-[9px] text-muted-foreground font-mono">/ea</span>
                                  </div>
                                  <span className="font-mono text-[10px] text-muted-foreground shrink-0">{cs.pins.length} pin{cs.pins.length !== 1 ? "s" : ""}</span>
                                  {isEditing ? (
                                    <>
                                      <button onClick={(e) => { e.stopPropagation(); handleRenameCountSession(cs.id); }} className="text-[#F5C518] hover:opacity-70"><Check size={12} /></button>
                                      <button onClick={(e) => { e.stopPropagation(); setEditingSessionId(null); }} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>
                                    </>
                                  ) : (
                                    <button onClick={(e) => { e.stopPropagation(); if (cs.pins.length > 0 && !window.confirm(`Delete "${cs.name}" and its ${cs.pins.length} pin${cs.pins.length !== 1 ? 's' : ''}?`)) return; handleDeleteCountSession(cs.id); }} className="text-muted-foreground hover:text-destructive" title="Delete session"><Trash2 size={11} /></button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* New session button */}
                        <button
                          onClick={handleAddCountSession}
                          className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-md bg-[#F5C518]/15 text-[#F5C518] text-xs font-semibold hover:bg-[#F5C518]/25 active:scale-[0.98] transition-all border border-[#F5C518]/20">
                          <Plus size={13} /> New Count Session
                        </button>
                        {/* Active session config */}
                        {activeCountSession && (
                          <div className="pt-2 border-t border-border space-y-3">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Active: <span className="text-foreground">{activeCountSession.name}</span>
                            </p>
                            <CompactCountConfig
                              color={activeCountSession.color}
                              iconId={activeCountSession.iconId}
                              onColorChange={(hex) => updateSessions(countSessions.map((cs) => cs.id === activeCountSession.id ? { ...cs, color: hex } : cs))}
                              onShapeChange={(id) => updateSessions(countSessions.map((cs) => cs.id === activeCountSession.id ? { ...cs, iconId: id } : cs))}
                            />
                            <div className="pt-1 border-t border-border/50">
                              <button
                                onClick={handleUndoLastPin}
                                disabled={!activeCountSession || activeCountSession.pins.filter((p) => (p.pageNumber ?? 1) === activePage).length === 0}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                title="Remove last dropped pin on this page (U key also works)"
                              >
                                <Undo2 size={12} />
                                Undo last pin
                                {activeCountSession.pins.filter((p) => (p.pageNumber ?? 1) === activePage).length > 0 && (
                                  <span className="ml-auto font-mono text-[10px] text-[#F5C518]">
                                    {activeCountSession.pins.filter((p) => (p.pageNumber ?? 1) === activePage).length} on pg {activePage}
                                  </span>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── RUNS accordion ── */}
                  <div className="bp-card overflow-hidden">
                    <button
                      onClick={() => setActiveSection(activeSection === "runs" ? null : "runs")}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/10 transition-colors"
                    >
                      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Runs — Page {activePage}
                        {pageRuns.length > 0 && (
                          <span className="ml-2 text-[#F5C518] normal-case tracking-normal font-mono">{pageRuns.length} run{pageRuns.length !== 1 ? 's' : ''}</span>
                        )}
                      </h2>
                      {activeSection === "runs" ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
                    </button>
                    {activeSection === "runs" && (
                      <div className="pb-2">
                        {pageRuns.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-32 text-center gap-3 px-4">
                            <div className="w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center">
                              <Link2 size={20} className="text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">No runs on page {activePage}</p>
                              <p className="text-xs text-muted-foreground/60 mt-1">Measure a conduit run on this page, then push it here.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 px-2 pb-2">
                            {pageRuns.map((run, i) => (
                              <RunCard
                                key={run.id}
                                run={run}
                                index={i}
                                onUpdate={updateRun}
                                onRemove={removeRun}
                                userMaterials={userMaterials}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── MATERIAL SUMMARY — inline below Runs, always visible, grows with content ── */}
                  <div className="bp-card overflow-hidden border-t border-border/40">
                    <div className="px-4 py-3 space-y-3">
                      <CrossPageTotals runs={runs} countSessions={countSessions} userMaterials={userMaterials} />

                    </div>
                  </div>

                </div>{/* end scrollable accordion area */}
              </>
            )}{/* end !rightPanelCollapsed */}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      </div>{/* end relative wrapper */}

      {/* ── Confirmation dialog for destructive clear actions ──────────────────────── */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            {confirmClear.type === "page-runs" && (
              <>
                <h3 className="font-semibold text-foreground mb-2">Clear all runs on page {activePage}?</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  This will remove all <span className="font-medium text-foreground">{pageRuns.length} run{pageRuns.length !== 1 ? "s" : ""}</span> from page {activePage}. This cannot be undone.
                </p>
              </>
            )}
            {confirmClear.type === "page-counts" && (
              <>
                <h3 className="font-semibold text-foreground mb-2">Clear all count pins on page {activePage}?</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  This will remove all count pins on page {activePage} across all count sessions. This cannot be undone.
                </p>
              </>
            )}
            {confirmClear.type === "total-reset" && (
              <>
                <h3 className="font-semibold text-destructive mb-2">⚠️ Total Reset — are you sure?</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  This will clear <span className="font-medium text-foreground">all runs and all count pins across every page</span> of this project. You’ll have 10 seconds to undo.
                </p>
              </>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmClear(null)}
                className="px-4 py-2 text-sm rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmClear.type === "page-runs") handleClearPageRuns();
                  else if (confirmClear.type === "page-counts") handleClearPageAllCounts();
                  else if (confirmClear.type === "total-reset") handleTotalReset();
                  setConfirmClear(null);
                }}
                className="px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity font-medium"
              >
                {confirmClear.type === "total-reset" ? "Yes, Reset Everything" : "Clear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Undo toast for total reset ──────────────────────────────────────────── */}
      {resetUndo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-card border border-border shadow-2xl">
          <span className="text-sm text-foreground">All marks cleared</span>
          <button
            onClick={handleUndoTotalReset}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#F5C518] hover:text-[#F5C518]/80 transition-colors"
          >
            <Undo2 size={14} />
            Undo (10s)
          </button>
        </div>
      )}
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

// ─── Grouped 4×4 shape picker ────────────────────────────────────────────────
// Size labels for the 4 variants within each family
const SIZE_LABELS: Record<string, string> = { sm: "S", md: "M", lg: "L", xl: "XL" };

function CivilShapeSelector({
  activeIconId,
  activeColor,
  onSelect,
}: {
  activeIconId: string;
  activeColor: string;
  onSelect: (id: PinShape) => void;
}) {
  // Only one family expanded at a time; null = all collapsed
  const [expandedCat, setExpandedCat] = React.useState<string | null>(() => {
    // Auto-expand the family of the currently active icon
    const active = COUNT_ICONS.find((ic) => ic.id === activeIconId);
    return active?.category ?? null;
  });

  const toggleCat = (cat: string) =>
    setExpandedCat((prev) => (prev === cat ? null : cat));

  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pin Shape</Label>

      {/* Row of 4 family icons side-by-side */}
      <div className="flex gap-1.5">
        {ICON_CATEGORIES.map((cat) => {
          const icons = COUNT_ICONS.filter((ic) => ic.category === cat);
          // Representative icon for this family (medium size)
          const repIcon = icons.find((ic) => ic.id.endsWith("-md")) ?? icons[0];
          const isExpanded = expandedCat === cat;
          const activeInCat = icons.some((ic) => ic.id === activeIconId);
          return (
            <button
              key={cat}
              onClick={() => toggleCat(cat)}
              title={cat}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2 rounded border transition-all",
                isExpanded
                  ? "border-[#F5C518] bg-[#F5C518]/10"
                  : activeInCat
                    ? "border-[#F5C518]/40 bg-[#F5C518]/5"
                    : "border-border/50 bg-muted/10 hover:border-border hover:bg-muted/20"
              )}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                {repIcon.paths.map((seg, pi) => (
                  <path key={pi} d={seg.d}
                    fill={seg.strokeOnly ? "none" : (activeInCat ? activeColor : "currentColor")}
                    stroke={activeInCat ? activeColor : "currentColor"}
                    strokeWidth={seg.strokeWidth ?? 1.5} strokeLinecap="round" strokeLinejoin="round" />
                ))}
              </svg>
              <span className={cn(
                "text-[8px] font-medium leading-none",
                isExpanded ? "text-[#F5C518]" : activeInCat ? "text-[#F5C518]/70" : "text-muted-foreground"
              )}>{cat.slice(0, 3).toUpperCase()}</span>
            </button>
          );
        })}
      </div>

      {/* Expanded size row — shown inline below the family row */}
      {expandedCat && (() => {
        const icons = COUNT_ICONS.filter((ic) => ic.category === expandedCat);
        return (
          <div className="flex gap-1.5 px-0.5">
            {icons.map((icon) => {
              const sizeKey = icon.id.split("-")[1] ?? "md";
              const isActive = activeIconId === icon.id;
              return (
                <button
                  key={icon.id}
                  onClick={() => onSelect(icon.id)}
                  title={`${expandedCat} ${SIZE_LABELS[sizeKey]}`}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 py-2 rounded border transition-all",
                    isActive
                      ? "border-[#F5C518] bg-[#F5C518]/15"
                      : "border-border/50 bg-muted/10 hover:border-[#F5C518]/40 hover:bg-[#F5C518]/5"
                  )}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                    {icon.paths.map((seg, pi) => (
                      <path key={pi} d={seg.d}
                        fill={seg.strokeOnly ? "none" : (isActive ? activeColor : "currentColor")}
                        stroke={isActive ? activeColor : "currentColor"}
                        strokeWidth={seg.strokeWidth ?? 1.5} strokeLinecap="round" strokeLinejoin="round" />
                    ))}
                  </svg>
                  <span className={cn(
                    "text-[8px] font-medium leading-none",
                    isActive ? "text-[#F5C518]" : "text-muted-foreground"
                  )}>{SIZE_LABELS[sizeKey]}</span>
                </button>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

// ─── CompactCountConfig ──────────────────────────────────────────────────────
// Single-row color + shape selector that replaces the separate pickers
function CompactCountConfig({
  color,
  iconId,
  onColorChange,
  onShapeChange,
}: {
  color: string;
  iconId: string;
  onColorChange: (hex: string) => void;
  onShapeChange: (id: PinShape) => void;
}) {
  const [expandedCat, setExpandedCat] = React.useState<string | null>(() => {
    const active = COUNT_ICONS.find((ic) => ic.id === iconId);
    return active?.category ?? null;
  });

  const toggleCat = (cat: string) =>
    setExpandedCat((prev) => (prev === cat ? null : cat));

  return (
    <div className="space-y-1.5">
      {/* Row 1: Color swatches */}
      <div className="flex flex-wrap items-center gap-1">
        {PIN_COLORS.map((c) => (
          <button
            key={c.hex}
            title={c.label}
            onClick={() => onColorChange(c.hex)}
            className={cn(
              "w-4 h-4 rounded-full border-2 transition-all shrink-0",
              color === c.hex ? "border-white scale-110" : "border-transparent hover:border-white/50"
            )}
            style={{ backgroundColor: c.hex }}
          />
        ))}
        {/* Custom color */}
        <label className="relative w-4 h-4 rounded-full overflow-hidden border border-dashed border-border hover:border-white/50 cursor-pointer shrink-0" title="Custom color">
          <input type="color" value={color} onChange={(e) => onColorChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
          <span className="flex items-center justify-center w-full h-full text-[7px] text-muted-foreground">+</span>
        </label>
      </div>

      {/* Row 2: Shape family icons — always on their own line so all 4 stay together */}
      <div className="flex items-center gap-1">
        {ICON_CATEGORIES.map((cat) => {
          const icons = COUNT_ICONS.filter((ic) => ic.category === cat);
          const repIcon = icons.find((ic) => ic.id.endsWith("-md")) ?? icons[0];
          const isExpanded = expandedCat === cat;
          const activeInCat = icons.some((ic) => ic.id === iconId);
          return (
            <button
              key={cat}
              onClick={() => toggleCat(cat)}
              title={cat}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded border transition-all shrink-0",
                isExpanded
                  ? "border-[#F5C518] bg-[#F5C518]/15"
                  : activeInCat
                    ? "border-[#F5C518]/40 bg-[#F5C518]/5"
                    : "border-border/50 bg-muted/10 hover:border-border hover:bg-muted/20"
              )}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                {repIcon.paths.map((seg, pi) => (
                  <path key={pi} d={seg.d}
                    fill={seg.strokeOnly ? "none" : (activeInCat ? color : "currentColor")}
                    stroke={activeInCat ? color : "currentColor"}
                    strokeWidth={seg.strokeWidth ?? 1.5} strokeLinecap="round" strokeLinejoin="round" />
                ))}
              </svg>
            </button>
          );
        })}


      </div>

      {/* Expanded size row */}
      {expandedCat && (() => {
        const icons = COUNT_ICONS.filter((ic) => ic.category === expandedCat);
        return (
          <div className="flex gap-1 px-0.5">
            {icons.map((icon) => {
              const sizeKey = icon.id.split("-")[1] ?? "md";
              const isActive = iconId === icon.id;
              return (
                <button
                  key={icon.id}
                  onClick={() => onShapeChange(icon.id)}
                  title={`${expandedCat} ${SIZE_LABELS[sizeKey]}`}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded border transition-all",
                    isActive
                      ? "border-[#F5C518] bg-[#F5C518]/15"
                      : "border-border/50 bg-muted/10 hover:border-[#F5C518]/40 hover:bg-[#F5C518]/5"
                  )}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                    {icon.paths.map((seg, pi) => (
                      <path key={pi} d={seg.d}
                        fill={seg.strokeOnly ? "none" : (isActive ? color : "currentColor")}
                        stroke={isActive ? color : "currentColor"}
                        strokeWidth={seg.strokeWidth ?? 1.5} strokeLinecap="round" strokeLinejoin="round" />
                    ))}
                  </svg>
                  <span className={cn(
                    "text-[7px] font-medium leading-none",
                    isActive ? "text-[#F5C518]" : "text-muted-foreground"
                  )}>{SIZE_LABELS[sizeKey]}</span>
                </button>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
// Category labels removed — projects are no longer categorized in the UI
const CATEGORY_LABELS: Record<string, string> = {};
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
    const categoryLabel = "Projects";

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
      category={category}
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
