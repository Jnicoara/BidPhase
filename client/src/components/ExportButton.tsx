/**
 * HelixBid — Global Floating Export Button
 *
 * Provides two export formats via a small dropdown:
 *   1. CSV  — flat spreadsheet for supplier ordering / data import
 *   2. PDF  — formatted Bill of Materials for printing / emailing
 *
 * PDF flow:
 *   1. User clicks "Export PDF"
 *   2. A modal opens with a short form (job name, contractor name, address)
 *      and a live first-page preview rendered to a <canvas> via jsPDF's
 *      output("datauristring") → <img>.
 *   3. User clicks "Download PDF" to save the file.
 *
 * Both exports aggregate materials from all three active projects.
 * Civil export reads RunItem[] from civilState.runs (fully typed — no casts).
 *
 * Design: Safety Yellow (#F5C518) fixed bottom-right button.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import type { RunItem, CountSession } from "@/contexts/AppContext";
import { toast } from "sonner";
import { Download, FileText, FileSpreadsheet, ChevronUp, X, Printer } from "lucide-react";
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

// ─── Job info type ────────────────────────────────────────────────────────────

export interface JobInfo {
  jobName: string;
  contractorName: string;
  address: string;
}

// ─── PDF builder (pure function — returns jsPDF instance) ─────────────────────

/**
 * Builds the full Bill of Materials PDF document.
 * Accepts optional JobInfo to populate the cover header.
 * Returns the jsPDF instance so callers can either save or render a preview.
 */
