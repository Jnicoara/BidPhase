/**
 * BidPhase — Global Floating Export Button
 *
 * Provides two export formats via a small dropdown:
 *   1. CSV  — flat spreadsheet for supplier ordering / data import
 *   2. PDF  — formatted Bill of Materials for printing / emailing
 *
 * Both exports aggregate materials from all three active projects.
 * Civil export reads RunItem[] from civilState.runs (fully typed — no casts).
 *
 * Design: Safety Yellow (#F5C518) fixed bottom-right button with a
 * slide-up dropdown that reveals CSV and PDF options.
 */
import { useState, useRef, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import type { RunItem } from "@/contexts/AppContext";
import { toast } from "sonner";
import { Download, FileText, FileSpreadsheet, ChevronUp } from "lucide-react";
import { jsPDF } from "jspdf";

// ─── Shared data helpers ──────────────────────────────────────────────────────

/** Fitting id → human-readable label (in sync with FITTING_TYPES in AppContext.tsx) */
const FITTING_LABELS: Record<string, string> = {
  connector: "Connectors",
  coupling:  "Couplings",
  lb:        "LBs",
  elbow90:   "90° Elbows",
  elbow45:   "45° Elbows",
  sweep:     "Sweeps",
  offset:    "Offsets",
};

function conductorSpec(run: RunItem): string {
  const mat = run.conductorMaterial ?? "CU";
  const sz  = run.conductorSize ?? "12";
  return `#${sz} AWG ${mat === "CU" ? "Cu" : "Al"}`;
}

function calcSticks(feet: number): number { return Math.ceil(feet / 10); }
function calcWire(feet: number, conductors: number): number {
  return parseFloat((feet * conductors * 1.1).toFixed(1));
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function escapeCSV(val: string | number): string {
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCSV(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCSV).join(",")).join("\n");
}

function exportCSV(
  runs: RunItem[],
  assemblyState: ReturnType<typeof useApp>["assemblyState"],
  roomState: ReturnType<typeof useApp>["roomState"],
  civilName: string,
  commercialName: string,
  residentialName: string,
): void {
  const rows: string[][] = [];

  rows.push(["BidPhase — Material Export", "", "", "", "", "", "", "", ""]);
  rows.push([`Generated: ${new Date().toLocaleString()}`, "", "", "", "", "", "", "", ""]);
  rows.push([]);

  // Section 1: Civil
  if (runs.length > 0) {
    rows.push([`SECTION: Civil & Underground — ${civilName}`, "", "", "", "", "", "", "", ""]);
    rows.push(["Run Name", "Page", "Conduit Type", "Conduit Size", "Distance (ft)", "Pipe Sticks", "Wire (ft w/ 10% slack)", "Conductors", "Conductor Spec"]);

    for (const run of runs) {
      const sticks = calcSticks(run.feet);
      const wire   = calcWire(run.feet, run.conductors);
      rows.push([
        run.name,
        run.pageNumber != null ? String(run.pageNumber) : "",
        run.conduitType ?? "EMT",
        `${run.conduitSize}"`,
        String(run.feet),
        String(sticks),
        String(wire),
        String(run.conductors),
        conductorSpec(run),
      ]);
      const hasFittings = Object.values(run.fittings).some((v) => v > 0);
      if (hasFittings) {
        rows.push(["  Fittings:", "", "", "", "", "", "", "", ""]);
        for (const [key, count] of Object.entries(run.fittings)) {
          if (count > 0) rows.push([`    ${FITTING_LABELS[key] ?? key}`, "EA", String(count), "", "", "", "", "", ""]);
        }
      }
    }

    const totalSticks = runs.reduce((a, r) => a + calcSticks(r.feet), 0);
    const totalWire   = runs.reduce((a, r) => a + calcWire(r.feet, r.conductors), 0);
    rows.push(["TOTAL", "", "", "", "", String(totalSticks), String(parseFloat(totalWire.toFixed(1))), "", ""]);
    rows.push([]);
  }

  // Section 2: Commercial
  if (assemblyState.materials.length > 0) {
    rows.push([`SECTION: Commercial — ${commercialName}`, "", "", "", "", "", "", "", ""]);
    rows.push([`Assembly: ${assemblyState.assemblyId} × ${assemblyState.quantity}`, "", "", "", "", "", "", "", ""]);
    rows.push(["Description", "Unit", "Quantity", "Unit Cost", "Ext. Cost", "", "", "", ""]);
    for (const m of assemblyState.materials) {
      rows.push([m.description, m.unit, String(m.quantity), `$${m.unitCost.toFixed(2)}`, `$${(m.unitCost * m.quantity).toFixed(2)}`, "", "", "", ""]);
    }
    rows.push(["Total Labor Hours", "HRS", String(assemblyState.totalLaborHours), "", "", "", "", "", ""]);
    rows.push([]);
  }

  // Section 3: Residential
  if (roomState.materials.length > 0) {
    rows.push([`SECTION: Residential — ${residentialName}`, "", "", "", "", "", "", "", ""]);
    rows.push([`Room: ${roomState.roomId}`, "", "", "", "", "", "", "", ""]);
    rows.push(["Description", "Unit", "Quantity", "", "", "", "", "", ""]);
    for (const m of roomState.materials) {
      rows.push([m.description, m.unit, String(m.quantity), "", "", "", "", "", ""]);
    }
    rows.push([]);
  }

  if (rows.length <= 3) {
    toast.error("No data to export. Open a project and add runs or assemblies first.");
    return;
  }

  const csv  = buildCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `BidPhase_Export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success("Material list exported as CSV.");
}

// ─── PDF export ───────────────────────────────────────────────────────────────

/**
 * Generates a formatted Bill of Materials PDF using jsPDF.
 *
 * Layout:
 *   - Cover header with BidPhase branding + generation timestamp
 *   - One section per tab (Civil / Commercial / Residential)
 *   - Civil: table with run rows + fittings sub-rows + project totals
 *   - Commercial: assembly details + materials table
 *   - Residential: room materials table
 *   - Page numbers in footer
 */
function exportPDF(
  runs: RunItem[],
  assemblyState: ReturnType<typeof useApp>["assemblyState"],
  roomState: ReturnType<typeof useApp>["roomState"],
  civilName: string,
  commercialName: string,
  residentialName: string,
): void {
  const hasData =
    runs.length > 0 ||
    assemblyState.materials.length > 0 ||
    roomState.materials.length > 0;

  if (!hasData) {
    toast.error("No data to export. Open a project and add runs or assemblies first.");
    return;
  }

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const PW = doc.internal.pageSize.getWidth();   // 612
  const PH = doc.internal.pageSize.getHeight();  // 792
  const ML = 48;   // margin left
  const MR = 48;   // margin right
  const CW = PW - ML - MR;  // content width
  const dateStr = new Date().toLocaleString();

  // ── Color palette ────────────────────────────────────────────────────────
  const YELLOW  = [245, 197, 24]  as [number, number, number];  // #F5C518
  const DARK    = [18, 18, 18]    as [number, number, number];  // near-black
  const MID     = [60, 60, 60]    as [number, number, number];
  const LIGHT   = [120, 120, 120] as [number, number, number];
  const RULE    = [220, 220, 220] as [number, number, number];
  const ROWALT  = [248, 248, 248] as [number, number, number];

  let y = 0;
  let pageNum = 1;

  // ── Page management ──────────────────────────────────────────────────────
  function addPage() {
    drawFooter();
    doc.addPage();
    pageNum++;
    y = 56;
  }

  function checkY(needed: number) {
    if (y + needed > PH - 56) addPage();
  }

  function drawFooter() {
    doc.setFontSize(8);
    doc.setTextColor(...LIGHT);
    doc.text(`BidPhase — Material Export  ·  Page ${pageNum}`, ML, PH - 24);
    doc.text(dateStr, PW - MR, PH - 24, { align: "right" });
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.5);
    doc.line(ML, PH - 36, PW - MR, PH - 36);
  }

  // ── Cover header ─────────────────────────────────────────────────────────
  // Yellow accent bar
  doc.setFillColor(...YELLOW);
  doc.rect(0, 0, PW, 6, "F");

  y = 48;
  doc.setFontSize(22);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.text("BidPhase", ML, y);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...LIGHT);
  y += 16;
  doc.text("Material Export — Bill of Materials", ML, y);

  doc.setFontSize(9);
  doc.setTextColor(...LIGHT);
  doc.text(dateStr, PW - MR, 48, { align: "right" });

  // Divider
  y += 14;
  doc.setDrawColor(...YELLOW);
  doc.setLineWidth(1.5);
  doc.line(ML, y, PW - MR, y);
  y += 20;

  // ── Section helpers ──────────────────────────────────────────────────────
  function sectionHeader(title: string, subtitle: string) {
    checkY(40);
    doc.setFillColor(...DARK);
    doc.rect(ML, y, CW, 22, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(title, ML + 8, y + 15);
    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...YELLOW);
      doc.text(subtitle, PW - MR - 8, y + 15, { align: "right" });
    }
    y += 28;
  }

  function tableHeader(cols: { label: string; width: number; align?: "left" | "right" }[]) {
    checkY(18);
    doc.setFillColor(...YELLOW);
    doc.rect(ML, y, CW, 16, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    let x = ML + 4;
    for (const col of cols) {
      if (col.align === "right") {
        doc.text(col.label, x + col.width - 4, y + 11, { align: "right" });
      } else {
        doc.text(col.label, x, y + 11);
      }
      x += col.width;
    }
    y += 16;
  }

  function tableRow(
    cols: { label: string; width: number; align?: "left" | "right" }[],
    values: string[],
    isAlt: boolean,
    isSubRow = false,
  ) {
    checkY(14);
    if (isAlt) {
      doc.setFillColor(...ROWALT);
      doc.rect(ML, y, CW, 14, "F");
    }
    doc.setFontSize(isSubRow ? 7 : 8);
    doc.setFont("helvetica", isSubRow ? "italic" : "normal");
    doc.setTextColor(...(isSubRow ? LIGHT : MID));
    let x = ML + 4;
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      const val = values[i] ?? "";
      if (col.align === "right") {
        doc.text(val, x + col.width - 4, y + 10, { align: "right" });
      } else {
        doc.text(val, x, y + 10);
      }
      x += col.width;
    }
    y += 14;
  }

  function totalsRow(label: string, values: string[], cols: { width: number }[]) {
    checkY(16);
    doc.setFillColor(235, 235, 235);
    doc.rect(ML, y, CW, 16, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    let x = ML + 4;
    doc.text(label, x, y + 11);
    x += cols[0].width;
    for (let i = 1; i < cols.length; i++) {
      const val = values[i - 1] ?? "";
      doc.text(val, x + cols[i].width - 4, y + 11, { align: "right" });
      x += cols[i].width;
    }
    y += 16;
  }

  // ── Section 1: Civil & Underground ──────────────────────────────────────
  if (runs.length > 0) {
    sectionHeader("Civil & Underground", civilName);

    const civilCols = [
      { label: "Run Name",     width: 110 },
      { label: "Pg",           width: 24,  align: "right" as const },
      { label: "Type",         width: 38 },
      { label: "Size",         width: 38 },
      { label: "Dist (ft)",    width: 56,  align: "right" as const },
      { label: "Sticks",       width: 44,  align: "right" as const },
      { label: "Wire (ft)",    width: 56,  align: "right" as const },
      { label: "Cond.",        width: 36,  align: "right" as const },
      { label: "Conductor Spec", width: CW - 402 },
    ];

    tableHeader(civilCols);

    let totalSticks = 0;
    let totalWire   = 0;
    let rowIdx      = 0;

    for (const run of runs) {
      const sticks = calcSticks(run.feet);
      const wire   = calcWire(run.feet, run.conductors);
      totalSticks += sticks;
      totalWire   += wire;

      tableRow(
        civilCols,
        [
          run.name,
          run.pageNumber != null ? String(run.pageNumber) : "",
          run.conduitType ?? "EMT",
          `${run.conduitSize}"`,
          run.feet.toFixed(1),
          String(sticks),
          wire.toFixed(1),
          String(run.conductors),
          conductorSpec(run),
        ],
        rowIdx % 2 === 1,
      );
      rowIdx++;

      // Fittings sub-rows
      for (const [key, count] of Object.entries(run.fittings)) {
        if (count > 0) {
          tableRow(
            civilCols,
            [`  ↳ ${FITTING_LABELS[key] ?? key}`, "", "", "", "", String(count), "", "", ""],
            rowIdx % 2 === 1,
            true,
          );
          rowIdx++;
        }
      }
    }

    totalsRow("TOTAL", [String(totalSticks), totalWire.toFixed(1)], [
      { width: 110 }, { width: 24 }, { width: 38 }, { width: 38 }, { width: 56 }, { width: 44 }, { width: 56 },
    ]);

    y += 16;
  }

  // ── Section 2: Commercial Assembly ──────────────────────────────────────
  if (assemblyState.materials.length > 0) {
    checkY(60);
    sectionHeader("Commercial Assembly", commercialName);

    // Assembly info row
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MID);
    doc.text(`Assembly: ${assemblyState.assemblyId}  ×  ${assemblyState.quantity}`, ML + 4, y + 10);
    y += 20;

    const commCols = [
      { label: "Description",  width: CW - 220 },
      { label: "Unit",         width: 50 },
      { label: "Qty",          width: 50,  align: "right" as const },
      { label: "Unit Cost",    width: 60,  align: "right" as const },
      { label: "Ext. Cost",    width: 60,  align: "right" as const },
    ];

    tableHeader(commCols);

    let totalExtCost = 0;
    assemblyState.materials.forEach((m, i) => {
      const ext = m.unitCost * m.quantity;
      totalExtCost += ext;
      tableRow(
        commCols,
        [m.description, m.unit, String(m.quantity), `$${m.unitCost.toFixed(2)}`, `$${ext.toFixed(2)}`],
        i % 2 === 1,
      );
    });

    totalsRow("TOTAL", [`$${totalExtCost.toFixed(2)}`], [
      { width: CW - 220 }, { width: 50 }, { width: 50 }, { width: 60 }, { width: 60 },
    ]);

    // Labor hours
    checkY(20);
    y += 6;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(`Total Labor Hours: ${assemblyState.totalLaborHours} hrs`, ML + 4, y + 10);
    y += 20;
  }

  // ── Section 3: Residential ───────────────────────────────────────────────
  if (roomState.materials.length > 0) {
    checkY(60);
    sectionHeader("Residential Rough-In", residentialName);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MID);
    doc.text(`Room: ${roomState.roomId}`, ML + 4, y + 10);
    y += 20;

    const resCols = [
      { label: "Description",  width: CW - 120 },
      { label: "Unit",         width: 60 },
      { label: "Qty",          width: 60, align: "right" as const },
    ];

    tableHeader(resCols);

    roomState.materials.forEach((m, i) => {
      tableRow(resCols, [m.description, m.unit, String(m.quantity)], i % 2 === 1);
    });

    y += 10;
  }

  drawFooter();

  doc.save(`BidPhase_BOM_${new Date().toISOString().slice(0, 10)}.pdf`);
  toast.success("Bill of Materials exported as PDF.");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExportButton() {
  const {
    civilState,
    assemblyState,
    roomState,
    activeCivilProject,
    activeCommercialProject,
    activeResidentialProject,
  } = useApp();

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const runs: RunItem[] = civilState.runs ?? [];

  const handleCSV = () => {
    setOpen(false);
    exportCSV(runs, assemblyState, roomState, activeCivilProject.name, activeCommercialProject.name, activeResidentialProject.name);
  };

  const handlePDF = () => {
    setOpen(false);
    exportPDF(runs, assemblyState, roomState, activeCivilProject.name, activeCommercialProject.name, activeResidentialProject.name);
  };

  return (
    <div
      ref={menuRef}
      className="fixed bottom-20 right-5 md:bottom-6 md:right-6 z-40 flex flex-col items-end gap-2"
    >
      {/* Dropdown menu — slides up when open */}
      {open && (
        <div
          className="flex flex-col gap-1 bg-[#1a1a1a] border border-white/10 rounded-xl
                     shadow-xl shadow-black/40 overflow-hidden
                     animate-in slide-in-from-bottom-2 fade-in duration-150"
        >
          <button
            onClick={handlePDF}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white
                       hover:bg-white/10 transition-colors duration-100 text-left"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <FileText size={15} className="text-[#F5C518]" />
            Export PDF
          </button>
          <div className="h-px bg-white/10 mx-3" />
          <button
            onClick={handleCSV}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white
                       hover:bg-white/10 transition-colors duration-100 text-left"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <FileSpreadsheet size={15} className="text-[#F5C518]" />
            Export CSV
          </button>
        </div>
      )}

      {/* Main toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Export Material List"
        className="flex items-center gap-2 px-4 py-3 rounded-full
                   bg-[#F5C518] text-black font-semibold text-sm
                   shadow-lg shadow-[#F5C518]/20
                   hover:bg-[#e0b315] active:scale-95
                   transition-all duration-150"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {open ? <ChevronUp size={16} /> : <Download size={16} />}
        <span className="hidden sm:inline">Export</span>
      </button>
    </div>
  );
}
