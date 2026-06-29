/**
 * BidPhase — Estimate Engine Page (v2 — Dual-Mode Assembly/Item Engine)
 *
 * Workflow:
 *  1. User builds a Takeoff using Item lines (from count sessions / paste) and/or Assembly lines
 *  2. User selects Project Category and sets Crew Efficiency Slider
 *  3. calculate_estimate() processes each line:
 *       - Item mode:    qty × base_labor_hrs × category_factor × crew_slider
 *       - Assembly mode: iterate child components, calculate each, sum into subtotal
 *  4. Outputs a structured report table grouped by phase, assemblies expand inline
 *  5. Unmatched items flagged at the bottom for manual review
 *  6. Export to CSV or print
 */
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  ArrowLeft, Calculator, ChevronDown, ChevronUp,
  AlertTriangle, Download, Printer, RefreshCw, Info,
  CheckCircle2, XCircle, Zap, Package, Plus, Trash2, Search,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import {
  ELECTRICAL_DB, ELECTRICAL_ASSEMBLIES, matchItem, DB_PHASES,
  CATEGORY_MULTIPLIERS, fetchPlattPrice,
  type ElectricalItem, type ElectricalPhase, type ElectricalAssembly,
} from "@/lib/electricalDatabase";

// ─── Types ─────────────────────────────────────────────────────────────────────

/** A single line in the takeoff input — either an item or an assembly. */
interface TakeoffLine {
  id: string;
  type: "item" | "assembly";
  // Item fields
  raw?: string;
  qty: number;
  description?: string;
  // Assembly fields
  assembly_id?: string;
}

interface InputLine {
  raw: string;
  qty: number;
  description: string;
}

/** A calculated child row within an assembly result. */
interface AssemblyChildResult {
  description: string;
  unit: string;
  qty: number;
  unitMaterial: number;
  baseLaborHrs: number;
  finalLaborHrs: number;
  lineMaterial: number;
  lineLaborCost: number;
  lineTotal: number;
}

/** A single row in the estimate report — either an item row or an assembly row. */
interface EstimateRow {
  rowType: "item" | "assembly";
  phase: ElectricalPhase | "Assembly" | "Unmatched";
  description: string;
  qty: number;
  unit: string;
  // Item-specific
  unitMaterial?: number;
  baseLaborHours?: number;
  categoryFactor?: number;
  crewFactor?: number;
  finalLaborHours?: number;
  lineTotal: number;
  matched?: boolean;
  rawInput?: string;
  dbItem?: ElectricalItem | null;
  // Assembly-specific
  assembly?: ElectricalAssembly;
  children?: AssemblyChildResult[];
  assemblyMaterial?: number;
  assemblyLaborHrs?: number;
  assemblyLaborCost?: number;
}

type ProjectCategory = "Residential" | "Commercial" | "Industrial" | "Infrastructure";
type InputMode = "sessions" | "paste" | "assembly";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function parsePastedList(text: string): InputLine[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const qtyFirst = line.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
      const qtyLast  = line.match(/^(.+?)\s+[xX×]\s*(\d+(?:\.\d+)?)$/);
      const qtyEnd   = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
      if (qtyFirst) return { raw: line, qty: parseFloat(qtyFirst[1]), description: qtyFirst[2].trim() };
      if (qtyLast)  return { raw: line, qty: parseFloat(qtyLast[2]),  description: qtyLast[1].trim() };
      if (qtyEnd && parseFloat(qtyEnd[2]) > 0 && parseFloat(qtyEnd[2]) < 10000)
        return { raw: line, qty: parseFloat(qtyEnd[2]), description: qtyEnd[1].trim() };
      return { raw: line, qty: 1, description: line };
    });
}

// ─── Phase color map ──────────────────────────────────────────────────────────
const PHASE_COLORS: Record<string, string> = {
  "Conduit & Raceway": "text-blue-400",
  "Wire & Cable": "text-orange-400",
  "Panels & Breakers": "text-red-400",
  "Devices & Wiring": "text-green-400",
  "Lighting": "text-yellow-400",
  "Motors & Controls": "text-purple-400",
  "Low Voltage": "text-cyan-400",
  "Grounding": "text-lime-400",
  "Fittings & Hardware": "text-slate-400",
  "Infrastructure": "text-amber-500",
  "Assembly": "text-violet-400",
  "Unmatched": "text-rose-400",
};

// ─── Assembly Picker Component ─────────────────────────────────────────────────
interface AssemblyPickerProps {
  onAdd: (assembly: ElectricalAssembly, qty: number) => void;
  activeCategory: ProjectCategory;
}