function buildPDF(
  runs: RunItem[],
  assemblyState: ReturnType<typeof useApp>["assemblyState"],
  roomState: ReturnType<typeof useApp>["roomState"],
  civilName: string,
  commercialName: string,
  residentialName: string,
  jobInfo: JobInfo,
  civilCountSessions: CountSession[] = [],
  roomCountSessions: CountSession[] = [],
): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const PW = doc.internal.pageSize.getWidth();   // 612
  const PH = doc.internal.pageSize.getHeight();  // 792
  const ML = 48;
  const MR = 48;
  const CW = PW - ML - MR;
  const dateStr = new Date().toLocaleString();

  // ── Color palette ────────────────────────────────────────────────────────
  const YELLOW  = [245, 197, 24]  as [number, number, number];
  const DARK    = [18, 18, 18]    as [number, number, number];
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
    doc.text(`HelixBid — Bill of Materials  ·  Page ${pageNum}`, ML, PH - 24);
    doc.text(dateStr, PW - MR, PH - 24, { align: "right" });
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.5);
    doc.line(ML, PH - 36, PW - MR, PH - 36);
  }

  // ── Cover header ─────────────────────────────────────────────────────────
  // Top yellow accent bar
  doc.setFillColor(...YELLOW);
  doc.rect(0, 0, PW, 6, "F");

  y = 48;

  // HelixBid brand + "Bill of Materials" subtitle
  doc.setFontSize(22);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.text("HelixBid", ML, y);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...LIGHT);
  y += 16;
  doc.text("Bill of Materials", ML, y);

  // Date top-right
  doc.setFontSize(9);
  doc.setTextColor(...LIGHT);
  doc.text(dateStr, PW - MR, 48, { align: "right" });

  // ── Job / contractor info block ──────────────────────────────────────────
  // Rendered to the right of the HelixBid brand, or below if fields are filled
  const hasJobInfo = jobInfo.jobName || jobInfo.contractorName || jobInfo.address;
  if (hasJobInfo) {
    // Right-aligned info block
    let infoY = 48;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    if (jobInfo.jobName) {
      doc.text(jobInfo.jobName, PW - MR, infoY, { align: "right" });
      infoY += 13;
    }
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MID);
    if (jobInfo.contractorName) {
      doc.text(jobInfo.contractorName, PW - MR, infoY, { align: "right" });
      infoY += 12;
    }
    if (jobInfo.address) {
      // Address may be multi-line — split on newlines or commas
      const lines = jobInfo.address.split(/\n|,\s*/).filter(Boolean);
      for (const line of lines) {
        doc.text(line.trim(), PW - MR, infoY, { align: "right" });
        infoY += 11;
      }
    }
  }

  // Yellow divider
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

  // ── Section 1: Infrastructure ──────────────────────────────────────
  if (runs.length > 0) {
    sectionHeader("Infrastructure", civilName);

    const civilCols = [
      { label: "Run Name",       width: 110 },
      { label: "Pg",             width: 24,  align: "right" as const },
      { label: "Type",           width: 38 },
      { label: "Size",           width: 38 },
      { label: "Dist (ft)",      width: 56,  align: "right" as const },
      { label: "Sticks",         width: 44,  align: "right" as const },
      { label: "Wire (ft)",      width: 56,  align: "right" as const },
      { label: "Cond.",          width: 36,  align: "right" as const },
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
      { width: 110 }, { width: 24 }, { width: 38 }, { width: 38 },
      { width: 56 }, { width: 44 }, { width: 56 },
    ]);
    y += 16;
    // Civil count sessions appended after run totals
    const civilActiveSessions = civilCountSessions.filter(cs => cs.pins.length > 0);
    if (civilActiveSessions.length > 0) {
      checkY(40);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...MID);
      doc.text("Count Sessions:", ML + 4, y + 10);
      y += 16;
      const csCols = [
        { label: "Session", width: CW - 120 },
        { label: "Unit", width: 60 },
        { label: "Qty", width: 60, align: "right" as const },
      ];
      tableHeader(csCols);
      civilActiveSessions.forEach((cs, i) => {
        tableRow(csCols, [cs.name, "EA", String(cs.pins.length)], i % 2 === 1);
      });
      y += 10;
    }
  }
  // ── Section 2: Commercial Assembly ──────────────────────────────────────
  if (assemblyState.materials.length > 0) {
    checkY(60);
    sectionHeader("Commercial Assembly", commercialName);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MID);
    doc.text(`Assembly: ${assemblyState.assemblyId}  ×  ${assemblyState.quantity}`, ML + 4, y + 10);
    y += 20;

    const commCols = [
      { label: "Description", width: CW - 220 },
      { label: "Unit",        width: 50 },
      { label: "Qty",         width: 50,  align: "right" as const },
      { label: "Unit Cost",   width: 60,  align: "right" as const },
      { label: "Ext. Cost",   width: 60,  align: "right" as const },
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

    checkY(20);
    y += 6;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(`Total Labor Hours: ${assemblyState.totalLaborHours} hrs`, ML + 4, y + 10);
    y += 20;
  }

  // ── Section 2b: Count Summary ─────────────────────────────────────────────
  const countSessions = assemblyState.countSessions ?? [];
  const activeSessions = countSessions.filter((cs) => cs.pins.length > 0);
  if (activeSessions.length > 0) {
    checkY(60);
    sectionHeader("Unit Count", commercialName);

    const countCols = [
      { label: "Session Name",  width: CW - 200 },
      { label: "Icon",          width: 60 },
      { label: "Count",         width: 50,  align: "right" as const },
      { label: "Unit Cost",     width: 60,  align: "right" as const },
      { label: "Ext. Cost",     width: 60,  align: "right" as const },
    ];

    tableHeader(countCols);

    let countExtTotal = 0;
    activeSessions.forEach((cs, i) => {
      const ext = cs.unitCost != null ? cs.unitCost * cs.pins.length : null;
      if (ext != null) countExtTotal += ext;

      // Draw color swatch dot before the session name
      const rowY = y + 8;
      const dotX = ML + 4;
      const r = parseInt(cs.color.slice(1, 3), 16);
      const g = parseInt(cs.color.slice(3, 5), 16);
      const b = parseInt(cs.color.slice(5, 7), 16);

      if (i % 2 === 1) {
        doc.setFillColor(...ROWALT as [number, number, number]);
        doc.rect(ML, y, CW, 18, "F");
      }

      // Color swatch circle
      doc.setFillColor(r, g, b);
      doc.circle(dotX + 4, rowY + 2, 4, "F");

      // Session name (offset to clear the dot)
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...DARK as [number, number, number]);
      doc.text(cs.name, dotX + 12, rowY + 4);

      // Icon label (abbreviated)
      doc.setTextColor(...MID as [number, number, number]);
      let xOff = ML + (CW - 200);
      doc.text(cs.iconId.replace(/-/g, " "), xOff + 4, rowY + 4);
      xOff += 60;

      // Count
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK as [number, number, number]);
      doc.text(String(cs.pins.length), xOff + 46, rowY + 4, { align: "right" });
      xOff += 50;

      // Unit cost
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MID as [number, number, number]);
      doc.text(cs.unitCost != null ? `$${cs.unitCost.toFixed(2)}` : "—", xOff + 56, rowY + 4, { align: "right" });
      xOff += 60;

      // Ext cost
      doc.setFont("helvetica", "bold");
      doc.setTextColor(ext != null ? DARK[0] : LIGHT[0], ext != null ? DARK[1] : LIGHT[1], ext != null ? DARK[2] : LIGHT[2]);
      doc.text(ext != null ? `$${ext.toFixed(2)}` : "—", xOff + 56, rowY + 4, { align: "right" });

      y += 18;
      checkY(18);
    });

    if (countExtTotal > 0) {
      totalsRow("TOTAL COUNTED", [`$${countExtTotal.toFixed(2)}`], [
        { width: CW - 200 }, { width: 60 }, { width: 50 }, { width: 60 }, { width: 60 },
      ]);
    }
    y += 8;
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
      { label: "Description", width: CW - 120 },
      { label: "Unit",        width: 60 },
      { label: "Qty",         width: 60, align: "right" as const },
    ];

    tableHeader(resCols);
        const resAllRows = [...roomState.materials];
    resAllRows.forEach((m, i) => {
      tableRow(resCols, [m.description, m.unit, String(m.quantity)], i % 2 === 1);
    });
    // Unit Count sessions appended as extra rows
    roomCountSessions.filter(cs => cs.pins.length > 0).forEach((cs, i) => {
      tableRow(resCols, [cs.name + " (Unit Count)", "EA", String(cs.pins.length)], (resAllRows.length + i) % 2 === 1);
    });
    y += 10;
  }
  // ── Civil count sessions (if any, even without runs) ─────────────────────
  const activeCivilSessions = civilCountSessions.filter(cs => cs.pins.length > 0);
  if (runs.length === 0 && activeCivilSessions.length > 0) {
    checkY(60);
    sectionHeader("Civil — Count Sessions", civilName);
    const csCols = [
      { label: "Session", width: CW - 120 },
      { label: "Unit", width: 60 },
      { label: "Qty", width: 60, align: "right" as const },
    ];
    tableHeader(csCols);
    activeCivilSessions.forEach((cs, i) => {
      tableRow(csCols, [cs.name, "EA", String(cs.pins.length)], i % 2 === 1);
    });
    y += 10;
  }
  drawFooter();
  return doc;
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
  civilCountSessions: CountSession[] = [],
  roomCountSessions: CountSession[] = [],
): void {
  const rows: string[][] = [];

  rows.push(["HelixBid — Material Export", "", "", "", "", "", "", "", ""]);
  rows.push([`Generated: ${new Date().toLocaleString()}`, "", "", "", "", "", "", "", ""]);
  rows.push([]);

  if (runs.length > 0) {
    rows.push([`SECTION: Infrastructure — ${civilName}`, "", "", "", "", "", "", "", ""]);
    rows.push(["Run Name", "Page", "Conduit Type", "Conduit Size", "Distance (ft)", "Pipe Sticks", "Wire (ft w/ 10% slack)", "Conductors", "Conductor Spec"]);
    for (const run of runs) {
      rows.push([
        run.name,
        run.pageNumber != null ? String(run.pageNumber) : "",
        run.conduitType ?? "EMT",
        `${run.conduitSize}"`,
        String(run.feet),
        String(calcSticks(run.feet)),
        String(calcWire(run.feet, run.conductors)),
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
    // Unit Count sessions for Civil
    const csvCivilActiveSessions = civilCountSessions.filter((cs) => cs.pins.length > 0);
    if (csvCivilActiveSessions.length > 0) {
      rows.push(["Unit Count", "", "", "", "", "", "", "", ""]);
      for (const cs of csvCivilActiveSessions) {
        const ext = cs.unitCost != null ? `$${(cs.unitCost * cs.pins.length).toFixed(2)}` : "";
        rows.push([cs.name, "EA", String(cs.pins.length), cs.unitCost != null ? `$${cs.unitCost.toFixed(2)}` : "", ext, "", "", "", ""]);
      }
    }
    rows.push([]);
  }

  if (assemblyState.materials.length > 0) {
    rows.push([`SECTION: Commercial — ${commercialName}`, "", "", "", "", "", "", "", ""]);
    rows.push([`Assembly: ${assemblyState.assemblyId} × ${assemblyState.quantity}`, "", "", "", "", "", "", "", ""]);
    rows.push(["Description", "Unit", "Quantity", "Unit Cost", "Ext. Cost", "", "", "", ""]);
    for (const m of assemblyState.materials) {
      rows.push([m.description, m.unit, String(m.quantity), `$${m.unitCost.toFixed(2)}`, `$${(m.unitCost * m.quantity).toFixed(2)}`, "", "", "", ""]);
    }
    rows.push(["Total Labor Hours", "HRS", String(assemblyState.totalLaborHours), "", "", "", "", "", ""]);
    // Unit Count sessions for Commercial
    const csvCommercialActiveSessions = (assemblyState.countSessions ?? []).filter((cs) => cs.pins.length > 0);
    if (csvCommercialActiveSessions.length > 0) {
      rows.push(["Unit Count", "", "", "", "", "", "", "", ""]);
      for (const cs of csvCommercialActiveSessions) {
        const ext = cs.unitCost != null ? `$${(cs.unitCost * cs.pins.length).toFixed(2)}` : "";
        rows.push([cs.name, "EA", String(cs.pins.length), cs.unitCost != null ? `$${cs.unitCost.toFixed(2)}` : "", ext, "", "", "", ""]);
      }
    }
    rows.push([]);
  }

  if (roomState.materials.length > 0) {
    rows.push([`SECTION: Residential — ${residentialName}`, "", "", "", "", "", "", "", ""]);
    rows.push([`Room: ${roomState.roomId}`, "", "", "", "", "", "", "", ""]);
    rows.push(["Description", "Unit", "Quantity", "", "", "", "", "", ""]);
    for (const m of roomState.materials) {
      rows.push([m.description, m.unit, String(m.quantity), "", "", "", "", "", ""]);
    }
    // Unit Count sessions for Residential
    const csvResActiveSessions = roomCountSessions.filter((cs) => cs.pins.length > 0);
    if (csvResActiveSessions.length > 0) {
      rows.push(["Unit Count", "", "", "", "", "", "", "", ""]);
      for (const cs of csvResActiveSessions) {
        const ext = cs.unitCost != null ? `$${(cs.unitCost * cs.pins.length).toFixed(2)}` : "";
        rows.push([cs.name, "EA", String(cs.pins.length), cs.unitCost != null ? `$${cs.unitCost.toFixed(2)}` : "", ext, "", "", "", ""]);
      }
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
  a.download = `HelixBid_Export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success("Material list exported as CSV.");
}

// ─── Print Preview Modal ──────────────────────────────────────────────────────

/**
 * Modal that shows:
 *   - A short form for job name, contractor name, and address
 *   - A live preview image of the first page (regenerated on form change)
 *   - A "Download PDF" button that saves the full document
 */
function PrintPreviewModal({
  runs,
  assemblyState,
  roomState,
  civilName,
  commercialName,
  residentialName,
  civilCountSessions = [],
  roomCountSessions = [],
  onClose,
}: {
  runs: RunItem[];
  assemblyState: ReturnType<typeof useApp>["assemblyState"];
  roomState: ReturnType<typeof useApp>["roomState"];
  civilName: string;
  commercialName: string;
  residentialName: string;
  civilCountSessions?: CountSession[];
  roomCountSessions?: CountSession[];
  onClose: () => void;
}) {
  const [jobInfo, setJobInfo] = useState<JobInfo>({
    jobName: "",
    contractorName: "",
    address: "",
  });
  // Data URI of the first page preview image
  const [previewSrc, setPreviewSrc] = useState<string>("");

  // Regenerate preview whenever jobInfo changes (debounced 300ms)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const regeneratePreview = useCallback(() => {
    const doc = buildPDF(runs, assemblyState, roomState, civilName, commercialName, residentialName, jobInfo, civilCountSessions, roomCountSessions);
    // jsPDF can output the first page as a data URI for <img> preview
    const dataUri = doc.output("datauristring");
    setPreviewSrc(dataUri);
  }, [runs, assemblyState, roomState, civilName, commercialName, residentialName, jobInfo, civilCountSessions, roomCountSessions]);

  // Initial render + debounced re-render on form change
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(regeneratePreview, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [regeneratePreview]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleDownload = () => {
    const doc = buildPDF(runs, assemblyState, roomState, civilName, commercialName, residentialName, jobInfo, civilCountSessions, roomCountSessions);
    const jobSlug = jobInfo.jobName
      ? `_${jobInfo.jobName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "")}`
      : "";
    doc.save(`HelixBid_BOM${jobSlug}_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("Bill of Materials downloaded.");
    onClose();
  };

  const field = (
    label: string,
    key: keyof JobInfo,
    placeholder: string,
    multiline = false,
  ) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[#999]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          rows={2}
          value={jobInfo[key]}
          onChange={(e) => setJobInfo((p) => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          className="rounded-lg px-3 py-2 text-sm transition-colors resize-none focus:outline-none focus:border-[#F5C518]/60"
          style={{ fontFamily: "'Space Grotesk', sans-serif", background: 'var(--bp-input-bg)', border: '1px solid var(--bp-input-border)', color: 'var(--bp-panel-text)' }}
        />
      ) : (
        <input
          type="text"
          value={jobInfo[key]}
          onChange={(e) => setJobInfo((p) => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          className="rounded-lg px-3 py-2 text-sm transition-colors focus:outline-none focus:border-[#F5C518]/60"
          style={{ fontFamily: "'Space Grotesk', sans-serif", background: 'var(--bp-input-bg)', border: '1px solid var(--bp-input-border)', color: 'var(--bp-panel-text)' }}
        />
      )}
    </div>
  );

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm
                 animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal panel */}
      <div
        className="relative flex flex-col md:flex-row gap-0 rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl mx-4
                   animate-in slide-in-from-bottom-4 fade-in duration-200"
        style={{ maxHeight: "90vh", background: 'var(--bp-panel-bg)', border: '1px solid var(--bp-panel-border)' }}
      >
        {/* ── Left: form ── */}
        <div className="flex flex-col gap-5 p-6 md:w-72 shrink-0 border-r border-white/10 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Export PDF
              </h2>
              <p className="text-xs text-[#777] mt-0.5">Add job details to the header</p>
            </div>
            <button
              onClick={onClose}
              className="text-[#666] hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form fields */}
          {field("Job Name", "jobName", "e.g. Main St. Substation")}
          {field("Contractor / Company", "contractorName", "e.g. Acme Electric Co.")}
          {field("Address", "address", "123 Main St, City, ST 00000", true)}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Download button */}
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
                       bg-[#F5C518] text-black font-semibold text-sm
                       hover:bg-[#e0b315] active:scale-95 transition-all duration-150"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <Printer size={15} />
            Download PDF
          </button>
        </div>

        {/* ── Right: preview ── */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bp-panel-preview-bg)' }}>
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <span className="text-xs font-medium text-[#666]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              First-page preview
            </span>
            <span className="text-xs text-[#444]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Updates as you type
            </span>
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
            {previewSrc ? (
              <img
                src={previewSrc}
                alt="PDF first-page preview"
                className="w-full max-w-[520px] rounded-lg shadow-xl border border-white/5"
                style={{ imageRendering: "crisp-edges" }}
              />
            ) : (
              <div className="flex items-center justify-center h-40 text-[#444] text-sm">
                Generating preview…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ExportButtonProps {
  onOpenMaterialList?: () => void;
}

export default function ExportButton({ onOpenMaterialList }: ExportButtonProps = {}) {
  const {
    civilState,
    assemblyState,
    roomState,
    activeCivilProject,
    activeCommercialProject,
    activeResidentialProject,
  } = useApp();

  const [open, setOpen]           = useState(false);
  const [showPreview, setShowPreview] = useState(false);
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

  const hasData =
    runs.length > 0 ||
    assemblyState.materials.length > 0 ||
    roomState.materials.length > 0;

  const handleCSV = () => {
    setOpen(false);
    exportCSV(runs, assemblyState, roomState, activeCivilProject.name, activeCommercialProject.name, activeResidentialProject.name, civilState.countSessions ?? [], roomState.countSessions ?? []);
  };

  const handlePDFClick = () => {
    setOpen(false);
    if (!hasData) {
      toast.error("No data to export. Open a project and add runs or assemblies first.");
      return;
    }
    setShowPreview(true);
  };

  return (
    <>
      {/* Print Preview Modal */}
      {showPreview && (
        <PrintPreviewModal
          runs={runs}
          assemblyState={assemblyState}
          roomState={roomState}
          civilName={activeCivilProject.name}
          commercialName={activeCommercialProject.name}
          residentialName={activeResidentialProject.name}
          civilCountSessions={civilState.countSessions ?? []}
          roomCountSessions={roomState.countSessions ?? []}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Floating export button + dropdown */}
      <div
        ref={menuRef}
        className="fixed bottom-20 right-5 md:bottom-6 md:right-6 z-40 flex flex-col items-end gap-2"
      >
        {/* Dropdown menu */}
        {open && (
          <div
            className="flex flex-col gap-1 rounded-xl shadow-xl overflow-hidden
                       animate-in slide-in-from-bottom-2 fade-in duration-150"
            style={{ background: 'var(--bp-panel-bg-2)', border: '1px solid var(--bp-panel-border)' }}
          >
            <button
              onClick={handlePDFClick}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-100 text-left"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--bp-panel-text)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bp-panel-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <FileText size={15} className="text-[#F5C518]" />
              Export PDF
            </button>
            <div className="h-px mx-3" style={{ background: 'var(--bp-panel-divider)' }} />
            <button
              onClick={handleCSV}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-100 text-left"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--bp-panel-text)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bp-panel-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <FileSpreadsheet size={15} className="text-[#F5C518]" />
              Export CSV
            </button>
            {onOpenMaterialList && (
              <>
                <div className="h-px mx-3" style={{ background: 'var(--bp-panel-divider)' }} />
                <button
                  onClick={() => { setOpen(false); onOpenMaterialList(); }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-100 text-left"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--bp-panel-text)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bp-panel-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <FileText size={15} className="text-blue-400" />
                  Labor & Material
                </button>
              </>
            )}
          </div>
        )}

        {/* Main toggle button */}
        <button
          onClick={() => setOpen((v) => !v)}
          title="Export Labor & Material"
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
    </>
  );
}
