/**
 * BidPhase — Labor & Material Summary Page
 *
 * Full-screen view showing:
 *  1. Material rows (from count sessions + runs + manual additions) with catalog picker
 *     — multi-select checkboxes for bulk delete/edit
 *     — "Add from Catalog" button to add items directly from the price database
 *  2. Journeyman labor lines (description + hours × rate)
 *  3. Trainee labor lines (description + hours × rate)
 *  4. Totals strip: material subtotal + markup % (material only) + labor subtotal = grand total
 *  5. Export: CSV, PDF, Print
 */
import { useState, useCallback, useEffect } from "react";
import { nanoid } from "nanoid";
import {
  ArrowLeft, Plus, Trash2, Printer, Download, FileText,
  ChevronDown, ChevronUp, Edit2, HardHat, Wrench,
  Tag, DollarSign, Percent, BookOpen, CheckSquare, Square, X, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import type { LaborLine, SavedMaterialRow, CivilProject, RunItem } from "@/contexts/AppContext";
import CatalogPicker from "@/components/CatalogPicker";
import { CATALOG, type CatalogItem, getConduitPricePerFoot, getWirePricePerFoot, type UserMaterialRow } from "@/lib/materialCatalog";
import { trpc } from "@/lib/trpc";

// ── Calc helpers (mirrors UnifiedProjects.tsx) ────────────────────────────────
function calcConduitBillable(feet: number, conduitWasteFactor = 10) {
  return parseFloat((feet * (1 + conduitWasteFactor / 100)).toFixed(1));
}
function calcConduitWire(feet: number, conductors: number, wireTermMakeup = 0, numPullPoints = 0, wireWasteFactor = 10) {
  const netWireLength = feet + wireTermMakeup * numPullPoints;
  return parseFloat((netWireLength * (1 + wireWasteFactor / 100) * conductors).toFixed(1));
}
function calcWire(feet: number, conductors: number, makeupAllowance = 0, serviceLoop = 0, numTerminations = 0, wirewasteFactor = 10) {
  const netLength = feet + makeupAllowance * numTerminations + serviceLoop;
  return parseFloat((netLength * (1 + wirewasteFactor / 100)).toFixed(1));
}

/** Expand a single RunItem into one or more MaterialRows with accurate billable qty + price */
function expandRunToRows(r: RunItem, prefix: string, seenIds: Set<string>, userMaterials: UserMaterialRow[]): MaterialRow[] {
  const out: MaterialRow[] = []
  const isWireRun = (r.runType ?? "conduit") === "wire";
  const runLabel = r.name || "Unnamed";

  if (!isWireRun) {
    // ── Conduit row ──────────────────────────────────────────────────────────
    const conduitBillable = calcConduitBillable(r.feet, r.conduitWasteFactor ?? 10);
    const conduitCpf = getConduitPricePerFoot(r.conduitType ?? "EMT", r.conduitSize ?? "1/2", userMaterials);
    const conduitId = `${prefix}-r-${r.id}-conduit`;
    if (!seenIds.has(conduitId)) {
      seenIds.add(conduitId);
      out.push({
        id: conduitId,
        description: `${r.conduitType ?? "EMT"} ${r.conduitSize ?? "1/2"}" Conduit — ${runLabel}`,
        unit: "FT",
        qty: conduitBillable,
        unitCost: conduitCpf ?? 0,
        notes: `${r.feet.toFixed(1)} ft measured · ${r.conduitWasteFactor ?? 10}% waste`,
        catalogId: null,
        source: "run",
      });
    }

    // ── Wire rows (skip if conduit-only) ─────────────────────────────────────
    if (!r.conduitOnly) {
      const wireTypeStr = r.wireTypeId ? r.wireTypeId.replace(/^wir-/, "") : "thhn";
      const effectiveWireSize = (wireTypeStr === "MC" || wireTypeStr === "NM")
        ? (r.wireTypeId?.match(/-([\d/]+(?:-\d+)?)(?:-[a-z])?$/i)?.[1] ?? r.conductorSize ?? "12")
        : (r.conductorSize ?? "12");
      const wireBillable = calcConduitWire(r.feet, r.conductors, r.wireTermMakeup ?? 0, r.numPullPoints ?? 0, r.wireWasteFactor ?? 10);
      const wireCpf = getWirePricePerFoot(wireTypeStr, effectiveWireSize, r.conductorMaterial ?? "CU", userMaterials, r.wireTypeId);
      const wireId = `${prefix}-r-${r.id}-wire`;
      if (!seenIds.has(wireId)) {
        seenIds.add(wireId);
        const matLabel = r.conductorMaterial === "AL" ? "Al" : "Cu";
        out.push({
          id: wireId,
          description: `#${effectiveWireSize} ${matLabel} ${wireTypeStr.toUpperCase()} Wire — ${runLabel}`,
          unit: "FT",
          qty: wireBillable,
          unitCost: wireCpf ?? 0,
          notes: `${r.conductors} conductor${r.conductors !== 1 ? "s" : ""} · ${r.wireWasteFactor ?? 10}% waste`,
          catalogId: null,
          source: "run",
        });
      }

      // ── EGC row ──────────────────────────────────────────────────────────────
      if (r.includeGround) {
        const egcBillable = calcConduitWire(r.feet, 1, r.wireTermMakeup ?? 0, r.numPullPoints ?? 0, r.wireWasteFactor ?? 10);
        const egcCpf = getWirePricePerFoot("thhn", r.groundSize ?? "12", r.groundMaterial ?? "CU", userMaterials, undefined);
        const egcId = `${prefix}-r-${r.id}-egc`;
        if (!seenIds.has(egcId)) {
          seenIds.add(egcId);
          const egcMatLabel = r.groundMaterial === "AL" ? "Al" : "Cu";
          out.push({
            id: egcId,
            description: `#${r.groundSize ?? "12"} ${egcMatLabel} THHN EGC — ${runLabel}`,
            unit: "FT",
            qty: egcBillable,
            unitCost: egcCpf ?? 0,
            notes: `EGC · ${r.wireWasteFactor ?? 10}% waste`,
            catalogId: null,
            source: "run",
          });
        }
      }
    }
  } else {
    // ── Wire-only run ─────────────────────────────────────────────────────────
    const wireTypeStr = r.wireTypeId ? r.wireTypeId.replace(/^wir-/, "") : "thhn";
    const effectiveWireSize = (wireTypeStr === "MC" || wireTypeStr === "NM")
      ? (r.wireTypeId?.match(/-([\d/]+(?:-\d+)?)(?:-[a-z])?$/i)?.[1] ?? r.conductorSize ?? "12")
      : (r.conductorSize ?? "12");
    // calcWire returns per-conductor footage
    const perConductorFt = calcWire(r.feet, r.conductors, r.makeupAllowance ?? 0, r.serviceLoop ?? 0, r.numTerminations ?? 0, r.wirewasteFactor ?? 10);
    const totalWireFt = parseFloat((perConductorFt * r.conductors).toFixed(1));
    const wireCpf = getWirePricePerFoot(wireTypeStr, effectiveWireSize, r.conductorMaterial ?? "CU", userMaterials, r.wireTypeId);
    const wireId = `${prefix}-r-${r.id}-wire`;
    if (!seenIds.has(wireId)) {
      seenIds.add(wireId);
      const matLabel = r.conductorMaterial === "AL" ? "Al" : "Cu";
      out.push({
        id: wireId,
        description: `#${effectiveWireSize} ${matLabel} ${wireTypeStr.toUpperCase()} Wire — ${runLabel}`,
        unit: "FT",
        qty: totalWireFt,
        unitCost: wireCpf ?? 0,
        notes: `${r.conductors} conductor${r.conductors !== 1 ? "s" : ""} · ${r.wirewasteFactor ?? 10}% waste`,
        catalogId: null,
        source: "run",
      });
    }
  }

  return out;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface MaterialRow {
  id: string;
  description: string;
  unit: string;
  qty: number;
  unitCost: number;
  notes: string;
  catalogId: string | null;
  source: "session" | "manual" | "run";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function InlineEdit({
  value, onSave, className, inputClassName, prefix,
}: {
  value: string; onSave: (v: string) => void;
  className?: string; inputClassName?: string; prefix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const commit = () => { onSave(draft); setEditing(false); };
  if (!editing) {
    return (
      <span
        className={cn("cursor-pointer hover:text-[#F5C518] transition-colors group flex items-center gap-1", className)}
        onClick={() => { setDraft(value); setEditing(true); }}
      >
        {prefix}{value}
        <Edit2 size={10} className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
      </span>
    );
  }
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      className={cn("bg-transparent border-b border-[#F5C518] outline-none text-[#F5C518]", inputClassName)}
    />
  );
}

// ─── Catalog Add Modal ────────────────────────────────────────────────────────
function CatalogAddModal({ onAdd, onClose }: { onAdd: (item: CatalogItem) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("All");
  const categories = ["All", ...Array.from(new Set(CATALOG.map((i) => i.category)))];
  const filtered = CATALOG.filter((i) => {
    const matchCat = selectedCat === "All" || i.category === selectedCat;
    const matchQ = !query || i.description.toLowerCase().includes(query.toLowerCase()) || i.category.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-[560px] max-h-[80vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-[#F5C518]" />
            <span className="text-sm font-semibold">Add from Material Catalog</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={14} /></button>
        </div>
        {/* Search + category filter */}
        <div className="px-4 py-2 border-b border-border shrink-0 flex gap-2">
          <input
            autoFocus
            type="text"
            placeholder="Search items…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-muted/20 border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#F5C518]/60 placeholder:text-muted-foreground"
          />
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="bg-muted/20 border border-border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-[#F5C518]/60 text-foreground"
          >
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {/* Item list */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/30">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">No items match your search.</div>
          )}
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => { onAdd(item); }}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors text-left group"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-medium text-foreground group-hover:text-[#F5C518] transition-colors truncate">{item.description}</span>
                <span className="text-[10px] text-muted-foreground">{item.category}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <span className="text-xs font-mono text-[#F5C518]">${item.unitPrice.toFixed(2)}/{item.unit}</span>
                <Plus size={12} className="text-muted-foreground group-hover:text-[#F5C518] transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Edit Bar ─────────────────────────────────────────────────────────────
function BulkEditBar({
  count,
  onDelete,
  onSetUnit,
  onClearSelection,
}: {
  count: number;
  onDelete: () => void;
  onSetUnit: (unit: string) => void;
  onClearSelection: () => void;
}) {
  const [unitDraft, setUnitDraft] = useState("");
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[#F5C518]/10 border-b border-[#F5C518]/30">
      <span className="text-xs font-semibold text-[#F5C518]">{count} selected</span>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Set unit:</span>
        <input
          type="text"
          placeholder="EA"
          value={unitDraft}
          onChange={(e) => setUnitDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && unitDraft) { onSetUnit(unitDraft); setUnitDraft(""); } }}
          className="w-16 bg-transparent border-b border-[#F5C518]/40 text-[#F5C518] font-mono text-xs outline-none focus:border-[#F5C518] px-1"
        />
        <button
          onClick={() => { if (unitDraft) { onSetUnit(unitDraft); setUnitDraft(""); } }}
          className="px-2 py-0.5 rounded text-[10px] bg-[#F5C518]/20 text-[#F5C518] hover:bg-[#F5C518]/30 transition-colors"
        >Apply</button>
      </div>
      <button
        onClick={onDelete}
        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors ml-auto"
      >
        <Trash2 size={10} />Delete selected
      </button>
      <button onClick={onClearSelection} className="text-muted-foreground hover:text-foreground transition-colors"><X size={12} /></button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface MaterialListPageProps {
  onBack?: () => void;
}

export default function MaterialListPage({ onBack }: MaterialListPageProps) {
  const {
    setShowMaterialList,
    activeCivilProject, activeCommercialProject, activeResidentialProject,
    activeCivilCatProject, activeCommercialCatProject, activeResidentialCatProject,
    markupPct, setMarkupPct,
    journeymanLines, setJourneymanLines,
    traineeLines, setTraineeLines,
    journeymanRate, setJourneymanRate,
    traineeRate, setTraineeRate,
  } = useApp();

  // Fetch user DB prices so run rows get accurate unit costs
  const { data: userMaterials = [] } = trpc.data.materials.list.useQuery(undefined, {
    staleTime: 60_000,
  });

  const goBack = onBack ?? (() => {
    window.history.back();
  });

  // ── Build material rows from all active projects ────────────────────────
  const buildRows = useCallback((): MaterialRow[] => {
    const allRows: MaterialRow[] = [];
    const seenIds = new Set<string>();

    const addProjectRows = (proj: CivilProject | undefined, prefix: string) => {
      if (!proj) return;
      const st = proj.state;
      // Saved material rows (from count sessions saved via Save button)
      for (const smr of st.savedMaterialRows ?? []) {
        const id = `${prefix}-smr-${smr.id}`;
        if (seenIds.has(id)) continue;
        seenIds.add(id);
        allRows.push({ id, description: smr.description, unit: smr.unit, qty: smr.qty, unitCost: smr.unitCost, notes: `Saved ${new Date(smr.savedAt).toLocaleDateString()}`, catalogId: null, source: "session" });
      }
      // Live count sessions (not yet saved as rows)
      const savedSessionIds = new Set((st.savedMaterialRows ?? []).map((r) => (r as SavedMaterialRow).sessionId));
      for (const s of st.countSessions ?? []) {
        if (savedSessionIds.has(s.id)) continue;
        const qty = s.pins.length;
        if (!qty && !s.unitCost) continue;
        const id = `${prefix}-s-${s.id}`;
        if (seenIds.has(id)) continue;
        seenIds.add(id);
        const unitCost = s.priceMode === "total" ? (qty > 0 ? (s.unitCost ?? 0) / qty : 0) : (s.unitCost ?? 0);
        allRows.push({ id, description: s.name || "Unnamed", unit: "EA", qty, unitCost, notes: "", catalogId: null, source: "session" });
      }
      // Runs — expanded into individual line items (conduit + wire + EGC) with real prices
      for (const r of st.runs ?? []) {
        if (!r.feet) continue;
        const expanded = expandRunToRows(r, prefix, seenIds, userMaterials);
        allRows.push(...expanded);
      }
    };

    // Category-specific projects (used by BidPhaseShell)
    addProjectRows(activeCivilCatProject, "civil-cat");
    addProjectRows(activeCommercialCatProject, "comm-cat");
    addProjectRows(activeResidentialCatProject, "res-cat");
    // Legacy projects (fallback for old data / direct access)
    addProjectRows(activeCivilProject, "civil");
    return allRows;
  }, [activeCivilProject, activeCommercialProject, activeResidentialProject, activeCivilCatProject, activeCommercialCatProject, activeResidentialCatProject, userMaterials]);

  const [rows, setRows] = useState<MaterialRow[]>(() => buildRows());
  const [manualRows, setManualRows] = useState<MaterialRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
  const [deletingLaborId, setDeletingLaborId] = useState<string | null>(null);
  const [bulkDeletePending, setBulkDeletePending] = useState(false);
  const [markupDraft, setMarkupDraft] = useState(String(markupPct));
  const [jRateDraft, setJRateDraft] = useState(String(journeymanRate));
  const [tRateDraft, setTRateDraft] = useState(String(traineeRate));
  const [showMaterials, setShowMaterials] = useState(true);
  const [showJourneyman, setShowJourneyman] = useState(true);
  const [showTrainee, setShowTrainee] = useState(true);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");

  useEffect(() => { setRows(buildRows()); }, [buildRows]);

  const allRows = [...rows, ...manualRows];
  const visibleRows = materialSearch.trim()
    ? allRows.filter((r) =>
        r.description.toLowerCase().includes(materialSearch.toLowerCase()) ||
        r.notes.toLowerCase().includes(materialSearch.toLowerCase()) ||
        r.unit.toLowerCase().includes(materialSearch.toLowerCase())
      )
    : allRows;

  // ── Totals ──────────────────────────────────────────────────────────────────
  const materialSubtotal = allRows.reduce((s, r) => s + r.qty * r.unitCost, 0);
  const jHours = journeymanLines.reduce((s, l) => s + l.hours, 0);
  const tHours = traineeLines.reduce((s, l) => s + l.hours, 0);
  const jLaborTotal = jHours * journeymanRate;
  const tLaborTotal = tHours * traineeRate;
  const laborSubtotal = jLaborTotal + tLaborTotal;
  const markupAmt = materialSubtotal * (markupPct / 100);
  const grandTotal = materialSubtotal + markupAmt + laborSubtotal;

  // ── Row helpers ─────────────────────────────────────────────────────────────
  const updateRow = (id: string, patch: Partial<MaterialRow>) => {
    setRows((p) => p.map((r) => r.id === id ? { ...r, ...patch } : r));
    setManualRows((p) => p.map((r) => r.id === id ? { ...r, ...patch } : r));
  };
  const addManualRow = () => setManualRows((p) => [...p, { id: nanoid(8), description: "New item", unit: "EA", qty: 1, unitCost: 0, notes: "", catalogId: null, source: "manual" }]);
  const addFromCatalog = (item: CatalogItem) => {
    setManualRows((p) => [...p, { id: nanoid(8), description: item.description, unit: item.unit, qty: 1, unitCost: item.unitPrice, notes: "", catalogId: item.id, source: "manual" }]);
  };
  const applyCatalog = (rowId: string, item: CatalogItem | null) => {
    if (!item) { updateRow(rowId, { catalogId: null }); return; }
    updateRow(rowId, { catalogId: item.id, description: item.description, unit: item.unit, unitCost: item.unitPrice });
  };

  // ── Selection helpers ────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const selectAll = () => setSelectedIds(new Set(allRows.map((r) => r.id)));
  const clearSelection = () => setSelectedIds(new Set());
  const allSelected = allRows.length > 0 && selectedIds.size === allRows.length;

  const bulkDelete = () => {
    setRows((p) => p.filter((r) => !selectedIds.has(r.id)));
    setManualRows((p) => p.filter((r) => !selectedIds.has(r.id)));
    clearSelection();
    setBulkDeletePending(false);
  };
  const bulkSetUnit = (unit: string) => {
    selectedIds.forEach((id) => updateRow(id, { unit }));
  };

  // ── Labor helpers ────────────────────────────────────────────────────────────
  const addJLine = () => setJourneymanLines([...journeymanLines, { id: nanoid(6), description: "Task", hours: 0 }]);
  const addTLine = () => setTraineeLines([...traineeLines, { id: nanoid(6), description: "Task", hours: 0 }]);
  const updateJLine = (id: string, patch: Partial<LaborLine>) => setJourneymanLines(journeymanLines.map((l) => l.id === id ? { ...l, ...patch } : l));
  const updateTLine = (id: string, patch: Partial<LaborLine>) => setTraineeLines(traineeLines.map((l) => l.id === id ? { ...l, ...patch } : l));

  // ── Export ───────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const lines = [
      "Section,Description,Unit,Qty,Unit Cost,Ext Cost,Notes",
      ...allRows.map((r) => `"${r.source}","${r.description}",${r.unit},${r.qty},${r.unitCost.toFixed(2)},${(r.qty * r.unitCost).toFixed(2)},"${r.notes}"`),
      "",
      "Type,Description,Hours,Rate,Total",
      ...journeymanLines.map((l) => `Journeyman,"${l.description}",${l.hours},${journeymanRate.toFixed(2)},${(l.hours * journeymanRate).toFixed(2)}`),
      ...traineeLines.map((l) => `Trainee,"${l.description}",${l.hours},${traineeRate.toFixed(2)},${(l.hours * traineeRate).toFixed(2)}`),
      "",
      `Material Subtotal,,,,,${materialSubtotal.toFixed(2)}`,
      `Material Markup (${markupPct}%),,,,,${markupAmt.toFixed(2)}`,
      `Labor Subtotal,,,,,${laborSubtotal.toFixed(2)}`,
      `Grand Total,,,,,${grandTotal.toFixed(2)}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "labor-material.csv"; a.click();
  };

  const exportPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Labor & Material Summary</title>
<style>body{font-family:Arial,sans-serif;font-size:11px;margin:24px;color:#111}h1{font-size:16px}h2{font-size:12px;margin:14px 0 4px;border-bottom:1px solid #ccc;padding-bottom:2px}table{width:100%;border-collapse:collapse}th{background:#1a1a1a;color:#F5C518;text-align:left;padding:4px 6px;font-size:10px}td{padding:3px 6px;border-bottom:1px solid #eee}.right{text-align:right}.bold{font-weight:bold}.grand{background:#1a1a1a;color:#F5C518}</style>
</head><body>
<h1>Labor & Material Summary</h1><p style="color:#888;font-size:10px">Generated ${new Date().toLocaleDateString()}</p>
<h2>Materials</h2>
<table><thead><tr><th>Description</th><th>Unit</th><th class="right">Qty</th><th class="right">Unit $</th><th class="right">Ext $</th><th>Notes</th></tr></thead><tbody>
${allRows.map((r) => `<tr><td>${r.description}</td><td>${r.unit}</td><td class="right">${r.qty}</td><td class="right">$${r.unitCost.toFixed(2)}</td><td class="right">$${(r.qty * r.unitCost).toFixed(2)}</td><td>${r.notes}</td></tr>`).join("")}
<tr class="bold"><td colspan="4">Material Subtotal</td><td class="right">$${materialSubtotal.toFixed(2)}</td><td></td></tr>
<tr><td colspan="4">Markup (${markupPct}%)</td><td class="right">$${markupAmt.toFixed(2)}</td><td></td></tr>
<tr class="bold"><td colspan="4">Material Total</td><td class="right">$${(materialSubtotal + markupAmt).toFixed(2)}</td><td></td></tr>
</tbody></table>
<h2>Journeyman Labor — $${journeymanRate}/hr</h2>
<table><thead><tr><th>Task</th><th class="right">Hours</th><th class="right">Total</th></tr></thead><tbody>
${journeymanLines.map((l) => `<tr><td>${l.description}</td><td class="right">${l.hours}</td><td class="right">$${(l.hours * journeymanRate).toFixed(2)}</td></tr>`).join("")}
<tr class="bold"><td>Total (${jHours} hrs)</td><td></td><td class="right">$${jLaborTotal.toFixed(2)}</td></tr>
</tbody></table>
<h2>Trainee Labor — $${traineeRate}/hr</h2>
<table><thead><tr><th>Task</th><th class="right">Hours</th><th class="right">Total</th></tr></thead><tbody>
${traineeLines.map((l) => `<tr><td>${l.description}</td><td class="right">${l.hours}</td><td class="right">$${(l.hours * traineeRate).toFixed(2)}</td></tr>`).join("")}
<tr class="bold"><td>Total (${tHours} hrs)</td><td></td><td class="right">$${tLaborTotal.toFixed(2)}</td></tr>
</tbody></table>
<h2>Totals</h2>
<table><tbody>
<tr><td>Material Subtotal</td><td class="right">$${materialSubtotal.toFixed(2)}</td></tr>
<tr><td>Markup (${markupPct}%)</td><td class="right">$${markupAmt.toFixed(2)}</td></tr>
<tr><td>Labor Total</td><td class="right">$${laborSubtotal.toFixed(2)}</td></tr>
<tr class="grand bold"><td>Grand Total</td><td class="right">$${grandTotal.toFixed(2)}</td></tr>
</tbody></table>
</body></html>`);
    w.document.close(); w.print();
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <button onClick={goBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /><span>Back</span>
        </button>
        <div className="w-px h-5 bg-border" />
        <h1 className="text-sm font-semibold text-foreground flex-1">Labor & Material Summary</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground hover:border-[#F5C518]/40 transition-all">
            <Printer size={13} />Print
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground hover:border-[#F5C518]/40 transition-all">
            <Download size={13} />CSV
          </button>
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#F5C518] text-black font-medium hover:bg-[#F5C518]/90 transition-all">
            <FileText size={13} />PDF
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Materials */}
        <section className="bg-card border border-border rounded-xl">
          <button onClick={() => setShowMaterials((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-[#F5C518]" />
              <span className="text-sm font-semibold">Materials</span>
              <span className="text-xs text-muted-foreground font-mono">{allRows.length} items · ${fmt(materialSubtotal)}</span>
            </div>
            {showMaterials ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
          </button>
          {showMaterials && (
            <div>
              {/* Search bar */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border/40 bg-muted/5">
                <Search size={12} className="text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Filter materials by name, unit, or notes…"
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none font-mono"
                />
                {materialSearch && (
                  <button onClick={() => setMaterialSearch("")} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X size={11} />
                  </button>
                )}
              </div>
              {/* Bulk action bar */}
              {selectedIds.size > 0 && (
                <BulkEditBar
                  count={selectedIds.size}
                  onDelete={() => setBulkDeletePending(true)}
                  onSetUnit={bulkSetUnit}
                  onClearSelection={clearSelection}
                />
              )}
              {/* Column headers */}
              <div className="grid grid-cols-[28px_2fr_60px_70px_80px_80px_1fr_28px] gap-1 px-4 py-2 bg-muted/20 border-y border-border text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                <button
                  onClick={allSelected ? clearSelection : selectAll}
                  className="flex items-center justify-center text-muted-foreground hover:text-[#F5C518] transition-colors"
                  title={allSelected ? "Deselect all" : "Select all"}
                >
                  {allSelected ? <CheckSquare size={12} /> : <Square size={12} />}
                </button>
                <span>Description / Catalog</span><span>Unit</span><span className="text-right">Qty</span><span className="text-right">Unit $</span><span className="text-right">Ext $</span><span>Notes</span><span />
              </div>
              {allRows.length === 0 && <div className="px-4 py-8 text-center text-xs text-muted-foreground">No materials yet. Add count sessions or click "+ Add Row".</div>}
              {allRows.length > 0 && visibleRows.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">No rows match "{materialSearch}".</div>
              )}
              {visibleRows.map((row) => (
                <div
                  key={row.id}
                  className={cn(
                    "grid grid-cols-[28px_2fr_60px_70px_80px_80px_1fr_28px] gap-1 px-4 py-2 border-b border-border/40 items-start group hover:bg-muted/10 transition-colors",
                    selectedIds.has(row.id) && "bg-[#F5C518]/5 border-l-2 border-l-[#F5C518]/40"
                  )}
                >
                  <button
                    onClick={() => toggleSelect(row.id)}
                    className="flex items-center justify-center mt-1 text-muted-foreground hover:text-[#F5C518] transition-colors"
                  >
                    {selectedIds.has(row.id) ? <CheckSquare size={12} className="text-[#F5C518]" /> : <Square size={12} />}
                  </button>
                  <div className="flex flex-col gap-1 min-w-0">
                    <InlineEdit value={row.description} onSave={(v) => updateRow(row.id, { description: v })} className="text-xs font-medium text-foreground truncate" inputClassName="text-xs w-full" />
                    <CatalogPicker value={row.catalogId} onChange={(item) => applyCatalog(row.id, item)} placeholder="Link to catalog…" />
                  </div>
                  <InlineEdit value={row.unit} onSave={(v) => updateRow(row.id, { unit: v })} className="text-xs text-muted-foreground font-mono mt-1" inputClassName="text-xs w-14 font-mono" />
                  <div className="text-right mt-1"><InlineEdit value={String(row.qty)} onSave={(v) => updateRow(row.id, { qty: parseFloat(v) || 0 })} className="text-xs font-mono text-foreground justify-end" inputClassName="text-xs w-14 font-mono text-right" /></div>
                  <div className="text-right mt-1"><InlineEdit value={row.unitCost.toFixed(2)} onSave={(v) => updateRow(row.id, { unitCost: parseFloat(v) || 0 })} className="text-xs font-mono text-foreground justify-end" inputClassName="text-xs w-16 font-mono text-right" prefix="$" /></div>
                  <div className="text-right text-xs font-mono font-medium text-[#F5C518] mt-1">${fmt(row.qty * row.unitCost)}</div>
                  <InlineEdit value={row.notes} onSave={(v) => updateRow(row.id, { notes: v })} className="text-xs text-muted-foreground truncate mt-1" inputClassName="text-xs w-full" />
                  <button onClick={() => setDeletingRowId(row.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400 mt-1"><Trash2 size={12} /></button>
                </div>
              ))}
              <div className="px-4 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button onClick={addManualRow} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#F5C518] transition-colors">
                    <Plus size={12} />Add Row
                  </button>
                  <span className="text-muted-foreground/40 text-xs">|</span>
                  <button onClick={() => setShowCatalogModal(true)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#F5C518] transition-colors">
                    <BookOpen size={12} />Add from Catalog
                  </button>
                </div>
                <span className="text-xs font-mono font-bold text-[#F5C518]">Subtotal: ${fmt(materialSubtotal)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Journeyman Labor */}
        <section className="bg-card border border-border rounded-xl">
          <button onClick={() => setShowJourneyman((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2">
              <HardHat size={14} className="text-[#F5C518]" />
              <span className="text-sm font-semibold">Journeyman Labor</span>
              <span className="text-xs text-muted-foreground font-mono">{jHours} hrs · ${fmt(jLaborTotal)}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                <span>Rate: $</span>
                <input type="number" min={0} step={1} value={jRateDraft} onChange={(e) => setJRateDraft(e.target.value)}
                  onBlur={() => { const v = parseFloat(jRateDraft); if (!isNaN(v) && v > 0) setJourneymanRate(v); else setJRateDraft(String(journeymanRate)); }}
                  className="w-14 bg-transparent border-b border-[#F5C518]/40 text-[#F5C518] font-mono text-xs text-right outline-none focus:border-[#F5C518]" />
                <span>/hr</span>
              </div>
              {showJourneyman ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
            </div>
          </button>
          {showJourneyman && (
            <div>
              <div className="grid grid-cols-[1fr_100px_100px_28px] gap-2 px-4 py-2 bg-muted/20 border-y border-border text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                <span>Task</span><span className="text-right">Hours</span><span className="text-right">Total</span><span />
              </div>
              {journeymanLines.length === 0 && <div className="px-4 py-6 text-center text-xs text-muted-foreground">No journeyman tasks yet.</div>}
              {journeymanLines.map((line) => (
                <div key={line.id} className="grid grid-cols-[1fr_100px_100px_28px] gap-2 px-4 py-2 border-b border-border/40 items-center group hover:bg-muted/10 transition-colors">
                  <InlineEdit value={line.description} onSave={(v) => updateJLine(line.id, { description: v })} className="text-xs text-foreground" inputClassName="text-xs w-full" />
                  <div className="text-right"><InlineEdit value={String(line.hours)} onSave={(v) => updateJLine(line.id, { hours: parseFloat(v) || 0 })} className="text-xs font-mono text-foreground justify-end" inputClassName="text-xs w-20 font-mono text-right" /></div>
                  <div className="text-right text-xs font-mono font-medium text-[#F5C518]">${fmt(line.hours * journeymanRate)}</div>
                  <button onClick={() => setDeletingLaborId(line.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400"><Trash2 size={12} /></button>
                </div>
              ))}
              <div className="px-4 py-2 flex items-center justify-between">
                <button onClick={addJLine} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#F5C518] transition-colors"><Plus size={12} />Add Task</button>
                <span className="text-xs font-mono font-bold text-[#F5C518]">{jHours} hrs · ${fmt(jLaborTotal)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Trainee Labor */}
        <section className="bg-card border border-border rounded-xl">
          <button onClick={() => setShowTrainee((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2">
              <Wrench size={14} className="text-[#F5C518]" />
              <span className="text-sm font-semibold">Trainee Labor</span>
              <span className="text-xs text-muted-foreground font-mono">{tHours} hrs · ${fmt(tLaborTotal)}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                <span>Rate: $</span>
                <input type="number" min={0} step={1} value={tRateDraft} onChange={(e) => setTRateDraft(e.target.value)}
                  onBlur={() => { const v = parseFloat(tRateDraft); if (!isNaN(v) && v > 0) setTraineeRate(v); else setTRateDraft(String(traineeRate)); }}
                  className="w-14 bg-transparent border-b border-[#F5C518]/40 text-[#F5C518] font-mono text-xs text-right outline-none focus:border-[#F5C518]" />
                <span>/hr</span>
              </div>
              {showTrainee ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
            </div>
          </button>
          {showTrainee && (
            <div>
              <div className="grid grid-cols-[1fr_100px_100px_28px] gap-2 px-4 py-2 bg-muted/20 border-y border-border text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                <span>Task</span><span className="text-right">Hours</span><span className="text-right">Total</span><span />
              </div>
              {traineeLines.length === 0 && <div className="px-4 py-6 text-center text-xs text-muted-foreground">No trainee tasks yet.</div>}
              {traineeLines.map((line) => (
                <div key={line.id} className="grid grid-cols-[1fr_100px_100px_28px] gap-2 px-4 py-2 border-b border-border/40 items-center group hover:bg-muted/10 transition-colors">
                  <InlineEdit value={line.description} onSave={(v) => updateTLine(line.id, { description: v })} className="text-xs text-foreground" inputClassName="text-xs w-full" />
                  <div className="text-right"><InlineEdit value={String(line.hours)} onSave={(v) => updateTLine(line.id, { hours: parseFloat(v) || 0 })} className="text-xs font-mono text-foreground justify-end" inputClassName="text-xs w-20 font-mono text-right" /></div>
                  <div className="text-right text-xs font-mono font-medium text-[#F5C518]">${fmt(line.hours * traineeRate)}</div>
                  <button onClick={() => setDeletingLaborId(line.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400"><Trash2 size={12} /></button>
                </div>
              ))}
              <div className="px-4 py-2 flex items-center justify-between">
                <button onClick={addTLine} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#F5C518] transition-colors"><Plus size={12} />Add Task</button>
                <span className="text-xs font-mono font-bold text-[#F5C518]">{tHours} hrs · ${fmt(tLaborTotal)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Totals */}
        <section className="bg-card border border-border rounded-xl">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <DollarSign size={14} className="text-[#F5C518]" />
            <span className="text-sm font-semibold">Project Totals</span>
          </div>
          <div className="divide-y divide-border/40">
            {/* Materials section */}
            <div className="flex items-center justify-between px-4 py-2.5 text-sm"><span className="text-muted-foreground">Material Subtotal</span><span className="font-mono font-medium">${fmt(materialSubtotal)}</span></div>
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Percent size={12} /><span>Material Markup</span>
                <input type="number" min={0} max={200} step={0.5} value={markupDraft} onChange={(e) => setMarkupDraft(e.target.value)}
                  onBlur={() => { const v = parseFloat(markupDraft); if (!isNaN(v) && v >= 0) setMarkupPct(v); else setMarkupDraft(String(markupPct)); }}
                  className="w-14 bg-transparent border-b border-[#F5C518]/40 text-[#F5C518] font-mono text-xs text-right outline-none focus:border-[#F5C518]" />
                <span className="text-xs">%</span>
              </div>
              <span className="font-mono font-medium text-[#F5C518]">+${fmt(markupAmt)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 text-sm bg-muted/10"><span className="font-medium text-muted-foreground">Material Total</span><span className="font-mono font-semibold">${fmt(materialSubtotal + markupAmt)}</span></div>
            {/* Labor section — separate, no markup applied */}
            <div className="flex items-center justify-between px-4 py-2.5 text-sm"><span className="text-muted-foreground">Labor Total</span><span className="font-mono font-medium">${fmt(laborSubtotal)}</span></div>
            {/* Grand total */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#F5C518]/5">
              <span className="font-bold text-base">Grand Total</span>
              <span className="font-mono font-bold text-xl text-[#F5C518]">${fmt(grandTotal)}</span>
            </div>
          </div>
        </section>

        <div className="h-8" />
      </div>

      {/* Catalog Add Modal */}
      {showCatalogModal && (
        <CatalogAddModal
          onAdd={(item) => { addFromCatalog(item); }}
          onClose={() => setShowCatalogModal(false)}
        />
      )}

      {/* Bulk Delete Confirmation */}
      {bulkDeletePending && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 w-80 shadow-2xl">
            <h3 className="text-sm font-semibold mb-2">Delete {selectedIds.size} rows?</h3>
            <p className="text-xs text-muted-foreground mb-4">Count session data in the plan is not affected.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setBulkDeletePending(false)} className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted/20 transition-colors">Cancel</button>
              <button onClick={bulkDelete} className="px-3 py-1.5 text-xs bg-red-500/90 text-white rounded-lg hover:bg-red-500 transition-colors">Delete All</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Row Confirmation */}
      {deletingRowId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 w-80 shadow-2xl">
            <h3 className="text-sm font-semibold mb-2">Remove this row?</h3>
            <p className="text-xs text-muted-foreground mb-4">Count session data in the plan is not affected.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeletingRowId(null)} className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted/20 transition-colors">Cancel</button>
              <button onClick={() => { setRows((p) => p.filter((r) => r.id !== deletingRowId)); setManualRows((p) => p.filter((r) => r.id !== deletingRowId)); setDeletingRowId(null); }} className="px-3 py-1.5 text-xs bg-red-500/90 text-white rounded-lg hover:bg-red-500 transition-colors">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Labor Confirmation */}
      {deletingLaborId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 w-80 shadow-2xl">
            <h3 className="text-sm font-semibold mb-2">Remove this labor task?</h3>
            <p className="text-xs text-muted-foreground mb-4">This will permanently remove the labor line.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeletingLaborId(null)} className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted/20 transition-colors">Cancel</button>
              <button onClick={() => { setJourneymanLines(journeymanLines.filter((l) => l.id !== deletingLaborId)); setTraineeLines(traineeLines.filter((l) => l.id !== deletingLaborId)); setDeletingLaborId(null); }} className="px-3 py-1.5 text-xs bg-red-500/90 text-white rounded-lg hover:bg-red-500 transition-colors">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
