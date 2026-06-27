/**
 * BidPhase — Commercial Buildout (Assembly Multiplier)
 * Design: Tactical Dark Mode SaaS · Space Grotesk headers · JetBrains Mono outputs
 *
 * Features:
 * - Multi-project manager (add / rename / delete / switch)
 * - Embedded PlanPanel (resizable split pane, project-scoped)
 * - Assembly dropdown + quantity → itemized BOM + labor hours
 */
import { useState, useEffect } from "react";
import { useApp, type AssemblyMaterialLine } from "@/contexts/AppContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResizablePanelGroup, ResizablePanel, ResizableHandle,
} from "@/components/ui/resizable";
import PlanPanel from "@/components/PlanPanel";
import { cn } from "@/lib/utils";
import { Building2, Clock, DollarSign, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

// ── Assembly data ─────────────────────────────────────────────────────────────
interface AssemblyMaterial { description: string; unit: string; unitCost: number; qtyPerAssembly: number; }
interface Assembly { id: string; name: string; blendedLaborHours: number; materials: AssemblyMaterial[]; }

const ASSEMBLIES: Assembly[] = [
  {
    id: "receptacle-20a", name: "20A Commercial Receptacle", blendedLaborHours: 0.75,
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
    id: "troffer-2x4-led", name: "2×4 LED Troffer", blendedLaborHours: 1.25,
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
  {
    id: "panel-3phase", name: "3-Phase Sub-Panel (100A)", blendedLaborHours: 8.0,
    materials: [
      { description: "100A 3-Phase Sub-Panel (24-Space)", unit: "EA", unitCost: 285.00, qtyPerAssembly: 1 },
      { description: "100A 3-Phase Main Breaker", unit: "EA", unitCost: 145.00, qtyPerAssembly: 1 },
      { description: "1-1/4\" EMT Conduit", unit: "FT", unitCost: 1.85, qtyPerAssembly: 20 },
      { description: "#1 THHN Wire (Black)", unit: "FT", unitCost: 1.45, qtyPerAssembly: 25 },
      { description: "#1 THHN Wire (Red)", unit: "FT", unitCost: 1.45, qtyPerAssembly: 25 },
      { description: "#1 THHN Wire (Blue)", unit: "FT", unitCost: 1.45, qtyPerAssembly: 25 },
      { description: "#6 THHN Wire (Green Ground)", unit: "FT", unitCost: 0.85, qtyPerAssembly: 25 },
      { description: "1-1/4\" EMT Connector", unit: "EA", unitCost: 2.15, qtyPerAssembly: 4 },
      { description: "Conduit Hanger (1-1/4\")", unit: "EA", unitCost: 0.65, qtyPerAssembly: 6 },
      { description: "Grounding Lug Kit", unit: "EA", unitCost: 12.50, qtyPerAssembly: 1 },
    ],
  },
  {
    id: "exit-emergency", name: "Exit / Emergency Light", blendedLaborHours: 0.9,
    materials: [
      { description: "Combo Exit/Emergency Light (LED)", unit: "EA", unitCost: 52.00, qtyPerAssembly: 1 },
      { description: "4\" Square Box (1-1/2\" Deep)", unit: "EA", unitCost: 2.40, qtyPerAssembly: 1 },
      { description: "#12 THHN Wire (Black)", unit: "FT", unitCost: 0.18, qtyPerAssembly: 6 },
      { description: "#12 THHN Wire (White)", unit: "FT", unitCost: 0.18, qtyPerAssembly: 6 },
      { description: "#12 THHN Wire (Green)", unit: "FT", unitCost: 0.18, qtyPerAssembly: 6 },
      { description: "Wire Connector (Ideal 73B)", unit: "EA", unitCost: 0.12, qtyPerAssembly: 2 },
      { description: "1/2\" EMT Connector", unit: "EA", unitCost: 0.55, qtyPerAssembly: 1 },
    ],
  },
  {
    id: "dryer-30a", name: "30A Dryer Circuit", blendedLaborHours: 2.5,
    materials: [
      { description: "30A 2-Pole Breaker", unit: "EA", unitCost: 18.50, qtyPerAssembly: 1 },
      { description: "10/3 NM-B Romex", unit: "FT", unitCost: 1.15, qtyPerAssembly: 30 },
      { description: "30A Dryer Receptacle (4-Prong)", unit: "EA", unitCost: 14.00, qtyPerAssembly: 1 },
      { description: "2-Gang Old-Work Box", unit: "EA", unitCost: 3.20, qtyPerAssembly: 1 },
      { description: "Romex Staples (1/2\")", unit: "EA", unitCost: 0.08, qtyPerAssembly: 12 },
      { description: "Wire Connector (Ideal 73B)", unit: "EA", unitCost: 0.12, qtyPerAssembly: 4 },
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

// ─── Project Manager Strip ────────────────────────────────────────────────────
function ProjectStrip() {
  const {
    commercialProjects, activeCommercialId,
    switchCommercialProject, addCommercialProject,
    renameCommercialProject, deleteCommercialProject,
  } = useApp();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  const commitEdit = (id: string) => {
    const t = editName.trim();
    if (t) renameCommercialProject(id, t);
    setEditingId(null);
  };

  const handleAdd = () => {
    const name = newName.trim() || `Job ${commercialProjects.length + 1}`;
    addCommercialProject(name);
    setNewName("");
    setShowNew(false);
    toast.success(`Project "${name}" created.`);
  };

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/20 shrink-0 overflow-x-auto">
      <span className="text-[10px] font-semibold text-muted-foreground mr-1 shrink-0 uppercase tracking-wide">Jobs:</span>
      {commercialProjects.map((proj) => (
        <div key={proj.id} className={cn(
          "flex items-center gap-0.5 rounded border transition-all shrink-0",
          proj.id === activeCommercialId ? "bg-yellow-400/10 border-yellow-400/40" : "border-transparent hover:border-border"
        )}>
          {editingId === proj.id ? (
            <div className="flex items-center gap-0.5 px-1">
              <input autoFocus value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitEdit(proj.id); if (e.key === "Escape") setEditingId(null); }}
                className="h-5 w-24 text-[10px] bg-background border border-border rounded px-1 text-foreground"
              />
              <button onClick={() => commitEdit(proj.id)} className="text-green-400 hover:text-green-300"><Check size={10} /></button>
              <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground"><X size={10} /></button>
            </div>
          ) : (
            <>
              <button onClick={() => switchCommercialProject(proj.id)}
                className={cn("px-2 py-0.5 text-[10px] font-medium whitespace-nowrap transition-colors",
                  proj.id === activeCommercialId ? "text-yellow-400" : "text-muted-foreground hover:text-foreground")}>
                {proj.name}
              </button>
              <button onClick={() => { setEditingId(proj.id); setEditName(proj.name); }}
                className="px-0.5 text-muted-foreground hover:text-foreground transition-colors" title="Rename">
                <Pencil size={9} />
              </button>
              {commercialProjects.length > 1 && (
                <button onClick={() => { deleteCommercialProject(proj.id); toast.info(`Deleted "${proj.name}".`); }}
                  className="px-0.5 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                  <Trash2 size={9} />
                </button>
              )}
            </>
          )}
        </div>
      ))}
      {showNew ? (
        <div className="flex items-center gap-0.5 shrink-0">
          <input autoFocus value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setShowNew(false); }}
            placeholder="Job name…"
            className="h-5 w-24 text-[10px] bg-background border border-border rounded px-1 text-foreground"
          />
          <button onClick={handleAdd} className="text-green-400 hover:text-green-300"><Check size={10} /></button>
          <button onClick={() => setShowNew(false)} className="text-muted-foreground hover:text-foreground"><X size={10} /></button>
        </div>
      ) : (
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <Plus size={10} /> New Job
        </button>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CommercialAssembly() {
  const { activeCommercialProject, setAssemblyState } = useApp();
  const s = activeCommercialProject.state;
  const { assemblyId, quantity } = s;

  const selectedAssembly = ASSEMBLIES.find((a) => a.id === assemblyId) ?? ASSEMBLIES[0];
  const qty = Math.max(1, quantity || 1);
  const bom = buildBOM(selectedAssembly, qty);
  const totalLaborHours = parseFloat((selectedAssembly.blendedLaborHours * qty).toFixed(2));
  const totalMaterialCost = parseFloat(bom.reduce((sum, m) => sum + m.unitCost * m.quantity, 0).toFixed(2));

  useEffect(() => {
    setAssemblyState({ assemblyId, quantity: qty, materials: bom, totalLaborHours });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assemblyId, qty]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ProjectStrip />
      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        <ResizablePanel defaultSize={50} minSize={25} maxSize={75}>
          <PlanPanel tabKey={`commercial_${activeCommercialProject.id}`} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={25}>
          <div className="flex flex-col h-full overflow-auto">
            <div className="px-5 pt-5 pb-3 border-b border-border bg-card shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F5C518]/15 flex items-center justify-center">
                  <Building2 size={16} className="text-[#F5C518]" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Commercial Buildout
                  </h1>
                  <p className="text-xs text-muted-foreground">{activeCommercialProject.name}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="max-w-2xl mx-auto space-y-5">
                {/* Inputs */}
                <div className="bp-card p-4 space-y-4">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Inputs
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Assembly Type</Label>
                      <Select value={assemblyId}
                        onValueChange={(v) => setAssemblyState({ ...s, assemblyId: v, quantity: qty })}>
                        <SelectTrigger className="bg-input border-border h-10"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {ASSEMBLIES.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Quantity</Label>
                      <Input type="number" min={1} step={1} value={qty}
                        onChange={(e) => setAssemblyState({ ...s, quantity: parseInt(e.target.value) || 1 })}
                        className="font-mono text-base h-10 bg-input border-border"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pt-1 border-t border-border text-[10px] text-muted-foreground font-mono">
                    <span>Labor: <span className="text-foreground">{selectedAssembly.blendedLaborHours} hrs/unit</span></span>
                    <span>Items: <span className="text-foreground">{selectedAssembly.materials.length}</span></span>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bp-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-medium uppercase tracking-wider mb-2">
                      <Clock size={12} />Total Labor Hrs
                    </div>
                    <div className="text-3xl font-bold text-[#F5C518]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {totalLaborHours}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-1">{selectedAssembly.blendedLaborHours} × {qty} units</div>
                  </div>
                  <div className="bp-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-medium uppercase tracking-wider mb-2">
                      <DollarSign size={12} />Est. Material
                    </div>
                    <div className="text-3xl font-bold text-[#22C55E]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      ${totalMaterialCost.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-1">materials only</div>
                  </div>
                </div>

                {/* BOM */}
                <div className="bp-card overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border bg-secondary/30">
                    <h2 className="text-xs font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Bill of Materials — {selectedAssembly.name} × {qty}
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                          <th className="text-left px-4 py-2.5 font-medium">Description</th>
                          <th className="text-center px-3 py-2.5 font-medium">Unit</th>
                          <th className="text-right px-3 py-2.5 font-medium">Qty</th>
                          <th className="text-right px-4 py-2.5 font-medium">Unit $</th>
                          <th className="text-right px-4 py-2.5 font-medium">Ext. $</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bom.map((row, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                            <td className="px-4 py-2.5 text-foreground">{row.description}</td>
                            <td className="px-3 py-2.5 text-center font-mono text-muted-foreground">{row.unit}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-semibold text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{row.quantity}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>${row.unitCost.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-semibold text-[#22C55E]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>${(row.unitCost * row.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border bg-secondary/20">
                          <td colSpan={4} className="px-4 py-2.5 text-right text-xs font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Total Material Cost</td>
                          <td className="px-4 py-2.5 text-right font-bold text-[#22C55E] text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>${totalMaterialCost.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
