/**
 * BidPhase — MaterialListPage
 *
 * Full-screen editable material list view. Accessible via the "Material List"
 * button in the Export dropdown. Shows all materials from all three active
 * projects (Civil, Commercial, Residential) with the ability to:
 *   - Edit description, unit, quantity, and unit cost inline
 *   - Add custom rows
 *   - Remove rows
 *   - Export as CSV or PDF
 *
 * Design: Tactical Dark Mode SaaS · Space Grotesk headers
 */
import { useState, useCallback } from "react";
import { ArrowLeft, Plus, Trash2, Download, FileText, FileSpreadsheet, Check, X } from "lucide-react";
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
  editable: boolean; // user-added rows are fully editable
  sourceKey?: string; // for syncing back to context
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

function exportCSVFromRows(rows: MaterialRow[], projectName: string) {
  const header = ["Section", "Description", "Unit", "Qty", "Unit $", "Ext $"];
  const data = rows.map((r) => [
    r.section,
    r.description,
    r.unit,
    String(r.quantity),
    r.unitCost != null ? `$${r.unitCost.toFixed(2)}` : "—",
    r.extCost != null ? `$${r.extCost.toFixed(2)}` : "—",
  ]);
  const totalExt = rows.reduce((s, r) => s + (r.extCost ?? 0), 0);
  data.push(["", "TOTAL", "", "", "", `$${totalExt.toFixed(2)}`]);

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
async function exportPDFFromRows(rows: MaterialRow[], projectName: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });

  const PW = 612, PH = 792;
  const ML = 40, MR = 40, MT = 50;
  const contentW = PW - ML - MR;
  let y = MT;

  // Header
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

  // Table header
  const cols = [
    { label: "Section", x: ML, w: 90 },
    { label: "Description", x: ML + 90, w: 200 },
    { label: "Unit", x: ML + 290, w: 50 },
    { label: "Qty", x: ML + 340, w: 50 },
    { label: "Unit $", x: ML + 390, w: 70 },
    { label: "Ext $", x: ML + 460, w: 72 },
  ];

  doc.setFillColor(40, 40, 40);
  doc.rect(ML, y - 12, contentW, 18, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(200, 200, 200);
  cols.forEach((c) => doc.text(c.label, c.x + 4, y));
  y += 10;

  // Rows
  let lastSection = "";
  let totalExt = 0;
  rows.forEach((row, i) => {
    if (y > PH - 60) {
      doc.addPage();
      y = MT;
    }
    if (row.section !== lastSection) {
      lastSection = row.section;
      y += 6;
      doc.setFillColor(30, 30, 30);
      doc.rect(ML, y - 10, contentW, 14, "F");
      doc.setFontSize(7.5);
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
    doc.text(row.description, cols[1].x + 4, y, { maxWidth: cols[1].w - 6 });
    doc.setTextColor(160, 160, 160);
    doc.text(row.unit, cols[2].x + 4, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 220, 220);
    doc.text(String(row.quantity), cols[3].x + cols[3].w - 4, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 160, 160);
    doc.text(row.unitCost != null ? `$${row.unitCost.toFixed(2)}` : "—", cols[4].x + cols[4].w - 4, y, { align: "right" });
    if (row.extCost != null) {
      totalExt += row.extCost;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(245, 197, 24);
      doc.text(`$${row.extCost.toFixed(2)}`, cols[5].x + cols[5].w - 4, y, { align: "right" });
    } else {
      doc.setTextColor(100, 100, 100);
      doc.text("—", cols[5].x + cols[5].w - 4, y, { align: "right" });
    }
    y += 14;
  });

  // Total row
  y += 4;
  doc.setFillColor(40, 40, 40);
  doc.rect(ML, y - 10, contentW, 18, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(200, 200, 200);
  doc.text("TOTAL MATERIAL COST", cols[1].x + 4, y);
  doc.setTextColor(245, 197, 24);
  doc.text(`$${totalExt.toFixed(2)}`, cols[5].x + cols[5].w - 4, y, { align: "right" });

  doc.save(`BidPhase_MaterialList_${new Date().toISOString().slice(0, 10)}.pdf`);
  toast.success("Material list exported as PDF.");
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
  } = useApp();

  // ── Build initial rows from context ─────────────────────────────────────────
  const buildRows = useCallback((): MaterialRow[] => {
    const result: MaterialRow[] = [];

    // Civil: runs
    const runs = civilState.runs ?? [];
    runs.forEach((run) => {
      result.push({
        id: mkId(),
        section: "Civil",
        description: `Run: ${run.name}`,
        unit: "FT",
        quantity: run.feet ?? 0,
        unitCost: null,
        extCost: null,
        editable: false,
      });
    });
    // Civil: count sessions
    (civilState.countSessions ?? []).filter((cs) => cs.pins.length > 0).forEach((cs) => {
      result.push({
        id: mkId(),
        section: "Civil",
        description: cs.name,
        unit: "EA",
        quantity: cs.pins.length,
        unitCost: sessionUnitCost(cs),
        extCost: sessionExtCost(cs),
        editable: false,
      });
    });

    // Commercial: BOM materials
    assemblyState.materials.forEach((m) => {
      result.push({
        id: mkId(),
        section: "Commercial",
        description: m.description,
        unit: m.unit,
        quantity: m.quantity,
        unitCost: m.unitCost,
        extCost: parseFloat((m.unitCost * m.quantity).toFixed(2)),
        editable: false,
      });
    });
    // Commercial: count sessions
    (assemblyState.countSessions ?? []).filter((cs) => cs.pins.length > 0).forEach((cs) => {
      result.push({
        id: mkId(),
        section: "Commercial",
        description: cs.name,
        unit: "EA",
        quantity: cs.pins.length,
        unitCost: sessionUnitCost(cs),
        extCost: sessionExtCost(cs),
        editable: false,
      });
    });

    // Residential: room materials
    roomState.materials.forEach((m) => {
      result.push({
        id: mkId(),
        section: "Residential",
        description: m.description,
        unit: m.unit,
        quantity: m.quantity,
        unitCost: null,
        extCost: null,
        editable: false,
      });
    });
    // Residential: count sessions
    (roomState.countSessions ?? []).filter((cs) => cs.pins.length > 0).forEach((cs) => {
      result.push({
        id: mkId(),
        section: "Residential",
        description: cs.name,
        unit: "EA",
        quantity: cs.pins.length,
        unitCost: sessionUnitCost(cs),
        extCost: sessionExtCost(cs),
        editable: false,
      });
    });

    return result;
  }, [civilState, assemblyState, roomState]);

  const [rows, setRows] = useState<MaterialRow[]>(() => buildRows());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuf, setEditBuf] = useState<Partial<MaterialRow>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalExt = rows.reduce((s, r) => s + (r.extCost ?? calcExtCost(r) ?? 0), 0);

  // ── Row editing ──────────────────────────────────────────────────────────────
  const startEdit = (row: MaterialRow) => {
    setEditingId(row.id);
    setEditBuf({
      description: row.description,
      unit: row.unit,
      quantity: row.quantity,
      unitCost: row.unitCost,
    });
  };

  const commitEdit = (id: string) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const qty = Number(editBuf.quantity) || r.quantity;
      const uc = editBuf.unitCost != null ? Number(editBuf.unitCost) : r.unitCost;
      const ext = uc != null ? parseFloat((uc * qty).toFixed(2)) : null;
      return {
        ...r,
        description: String(editBuf.description ?? r.description),
        unit: String(editBuf.unit ?? r.unit),
        quantity: qty,
        unitCost: uc,
        extCost: ext,
      };
    }));
    setEditingId(null);
    setEditBuf({});
  };

  const cancelEdit = () => { setEditingId(null); setEditBuf({}); };

  // ── Add custom row ───────────────────────────────────────────────────────────
  const addRow = () => {
    const newRow: MaterialRow = {
      id: mkId(),
      section: "Custom",
      description: "New item",
      unit: "EA",
      quantity: 1,
      unitCost: null,
      extCost: null,
      editable: true,
    };
    setRows((prev) => [...prev, newRow]);
    setEditingId(newRow.id);
    setEditBuf({ description: "New item", unit: "EA", quantity: 1, unitCost: null });
  };

  // ── Delete row ───────────────────────────────────────────────────────────────
  const deleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
    toast.info("Row removed.");
  };

  // ── Export ───────────────────────────────────────────────────────────────────
  const projectLabel = [activeCivilProject.name, activeCommercialProject.name, activeResidentialProject.name]
    .filter(Boolean).join(" / ");

  const handleExportCSV = () => exportCSVFromRows(rows, projectLabel);
  const handleExportPDF = () => exportPDFFromRows(rows, projectLabel);

  // ── Sections for display ─────────────────────────────────────────────────────
  const sections = Array.from(new Set(rows.map((r) => r.section)));

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 bg-card">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Back</span>
        </button>
        <div className="w-px h-5 bg-border" />
        <h1
          className="text-base font-bold text-foreground"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Material List
        </h1>
        {projectLabel && (
          <span className="text-xs text-muted-foreground font-mono truncate">— {projectLabel}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {/* Total */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#F5C518]/10 border border-[#F5C518]/30">
            <span className="text-[10px] text-muted-foreground font-mono">TOTAL</span>
            <span className="text-sm font-bold text-[#F5C518] font-mono">${totalExt.toFixed(2)}</span>
          </div>
          {/* Add row */}
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/40 border border-border text-xs text-muted-foreground hover:text-foreground hover:border-[#F5C518]/40 transition-all"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <Plus size={13} />
            Add Row
          </button>
          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/40 border border-border text-xs text-muted-foreground hover:text-foreground hover:border-[#F5C518]/40 transition-all"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <FileSpreadsheet size={13} className="text-[#F5C518]" />
            CSV
          </button>
          {/* Export PDF */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#F5C518] text-black text-xs font-semibold hover:bg-[#e0b315] transition-colors"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <FileText size={13} />
            PDF
          </button>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <FileText size={40} className="opacity-30" />
            <p className="text-sm">No materials yet. Add runs, assemblies, or count sessions in the project tabs.</p>
            <button
              onClick={addRow}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#F5C518] text-black text-sm font-semibold hover:bg-[#e0b315] transition-colors"
            >
              <Plus size={14} />
              Add Custom Row
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
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium w-24">Ext $</th>
                <th className="w-16 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => {
                const sectionRows = rows.filter((r) => r.section === section);
                const sectionTotal = sectionRows.reduce((s, r) => s + (r.extCost ?? calcExtCost(r) ?? 0), 0);
                return (
                  <>
                    {/* Section header */}
                    <tr key={`sec-${section}`} className="bg-muted/20 border-b border-border/50">
                      <td
                        colSpan={5}
                        className="px-4 py-1.5 text-[10px] font-semibold text-[#F5C518] uppercase tracking-widest"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {section}
                      </td>
                      <td className="px-4 py-1.5 text-right font-mono text-[10px] text-muted-foreground">
                        {sectionTotal > 0 ? `$${sectionTotal.toFixed(2)}` : ""}
                      </td>
                      <td />
                    </tr>

                    {sectionRows.map((row, i) => {
                      const isEditing = editingId === row.id;
                      const displayExt = row.extCost ?? calcExtCost(row);
                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            "border-b border-border/30 transition-colors",
                            i % 2 === 0 ? "bg-background" : "bg-muted/5",
                            isEditing ? "bg-[#F5C518]/5" : "hover:bg-muted/10"
                          )}
                        >
                          {/* Section cell (empty for data rows) */}
                          <td className="px-4 py-2" />

                          {/* Description */}
                          <td className="px-3 py-2 text-foreground">
                            {isEditing ? (
                              <input
                                autoFocus
                                value={String(editBuf.description ?? "")}
                                onChange={(e) => setEditBuf((b) => ({ ...b, description: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === "Enter") commitEdit(row.id); if (e.key === "Escape") cancelEdit(); }}
                                className="w-full bg-transparent border-b border-[#F5C518] text-xs text-foreground outline-none font-mono"
                              />
                            ) : (
                              <span
                                className={cn("cursor-text", row.editable ? "hover:text-[#F5C518] transition-colors" : "")}
                                onClick={() => startEdit(row)}
                                title="Click to edit"
                              >{row.description}</span>
                            )}
                          </td>

                          {/* Unit */}
                          <td className="px-3 py-2 text-center font-mono text-muted-foreground">
                            {isEditing ? (
                              <input
                                value={String(editBuf.unit ?? "")}
                                onChange={(e) => setEditBuf((b) => ({ ...b, unit: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === "Enter") commitEdit(row.id); if (e.key === "Escape") cancelEdit(); }}
                                className="w-12 bg-transparent border-b border-[#F5C518] text-xs text-center text-foreground outline-none font-mono"
                              />
                            ) : (
                              <span onClick={() => startEdit(row)} className="cursor-text">{row.unit}</span>
                            )}
                          </td>

                          {/* Qty */}
                          <td className="px-3 py-2 text-right font-mono font-semibold text-foreground">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                value={editBuf.quantity ?? ""}
                                onChange={(e) => setEditBuf((b) => ({ ...b, quantity: parseFloat(e.target.value) }))}
                                onKeyDown={(e) => { if (e.key === "Enter") commitEdit(row.id); if (e.key === "Escape") cancelEdit(); }}
                                className="w-14 bg-transparent border-b border-[#F5C518] text-xs text-right text-foreground outline-none font-mono"
                              />
                            ) : (
                              <span onClick={() => startEdit(row)} className="cursor-text">{row.quantity}</span>
                            )}
                          </td>

                          {/* Unit Cost */}
                          <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                placeholder="0.00"
                                value={editBuf.unitCost ?? ""}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  setEditBuf((b) => ({ ...b, unitCost: isNaN(v) ? null : v }));
                                }}
                                onKeyDown={(e) => { if (e.key === "Enter") commitEdit(row.id); if (e.key === "Escape") cancelEdit(); }}
                                className="w-16 bg-transparent border-b border-[#F5C518] text-xs text-right text-foreground outline-none font-mono"
                              />
                            ) : (
                              <span onClick={() => startEdit(row)} className="cursor-text">
                                {row.unitCost != null ? `$${row.unitCost.toFixed(2)}` : "—"}
                              </span>
                            )}
                          </td>

                          {/* Ext Cost */}
                          <td className="px-4 py-2 text-right font-mono font-semibold text-[#F5C518]">
                            {displayExt != null ? `$${displayExt.toFixed(2)}` : "—"}
                          </td>

                          {/* Actions */}
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1 justify-end">
                              {isEditing ? (
                                <>
                                  <button onClick={() => commitEdit(row.id)} className="text-[#F5C518] hover:opacity-70 transition-opacity" title="Save (Enter)">
                                    <Check size={12} />
                                  </button>
                                  <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground transition-colors" title="Cancel (Esc)">
                                    <X size={12} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setDeletingId(row.id)}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                  title="Remove row"
                                >
                                  <Trash2 size={11} />
                                </button>
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

            {/* Totals footer */}
            <tfoot className="sticky bottom-0">
              <tr className="border-t-2 border-border bg-card">
                <td colSpan={5} className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                  Total Material Cost
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-[#F5C518] text-sm">
                  ${totalExt.toFixed(2)}
                </td>
                <td />
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
              <p className="text-sm text-muted-foreground mb-5">
                Remove <span className="font-medium text-foreground">"{row?.description}"</span> from the material list?
              </p>
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
