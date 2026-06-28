/**
 * BidPhase — Commercial Buildout (Assembly Multiplier)
 * Design: Tactical Dark Mode SaaS · Space Grotesk headers · JetBrains Mono outputs
 *
 * Features:
 * - Project homepage (card grid) → open project editor
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
import ProjectHomepage from "@/components/ProjectHomepage";
import { cn } from "@/lib/utils";
import { Building2, Clock, DollarSign, ChevronLeft } from "lucide-react";
import { COUNT_ICONS, PIN_COLORS, DEFAULT_ICON_ID, DEFAULT_PIN_COLOR } from "@/lib/CountIcons";

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

// ─── Editor view ─────────────────────────────────────────────────────────────
function CommercialEditor({
  projectId,
  projectName,
  onBack,
}: {
  projectId: string;
  projectName: string;
  onBack: () => void;
}) {
  const { activeCommercialProject, setAssemblyState } = useApp();
  const s = activeCommercialProject.state;
  const { assemblyId, quantity, iconId = DEFAULT_ICON_ID, pinColor = DEFAULT_PIN_COLOR } = s;

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
      {/* Back bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/10 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft size={14} /> All Projects
        </button>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-xs font-medium text-foreground">{projectName}</span>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        <ResizablePanel defaultSize={50} minSize={25} maxSize={75}>
          <PlanPanel
            tabKey={`commercial_${projectId}`}
            activeAssemblyId={assemblyId}
            activeAssemblyColor={pinColor}
            activeAssemblyIconId={iconId}
            onPinAdded={() => setAssemblyState({ ...s, quantity: qty + 1 })}
            onPinRemoved={() => setAssemblyState({ ...s, quantity: Math.max(1, qty - 1) })}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={25}>
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-border bg-card shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F5C518]/15 flex items-center justify-center">
                  <Building2 size={16} className="text-[#F5C518]" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Commercial
                  </h1>
                  <p className="text-xs text-muted-foreground">{projectName}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 pb-24">
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

                  {/* ── Count Mode: Pin Color + Icon ─────────────────── */}
                  <div className="pt-2 border-t border-border space-y-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Count Mode Pin</p>

                    {/* Color picker row */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Pin Color</Label>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {PIN_COLORS.map((c) => (
                          <button
                            key={c.hex}
                            title={c.label}
                            onClick={() => setAssemblyState({ ...s, pinColor: c.hex })}
                            className={cn(
                              "w-6 h-6 rounded-full border-2 transition-all",
                              pinColor === c.hex ? "border-white scale-110" : "border-transparent hover:border-white/50"
                            )}
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                        {/* Custom hex input */}
                        <label className="relative w-6 h-6 rounded-full overflow-hidden border-2 border-dashed border-border hover:border-white/50 cursor-pointer" title="Custom color">
                          <input
                            type="color"
                            value={pinColor}
                            onChange={(e) => setAssemblyState({ ...s, pinColor: e.target.value })}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <span className="flex items-center justify-center w-full h-full text-[8px] text-muted-foreground">+</span>
                        </label>
                        <span className="font-mono text-[10px] text-muted-foreground ml-1">{pinColor}</span>
                      </div>
                    </div>

                    {/* Icon selector grid */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Pin Icon</Label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {COUNT_ICONS.map((icon) => (
                          <button
                            key={icon.id}
                            title={icon.label}
                            onClick={() => setAssemblyState({ ...s, iconId: icon.id })}
                            className={cn(
                              "flex flex-col items-center gap-1 p-2 rounded-md border text-[9px] transition-all",
                              iconId === icon.id
                                ? "border-[#F5C518] bg-[#F5C518]/10 text-foreground"
                                : "border-border bg-muted/10 text-muted-foreground hover:border-border/80 hover:text-foreground"
                            )}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="20"
                              height="20"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              {icon.paths.map((p, pi) => (
                                <path
                                  key={pi}
                                  d={p.d}
                                  fill={p.strokeOnly ? "none" : (iconId === icon.id ? pinColor : "currentColor")}
                                  stroke={iconId === icon.id ? pinColor : "currentColor"}
                                  strokeWidth={p.strokeWidth ?? 1.5}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              ))}
                            </svg>
                            <span className="leading-tight text-center">{icon.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bp-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-medium uppercase tracking-wider mb-2">
                      <Clock size={12} />Total Labor Hrs
                    </div>
                    <div className="text-3xl font-bold font-mono text-[#F5C518]">{totalLaborHours}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">hrs @ {qty} units</div>
                  </div>
                  <div className="bp-card p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-medium uppercase tracking-wider mb-2">
                      <DollarSign size={12} />Material Cost
                    </div>
                    <div className="text-3xl font-bold font-mono text-[#F5C518]">${totalMaterialCost.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">est. material only</div>
                  </div>
                </div>

                {/* BOM Table */}
                <div className="bp-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Bill of Materials
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          <th className="text-left px-4 py-2 text-muted-foreground font-medium">Description</th>
                          <th className="text-center px-3 py-2 text-muted-foreground font-medium">Unit</th>
                          <th className="text-right px-3 py-2 text-muted-foreground font-medium">Qty</th>
                          <th className="text-right px-3 py-2 text-muted-foreground font-medium">Unit $</th>
                          <th className="text-right px-4 py-2 text-muted-foreground font-medium">Ext $</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bom.map((item, i) => (
                          <tr key={i} className={cn("border-b border-border/50 hover:bg-muted/10 transition-colors", i % 2 === 0 ? "" : "bg-muted/5")}>
                            <td className="px-4 py-2 text-foreground">{item.description}</td>
                            <td className="px-3 py-2 text-center font-mono text-muted-foreground">{item.unit}</td>
                            <td className="px-3 py-2 text-right font-mono font-semibold text-foreground">{item.quantity}</td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">${item.unitCost.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right font-mono font-semibold text-[#F5C518]">
                              ${(item.unitCost * item.quantity).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border bg-muted/20">
                          <td colSpan={4} className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Total Material</td>
                          <td className="px-4 py-2 text-right font-mono font-bold text-[#F5C518]">${totalMaterialCost.toFixed(2)}</td>
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CommercialAssembly() {
  const {
    commercialProjects,
    activeCommercialId,
    addCommercialProject,
    renameCommercialProject,
    deleteCommercialProject,
    switchCommercialProject,
  } = useApp();

  const [openProjectId, setOpenProjectId] = useState<string | null>(null);

  const handleOpen = (id: string) => {
    switchCommercialProject(id);
    setOpenProjectId(id);
  };

  const handleNew = (name: string) => {
    addCommercialProject(name);
    setTimeout(() => setOpenProjectId("__new__"), 80);
  };

  const resolvedOpenId =
    openProjectId === "__new__" ? activeCommercialId : openProjectId;

  const projectCards = commercialProjects.map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: p.createdAt,
    summary: p.state.assemblyId
      ? `${ASSEMBLIES.find((a) => a.id === p.state.assemblyId)?.name ?? p.state.assemblyId} × ${p.state.quantity || 1}`
      : "No assembly selected",
  }));

  if (!resolvedOpenId) {
    return (
      <ProjectHomepage
        title="Commercial"
        icon={<Building2 size={18} className="text-[#F5C518]" />}
        projects={projectCards}
        activeId={activeCommercialId}
        onOpen={handleOpen}
        onNew={handleNew}
        onRename={renameCommercialProject}
        onDelete={deleteCommercialProject}
      />
    );
  }

  const proj = commercialProjects.find((p) => p.id === resolvedOpenId);
  const name = proj?.name ?? "Project";

  return (
    <CommercialEditor
      projectId={resolvedOpenId}
      projectName={name}
      onBack={() => setOpenProjectId(null)}
    />
  );
}
