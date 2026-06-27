/**
 * BidPhase — Tab 3: Commercial Buildout (Assembly Multiplier)
 * Assemblies: "20A Commercial Receptacle" and "2x4 LED Troffer"
 * Inputs: Assembly dropdown + Quantity
 * Outputs: Itemized BOM (materials × qty) + Total Labor Hours
 * Design: Tactical Dark Mode SaaS, Safety Yellow accent
 */
import { useEffect } from "react";
import { useApp, type AssemblyMaterialLine } from "@/contexts/AppContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Clock, DollarSign } from "lucide-react";

// ── Assembly data ─────────────────────────────────────────────────────────────
interface AssemblyMaterial {
  description: string;
  unit: string;
  unitCost: number;
  qtyPerAssembly: number;
}

interface Assembly {
  id: string;
  name: string;
  blendedLaborHours: number;
  materials: AssemblyMaterial[];
}

const ASSEMBLIES: Assembly[] = [
  {
    id: "receptacle-20a",
    name: "20A Commercial Receptacle",
    blendedLaborHours: 0.75,
    materials: [
      { description: "20A Duplex Receptacle (Commercial Grade)", unit: "EA", unitCost: 4.85, qtyPerAssembly: 1 },
      { description: "1-Gang Steel Box (4\" Deep)", unit: "EA", unitCost: 2.10, qtyPerAssembly: 1 },
      { description: "1-Gang Steel Plate Cover", unit: "EA", unitCost: 0.75, qtyPerAssembly: 1 },
      { description: "#12 THHN Wire (Black)", unit: "FT", unitCost: 0.18, qtyPerAssembly: 6 },
      { description: "#12 THHN Wire (White)", unit: "FT", unitCost: 0.18, qtyPerAssembly: 6 },
      { description: "#12 THHN Wire (Green)", unit: "FT", unitCost: 0.18, qtyPerAssembly: 6 },
      { description: "Wire Connector (Ideal 73B)", unit: "EA", unitCost: 0.12, qtyPerAssembly: 3 },
      { description: "EMT Connector 1/2\"", unit: "EA", unitCost: 0.55, qtyPerAssembly: 1 },
    ],
  },
  {
    id: "troffer-2x4-led",
    name: "2×4 LED Troffer",
    blendedLaborHours: 1.25,
    materials: [
      { description: "2×4 LED Troffer Fixture (40W, 5000K)", unit: "EA", unitCost: 68.00, qtyPerAssembly: 1 },
      { description: "4\" Square Box (1-1/2\" Deep)", unit: "EA", unitCost: 2.40, qtyPerAssembly: 1 },
      { description: "4\" Square Raised Cover (1-Gang)", unit: "EA", unitCost: 1.15, qtyPerAssembly: 1 },
      { description: "#12 THHN Wire (Black)", unit: "FT", unitCost: 0.18, qtyPerAssembly: 8 },
      { description: "#12 THHN Wire (White)", unit: "FT", unitCost: 0.18, qtyPerAssembly: 8 },
      { description: "#12 THHN Wire (Green)", unit: "FT", unitCost: 0.18, qtyPerAssembly: 8 },
      { description: "Wire Connector (Ideal 73B)", unit: "EA", unitCost: 0.12, qtyPerAssembly: 3 },
      { description: "1/2\" EMT Conduit", unit: "FT", unitCost: 0.65, qtyPerAssembly: 4 },
      { description: "1/2\" EMT Coupling", unit: "EA", unitCost: 0.30, qtyPerAssembly: 1 },
      { description: "Ceiling Grid Clip", unit: "EA", unitCost: 0.45, qtyPerAssembly: 4 },
    ],
  },
];

function buildBOM(assembly: Assembly, qty: number): AssemblyMaterialLine[] {
  return assembly.materials.map((m) => ({
    description: m.description,
    unit: m.unit,
    unitCost: m.unitCost,
    quantity: m.qtyPerAssembly * qty,
  }));
}

