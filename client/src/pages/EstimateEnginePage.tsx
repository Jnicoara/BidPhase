/**
 * BidPhase — Estimate Engine Page
 *
 * Workflow:
 *  1. User selects input source: existing count sessions OR paste a raw list
 *  2. User selects Project Category and sets Crew Efficiency Slider
 *  3. Engine matches each item against electricalDatabase, applies multipliers
 *  4. Outputs a structured report table grouped by phase
 *  5. Unmatched items flagged at the bottom for manual review
 *  6. Export to CSV or print
 */
import { useState, useMemo, useCallback } from "react";
import {
  ArrowLeft, Calculator, ChevronDown, ChevronUp,
  AlertTriangle, Download, Printer, RefreshCw, Info,
  CheckCircle2, XCircle, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import {
  ELECTRICAL_DB, matchItem, DB_PHASES, CATEGORY_MULTIPLIERS, fetchPlattPrice,
  type ElectricalItem, type ElectricalPhase,
} from "@/lib/electricalDatabase";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface InputLine {
  raw: string;
  qty: number;
  description: string;
}

interface EstimateRow {
  phase: ElectricalPhase | "Unmatched";
  description: string;
  qty: number;
  unit: string;
  unitMaterial: number;
  baseLaborHours: number;
  categoryFactor: number;
  crewFactor: number;
  finalLaborHours: number;
  lineTotal: number;
  matched: boolean;
  rawInput: string;
      dbItem?: ElectricalItem | null;
}

type ProjectCategory = "Residential" | "Commercial" | "Civil & Underground";
type InputMode = "sessions" | "paste";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function parsePastedList(text: string): InputLine[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // Try to parse "QTY DESCRIPTION" or "DESCRIPTION x QTY" or just "DESCRIPTION"
      const qtyFirst = line.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
      const qtyLast = line.match(/^(.+?)\s+[xX×]\s*(\d+(?:\.\d+)?)$/);
      const qtyEnd = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);

      if (qtyFirst) {
        return { raw: line, qty: parseFloat(qtyFirst[1]), description: qtyFirst[2].trim() };
      } else if (qtyLast) {
        return { raw: line, qty: parseFloat(qtyLast[2]), description: qtyLast[1].trim() };
      } else if (qtyEnd && parseFloat(qtyEnd[2]) > 0 && parseFloat(qtyEnd[2]) < 10000) {
        return { raw: line, qty: parseFloat(qtyEnd[2]), description: qtyEnd[1].trim() };
      }
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
  "Civil & Underground": "text-amber-500",
  "Unmatched": "text-rose-400",
};

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
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(DB_PHASES));
  const [isGenerating, setIsGenerating] = useState(false);
  const [pricingSource, setPricingSource] = useState<"mock" | "platt">("mock");

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

  const activeLines = inputMode === "sessions" ? sessionLines : parsePastedList(pastedText);

  // ── Run the estimate engine ────────────────────────────────────────────────
  const runEstimate = useCallback(async () => {
    setIsGenerating(true);
    const catFactor = CATEGORY_MULTIPLIERS[category] ?? 1.0;
    const rows: EstimateRow[] = [];

    for (const line of activeLines) {
      const dbItem = matchItem(line.description);

      // Try Platt pricing (returns null in mock mode)
      let unitMaterial = dbItem?.mock_unit_price ?? 0;
      if (dbItem?.platt_sku) {
        const plattPrice = await fetchPlattPrice(dbItem.platt_sku);
        if (plattPrice !== null) {
          unitMaterial = plattPrice;
          setPricingSource("platt");
        }
      }

      const baseLaborHours = dbItem?.base_labor_hours ?? 0;
      const adjustedLabor = baseLaborHours * catFactor;
      const finalLabor = adjustedLabor * crewSlider;
      const laborCost = finalLabor * line.qty * laborRate;
      const materialCost = unitMaterial * line.qty;
      const lineTotal = materialCost + laborCost;

      rows.push({
        phase: dbItem?.phase ?? "Unmatched",
        description: dbItem?.description ?? line.description,
        qty: line.qty,
        unit: dbItem?.unit ?? "EA",
        unitMaterial,
        baseLaborHours,
        categoryFactor: catFactor,
        crewFactor: crewSlider,
        finalLaborHours: finalLabor,
        lineTotal,
        matched: !!dbItem,
        rawInput: line.raw,
        dbItem,
      });
    }

    // Small delay for UX feedback
    await new Promise((r) => setTimeout(r, 400));
    setIsGenerating(false);
    setShowReport(true);
    // Store rows in state
    setEstimateRows(rows);
  }, [activeLines, category, crewSlider, laborRate]);

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

  const matchedRows = estimateRows.filter((r) => r.matched);
  const unmatchedRows = estimateRows.filter((r) => !r.matched);
  const totalMaterial = matchedRows.reduce((s, r) => s + r.unitMaterial * r.qty, 0);
  const totalLaborHours = matchedRows.reduce((s, r) => s + r.finalLaborHours * r.qty, 0);
  const totalLaborCost = totalLaborHours * laborRate;
  const grandTotal = totalMaterial + totalLaborCost;

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    const header = "Phase,Item Description,Qty,Unit,Unit Material,Base Labor Hrs,Category Factor,Final Labor Hrs,Line Total\n";
    const rows = estimateRows.map((r) =>
      [
        r.phase, `"${r.description}"`, r.qty, r.unit,
        r.unitMaterial.toFixed(2), r.baseLaborHours.toFixed(4),
        r.categoryFactor.toFixed(2), (r.finalLaborHours * r.qty).toFixed(3),
        r.lineTotal.toFixed(2),
      ].join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
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
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
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
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className={cn("flex items-center gap-1", pricingSource === "platt" ? "text-green-400" : "text-amber-400")}>
            <span className={cn("w-1.5 h-1.5 rounded-full", pricingSource === "platt" ? "bg-green-400" : "bg-amber-400")} />
            {pricingSource === "platt" ? "Platt Live Pricing" : "Mock Pricing (Platt stub ready)"}
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
                {(["Residential", "Commercial", "Civil & Underground"] as ProjectCategory[]).map((cat) => (
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
                    <span className="font-mono text-xs">×{CATEGORY_MULTIPLIERS[cat].toFixed(2)}</span>
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
                      setCrewSlider(v);
                      setCrewDraft(v.toFixed(2));
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
                  Final labor = Base × <span className="text-[#F5C518] font-mono">{CATEGORY_MULTIPLIERS[category].toFixed(2)}</span> × <span className="text-[#F5C518] font-mono">{crewSlider.toFixed(2)}</span>
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
                    setLaborRate(v);
                    setLaborRateDraft(String(v));
                  }}
                  className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-[#F5C518]/60"
                />
                <span className="text-muted-foreground text-sm">/hr</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Blended journeyman rate used to compute labor line totals.</p>
              <div className="text-xs text-muted-foreground border-t border-border pt-2 space-y-0.5">
                <div className="flex justify-between"><span>Category:</span><span className="text-foreground font-mono">{category}</span></div>
                <div className="flex justify-between"><span>Cat Factor:</span><span className="text-[#F5C518] font-mono">×{CATEGORY_MULTIPLIERS[category].toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Crew Factor:</span><span className="text-[#F5C518] font-mono">×{crewSlider.toFixed(2)}</span></div>
              </div>
            </div>
          </div>

          {/* ── Input Source ─────────────────────────────────────────────── */}
          <div className="bp-card overflow-hidden">
            <div className="flex border-b border-border">
              {(["sessions", "paste"] as InputMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setInputMode(mode)}
                  className={cn(
                    "flex-1 px-4 py-3 text-sm font-medium transition-colors",
                    inputMode === mode
                      ? "bg-[#F5C518]/10 text-[#F5C518] border-b-2 border-[#F5C518]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {mode === "sessions" ? `Count Sessions (${sessionLines.length} items)` : "Paste Raw List"}
                </button>
              ))}
            </div>

            <div className="p-4">
              {inputMode === "sessions" ? (
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
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Paste one item per line. Formats accepted: <span className="font-mono text-foreground">20 #12 AWG THHN Wire</span> or <span className="font-mono text-foreground">#12 AWG THHN Wire x 20</span> or <span className="font-mono text-foreground">#12 AWG THHN Wire 20</span>
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
            </div>
          </div>

          {/* ── Generate Button ──────────────────────────────────────────── */}
          <div className="flex justify-center">
            <button
              onClick={runEstimate}
              disabled={isGenerating || activeLines.length === 0}
              className={cn(
                "flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-sm transition-all",
                activeLines.length === 0
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-[#F5C518] text-black hover:bg-[#F5C518]/90 active:scale-[0.98]"
              )}
            >
              {isGenerating ? (
                <><RefreshCw size={16} className="animate-spin" /> Generating Estimate…</>
              ) : (
                <><Calculator size={16} /> Generate Estimate ({activeLines.length} items)</>
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
                  <span className="flex items-center gap-1 text-green-400"><CheckCircle2 size={12} />{matchedRows.length} matched</span>
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

              {/* Phase tables */}
              {Array.from(rowsByPhase.entries())
                .filter(([phase]) => phase !== "Unmatched")
                .map(([phase, rows]) => {
                  const phaseTotal = rows.reduce((s, r) => s + r.lineTotal, 0);
                  const phaseLaborHrs = rows.reduce((s, r) => s + r.finalLaborHours * r.qty, 0);
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
                                  <td className="px-3 py-2 text-right font-mono text-foreground">${fmt(row.unitMaterial)}</td>
                                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">{fmt(row.baseLaborHours, 4)}</td>
                                  <td className="px-3 py-2 text-right font-mono text-[#F5C518]">{fmt(row.categoryFactor, 2)}</td>
                                  <td className="px-3 py-2 text-right font-mono text-foreground">{fmt(row.finalLaborHours * row.qty, 3)}</td>
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
                        These items did not match any entry in the electrical database. Add them manually to the Labor & Material page or expand the database with the exact description.
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
