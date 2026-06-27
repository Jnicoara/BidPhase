/**
 * BidPhase — Residential Rough-In (Room Configurator)
 * Design: Tactical Dark Mode SaaS · Space Grotesk headers · JetBrains Mono outputs
 *
 * Features:
 * - Project homepage (card grid) → open project editor
 * - Embedded PlanPanel (resizable split pane, project-scoped)
 * - Room type selector with editable baseline material list
 */
import { useState, useEffect } from "react";
import { useApp, type RoomMaterialLine } from "@/contexts/AppContext";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResizablePanelGroup, ResizablePanel, ResizableHandle,
} from "@/components/ui/resizable";
import PlanPanel from "@/components/PlanPanel";
import ProjectHomepage from "@/components/ProjectHomepage";
import { Home, ChevronLeft } from "lucide-react";

// ── Room data ─────────────────────────────────────────────────────────────────
interface RoomTemplate { id: string; name: string; materials: RoomMaterialLine[]; }

const ROOM_TEMPLATES: RoomTemplate[] = [
  {
    id: "bedroom", name: "Standard Bedroom",
    materials: [
      { description: "14/2 NM-B Romex (General Lighting/Outlets)", unit: "FT", quantity: 150 },
      { description: "14/3 NM-B Romex (Switch Loops)", unit: "FT", quantity: 25 },
      { description: "1-Gang Old-Work Box", unit: "EA", quantity: 4 },
      { description: "2-Gang Old-Work Box", unit: "EA", quantity: 1 },
      { description: "Romex Staples (1/2\")", unit: "EA", quantity: 40 },
      { description: "15A Single-Pole Switch", unit: "EA", quantity: 1 },
      { description: "15A 3-Way Switch", unit: "EA", quantity: 0 },
      { description: "15A Duplex Receptacle", unit: "EA", quantity: 4 },
      { description: "Smoke Detector (120V w/ Battery Backup)", unit: "EA", quantity: 1 },
      { description: "Wire Connector (Ideal 73B)", unit: "EA", quantity: 12 },
    ],
  },
  {
    id: "kitchen", name: "Kitchen",
    materials: [
      { description: "12/2 NM-B Romex (20A Circuits)", unit: "FT", quantity: 200 },
      { description: "12/3 NM-B Romex (SABC Circuits)", unit: "FT", quantity: 80 },
      { description: "10/3 NM-B Romex (Range Circuit)", unit: "FT", quantity: 40 },
      { description: "1-Gang Old-Work Box", unit: "EA", quantity: 6 },
      { description: "2-Gang Old-Work Box", unit: "EA", quantity: 2 },
      { description: "Romex Staples (1/2\")", unit: "EA", quantity: 60 },
      { description: "20A Single-Pole Switch", unit: "EA", quantity: 2 },
      { description: "20A GFCI Duplex Receptacle", unit: "EA", quantity: 4 },
      { description: "20A Duplex Receptacle (SABC)", unit: "EA", quantity: 4 },
      { description: "50A Range Receptacle (4-Prong)", unit: "EA", quantity: 1 },
      { description: "Smoke/CO Combo Detector (120V)", unit: "EA", quantity: 1 },
      { description: "Under-Cabinet Light Rough-In Box", unit: "EA", quantity: 2 },
      { description: "Wire Connector (Ideal 73B)", unit: "EA", quantity: 20 },
    ],
  },
  {
    id: "bathroom", name: "Bathroom",
    materials: [
      { description: "14/2 NM-B Romex (Lighting)", unit: "FT", quantity: 60 },
      { description: "12/2 NM-B Romex (GFCI Circuit)", unit: "FT", quantity: 80 },
      { description: "1-Gang Old-Work Box", unit: "EA", quantity: 3 },
      { description: "Romex Staples (1/2\")", unit: "EA", quantity: 20 },
      { description: "15A Single-Pole Switch", unit: "EA", quantity: 1 },
      { description: "20A GFCI Duplex Receptacle", unit: "EA", quantity: 2 },
      { description: "Exhaust Fan (110 CFM)", unit: "EA", quantity: 1 },
      { description: "Wire Connector (Ideal 73B)", unit: "EA", quantity: 8 },
    ],
  },
  {
    id: "garage", name: "Garage",
    materials: [
      { description: "12/2 NM-B Romex (20A Circuits)", unit: "FT", quantity: 120 },
      { description: "10/3 NM-B Romex (EV Charger)", unit: "FT", quantity: 50 },
      { description: "1-Gang Old-Work Box", unit: "EA", quantity: 4 },
      { description: "Romex Staples (1/2\")", unit: "EA", quantity: 30 },
      { description: "20A GFCI Duplex Receptacle", unit: "EA", quantity: 4 },
      { description: "30A NEMA 14-30 Receptacle (EV)", unit: "EA", quantity: 1 },
      { description: "Motion Sensor Light Switch", unit: "EA", quantity: 1 },
      { description: "Wire Connector (Ideal 73B)", unit: "EA", quantity: 10 },
    ],
  },
];