export default function CommercialAssembly() {
  const { assemblyState, setAssemblyState } = useApp();
  const { assemblyId, quantity } = assemblyState;

  const selectedAssembly = ASSEMBLIES.find((a) => a.id === assemblyId) ?? ASSEMBLIES[0];
  const qty = Math.max(1, quantity || 1);
  const bom = buildBOM(selectedAssembly, qty);
  const totalLaborHours = parseFloat((selectedAssembly.blendedLaborHours * qty).toFixed(2));
  const totalMaterialCost = parseFloat(
    bom.reduce((sum, m) => sum + m.unitCost * m.quantity, 0).toFixed(2)
  );

  // Sync to context for CSV export
  useEffect(() => {
    setAssemblyState({
      assemblyId,
      quantity: qty,
      materials: bom,
      totalLaborHours,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assemblyId, qty]);

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F5C518]/15 flex items-center justify-center">
            <Building2 size={18} className="text-[#F5C518]" />
          </div>
          <div>
            <h1
              className="text-xl font-bold text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Commercial Buildout
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Assembly multiplier — bill of materials &amp; labor
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* ── Inputs ──────────────────────────────────────────── */}
          <div className="bp-card p-5 space-y-5">
            <h2
              className="text-sm font-semibold text-muted-foreground uppercase tracking-wider"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Inputs
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Assembly selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Assembly Type</Label>
                <Select
                  value={assemblyId}
                  onValueChange={(v) =>
                    setAssemblyState({ ...assemblyState, assemblyId: v, quantity: qty })
                  }
                >
                  <SelectTrigger className="bg-input border-border h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {ASSEMBLIES.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={qty}
                  onChange={(e) =>
                    setAssemblyState({
                      ...assemblyState,
                      quantity: parseInt(e.target.value) || 1,
                    })
                  }
                  className="font-mono text-lg h-11 bg-input border-border"
                />
              </div>
            </div>

            {/* Assembly info */}
            <div className="flex items-center gap-4 pt-1 border-t border-border text-xs text-muted-foreground font-mono">
              <span>
                Labor rate:{" "}
                <span className="text-foreground">{selectedAssembly.blendedLaborHours} hrs/unit</span>
              </span>
              <span>
                Materials:{" "}
                <span className="text-foreground">{selectedAssembly.materials.length} line items</span>
              </span>
            </div>
          </div>

          {/* ── Summary cards ────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bp-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2">
                <Clock size={13} />
                Total Labor Hours
              </div>
              <div
                className="text-4xl font-bold text-[#F5C518]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {totalLaborHours}
              </div>
              <div className="text-xs text-muted-foreground font-mono mt-1">
                {selectedAssembly.blendedLaborHours} hrs × {qty} units
              </div>
            </div>
            <div className="bp-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider mb-2">
                <DollarSign size={13} />
                Est. Material Cost
              </div>
              <div
                className="text-4xl font-bold text-[#22C55E]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                ${totalMaterialCost.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground font-mono mt-1">
                materials only · no labor
              </div>
            </div>
          </div>

          {/* ── Bill of Materials ────────────────────────────────── */}
          <div className="bp-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-secondary/30">
              <h2
                className="text-sm font-semibold text-foreground"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Bill of Materials — {selectedAssembly.name} × {qty}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider font-mono">
                    <th className="text-left px-5 py-3 font-medium">Description</th>
                    <th className="text-center px-4 py-3 font-medium">Unit</th>
                    <th className="text-right px-4 py-3 font-medium">Qty</th>
                    <th className="text-right px-5 py-3 font-medium">Unit Cost</th>
                    <th className="text-right px-5 py-3 font-medium">Ext. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {bom.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                    >
                      <td className="px-5 py-3 text-foreground">{row.description}</td>
                      <td className="px-4 py-3 text-center font-mono text-muted-foreground text-xs">
                        {row.unit}
                      </td>
                      <td
                        className="px-4 py-3 text-right font-mono font-semibold text-foreground"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {row.quantity}
                      </td>
                      <td
                        className="px-5 py-3 text-right font-mono text-muted-foreground text-xs"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        ${row.unitCost.toFixed(2)}
                      </td>
                      <td
                        className="px-5 py-3 text-right font-mono font-semibold text-[#22C55E]"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        ${(row.unitCost * row.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-secondary/20">
                    <td colSpan={4} className="px-5 py-3 text-right text-sm font-semibold text-foreground"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Total Material Cost
                    </td>
                    <td
                      className="px-5 py-3 text-right font-bold text-[#22C55E] text-base"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      ${totalMaterialCost.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
