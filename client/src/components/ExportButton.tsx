/**
 * BidPhase — Global Floating Export Button
 *
 * Aggregates materials from all three active projects and downloads a
 * clean, formatted CSV for supplier ordering.
 *
 * Civil export reads the richer RunItem shape stored via AppContext.
 * Each run row includes: conduit type, conduit size, distance, pipe sticks,
 * wire footage, conductor count, conductor material, conductor size, and
 * page number. Fittings are emitted as indented sub-rows beneath each run.
 *
 * Design: Safety Yellow (#F5C518) fixed bottom-right button.
 */
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { Download } from "lucide-react";

// ─── CSV helpers ──────────────────────────────────────────────────────────────

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

// ─── RunItem shape (mirrors CivilCalculator.tsx) ──────────────────────────────
// The full run data is stored in civilState as `runs` via an `as any` cast
// because CivilState in AppContext is intentionally kept minimal (it only
// declares the legacy scalar fields). The richer run array is appended at
// runtime and read back here with the same pattern.
interface RunItem {
  id: string;
  name: string;
  pageNumber?: number;
  feet: number;
  conduitSize: string;
  conduitType?: string;
  conductors: number;
  conductorMaterial?: string;
  conductorSize?: string;
  fittings: Record<string, number>;
}

// Fitting id → human-readable label (must stay in sync with FITTING_TYPES in CivilCalculator.tsx)
// Note: "tee" was removed from the UI in a prior refactor — it is intentionally absent here.
const FITTING_LABELS: Record<string, string> = {
  connector: "Connectors",
  coupling:  "Couplings",
  lb:        "LBs",
  elbow90:   "90° Elbows",
  elbow45:   "45° Elbows",
  sweep:     "Sweeps",
  offset:    "Offsets",
};

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

  const handleExport = () => {
    const rows: string[][] = [];

    // ── Header ──────────────────────────────────────────────────────────────
    rows.push(["BidPhase — Material Export", "", "", "", "", "", "", "", ""]);
    rows.push([`Generated: ${new Date().toLocaleString()}`, "", "", "", "", "", "", "", ""]);
    rows.push([]);

    // ── Section 1: Civil & Underground (per-run) ─────────────────────────────
    // Run data is stored in civilState.runs (appended at runtime in CivilEditor).
    const runs = ((civilState as any).runs ?? []) as RunItem[];

    if (runs.length > 0) {
      rows.push([`SECTION: Civil & Underground — ${activeCivilProject.name}`, "", "", "", "", "", "", "", ""]);
      rows.push([
        "Run Name",
        "Page",
        "Conduit Type",
        "Conduit Size",
        "Distance (ft)",
        "Pipe Sticks",
        "Wire (ft w/ 10% slack)",
        "Conductors",
        "Conductor Spec",
      ]);

      for (const run of runs) {
        const sticks = Math.ceil(run.feet / 10);
        const wire = parseFloat((run.feet * run.conductors * 1.1).toFixed(1));
        const conduitType = run.conduitType ?? "EMT";
        const conductorMat = run.conductorMaterial ?? "CU";
        const conductorSz = run.conductorSize ?? "12";
        const conductorSpec = `#${conductorSz} AWG ${conductorMat === "CU" ? "Cu" : "Al"}`;

        rows.push([
          run.name,
          run.pageNumber != null ? String(run.pageNumber) : "",
          conduitType,
          `${run.conduitSize}"`,
          String(run.feet),
          String(sticks),
          String(wire),
          String(run.conductors),
          conductorSpec,
        ]);

        // Fittings sub-rows (indented for readability)
        const hasFittings = Object.values(run.fittings).some((v) => v > 0);
        if (hasFittings) {
          rows.push(["  Fittings:", "", "", "", "", "", "", "", ""]);
          for (const [key, count] of Object.entries(run.fittings)) {
            if (count > 0) {
              const label = FITTING_LABELS[key] ?? key;
              rows.push([`    ${label}`, "EA", String(count), "", "", "", "", "", ""]);
            }
          }
        }
      }

      // Project totals row
      const totalSticks = runs.reduce((a, r) => a + Math.ceil(r.feet / 10), 0);
      const totalWire = runs.reduce(
        (a, r) => a + parseFloat((r.feet * r.conductors * 1.1).toFixed(1)),
        0
      );
      rows.push([
        "TOTAL",
        "",
        "",
        "",
        "",
        String(totalSticks),
        String(parseFloat(totalWire.toFixed(1))),
        "",
        "",
      ]);
      rows.push([]);
    }

    // ── Section 2: Commercial Assembly ──────────────────────────────────────
    if (assemblyState.materials.length > 0) {
      rows.push([`SECTION: Commercial — ${activeCommercialProject.name}`, "", "", "", "", "", "", "", ""]);
      rows.push([
        `Assembly: ${assemblyState.assemblyId} × ${assemblyState.quantity}`,
        "", "", "", "", "", "", "", "",
      ]);
      rows.push(["Description", "Unit", "Quantity", "Unit Cost", "Ext. Cost", "", "", "", ""]);
      for (const m of assemblyState.materials) {
        rows.push([
          m.description,
          m.unit,
          String(m.quantity),
          `$${m.unitCost.toFixed(2)}`,
          `$${(m.unitCost * m.quantity).toFixed(2)}`,
          "", "", "", "",
        ]);
      }
      rows.push(["Total Labor Hours", "HRS", String(assemblyState.totalLaborHours), "", "", "", "", "", ""]);
      rows.push([]);
    }

    // ── Section 3: Residential ───────────────────────────────────────────────
    if (roomState.materials.length > 0) {
      rows.push([`SECTION: Residential — ${activeResidentialProject.name}`, "", "", "", "", "", "", "", ""]);
      rows.push([`Room: ${roomState.roomId}`, "", "", "", "", "", "", "", ""]);
      rows.push(["Description", "Unit", "Quantity", "", "", "", "", "", ""]);
      for (const m of roomState.materials) {
        rows.push([m.description, m.unit, String(m.quantity), "", "", "", "", "", ""]);
      }
      rows.push([]);
    }

    // Guard: nothing to export
    if (rows.length <= 3) {
      toast.error("No data to export. Open a project and add runs or assemblies first.");
      return;
    }

    // Trigger download
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