// ─── Editor view ─────────────────────────────────────────────────────────────
function ResidentialEditor({
  projectId,
  projectName,
  onBack,
}: {
  projectId: string;
  projectName: string;
  onBack: () => void;
}) {
  const { activeResidentialProject, setRoomState } = useApp();
  const s = activeResidentialProject.state;
  const { roomId, materials } = s;

  const template = ROOM_TEMPLATES.find((r) => r.id === roomId) ?? ROOM_TEMPLATES[0];

  useEffect(() => {
    setRoomState({ roomId, materials: template.materials.map((m) => ({ ...m })) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handleRoomChange = (id: string) => {
    const t = ROOM_TEMPLATES.find((r) => r.id === id) ?? ROOM_TEMPLATES[0];
    setRoomState({ roomId: id, materials: t.materials.map((m) => ({ ...m })) });
  };

  const updateQty = (index: number, value: string) => {
    const qty = parseInt(value);
    if (isNaN(qty) || qty < 0) return;
    const updated = materials.map((m, i) => (i === index ? { ...m, quantity: qty } : m));
    setRoomState({ ...s, materials: updated });
  };

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
          <PlanPanel tabKey={`residential_${projectId}`} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={25}>
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-border bg-card shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F5C518]/15 flex items-center justify-center">
                  <Home size={16} className="text-[#F5C518]" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Residential
                  </h1>
                  <p className="text-xs text-muted-foreground">{projectName}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 pb-24">
              <div className="max-w-lg mx-auto space-y-5">
                {/* Room selector */}
                <div className="bp-card p-4 space-y-3">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Room Type
                  </h2>
                  <Select value={roomId} onValueChange={handleRoomChange}>
                    <SelectTrigger className="bg-input border-border h-10"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {ROOM_TEMPLATES.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    Baseline defaults — edit any field to match your actual takeoff.
                  </p>
                </div>

                {/* Material list */}
                <div className="bp-card overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border bg-secondary/30">
                    <h2 className="text-xs font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {template.name} — Rough-In Materials
                    </h2>
                  </div>
                  <div className="divide-y divide-border/50">
                    {(materials.length > 0 ? materials : template.materials).map((mat, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/20 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground truncate">{mat.description}</p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{mat.unit}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Input
                            type="number" min={0} value={mat.quantity}
                            onChange={(e) => updateQty(i, e.target.value)}
                            className="w-18 h-8 text-right font-mono text-xs bg-input border-border text-foreground"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          />
                          <span className="text-[10px] text-muted-foreground font-mono w-5">{mat.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t border-border bg-secondary/20 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-mono">{materials.length} line items</span>
                    <span className="text-[10px] text-[#F5C518] font-mono">Changes saved automatically</span>
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
export default function ResidentialRoughIn() {
  const {
    residentialProjects,
    activeResidentialId,
    addResidentialProject,
    renameResidentialProject,
    deleteResidentialProject,
    switchResidentialProject,
  } = useApp();

  const [openProjectId, setOpenProjectId] = useState<string | null>(null);

  const handleOpen = (id: string) => {
    switchResidentialProject(id);
    setOpenProjectId(id);
  };

  const handleNew = (name: string) => {
    addResidentialProject(name);
    setTimeout(() => setOpenProjectId("__new__"), 80);
  };

  const resolvedOpenId =
    openProjectId === "__new__" ? activeResidentialId : openProjectId;

  const projectCards = residentialProjects.map((p) => ({
    id: p.id,
    name: p.name,
    createdAt: p.createdAt,
    summary: p.state.roomId
      ? ROOM_TEMPLATES.find((r) => r.id === p.state.roomId)?.name ?? p.state.roomId
      : "No room selected",
  }));

  if (!resolvedOpenId) {
    return (
      <ProjectHomepage
        title="Residential"
        icon={<Home size={18} className="text-[#F5C518]" />}
        projects={projectCards}
        activeId={activeResidentialId}
        onOpen={handleOpen}
        onNew={handleNew}
        onRename={renameResidentialProject}
        onDelete={deleteResidentialProject}
      />
    );
  }

  const proj = residentialProjects.find((p) => p.id === resolvedOpenId);
  const name = proj?.name ?? "Project";

  return (
    <ResidentialEditor
      projectId={resolvedOpenId}
      projectName={name}
      onBack={() => setOpenProjectId(null)}
    />
  );
}
