/**
 * BidPhase — Global Floating Export Button
 * Aggregates materials from all three tabs (active projects)
 * Downloads a clean, formatted CSV for supplier ordering
 * Design: Safety Yellow, bottom-right fixed
 */
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { Download } from "lucide-react";

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

export default function ExportButton() {
  const { civilState, assemblyState, roomState, activeCivilProject, activeCommercialProject, activeResidentialProject } = useApp();

  const handleExport = () => {
    const rows: string[][] = [];

    // ── Header ──────────────────────────────────────────────────
    rows.push(["BidPhase — Material Export", "", "", "", "", ""]);
    rows.push([`Generated: ${new Date().toLocaleString()}`, "", "", "", "", ""]);
    rows.push([]);

    // ── Section 1: Civil / Underground (per-run) ─────────────────
    const runs = ((civilState as any).runs ?? []) as Array<{
      id: string;
      name: string;
      feet: number;
      conduitSize: string;
      conductors: number;
      fittings: Record<string, number>;
    }>;

    if (runs.length > 0) {
      rows.push([`SECTION: Civil & Underground — ${activeCivilProject.name}`, "", "", "", "", ""]);
      rows.push(["Run Name", "Conduit Size", "Distance (ft)", "Pipe Sticks", "Wire (ft w/ 10% slack)", "Conductors"]);

      for (const run of runs) {
        const sticks = Math.ceil(run.feet / 10);
        const wire = parseFloat((run.feet * run.conductors * 1.1).toFixed(1));
        rows.push([
          run.name,
          `${run.conduitSize}"`,
          String(run.feet),
          String(sticks),
          String(wire),
          String(run.conductors),
        ]);

        // Fittings sub-rows
        const fittingLabels: Record<string, string> = {
          connector: "Connectors",
          coupling: "Couplings",
          lb: "LBs",
          elbow90: "90° Elbows",
          elbow45: "45° Elbows",
          sweep: "Sweeps",
          tee: "Tees",
          offset: "Offsets",
        };
        const hasFittings = Object.values(run.fittings).some((v) => v > 0);
        if (hasFittings) {
          rows.push(["  Fittings:", "", "", "", "", ""]);
          for (const [key, count] of Object.entries(run.fittings)) {
            if (count > 0) {
              rows.push([`    ${fittingLabels[key] ?? key}`, "EA", String(count), "", "", ""]);
            }
          }
        }
      }

      // Project totals
      const totalSticks = runs.reduce((a, r) => a + Math.ceil(r.feet / 10), 0);
      const totalWire = runs.reduce((a, r) => a + parseFloat((r.feet * r.conductors * 1.1).toFixed(1)), 0);
      rows.push(["TOTAL", "", "", String(totalSticks), String(parseFloat(totalWire.toFixed(1))), ""]);
      rows.push([]);
    } else if (civilState.distance > 0) {
      // Legacy single-distance fallback
      const { distance, conductors } = civilState;
      const sticks = Math.ceil(distance / 10);
      const wireLength = parseFloat((distance * conductors * 1.1).toFixed(1));
      rows.push([`SECTION: Civil & Underground — ${activeCivilProject.name}`, "", "", "", "", ""]);
      rows.push(["Description", "Unit", "Quantity", "Notes", "", ""]);
      rows.push(["10-ft Conduit Sticks", "EA", String(sticks), `${distance} ft run`, "", ""]);
      rows.push(["Wire (Total w/ 10% Slack)", "FT", String(wireLength), `${conductors} conductors`, "", ""]);
      rows.push([]);
    }

    // ── Section 2: Commercial Assembly ──────────────────────────
    if (assemblyState.materials.length > 0) {
      rows.push([`SECTION: Commercial Assembly — ${activeCommercialProject.name}`, "", "", "", "", ""]);
      rows.push([
        `Assembly: ${assemblyState.assemblyId} × ${assemblyState.quantity}`,
        "", "", "", "", "",
      ]);
      rows.push(["Description", "Unit", "Quantity", "Unit Cost", "Ext. Cost", ""]);
      for (const m of assemblyState.materials) {
        rows.push([
          m.description,
          m.unit,
          String(m.quantity),
          `$${m.unitCost.toFixed(2)}`,
          `$${(m.unitCost * m.quantity).toFixed(2)}`,
          "",
        ]);
      }
      rows.push(["Total Labor Hours", "HRS", String(assemblyState.totalLaborHours), "", "", ""]);
      rows.push([]);
    }

    // ── Section 3: Residential Rough-In ─────────────────────────
    if (roomState.materials.length > 0) {
      rows.push([`SECTION: Residential Rough-In — ${activeResidentialProject.name}`, "", "", "", "", ""]);
      rows.push([`Room: ${roomState.roomId}`, "", "", "", "", ""]);
      rows.push(["Description", "Unit", "Quantity", "", "", ""]);
      for (const m of roomState.materials) {
        rows.push([m.description, m.unit, String(m.quantity), "", "", ""]);
      }
      rows.push([]);
    }

    if (rows.length <= 3) {
      toast.error("No data to export. Open a project and add runs or assemblies first.");
      return;
    }

    const csv = buildCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BidPhase_Export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Material list exported as CSV.");
  };

  return (
    <button
      onClick={handleExport}
      title="Export Material List to CSV"
      className="fixed bottom-20 right-5 md:bottom-6 md:right-6 z-40
                 flex items-center gap-2 px-4 py-3 rounded-full
                 bg-[#F5C518] text-black font-semibold text-sm
                 shadow-lg shadow-[#F5C518]/20
                 hover:bg-[#e0b315] active:scale-95
                 transition-all duration-150"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      <Download size={16} />
      <span className="hidden sm:inline">Export CSV</span>
    </button>
  );
}
