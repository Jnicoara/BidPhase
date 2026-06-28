/**
 * BidPhase — MaterialListPage
 *
 * Full-screen editable material list view. Accessible via:
 *   - "Full View →" button on the right-panel material list header in any tab
 *   - Export → "View Material List" in the floating export button
 *
 * Features:
 *   - Notes column (free text per row)
 *   - Labor cost row (hours × hourly rate = labor total) — persisted in AppContext
 *   - Markup % field — persisted in AppContext
 *   - Sync edits back to AppContext (qty, unit cost for residential/commercial rows)
 *   - Add custom rows, remove rows with confirmation
 *   - Print button (window.print with print stylesheet)
 *   - Export as CSV or PDF
 *
 * Design: Tactical Dark Mode SaaS · Space Grotesk headers
 */
import { useState, useCallback } from "react";
import { ArrowLeft, Plus, Trash2, FileText, FileSpreadsheet, Check, X, HardHat, Printer, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import type { CountSession } from "@/contexts/AppContext";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MaterialRow {
  id: string;
  section: string;   // "Civil" | "Commercial" | "Residential" | "Custom"
  description: string;
  unit: string;
  quantity: number;
  unitCost: number | null;
  extCost: number | null;
  notes: string;
  editable: boolean;
  /** For syncing back to context: "residential-{index}" | "commercial-{index}" */
  sourceKey?: string;
}

let rowSeq = 0;
function mkId() { return `mr-${++rowSeq}-${Date.now()}`; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcExtCost(row: MaterialRow): number | null {
  if (row.unitCost == null) return null;
  return parseFloat((row.unitCost * row.quantity).toFixed(2));
}

function sessionExtCost(cs: CountSession): number | null {
  if (cs.unitCost == null || cs.pins.length === 0) return null;
  return parseFloat((cs.priceMode === "total" ? cs.unitCost : cs.unitCost * cs.pins.length).toFixed(2));
}

function sessionUnitCost(cs: CountSession): number | null {
  if (cs.unitCost == null || cs.pins.length === 0) return null;
  return cs.priceMode === "total"
    ? parseFloat((cs.unitCost / cs.pins.length).toFixed(4))
    : cs.unitCost;
}

// ─── CSV export ───────────────────────────────────────────────────────────────
function buildCSV(rows: string[][]): string {
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

function exportCSVFromRows(
  rows: MaterialRow[],
  laborHours: number,
  laborRate: number,
  markupPct: number,
  projectName: string
) {
  const header = ["Section", "Description", "Unit", "Qty", "Unit $", "Ext $", "Notes"];
  const data = rows.map((r) => {
    const ext = r.extCost ?? calcExtCost(r);
    return [
      r.section,
      r.description,
      r.unit,
      String(r.quantity),
      r.unitCost != null ? `$${r.unitCost.toFixed(2)}` : "—",
      ext != null ? `$${ext.toFixed(2)}` : "—",
      r.notes || "",
    ];
  });
  const totalMat = rows.reduce((s, r) => s + (r.extCost ?? calcExtCost(r) ?? 0), 0);
  const laborTotal = laborHours * laborRate;
  const subtotal = totalMat + laborTotal;
  const markupAmt = subtotal * (markupPct / 100);
  const grandTotal = subtotal + markupAmt;

  data.push(["", "TOTAL MATERIAL", "", "", "", `$${totalMat.toFixed(2)}`, ""]);
  if (laborHours > 0) {
    data.push(["Labor", `${laborHours} hrs @ $${laborRate}/hr`, "HR", String(laborHours), `$${laborRate.toFixed(2)}`, `$${laborTotal.toFixed(2)}`, ""]);
  }
  if (markupPct > 0) {
    data.push(["", `Markup (${markupPct}%)`, "", "", "", `$${markupAmt.toFixed(2)}`, ""]);
  }
  data.push(["", "GRAND TOTAL", "", "", "", `$${grandTotal.toFixed(2)}`, ""]);

  const csv = buildCSV([
    [`BidPhase — Material List${projectName ? ` — ${projectName}` : ""}`],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    header,
    ...data,
  ]);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `BidPhase_MaterialList_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success("Material list exported as CSV.");
}

// ─── PDF export ───────────────────────────────────────────────────────────────
async function exportPDFFromRows(
  rows: MaterialRow[],
  laborHours: number,
  laborRate: number,
  markupPct: number,
  projectName: string
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });

  const PW = 612, PH = 792;
  const ML = 36, MR = 36, MT = 50;
  const contentW = PW - ML - MR;
  let y = MT;

  // Header band
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, PW, 80, "F");
  doc.setTextColor(245, 197, 24);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("BidPhase", ML, 32);
  doc.setFontSize(11);
  doc.setTextColor(200, 200, 200);
  doc.text("Material List", ML, 50);
  if (projectName) {
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(projectName, ML, 65);
  }
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${new Date().toLocaleString()}`, PW - MR, 65, { align: "right" });

  y = 100;

  // Table columns
  const cols = [
    { label: "Description", x: ML,       w: 190 },
    { label: "Unit",        x: ML + 190, w: 40  },
    { label: "Qty",         x: ML + 230, w: 40  },
    { label: "Unit $",      x: ML + 270, w: 60  },
    { label: "Ext $",       x: ML + 330, w: 65  },
    { label: "Notes",       x: ML + 395, w: contentW - 395 },
  ];

  doc.setFillColor(40, 40, 40);
  doc.rect(ML, y - 12, contentW, 18, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(200, 200, 200);
  cols.forEach((c) => doc.text(c.label, c.x + 3, y));
  y += 10;

  let lastSection = "";
  let totalMat = 0;

  rows.forEach((row, i) => {
    if (y > PH - 100) { doc.addPage(); y = MT; }

    if (row.section !== lastSection) {
      lastSection = row.section;
      y += 4;
      doc.setFillColor(30, 30, 30);
      doc.rect(ML, y - 10, contentW, 14, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(245, 197, 24);
      doc.text(row.section.toUpperCase(), ML + 4, y);
      y += 8;
    }

    const bg = i % 2 === 0 ? [22, 22, 22] : [26, 26, 26];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(ML, y - 10, contentW, 14, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 220, 220);
    doc.text(row.description, cols[0].x + 3, y, { maxWidth: cols[0].w - 6 });
    doc.setTextColor(160, 160, 160);
    doc.text(row.unit, cols[1].x + 3, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 220, 220);
    doc.text(String(row.quantity), cols[2].x + cols[2].w - 3, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 160, 160);
    const uc = row.unitCost ?? null;
    doc.text(uc != null ? `$${uc.toFixed(2)}` : "—", cols[3].x + cols[3].w - 3, y, { align: "right" });
    const ext = row.extCost ?? calcExtCost(row);
    if (ext != null) {
      totalMat += ext;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(245, 197, 24);
      doc.text(`$${ext.toFixed(2)}`, cols[4].x + cols[4].w - 3, y, { align: "right" });
    } else {
      doc.setTextColor(100, 100, 100);
      doc.text("—", cols[4].x + cols[4].w - 3, y, { align: "right" });
    }
    if (row.notes) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(140, 140, 140);
      doc.text(row.notes, cols[5].x + 3, y, { maxWidth: cols[5].w - 6 });
    }
    y += 14;
  });

  // Totals
  const laborTotal = laborHours * laborRate;
  const subtotal = totalMat + laborTotal;
  const markupAmt = subtotal * (markupPct / 100);
  const grandTotal = subtotal + markupAmt;

  const drawTotalRow = (label: string, value: string, highlight = false) => {
    if (y > PH - 40) { doc.addPage(); y = MT; }
    y += 2;
    doc.setFillColor(highlight ? 50 : 40, highlight ? 40 : 40, highlight ? 10 : 40);
    doc.rect(ML, y - 10, contentW, 18, "F");
    doc.setFontSize(highlight ? 9 : 8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(highlight ? 245 : 200, highlight ? 197 : 200, highlight ? 24 : 200);
    doc.text(label, cols[0].x + 3, y);
    doc.setTextColor(245, 197, 24);
    doc.text(value, cols[4].x + cols[4].w - 3, y, { align: "right" });
    y += 18;
  };

  drawTotalRow("TOTAL MATERIAL COST", `$${totalMat.toFixed(2)}`);
  if (laborHours > 0) drawTotalRow(`LABOR — ${laborHours} hrs @ $${laborRate.toFixed(2)}/hr`, `$${laborTotal.toFixed(2)}`);
  if (markupPct > 0) drawTotalRow(`MARKUP (${markupPct}%)`, `$${markupAmt.toFixed(2)}`);
  if (laborHours > 0 || markupPct > 0) drawTotalRow("GRAND TOTAL", `$${grandTotal.toFixed(2)}`, true);

  doc.save(`BidPhase_MaterialList_${new Date().toISOString().slice(0, 10)}.pdf`);
  toast.success("Material list exported as PDF.");
}

// ─── Print stylesheet injection ───────────────────────────────────────────────
function injectPrintStyle() {
  const id = "bp-print-style";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    @media print {
      body > *:not(#bp-print-root) { display: none !important; }
      #bp-print-root { display: block !important; position: static !important; height: auto !important; overflow: visible !important; }
      #bp-print-root header { display: none !important; }
      #bp-print-root .no-print { display: none !important; }
      #bp-print-root table { font-size: 10pt; }
      #bp-print-root tfoot { display: table-row-group; }
      @page { margin: 1.5cm; }
    }
  `;
  document.head.appendChild(style);
}

// ─── Component ────────────────────────────────────────────────────────────────
interface MaterialListPageProps {
  onBack: () => void;
}

export default function MaterialListPage({ onBack }: MaterialListPageProps) {
  const {
    civilState,
    assemblyState,
    roomState,
    activeCivilProject,
    activeCommercialProject,
    activeResidentialProject,
    setRoomState,
    setAssemblyState,
    laborHours,
    setLaborHours,
    laborRate,
    setLaborRate,
    markupPct,
    setMarkupPct,
  } = useApp();

  // ── Build initial rows from context ─────────────────────────────────────────
  const buildRows = useCallback((): MaterialRow[] => {
    const result: MaterialRow[] = [];

    // Civil: runs
    const runs = civilState.runs ?? [];
    runs.forEach((run) => {
      result.push({
        id: mkId(), section: "Civil",
        description: `Run: ${run.name}`, unit: "FT",
        quantity: run.feet ?? 0, unitCost: null, extCost: null, notes: "",
        editable: false,
      });
    });
    (civilState.countSessions ?? []).filter((cs) => cs.pins.length > 0).forEach((cs) => {
      result.push({
        id: mkId(), section: "Civil",
        description: cs.name, unit: "EA",
        quantity: cs.pins.length, unitCost: sessionUnitCost(cs), extCost: sessionExtCost(cs), notes: "",
        editable: false, sourceKey: `count-civil-${cs.id}`,
      });
    });

    // Commercial: BOM materials
    assemblyState.materials.forEach((m, idx) => {
      result.push({
        id: mkId(), section: "Commercial",
        description: m.description, unit: m.unit,
        quantity: m.quantity, unitCost: m.unitCost,
        extCost: parseFloat((m.unitCost * m.quantity).toFixed(2)), notes: "",
        editable: true, sourceKey: `commercial-${idx}`,
      });
    });
    (assemblyState.countSessions ?? []).filter((cs) => cs.pins.length > 0).forEach((cs) => {
      result.push({
        id: mkId(), section: "Commercial",
        description: cs.name, unit: "EA",
        quantity: cs.pins.length, unitCost: sessionUnitCost(cs), extCost: sessionExtCost(cs), notes: "",
        editable: false, sourceKey: `count-commercial-${cs.id}`,
      });
    });

    // Residential: room materials
    roomState.materials.forEach((m, idx) => {
      result.push({
        id: mkId(), section: "Residential",
        description: m.description, unit: m.unit,
        quantity: m.quantity, unitCost: null, extCost: null, notes: "",
        editable: true, sourceKey: `residential-${idx}`,
      });
    });
    (roomState.countSessions ?? []).filter((cs) => cs.pins.length > 0).forEach((cs) => {
      result.push({
        id: mkId(), section: "Residential",
        description: cs.name, unit: "EA",
        quantity: cs.pins.length, unitCost: sessionUnitCost(cs), extCost: sessionExtCost(cs), notes: "",
        editable: false, sourceKey: `count-residential-${cs.id}`,
      });
    });

    return result;
  }, [civilState, assemblyState, roomState]);

  const [rows, setRows] = useState<MaterialRow[]>(() => buildRows());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuf, setEditBuf] = useState<Partial<MaterialRow>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Labor editing state (local buf, persisted value lives in context)
  const [editingLabor, setEditingLabor] = useState(false);
  const [laborBuf, setLaborBuf] = useState({ hours: laborHours, rate: laborRate });

  // Markup editing state
  const [editingMarkup, setEditingMarkup] = useState(false);
  const [markupBuf, setMarkupBuf] = useState(markupPct);

  // Derived totals
  const totalMat = rows.reduce((s, r) => s + (r.extCost ?? calcExtCost(r) ?? 0), 0);
  const laborTotal = laborHours * laborRate;
  const subtotal = totalMat + laborTotal;
  const markupAmt = subtotal * (markupPct / 100);
  const grandTotal = subtotal + markupAmt;

  // ── Sync edits back to AppContext ────────────────────────────────────────────
  const syncToContext = useCallback((updatedRows: MaterialRow[]) => {
    const resRows = updatedRows.filter((r) => r.sourceKey?.startsWith("residential-") && !r.sourceKey.includes("count"));
    if (resRows.length > 0) {
      const updatedMaterials = [...(roomState.materials ?? [])];
      resRows.forEach((row) => {
        const idx = parseInt(row.sourceKey!.split("-")[1]);
        if (!isNaN(idx) && updatedMaterials[idx]) {
          updatedMaterials[idx] = { ...updatedMaterials[idx], quantity: row.quantity };
        }
      });
      setRoomState({ ...roomState, materials: updatedMaterials });
    }

    const comRows = updatedRows.filter((r) => r.sourceKey?.startsWith("commercial-") && !r.sourceKey.includes("count"));
    if (comRows.length > 0) {
      const updatedMaterials = [...(assemblyState.materials ?? [])];
      comRows.forEach((row) => {
        const idx = parseInt(row.sourceKey!.split("-")[1]);
        if (!isNaN(idx) && updatedMaterials[idx]) {
          updatedMaterials[idx] = {
            ...updatedMaterials[idx],
            quantity: row.quantity,
            unitCost: row.unitCost ?? updatedMaterials[idx].unitCost,
          };
        }
      });
      setAssemblyState({ ...assemblyState, materials: updatedMaterials });
    }
  }, [roomState, assemblyState, setRoomState, setAssemblyState]);

  // ── Row editing ──────────────────────────────────────────────────────────────
  const startEdit = (row: MaterialRow) => {
    setEditingId(row.id);
    setEditBuf({ description: row.description, unit: row.unit, quantity: row.quantity, unitCost: row.unitCost, notes: row.notes });
  };

  const commitEdit = (id: string) => {
    let updatedRows: MaterialRow[] = [];
    setRows((prev) => {
      updatedRows = prev.map((r) => {
        if (r.id !== id) return r;
        const qty = Number(editBuf.quantity) || r.quantity;
        const uc = editBuf.unitCost != null ? Number(editBuf.unitCost) : r.unitCost;
        const ext = uc != null ? parseFloat((uc * qty).toFixed(2)) : null;
        return { ...r, description: String(editBuf.description ?? r.description), unit: String(editBuf.unit ?? r.unit), quantity: qty, unitCost: uc, extCost: ext, notes: String(editBuf.notes ?? r.notes ?? "") };
      });
      return updatedRows;
    });
    setEditingId(null);
    setEditBuf({});
    setTimeout(() => syncToContext(updatedRows), 0);
  };

  const cancelEdit = () => { setEditingId(null); setEditBuf({}); };

  // ── Add custom row ───────────────────────────────────────────────────────────
  const addRow = () => {
    const newRow: MaterialRow = { id: mkId(), section: "Custom", description: "New item", unit: "EA", quantity: 1, unitCost: null, extCost: null, notes: "", editable: true };
    setRows((prev) => [...prev, newRow]);
    setEditingId(newRow.id);
    setEditBuf({ description: "New item", unit: "EA", quantity: 1, unitCost: null, notes: "" });
  };

  // ── Delete row ───────────────────────────────────────────────────────────────
  const deleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
    toast.info("Row removed.");
  };

  // ── Print ────────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    injectPrintStyle();
    window.print();
  };

  // ── Export ───────────────────────────────────────────────────────────────────
  const projectLabel = [activeCivilProject.name, activeCommercialProject.name, activeResidentialProject.name].filter(Boolean).join(" / ");
  const handleExportCSV = () => exportCSVFromRows(rows, laborHours, laborRate, markupPct, projectLabel);
  const handleExportPDF = () => exportPDFFromRows(rows, laborHours, laborRate, markupPct, projectLabel);

  const sections = Array.from(new Set(rows.map((r) => r.section)));

  return (
    <div id="bp-print-root" className="flex flex-col h-full bg-background overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 bg-card no-print">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Back</span>
        </button>
        <div className="w-px h-5 bg-border" />
        <h1 className="text-base font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Material List</h1>
        {projectLabel && <span className="text-xs text-muted-foreground font-mono truncate">— {projectLabel}</span>}
        <div className="ml-auto flex items-center gap-2">
          {/* Grand total badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#F5C518]/10 border border-[#F5C518]/30">
            <span className="text-[10px] text-muted-foreground font-mono">TOTAL</span>
            <span className="text-sm font-bold text-[#F5C518] font-mono">${grandTotal.toFixed(2)}</span>
          </div>
          {/* Add row */}
          <button onClick={addRow} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/40 border border-border text-xs text-muted-foreground hover:text-foreground hover:border-[#F5C518]/40 transition-all" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <Plus size={13} />Add Row
          </button>
          {/* Print */}
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/40 border border-border text-xs text-muted-foreground hover:text-foreground hover:border-[#F5C518]/40 transition-all" style={{ fontFamily: "'Space Grotesk', sans-serif" }} title="Print material list">
            <Printer size={13} />Print
          </button>
          {/* Export CSV */}
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/40 border border-border text-xs text-muted-foreground hover:text-foreground hover:border-[#F5C518]/40 transition-all" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <FileSpreadsheet size={13} className="text-[#F5C518]" />CSV
          </button>
          {/* Export PDF */}
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#F5C518] text-black text-xs font-semibold hover:bg-[#e0b315] transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <FileText size={13} />PDF
          </button>
        </div>
      </header>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <FileText size={40} className="opacity-30" />
            <p className="text-sm">No materials yet. Add runs, assemblies, or count sessions in the project tabs.</p>
            <button onClick={addRow} className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#F5C518] text-black text-sm font-semibold hover:bg-[#e0b315] transition-colors">
              <Plus size={14} />Add Custom Row
            </button>
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted/30 border-b border-border">
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium w-24">Section</th>
                <th className="text-left px-3 py-2.5 text-muted-foreground font-medium">Description</th>
                <th className="text-center px-3 py-2.5 text-muted-foreground font-medium w-16">Unit</th>
                <th className="text-right px-3 py-2.5 text-muted-foreground font-medium w-16">Qty</th>
                <th className="text-right px-3 py-2.5 text-muted-foreground font-medium w-20">Unit $</th>
                <th className="text-right px-3 py-2.5 text-muted-foreground font-medium w-24">Ext $</th>
                <th className="text-left px-3 py-2.5 text-muted-foreground font-medium">Notes</th>
                <th className="w-14 px-2 py-2.5 no-print" />
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => {
                const sectionRows = rows.filter((r) => r.section === section);
                const sectionTotal = sectionRows.reduce((s, r) => s + (r.extCost ?? calcExtCost(r) ?? 0), 0);
                return (
                  <>
                    <tr key={`sec-${section}`} className="bg-muted/20 border-b border-border/50">
                      <td colSpan={6} className="px-4 py-1.5 text-[10px] font-semibold text-[#F5C518] uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{section}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-[10px] text-muted-foreground">{sectionTotal > 0 ? `$${sectionTotal.toFixed(2)}` : ""}</td>
                      <td className="no-print" />
                    </tr>
                    {sectionRows.map((row, i) => {
                      const isEditing = editingId === row.id;
                      const displayExt = row.extCost ?? calcExtCost(row);
                      return (
                        <tr key={row.id} className={cn("border-b border-border/30 transition-colors", i % 2 === 0 ? "bg-background" : "bg-muted/5", isEditing ? "bg-[#F5C518]/5" : "hover:bg-muted/10")}>
                          <td className="px-4 py-2" />
                          {/* Description */}
                          <td className="px-3 py-2 text-foreground">
                            {isEditing ? (
                              <input autoFocus value={String(editBuf.description ?? "")} onChange={(e) => setEditBuf((b) => ({ ...b, description: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") commitEdit(row.id); if (e.key === "Escape") cancelEdit(); }} className="w-full bg-transparent border-b border-[#F5C518] text-xs text-foreground outline-none font-mono" />
                            ) : (
                              <span className="cursor-text hover:text-[#F5C518] transition-colors" onClick={() => startEdit(row)} title="Click to edit">{row.description}</span>
                            )}
                          </td>
                          {/* Unit */}
                          <td className="px-3 py-2 text-center font-mono text-muted-foreground">
                            {isEditing ? (
                              <input value={String(editBuf.unit ?? "")} onChange={(e) => setEditBuf((b) => ({ ...b, unit: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") commitEdit(row.id); if (e.key === "Escape") cancelEdit(); }} className="w-12 bg-transparent border-b border-[#F5C518] text-xs text-center text-foreground outline-none font-mono" />
                            ) : (
                              <span onClick={() => startEdit(row)} className="cursor-text">{row.unit}</span>
                            )}
                          </td>
                          {/* Qty */}
                          <td className="px-3 py-2 text-right font-mono font-semibold text-foreground">
                            {isEditing ? (
                              <input type="number" min={0} value={editBuf.quantity ?? ""} onChange={(e) => setEditBuf((b) => ({ ...b, quantity: parseFloat(e.target.value) }))} onKeyDown={(e) => { if (e.key === "Enter") commitEdit(row.id); if (e.key === "Escape") cancelEdit(); }} className="w-14 bg-transparent border-b border-[#F5C518] text-xs text-right text-foreground outline-none font-mono" />
                            ) : (
                              <span onClick={() => startEdit(row)} className="cursor-text">{row.quantity}</span>
                            )}
                          </td>
                          {/* Unit Cost */}
                          <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                            {isEditing ? (
                              <input type="number" min={0} step={0.01} placeholder="0.00" value={editBuf.unitCost ?? ""} onChange={(e) => { const v = parseFloat(e.target.value); setEditBuf((b) => ({ ...b, unitCost: isNaN(v) ? null : v })); }} onKeyDown={(e) => { if (e.key === "Enter") commitEdit(row.id); if (e.key === "Escape") cancelEdit(); }} className="w-16 bg-transparent border-b border-[#F5C518] text-xs text-right text-foreground outline-none font-mono" />
                            ) : (
                              <span onClick={() => startEdit(row)} className="cursor-text">{row.unitCost != null ? `$${row.unitCost.toFixed(2)}` : "—"}</span>
                            )}
                          </td>
                          {/* Ext Cost */}
                          <td className="px-3 py-2 text-right font-mono font-semibold text-[#F5C518]">{displayExt != null ? `$${displayExt.toFixed(2)}` : "—"}</td>
                          {/* Notes */}
                          <td className="px-3 py-2 text-muted-foreground">
                            {isEditing ? (
                              <input value={String(editBuf.notes ?? "")} onChange={(e) => setEditBuf((b) => ({ ...b, notes: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") commitEdit(row.id); if (e.key === "Escape") cancelEdit(); }} placeholder="Spec, model #, supplier…" className="w-full bg-transparent border-b border-[#F5C518] text-xs text-foreground outline-none font-mono" />
                            ) : (
                              <span onClick={() => startEdit(row)} className={cn("cursor-text text-[11px]", row.notes ? "text-muted-foreground" : "text-muted-foreground/30 italic")}>{row.notes || "Add note…"}</span>
                            )}
                          </td>
                          {/* Actions */}
                          <td className="px-2 py-2 no-print">
                            <div className="flex items-center gap-1 justify-end">
                              {isEditing ? (
                                <>
                                  <button onClick={() => commitEdit(row.id)} className="text-[#F5C518] hover:opacity-70 transition-opacity" title="Save (Enter)"><Check size={12} /></button>
                                  <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground transition-colors" title="Cancel (Esc)"><X size={12} /></button>
                                </>
                              ) : (
                                <button onClick={() => setDeletingId(row.id)} className="text-muted-foreground hover:text-destructive transition-colors" title="Remove row"><Trash2 size={11} /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                );
              })}
            </tbody>

            {/* ── Labor row ────────────────────────────────────────────────── */}
            <tbody>
              <tr className="border-t border-border/50 bg-muted/10">
                <td colSpan={8} className="px-4 py-0.5">
                  <div className="flex items-center gap-2 py-2">
                    <HardHat size={13} className="text-[#F5C518] shrink-0" />
                    <span className="text-[10px] font-semibold text-[#F5C518] uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Labor</span>
                    {editingLabor ? (
                      <>
                        <input type="number" min={0} step={0.5} value={laborBuf.hours} onChange={(e) => setLaborBuf((b) => ({ ...b, hours: parseFloat(e.target.value) || 0 }))} className="w-16 bg-transparent border-b border-[#F5C518] text-xs text-right text-foreground outline-none font-mono" placeholder="hrs" />
                        <span className="text-[10px] text-muted-foreground font-mono">hrs @</span>
                        <span className="text-[10px] text-muted-foreground font-mono">$</span>
                        <input type="number" min={0} step={1} value={laborBuf.rate} onChange={(e) => setLaborBuf((b) => ({ ...b, rate: parseFloat(e.target.value) || 0 }))} className="w-16 bg-transparent border-b border-[#F5C518] text-xs text-right text-foreground outline-none font-mono" placeholder="rate" />
                        <span className="text-[10px] text-muted-foreground font-mono">/hr</span>
                        <button onClick={() => { setLaborHours(laborBuf.hours); setLaborRate(laborBuf.rate); setEditingLabor(false); }} className="text-[#F5C518] hover:opacity-70 transition-opacity ml-1" title="Save"><Check size={12} /></button>
                        <button onClick={() => setEditingLabor(false)} className="text-muted-foreground hover:text-foreground transition-colors" title="Cancel"><X size={12} /></button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-mono text-muted-foreground cursor-text hover:text-foreground transition-colors" onClick={() => { setLaborBuf({ hours: laborHours, rate: laborRate }); setEditingLabor(true); }} title="Click to edit labor">
                          {laborHours > 0 ? `${laborHours} hrs @ $${laborRate.toFixed(2)}/hr` : "Click to add labor hours"}
                        </span>
                        {laborHours > 0 && <span className="ml-auto text-sm font-bold font-mono text-[#F5C518]">${laborTotal.toFixed(2)}</span>}
                      </>
                    )}
                  </div>
                </td>
              </tr>

              {/* ── Markup row ───────────────────────────────────────────── */}
              <tr className="border-t border-border/30 bg-muted/5">
                <td colSpan={8} className="px-4 py-0.5">
                  <div className="flex items-center gap-2 py-2">
                    <Percent size={13} className="text-[#F5C518] shrink-0" />
                    <span className="text-[10px] font-semibold text-[#F5C518] uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Markup</span>
                    {editingMarkup ? (
                      <>
                        <input type="number" min={0} max={200} step={0.5} value={markupBuf} onChange={(e) => setMarkupBuf(parseFloat(e.target.value) || 0)} className="w-16 bg-transparent border-b border-[#F5C518] text-xs text-right text-foreground outline-none font-mono" placeholder="%" />
                        <span className="text-[10px] text-muted-foreground font-mono">%</span>
                        <button onClick={() => { setMarkupPct(markupBuf); setEditingMarkup(false); }} className="text-[#F5C518] hover:opacity-70 transition-opacity ml-1" title="Save"><Check size={12} /></button>
                        <button onClick={() => setEditingMarkup(false)} className="text-muted-foreground hover:text-foreground transition-colors" title="Cancel"><X size={12} /></button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-mono text-muted-foreground cursor-text hover:text-foreground transition-colors" onClick={() => { setMarkupBuf(markupPct); setEditingMarkup(true); }} title="Click to set markup %">
                          {markupPct > 0 ? `${markupPct}% on subtotal` : "Click to add markup %"}
                        </span>
                        {markupPct > 0 && <span className="ml-auto text-sm font-bold font-mono text-[#F5C518]">+${markupAmt.toFixed(2)}</span>}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>

            {/* ── Totals footer ─────────────────────────────────────────────── */}
            <tfoot className="sticky bottom-0">
              <tr className="border-t border-border bg-muted/20">
                <td colSpan={5} className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Material Subtotal</td>
                <td className="px-3 py-2 text-right font-mono font-semibold text-foreground text-xs">${totalMat.toFixed(2)}</td>
                <td colSpan={2} />
              </tr>
              {laborHours > 0 && (
                <tr className="border-t border-border/50 bg-muted/10">
                  <td colSpan={5} className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Labor Subtotal</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-foreground text-xs">${laborTotal.toFixed(2)}</td>
                  <td colSpan={2} />
                </tr>
              )}
              {markupPct > 0 && (
                <tr className="border-t border-border/50 bg-muted/10">
                  <td colSpan={5} className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Markup ({markupPct}%)</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-foreground text-xs">+${markupAmt.toFixed(2)}</td>
                  <td colSpan={2} />
                </tr>
              )}
              <tr className="border-t-2 border-[#F5C518]/40 bg-card">
                <td colSpan={5} className="px-4 py-3 text-right text-sm font-bold text-foreground">
                  {(laborHours > 0 || markupPct > 0) ? "Grand Total" : "Total Material Cost"}
                </td>
                <td className="px-3 py-3 text-right font-mono font-bold text-[#F5C518] text-base">${grandTotal.toFixed(2)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ── Delete row confirmation ─────────────────────────────────────────── */}
      {deletingId && (() => {
        const row = rows.find((r) => r.id === deletingId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
              <h3 className="font-semibold text-foreground mb-2">Remove Row?</h3>
              <p className="text-sm text-muted-foreground mb-5">Remove <span className="font-medium text-foreground">"{row?.description}"</span> from the material list?</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeletingId(null)} className="px-4 py-2 text-sm rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                <button onClick={() => deleteRow(deletingId)} className="px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity font-medium">Remove</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