function AssemblyPicker({ onAdd, activeCategory }: AssemblyPickerProps) {
  const [search, setSearch] = useState("");
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<ElectricalAssembly | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Map UI category to assembly category filter
  const catKey = activeCategory.toLowerCase() as ElectricalAssembly["category"];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ELECTRICAL_ASSEMBLIES.filter((a) => {
      const catMatch = a.category === catKey || a.category === "all";
      const textMatch = !q || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.phase.toLowerCase().includes(q);
      return catMatch && textMatch;
    });
  }, [search, catKey]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleAdd = () => {
    if (!selected) return;
    onAdd(selected, Math.max(1, qty));
    setSelected(null);
    setSearch("");
    setQty(1);
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div ref={ref} className="relative flex-1">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md border bg-input text-sm cursor-pointer transition-colors",
              open ? "border-[#F5C518]/60" : "border-border hover:border-border/80"
            )}
            onClick={() => setOpen(!open)}
          >
            <Search size={13} className="text-muted-foreground shrink-0" />
            {selected ? (
              <span className="text-foreground truncate flex-1">{selected.name}</span>
            ) : (
              <span className="text-muted-foreground flex-1">Search assemblies for {activeCategory}…</span>
            )}
            <ChevronDown size={13} className={cn("text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
          </div>

          {open && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-md shadow-xl overflow-hidden">
              <div className="p-2 border-b border-border">
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter assemblies…"
                  className="w-full bg-input border border-border rounded px-2 py-1.5 text-xs outline-none focus:border-[#F5C518]/60"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-muted-foreground text-center">No assemblies found for {activeCategory}</div>
                ) : (
                  filtered.map((a) => (
                    <button
                      key={a.assembly_id}
                      onClick={() => { setSelected(a); setOpen(false); }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 text-xs hover:bg-muted/10 transition-colors border-b border-border/30 last:border-0",
                        selected?.assembly_id === a.assembly_id && "bg-[#F5C518]/10"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Package size={11} className="text-violet-400 shrink-0" />
                        <span className="font-medium text-foreground truncate">{a.name}</span>
                        <span className="ml-auto text-muted-foreground shrink-0 font-mono">{a.unit}</span>
                      </div>
                      <div className="text-muted-foreground mt-0.5 pl-[19px] truncate">{a.description}</div>
                      <div className="flex items-center gap-2 mt-0.5 pl-[19px]">
                        <span className="text-violet-400/70">{a.phase}</span>
                        <span className="text-muted-foreground/50">·</span>
                        <span className="text-muted-foreground/70">{a.components.length} components</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-muted-foreground">Qty</span>
          <input
            type="number" min={1} max={9999} step={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 bg-input border border-border rounded px-2 py-2 text-sm font-mono text-center outline-none focus:border-[#F5C518]/60"
          />
        </div>

        <button
          onClick={handleAdd}
          disabled={!selected}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all shrink-0",
            selected
              ? "bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30"
              : "bg-muted/10 text-muted-foreground border border-border cursor-not-allowed"
          )}
        >
          <Plus size={14} /> Add Assembly
        </button>
      </div>

      {selected && (
        <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-medium text-violet-300">
            <Package size={12} />
            <span>{selected.name}</span>
            <span className="ml-auto font-mono text-muted-foreground">{selected.components.length} components</span>
          </div>
          <div className="text-muted-foreground">{selected.description}</div>
          <div className="grid grid-cols-2 gap-1 pt-1">
            {selected.components.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 text-muted-foreground/80">
                <span className="font-mono text-violet-400/70">{c.qty_per_unit}×</span>
                <span className="truncate">{c.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
interface EstimateEnginePageProps {
  onBack?: () => void;
}

export default function EstimateEnginePage({ onBack }: EstimateEnginePageProps) {
  const {
    setShowMaterialList,
    activeCivilCatProject, activeCommercialCatProject, activeResidentialCatProject,
    activeCivilProject, activeCommercialProject, activeResidentialProject,
  } = useApp();

  const goBack = onBack ?? (() => setShowMaterialList(false));

  // ── State ──────────────────────────────────────────────────────────────────
  const [inputMode, setInputMode] = useState<InputMode>("sessions");
  const [pastedText, setPastedText] = useState("");
  const [category, setCategory] = useState<ProjectCategory>("Commercial");
  const [crewSlider, setCrewSlider] = useState(1.00);
  const [crewDraft, setCrewDraft] = useState("1.00");
  const [laborRate, setLaborRate] = useState(85);
  const [laborRateDraft, setLaborRateDraft] = useState("85");
  const [showReport, setShowReport] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set([...DB_PHASES, "Assembly"]));
  const [expandedAssemblies, setExpandedAssemblies] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [pricingSource, setPricingSource] = useState<"mock" | "platt">("mock");

  // Assembly takeoff lines (user-built list of assemblies to include)
  const [assemblyLines, setAssemblyLines] = useState<TakeoffLine[]>([]);

  // ── Collect count sessions from all active projects ────────────────────────
  const sessionLines = useMemo((): InputLine[] => {
    const lines: InputLine[] = [];
    const projects = [
      activeCivilCatProject, activeCommercialCatProject, activeResidentialCatProject,
      activeCivilProject, activeCommercialProject, activeResidentialProject,
    ];
    const seen = new Set<string>();
    for (const proj of projects) {
      if (!proj) continue;
      for (const cs of proj.state?.countSessions ?? []) {
        if (seen.has(cs.id)) continue;
        seen.add(cs.id);
        const qty = cs.pins.length;
        if (qty === 0 && !cs.name) continue;
        lines.push({ raw: cs.name, qty: Math.max(qty, 1), description: cs.name });
      }
      for (const smr of (proj.state as { savedMaterialRows?: Array<{ id: string; description: string; qty: number }> }).savedMaterialRows ?? []) {
        if (seen.has(smr.id)) continue;
        seen.add(smr.id);
        lines.push({ raw: smr.description, qty: smr.qty, description: smr.description });
      }
    }
    return lines;
  }, [activeCivilCatProject, activeCommercialCatProject, activeResidentialCatProject, activeCivilProject, activeCommercialProject, activeResidentialProject]);

  const activeItemLines: InputLine[] =
    inputMode === "sessions" ? sessionLines :
    inputMode === "paste"    ? parsePastedList(pastedText) :
    [];

  const totalTakeoffCount = activeItemLines.length + assemblyLines.length;

  // ── Add / remove assembly lines ────────────────────────────────────────────
  const addAssemblyLine = useCallback((assembly: ElectricalAssembly, qty: number) => {
    setAssemblyLines((prev) => [...prev, {
      id: uid(),
      type: "assembly",
      assembly_id: assembly.assembly_id,
      qty,
      description: assembly.name,
    }]);
  }, []);

  const removeAssemblyLine = useCallback((id: string) => {
    setAssemblyLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const updateAssemblyQty = useCallback((id: string, qty: number) => {
    setAssemblyLines((prev) => prev.map((l) => l.id === id ? { ...l, qty } : l));
  }, []);

  // ── calculate_estimate() — dual-mode engine ────────────────────────────────
  const runEstimate = useCallback(async () => {
    setIsGenerating(true);
    const catFactor = CATEGORY_MULTIPLIERS[category] ?? 1.0;
    const rows: EstimateRow[] = [];

    // ── Process item lines ──────────────────────────────────────────────────
    for (const line of activeItemLines) {
      const dbItem = matchItem(line.description);

      let unitMaterial = dbItem?.mock_unit_price ?? 0;
      if (dbItem?.platt_sku) {
        const plattPrice = await fetchPlattPrice(dbItem.platt_sku);
        if (plattPrice !== null) { unitMaterial = plattPrice; setPricingSource("platt"); }
      }

      const baseLaborHours = dbItem?.base_labor_hours ?? 0;
      const finalLaborHours = baseLaborHours * catFactor * crewSlider;
      const materialCost = unitMaterial * line.qty;
      const laborCost = finalLaborHours * line.qty * laborRate;
      const lineTotal = materialCost + laborCost;

      rows.push({
        rowType: "item",
        phase: dbItem?.phase ?? "Unmatched",
        description: dbItem?.description ?? line.description,
        qty: line.qty,
        unit: dbItem?.unit ?? "EA",
        unitMaterial,
        baseLaborHours,
        categoryFactor: catFactor,
        crewFactor: crewSlider,
        finalLaborHours,
        lineTotal,
        matched: !!dbItem,
        rawInput: line.raw,
        dbItem,
      });
    }

    // ── Process assembly lines ──────────────────────────────────────────────
    for (const line of assemblyLines) {
      const assembly = ELECTRICAL_ASSEMBLIES.find((a) => a.assembly_id === line.assembly_id);
      if (!assembly) continue;

      const children: AssemblyChildResult[] = [];
      let asmMaterial = 0;
      let asmLaborHrs = 0;

      for (const comp of assembly.components) {
        const childQty = line.qty * comp.qty_per_unit;
        const childMat = childQty * comp.mock_unit_cost;
        const childLaborHrs = childQty * comp.base_labor_hrs * catFactor * crewSlider;
        const childLaborCost = childLaborHrs * laborRate;
        const childTotal = childMat + childLaborCost;

        children.push({
          description: comp.description,
          unit: comp.unit,
          qty: childQty,
          unitMaterial: comp.mock_unit_cost,
          baseLaborHrs: comp.base_labor_hrs,
          finalLaborHrs: childLaborHrs,
          lineMaterial: childMat,
          lineLaborCost: childLaborCost,
          lineTotal: childTotal,
        });

        asmMaterial += childMat;
        asmLaborHrs += childLaborHrs;
      }

      const asmLaborCost = asmLaborHrs * laborRate;
      const asmTotal = asmMaterial + asmLaborCost;

      rows.push({
        rowType: "assembly",
        phase: "Assembly",
        description: `${assembly.name} × ${line.qty}`,
        qty: line.qty,
        unit: assembly.unit,
        assembly,
        children,
        assemblyMaterial: asmMaterial,
        assemblyLaborHrs: asmLaborHrs,
        assemblyLaborCost: asmLaborCost,
        lineTotal: asmTotal,
      });
    }

    await new Promise((r) => setTimeout(r, 400));
    setIsGenerating(false);
    setShowReport(true);
    setEstimateRows(rows);
    setExpandedAssemblies(new Set());
  }, [activeItemLines, assemblyLines, category, crewSlider, laborRate]);

  const [estimateRows, setEstimateRows] = useState<EstimateRow[]>([]);

  // ── Group rows by phase ────────────────────────────────────────────────────
  const rowsByPhase = useMemo(() => {
    const map = new Map<string, EstimateRow[]>();
    for (const row of estimateRows) {
      const key = row.phase;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return map;
  }, [estimateRows]);

  const matchedRows    = estimateRows.filter((r) => r.rowType === "item" && r.matched);
  const unmatchedRows  = estimateRows.filter((r) => r.rowType === "item" && !r.matched);
  const assemblyRows   = estimateRows.filter((r) => r.rowType === "assembly");

  const totalMaterial    = estimateRows.reduce((s, r) => {
    if (r.rowType === "item") return s + (r.unitMaterial ?? 0) * r.qty;
    return s + (r.assemblyMaterial ?? 0);
  }, 0);
  const totalLaborHours  = estimateRows.reduce((s, r) => {
    if (r.rowType === "item") return s + (r.finalLaborHours ?? 0) * r.qty;
    return s + (r.assemblyLaborHrs ?? 0);
  }, 0);
  const totalLaborCost   = totalLaborHours * laborRate;
  const grandTotal       = totalMaterial + totalLaborCost;

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    const lines: string[] = [
      "Type,Phase,Item Description,Qty,Unit,Unit Material,Base Labor Hrs,Cat Factor,Final Labor Hrs,Line Total"
    ];
    for (const r of estimateRows) {
      if (r.rowType === "item") {
        lines.push([
          "Item", r.phase, `"${r.description}"`, r.qty, r.unit,
          (r.unitMaterial ?? 0).toFixed(2), (r.baseLaborHours ?? 0).toFixed(4),
          (r.categoryFactor ?? 1).toFixed(2), ((r.finalLaborHours ?? 0) * r.qty).toFixed(3),
          r.lineTotal.toFixed(2),
        ].join(","));
      } else if (r.rowType === "assembly" && r.children) {
        lines.push(["Assembly", "Assembly", `"${r.description}"`, r.qty, r.unit, "", "", "", "", r.lineTotal.toFixed(2)].join(","));
        for (const c of r.children) {
          lines.push([
            "  └ Component", "", `"  ${c.description}"`, c.qty.toFixed(2), c.unit,
            c.unitMaterial.toFixed(2), c.baseLaborHrs.toFixed(4), "",
            c.finalLaborHrs.toFixed(3), c.lineTotal.toFixed(2),
          ].join(","));
        }
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BidPhase-Estimate-${category.replace(/\s+/g, "-")}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [estimateRows, category]);

  const togglePhase = (phase: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase); else next.add(phase);
      return next;
    });
  };

  const toggleAssembly = (idx: number) => {
    setExpandedAssemblies((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
        <button onClick={goBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2 ml-2">
          <Zap size={18} className="text-[#F5C518]" />
          <h1 className="font-bold text-base tracking-tight">Estimate Engine</h1>
          <span className="text-xs text-violet-400 border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 rounded font-medium">v2 · Dual-Mode</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className={cn("flex items-center gap-1", pricingSource === "platt" ? "text-green-400" : "text-amber-400")}>
            <span className={cn("w-1.5 h-1.5 rounded-full", pricingSource === "platt" ? "bg-green-400" : "bg-amber-400")} />
            {pricingSource === "platt" ? "Platt Live Pricing" : "Mock Pricing"}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

          {/* ── Config Panel ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Project Category */}
            <div className="bp-card p-4 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Category</label>
              <div className="space-y-1.5">
                {(["Residential", "Commercial", "Industrial", "Infrastructure"] as ProjectCategory[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-all",
                      category === cat
                        ? "border-[#F5C518] bg-[#F5C518]/10 text-[#F5C518] font-semibold"
                        : "border-border bg-muted/5 text-muted-foreground hover:border-border/80 hover:text-foreground"
                    )}
                  >
                    <span>{cat}</span>
                    <span className="font-mono text-xs">×{(CATEGORY_MULTIPLIERS[cat] ?? 1).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Crew Efficiency Slider */}
            <div className="bp-card p-4 space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Crew Efficiency Slider</label>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={0.60} max={1.50} step={0.01}
                    value={crewSlider}
                    onChange={(e) => { const v = parseFloat(e.target.value); setCrewSlider(v); setCrewDraft(v.toFixed(2)); }}
                    className="flex-1 accent-[#F5C518]"
                  />
                  <input
                    type="number" min={0.60} max={1.50} step={0.01}
                    value={crewDraft}
                    onChange={(e) => setCrewDraft(e.target.value)}
                    onBlur={() => {
                      const v = Math.min(1.50, Math.max(0.60, parseFloat(crewDraft) || 1.00));
                      setCrewSlider(v); setCrewDraft(v.toFixed(2));
                    }}
                    className="w-16 bg-input border border-border rounded px-2 py-1 text-sm font-mono text-center outline-none focus:border-[#F5C518]/60"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>0.60 (Slow)</span>
                  <span className={cn("font-semibold", crewSlider < 0.90 ? "text-red-400" : crewSlider > 1.10 ? "text-green-400" : "text-[#F5C518]")}>
                    {crewSlider < 0.90 ? "Below Average" : crewSlider > 1.10 ? "High Efficiency" : "Standard"}
                  </span>
                  <span>1.50 (Fast)</span>
                </div>
                <div className="text-xs text-muted-foreground border-t border-border pt-2">
                  Final labor = Base × <span className="text-[#F5C518] font-mono">{(CATEGORY_MULTIPLIERS[category] ?? 1).toFixed(2)}</span> × <span className="text-[#F5C518] font-mono">{crewSlider.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Labor Rate */}
            <div className="bp-card p-4 space-y-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Labor Rate ($/hr)</label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">$</span>
                <input
                  type="number" min={20} max={300} step={1}
                  value={laborRateDraft}
                  onChange={(e) => setLaborRateDraft(e.target.value)}
                  onBlur={() => {
                    const v = Math.min(300, Math.max(20, parseFloat(laborRateDraft) || 85));
                    setLaborRate(v); setLaborRateDraft(String(v));
                  }}
                  className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-[#F5C518]/60"
                />
                <span className="text-muted-foreground text-sm">/hr</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Blended journeyman rate used to compute labor line totals.</p>
              <div className="text-xs text-muted-foreground border-t border-border pt-2 space-y-0.5">
                <div className="flex justify-between"><span>Category:</span><span className="text-foreground font-mono">{category}</span></div>
                <div className="flex justify-between"><span>Cat Factor:</span><span className="text-[#F5C518] font-mono">×{(CATEGORY_MULTIPLIERS[category] ?? 1).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Crew Factor:</span><span className="text-[#F5C518] font-mono">×{crewSlider.toFixed(2)}</span></div>
              </div>
            </div>
          </div>

          {/* ── Input Source ─────────────────────────────────────────────── */}
          <div className="bp-card overflow-hidden">
            <div className="flex border-b border-border">
              {(["sessions", "paste", "assembly"] as InputMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setInputMode(mode)}
                  className={cn(
                    "flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                    inputMode === mode
                      ? mode === "assembly"
                        ? "bg-violet-500/10 text-violet-300 border-b-2 border-violet-400"
                        : "bg-[#F5C518]/10 text-[#F5C518] border-b-2 border-[#F5C518]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {mode === "sessions" && <><span>Count Sessions</span><span className="text-xs opacity-70">({sessionLines.length})</span></>}
                  {mode === "paste"    && <span>Paste Raw List</span>}
                  {mode === "assembly" && <><Layers size={13} /><span>Assemblies</span><span className="text-xs opacity-70">({assemblyLines.length})</span></>}
                </button>
              ))}
            </div>

            <div className="p-4">
              {/* Count Sessions tab */}
              {inputMode === "sessions" && (
                <div>
                  {sessionLines.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                      <Info size={14} />
                      <span>No count sessions found. Open a project and create count sessions, or switch to Paste Raw List.</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground mb-3">Items pulled from all active project count sessions and saved material rows:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {sessionLines.map((line, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/10 border border-border text-xs">
                            <span className="font-mono text-[#F5C518] shrink-0">{line.qty}×</span>
                            <span className="text-foreground truncate">{line.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Paste tab */}
              {inputMode === "paste" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Paste one item per line. Formats: <span className="font-mono text-foreground">20 #12 AWG THHN Wire</span> or <span className="font-mono text-foreground">#12 AWG THHN Wire x 20</span>
                  </p>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={"20 #12 AWG THHN Wire\n5 20A GFCI Receptacle\n100 1/2\" EMT Conduit\n3 200A Panel Square D\n10 2x4 LED Troffer"}
                    rows={8}
                    className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[#F5C518]/60 resize-none transition-colors"
                  />
                  {pastedText && (
                    <p className="text-xs text-muted-foreground">{parsePastedList(pastedText).length} items parsed</p>
                  )}
                </div>
              )}

              {/* Assembly tab */}
              {inputMode === "assembly" && (
                <div className="space-y-4">
                  <AssemblyPicker onAdd={addAssemblyLine} activeCategory={category} />

                  {assemblyLines.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Assembly Takeoff List</div>
                      {assemblyLines.map((line) => {
                        const asm = ELECTRICAL_ASSEMBLIES.find((a) => a.assembly_id === line.assembly_id);
                        return (
                          <div key={line.id} className="flex items-center gap-2 px-3 py-2 rounded-md border border-violet-500/30 bg-violet-500/5 text-xs">
                            <Package size={12} className="text-violet-400 shrink-0" />
                            <span className="flex-1 text-foreground truncate">{asm?.name ?? line.description}</span>
                            <span className="text-muted-foreground shrink-0">{asm?.unit}</span>
                            <input
                              type="number" min={1} max={9999} step={1}
                              value={line.qty}
                              onChange={(e) => updateAssemblyQty(line.id, Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-14 bg-input border border-border rounded px-1.5 py-1 text-xs font-mono text-center outline-none focus:border-violet-400/60"
                            />
                            <button
                              onClick={() => removeAssemblyLine(line.id)}
                              className="text-muted-foreground hover:text-rose-400 transition-colors shrink-0"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {assemblyLines.length === 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                      <Info size={13} />
                      <span>Select an assembly above and click "Add Assembly" to build your takeoff list.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Generate Button ──────────────────────────────────────────── */}
          <div className="flex justify-center">
            <button
              onClick={runEstimate}
              disabled={isGenerating || totalTakeoffCount === 0}
              className={cn(
                "flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-sm transition-all",
                totalTakeoffCount === 0
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-[#F5C518] text-black hover:bg-[#F5C518]/90 active:scale-[0.98]"
              )}
            >
              {isGenerating ? (
                <><RefreshCw size={16} className="animate-spin" /> Generating Estimate…</>
              ) : (
                <><Calculator size={16} /> Generate Estimate ({totalTakeoffCount} line{totalTakeoffCount !== 1 ? "s" : ""})</>
              )}
            </button>
          </div>

          {/* ── Report ───────────────────────────────────────────────────── */}
          {showReport && estimateRows.length > 0 && (
            <div className="space-y-4">

              {/* Summary strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total Material", value: `$${fmt(totalMaterial)}`, color: "text-blue-400" },
                  { label: "Total Labor Hours", value: fmt(totalLaborHours, 1) + " hrs", color: "text-orange-400" },
                  { label: "Total Labor Cost", value: `$${fmt(totalLaborCost)}`, color: "text-purple-400" },
                  { label: "Grand Total", value: `$${fmt(grandTotal)}`, color: "text-[#F5C518]" },
                ].map((s) => (
                  <div key={s.label} className="bp-card p-3 text-center">
                    <div className={cn("text-xl font-bold font-mono", s.color)}>{s.value}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Match rate */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 text-green-400"><CheckCircle2 size={12} />{matchedRows.length} items matched</span>
                  {assemblyRows.length > 0 && (
                    <span className="flex items-center gap-1 text-violet-400"><Package size={12} />{assemblyRows.length} assembl{assemblyRows.length !== 1 ? "ies" : "y"}</span>
                  )}
                  {unmatchedRows.length > 0 && (
                    <span className="flex items-center gap-1 text-rose-400"><XCircle size={12} />{unmatchedRows.length} unmatched</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/20 border border-border text-xs text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors">
                    <Download size={12} /> CSV
                  </button>
                  <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/20 border border-border text-xs text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors">
                    <Printer size={12} /> Print
                  </button>
                </div>
              </div>

              {/* Assembly phase section */}
              {rowsByPhase.has("Assembly") && (
                <div className="bp-card overflow-hidden border-violet-500/30">
                  <button
                    onClick={() => togglePhase("Assembly")}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors"
                  >
                    <Package size={14} className="text-violet-400 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-400">Assemblies</span>
                    <span className="text-xs text-muted-foreground font-mono ml-auto">{rowsByPhase.get("Assembly")!.length} assembl{rowsByPhase.get("Assembly")!.length !== 1 ? "ies" : "y"}</span>
                    <span className="text-xs font-mono text-foreground">{fmt(rowsByPhase.get("Assembly")!.reduce((s, r) => s + (r.assemblyLaborHrs ?? 0), 0), 1)} hrs</span>
                    <span className="text-xs font-mono font-semibold text-violet-300">${fmt(rowsByPhase.get("Assembly")!.reduce((s, r) => s + r.lineTotal, 0))}</span>
                    {expandedPhases.has("Assembly") ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
                  </button>

                  {expandedPhases.has("Assembly") && (
                    <div className="space-y-0 border-t border-border">
                      {rowsByPhase.get("Assembly")!.map((row, asmIdx) => {
                        const isOpen = expandedAssemblies.has(asmIdx);
                        return (
                          <div key={asmIdx} className="border-b border-border/50 last:border-0">
                            {/* Assembly header row */}
                            <button
                              onClick={() => toggleAssembly(asmIdx)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/5 transition-colors text-xs"
                            >
                              <Package size={12} className="text-violet-400 shrink-0" />
                              <span className="text-foreground font-medium flex-1 text-left truncate">{row.description}</span>
                              <span className="text-muted-foreground font-mono shrink-0">{row.unit}</span>
                              <span className="text-muted-foreground font-mono shrink-0">{fmt(row.assemblyLaborHrs ?? 0, 1)} hrs</span>
                              <span className="font-mono font-semibold text-violet-300 shrink-0">${fmt(row.lineTotal)}</span>
                              <span className="text-muted-foreground/60 text-[10px] shrink-0">{isOpen ? "▲ hide" : "▼ expand"}</span>
                            </button>

                            {/* Expanded child rows */}
                            {isOpen && row.children && (
                              <div className="overflow-x-auto bg-violet-500/3 border-t border-violet-500/20">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-violet-500/5">
                                      <th className="text-left px-4 py-1.5 text-violet-400/70 font-medium pl-8">Component</th>
                                      <th className="text-right px-3 py-1.5 text-violet-400/70 font-medium">Qty</th>
                                      <th className="text-right px-3 py-1.5 text-violet-400/70 font-medium">Unit</th>
                                      <th className="text-right px-3 py-1.5 text-violet-400/70 font-medium">Unit Mat.</th>
                                      <th className="text-right px-3 py-1.5 text-violet-400/70 font-medium">Labor Hrs</th>
                                      <th className="text-right px-3 py-1.5 text-violet-400/70 font-medium">Mat. Cost</th>
                                      <th className="text-right px-4 py-1.5 text-violet-400/70 font-medium">Line Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.children.map((c, ci) => (
                                      <tr key={ci} className="border-t border-violet-500/10 hover:bg-violet-500/5 transition-colors">
                                        <td className="px-4 py-1.5 text-muted-foreground pl-8 truncate max-w-[200px]" title={c.description}>
                                          <span className="text-violet-400/50 mr-1.5">└</span>{c.description}
                                        </td>
                                        <td className="px-3 py-1.5 text-right font-mono text-foreground">{fmt(c.qty, 2)}</td>
                                        <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">{c.unit}</td>
                                        <td className="px-3 py-1.5 text-right font-mono text-foreground">${fmt(c.unitMaterial)}</td>
                                        <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">{fmt(c.finalLaborHrs, 3)}</td>
                                        <td className="px-3 py-1.5 text-right font-mono text-foreground">${fmt(c.lineMaterial)}</td>
                                        <td className="px-4 py-1.5 text-right font-mono font-semibold text-violet-200">${fmt(c.lineTotal)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="border-t border-violet-500/30 bg-violet-500/5">
                                      <td colSpan={5} className="px-4 py-1.5 text-xs text-violet-400/70 font-medium pl-8">Assembly Subtotal</td>
                                      <td className="px-3 py-1.5 text-right font-mono text-sm text-foreground">${fmt(row.assemblyMaterial ?? 0)}</td>
                                      <td className="px-4 py-1.5 text-right font-mono text-sm font-bold text-violet-300">${fmt(row.lineTotal)}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Item phase tables */}
              {Array.from(rowsByPhase.entries())
                .filter(([phase]) => phase !== "Unmatched" && phase !== "Assembly")
                .map(([phase, rows]) => {
                  const phaseTotal = rows.reduce((s, r) => s + r.lineTotal, 0);
                  const phaseLaborHrs = rows.reduce((s, r) => s + (r.finalLaborHours ?? 0) * r.qty, 0);
                  const isOpen = expandedPhases.has(phase);
                  return (
                    <div key={phase} className="bp-card overflow-hidden">
                      <button
                        onClick={() => togglePhase(phase)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors"
                      >
                        <span className={cn("text-xs font-bold uppercase tracking-wider", PHASE_COLORS[phase] ?? "text-foreground")}>{phase}</span>
                        <span className="text-xs text-muted-foreground font-mono ml-auto">{rows.length} item{rows.length !== 1 ? "s" : ""}</span>
                        <span className="text-xs font-mono text-foreground">{fmt(phaseLaborHrs, 1)} hrs</span>
                        <span className="text-xs font-mono font-semibold text-[#F5C518]">${fmt(phaseTotal)}</span>
                        {isOpen ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
                      </button>
                      {isOpen && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-t border-border bg-muted/5">
                                <th className="text-left px-4 py-2 text-muted-foreground font-medium">Item Description</th>
                                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Qty</th>
                                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Unit</th>
                                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Unit Material</th>
                                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Base Labor</th>
                                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Cat ×</th>
                                <th className="text-right px-3 py-2 text-muted-foreground font-medium">Final Labor</th>
                                <th className="text-right px-4 py-2 text-muted-foreground font-medium">Line Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row, i) => (
                                <tr key={i} className="border-t border-border/50 hover:bg-muted/5 transition-colors">
                                  <td className="px-4 py-2 text-foreground max-w-[200px] truncate" title={row.description}>{row.description}</td>
                                  <td className="px-3 py-2 text-right font-mono text-foreground">{row.qty}</td>
                                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">{row.unit}</td>
                                  <td className="px-3 py-2 text-right font-mono text-foreground">${fmt(row.unitMaterial ?? 0)}</td>
                                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">{fmt(row.baseLaborHours ?? 0, 4)}</td>
                                  <td className="px-3 py-2 text-right font-mono text-[#F5C518]">{fmt(row.categoryFactor ?? 1, 2)}</td>
                                  <td className="px-3 py-2 text-right font-mono text-foreground">{fmt((row.finalLaborHours ?? 0) * row.qty, 3)}</td>
                                  <td className="px-4 py-2 text-right font-mono font-semibold text-foreground">${fmt(row.lineTotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-border bg-muted/5">
                                <td colSpan={6} className="px-4 py-2 text-xs text-muted-foreground font-medium">Phase Subtotal</td>
                                <td className="px-3 py-2 text-right font-mono text-sm text-foreground">{fmt(phaseLaborHrs, 1)} hrs</td>
                                <td className="px-4 py-2 text-right font-mono text-sm font-bold text-[#F5C518]">${fmt(phaseTotal)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* Unmatched items */}
              {unmatchedRows.length > 0 && (
                <div className="bp-card overflow-hidden border-rose-500/30">
                  <button
                    onClick={() => togglePhase("Unmatched")}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors"
                  >
                    <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Unmatched Items — Manual Review Required</span>
                    <span className="text-xs text-muted-foreground font-mono ml-auto">{unmatchedRows.length} item{unmatchedRows.length !== 1 ? "s" : ""}</span>
                    {expandedPhases.has("Unmatched") ? <ChevronUp size={14} className="text-muted-foreground shrink-0" /> : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
                  </button>
                  {expandedPhases.has("Unmatched") && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-t border-border bg-muted/5">
                            <th className="text-left px-4 py-2 text-muted-foreground font-medium">Raw Input</th>
                            <th className="text-right px-3 py-2 text-muted-foreground font-medium">Qty</th>
                            <th className="text-left px-4 py-2 text-rose-400 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unmatchedRows.map((row, i) => (
                            <tr key={i} className="border-t border-border/50">
                              <td className="px-4 py-2 text-foreground font-mono">{row.rawInput}</td>
                              <td className="px-3 py-2 text-right font-mono text-foreground">{row.qty}</td>
                              <td className="px-4 py-2 text-rose-400 font-semibold">[UNMATCHED]</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="px-4 py-3 text-[11px] text-muted-foreground border-t border-border">
                        These items did not match any entry in the electrical database. Add them manually to the Labor &amp; Material page or expand the database with the exact description.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Grand total footer */}
              <div className="bp-card p-4">
                <div className="flex flex-wrap items-center gap-4 justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">Estimate Summary</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {category} · Crew ×{crewSlider.toFixed(2)} · ${laborRate}/hr · {pricingSource === "platt" ? "Platt Live" : "Mock Pricing"}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-mono font-semibold text-blue-400">${fmt(totalMaterial)}</div>
                      <div className="text-[10px] text-muted-foreground">Material</div>
                    </div>
                    <div className="text-muted-foreground">+</div>
                    <div className="text-center">
                      <div className="font-mono font-semibold text-purple-400">${fmt(totalLaborCost)}</div>
                      <div className="text-[10px] text-muted-foreground">Labor ({fmt(totalLaborHours, 1)} hrs)</div>
                    </div>
                    <div className="text-muted-foreground">=</div>
                    <div className="text-center">
                      <div className="font-mono font-bold text-xl text-[#F5C518]">${fmt(grandTotal)}</div>
                      <div className="text-[10px] text-muted-foreground">Grand Total</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
