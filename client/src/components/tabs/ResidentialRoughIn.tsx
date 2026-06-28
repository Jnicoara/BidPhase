/**
 * BidPhase — Residential Rough-In (Room Configurator)
 * Design: Tactical Dark Mode SaaS · Space Grotesk headers · JetBrains Mono outputs
 *
 * Features:
 * - Project homepage (card grid) → open project editor
 * - Embedded PlanPanel (resizable split pane, project-scoped)
 * - Room type selector with editable baseline material list
 * - Count Mode: named sessions, cross-page pin totals, icon + color picker
 */
import { useState, useEffect, useCallback } from "react";
import { useApp, type RoomMaterialLine, type CountPin, type CountSession } from "@/contexts/AppContext";
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
import { Home, ChevronLeft, ChevronDown, ChevronUp, Plus, Trash2, Pencil, Check, X, Undo2 } from "lucide-react";
import { COUNT_ICONS, PIN_COLORS, DEFAULT_ICON_ID, DEFAULT_PIN_COLOR, type PinShape } from "@/lib/CountIcons";
import { toast } from "sonner";

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

// ─── Pin shape swatch (inline SVG preview) ──────────────────────────────────
function PinShapeSwatch({ shape, color, size = 16 }: { shape: PinShape; color: string; size?: number }) {
  const icon = COUNT_ICONS.find((ic) => ic.id === shape) ?? COUNT_ICONS[0];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" className="shrink-0">
      {icon.paths.map((seg, pi) => (
        <path key={pi} d={seg.d}
          fill={seg.strokeOnly ? "none" : color}
          stroke={color}
          strokeWidth={seg.strokeWidth ?? 1.5}
          strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

// ─── Simple 4-shape picker ───────────────────────────────────────────────────
function ResShapeSelector({
  activeIconId,
  activeColor,
  onSelect,
}: {
  activeIconId: string;
  activeColor: string;
  onSelect: (id: PinShape) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">Pin Shape</Label>
      <div className="flex gap-2">
        {COUNT_ICONS.map((icon) => (
          <button key={icon.id} title={icon.label} onClick={() => onSelect(icon.id)}
            className={cn("flex flex-col items-center gap-1 p-2 rounded-md border text-[9px] transition-all flex-1",
              activeIconId === icon.id
                ? "border-[#F5C518] bg-[#F5C518]/10 text-foreground"
                : "border-border bg-muted/10 text-muted-foreground hover:border-border/80 hover:text-foreground")}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
              {icon.paths.map((seg, pi) => (
                <path key={pi} d={seg.d}
                  fill={seg.strokeOnly ? "none" : (activeIconId === icon.id ? activeColor : "currentColor")}
                  stroke={activeIconId === icon.id ? activeColor : "currentColor"}
                  strokeWidth={seg.strokeWidth ?? 1.5} strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </svg>
            <span className="leading-tight text-center">{icon.label}</span>
          </button>
        ))}
      </div>

    </div>
  );
}

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

  // Preserve countSessions when room changes (don't wipe them out)
  useEffect(() => {
    setRoomState({
      ...s,
      roomId,
      materials: template.materials.map((m) => ({ ...m })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handleRoomChange = (id: string) => {
    const t = ROOM_TEMPLATES.find((r) => r.id === id) ?? ROOM_TEMPLATES[0];
    setRoomState({ ...s, roomId: id, materials: t.materials.map((m) => ({ ...m })) });
  };

  const updateQty = (index: number, value: string) => {
    const qty = parseInt(value);
    if (isNaN(qty) || qty < 0) return;
    const updated = materials.map((m, i) => (i === index ? { ...m, quantity: qty } : m));
    setRoomState({ ...s, materials: updated });
  };

  // ── Count session state ────────────────────────────────────────────────────
  const countSessions: CountSession[] = s.countSessions ?? [];
  const activeCountSessionId = s.activeCountSessionId;
  const activeCountSession = countSessions.find((cs) => cs.id === activeCountSessionId) ?? null;

  const [newSessionName, setNewSessionName] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [countSessionsOpen, setCountSessionsOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const updateSessions = useCallback(
    (sessions: CountSession[], activeId?: string) => {
      setRoomState({
        ...s,
        countSessions: sessions,
        activeCountSessionId: activeId !== undefined ? activeId : activeCountSessionId,
      });
    },
    [s, setRoomState, activeCountSessionId]
  );

  const handleAddSession = () => {
    const name = newSessionName.trim() || `Count ${countSessions.length + 1}`;
    const newSession: CountSession = {
      id: `cs-${Date.now().toString(36)}`,
      name,
      iconId: DEFAULT_ICON_ID,
      color: DEFAULT_PIN_COLOR,
      pins: [],
    };
    updateSessions([...countSessions, newSession], newSession.id);
    setNewSessionName("");
    toast.success(`Session "${name}" created.`);
  };

  const handleDeleteSession = (id: string) => {
    setDeletingSessionId(id);
  };
  const confirmDeleteSession = (id: string) => {
    const updated = countSessions.filter((cs) => cs.id !== id);
    const newActive = activeCountSessionId === id ? (updated[0]?.id ?? undefined) : activeCountSessionId;
    updateSessions(updated, newActive);
    setDeletingSessionId(null);
    toast.success("Session deleted.");
  };

  const handleRenameSession = (id: string) => {
    const name = editingName.trim();
    if (!name) { setEditingSessionId(null); return; }
    updateSessions(countSessions.map((cs) => cs.id === id ? { ...cs, name } : cs));
    setEditingSessionId(null);
  };

  const handlePinAdded = useCallback((pin: CountPin) => {
    if (!activeCountSessionId) return;
    const updated = countSessions.map((cs) =>
      cs.id === activeCountSessionId ? { ...cs, pins: [...cs.pins, pin] } : cs
    );
    setRoomState({ ...s, countSessions: updated, activeCountSessionId });
  }, [activeCountSessionId, countSessions, s, setRoomState]);

  const handlePinRemoved = useCallback((pinId: string) => {
    if (!activeCountSessionId) return;
    const updated = countSessions.map((cs) =>
      cs.id === activeCountSessionId
        ? { ...cs, pins: cs.pins.filter((p) => p.id !== pinId) }
        : cs
    );
    setRoomState({ ...s, countSessions: updated, activeCountSessionId });
  }, [activeCountSessionId, countSessions, s, setRoomState]);

  const handleUndoLastPin = useCallback(() => {
    if (!activeCountSessionId) return;
    const session = countSessions.find((cs) => cs.id === activeCountSessionId);
    if (!session) return;
    const pagePins = session.pins.filter((p) => (p.pageNumber ?? 1) === currentPage);
    if (pagePins.length === 0) { toast.info("No pins to undo on this page."); return; }
    const lastPin = pagePins[pagePins.length - 1];
    const updated = countSessions.map((cs) =>
      cs.id === activeCountSessionId
        ? { ...cs, pins: cs.pins.filter((p) => p.id !== lastPin.id) }
        : cs
    );
    setRoomState({ ...s, countSessions: updated, activeCountSessionId });
    toast.info("Last pin removed.");
  }, [activeCountSessionId, countSessions, currentPage, s, setRoomState]);

  const handleClearPagePins = useCallback((pageNumber: number) => {
    if (!activeCountSessionId) return;
    const updated = countSessions.map((cs) =>
      cs.id === activeCountSessionId
        ? { ...cs, pins: cs.pins.filter((p) => p.pageNumber !== pageNumber) }
        : cs
    );
    setRoomState({ ...s, countSessions: updated, activeCountSessionId });
  }, [activeCountSessionId, countSessions, s, setRoomState]);

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
            tabKey={`residential_${projectId}`}
            activeCountSession={activeCountSession}
            allCountSessions={countSessions}
            onPinAdded={handlePinAdded}
            onPinRemoved={handlePinRemoved}
            onClearPagePins={handleClearPagePins}
            onUnitCountToggle={(open) => setCountSessionsOpen(open)}
            onCurrentPageChange={(page) => setCurrentPage(page)}
          />
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

                {/* ── Count Sessions ──────────────────────────────────────── */}
                <div className="bp-card overflow-hidden">
                  <button
                    onClick={() => setCountSessionsOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/10 transition-colors"
                  >
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Unit Count
                      {countSessions.length > 0 && (
                        <span className="ml-2 text-[#F5C518] normal-case tracking-normal font-mono">{countSessions.length} session{countSessions.length !== 1 ? 's' : ''} · {countSessions.reduce((a, cs) => a + cs.pins.length, 0)} pins</span>
                      )}
                    </h2>
                    {countSessionsOpen ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  </button>
                  {countSessionsOpen && <div className="px-4 pb-4 space-y-3">

                  {countSessions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No sessions yet. Create one below to start counting.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {countSessions.map((cs) => {
                        const isActive = cs.id === activeCountSessionId;
                        const isEditing = editingSessionId === cs.id;
                        return (
                          <div
                            key={cs.id}
                            onClick={() => !isEditing && updateSessions(countSessions, cs.id)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-all",
                              isActive ? "border-[#F5C518] bg-[#F5C518]/8" : "border-border bg-muted/5 hover:border-border/80"
                            )}
                          >
                            <PinShapeSwatch shape={cs.iconId as PinShape} color={cs.color} size={16} />
                            {isEditing ? (
                              <input autoFocus value={editingName} onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleRenameSession(cs.id); if (e.key === "Escape") setEditingSessionId(null); }}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 bg-transparent border-b border-[#F5C518] text-xs text-foreground outline-none font-mono" />
                            ) : (
                              <span
                                className="flex-1 text-xs text-foreground font-medium truncate cursor-text hover:text-[#F5C518] transition-colors"
                                title="Click to rename"
                                onClick={(e) => { e.stopPropagation(); setEditingSessionId(cs.id); setEditingName(cs.name); }}
                              >{cs.name}</span>
                            )}
                            {/* Price mode toggle + cost input */}
                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                title={cs.priceMode === "total" ? "Switch to per-unit price" : "Switch to total cost"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateSessions(countSessions.map((x) =>
                                    x.id === cs.id ? { ...x, priceMode: (x.priceMode === "total" ? "per-unit" : "total") as "per-unit" | "total" } : x
                                  ));
                                }}
                                className="text-[9px] font-mono text-muted-foreground hover:text-[#F5C518] transition-colors border border-border rounded px-1 py-0.5 leading-none"
                              >{cs.priceMode === "total" ? "total" : "$/ea"}</button>
                              <span className="text-[9px] text-muted-foreground font-mono">$</span>
                              <input
                                type="number" min={0} step={0.01} placeholder="0.00"
                                value={cs.unitCost ?? ""}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  updateSessions(countSessions.map((x) =>
                                    x.id === cs.id ? { ...x, unitCost: isNaN(val) ? undefined : val } : x
                                  ));
                                }}
                                className="w-14 bg-transparent border-b border-border text-[10px] font-mono text-foreground outline-none focus:border-[#F5C518]/60 text-right"
                              />
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground shrink-0">{cs.pins.length} pin{cs.pins.length !== 1 ? "s" : ""}</span>
                            {isEditing ? (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); handleRenameSession(cs.id); }} className="text-[#F5C518] hover:opacity-70"><Check size={12} /></button>
                                <button onClick={(e) => { e.stopPropagation(); setEditingSessionId(null); }} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>
                              </>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteSession(cs.id); }}
                                className="text-muted-foreground hover:text-destructive"
                              ><Trash2 size={11} /></button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* New session row */}
                  <div className="flex gap-2 pt-1">
                    <input value={newSessionName} onChange={(e) => setNewSessionName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSession()}
                      placeholder="Session name (e.g. Outlets - Bedroom)"
                      className="flex-1 bg-input border border-border rounded-md px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-[#F5C518]/60 transition-colors font-mono" />
                    <button onClick={handleAddSession}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#F5C518]/15 text-[#F5C518] text-xs font-medium hover:bg-[#F5C518]/25 transition-colors shrink-0">
                      <Plus size={12} /> New
                    </button>
                  </div>

                  {/* Active session config */}
                  {activeCountSession && (
                    <div className="pt-2 border-t border-border space-y-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Active: <span className="text-foreground">{activeCountSession.name}</span>
                      </p>
                      {/* Color picker */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Pin Color</Label>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {PIN_COLORS.map((c) => (
                            <button key={c.hex} title={c.label}
                              onClick={() => updateSessions(countSessions.map((cs) => cs.id === activeCountSession.id ? { ...cs, color: c.hex } : cs))}
                              className={cn("w-6 h-6 rounded-full border-2 transition-all", activeCountSession.color === c.hex ? "border-white scale-110" : "border-transparent hover:border-white/50")}
                              style={{ backgroundColor: c.hex }} />
                          ))}
                          <label className="relative w-6 h-6 rounded-full overflow-hidden border-2 border-dashed border-border hover:border-white/50 cursor-pointer" title="Custom color">
                            <input type="color" value={activeCountSession.color}
                              onChange={(e) => updateSessions(countSessions.map((cs) => cs.id === activeCountSession.id ? { ...cs, color: e.target.value } : cs))}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                            <span className="flex items-center justify-center w-full h-full text-[8px] text-muted-foreground">+</span>
                          </label>
                          <span className="font-mono text-[10px] text-muted-foreground ml-1">{activeCountSession.color}</span>
                        </div>
                      </div>
                      {/* Shape picker */}
                      <ResShapeSelector
                        activeIconId={activeCountSession.iconId}
                        activeColor={activeCountSession.color}
                        onSelect={(id) => updateSessions(countSessions.map((cs) => cs.id === activeCountSession.id ? { ...cs, iconId: id } : cs))}
                      />
                      {/* Undo last pin on current page */}
                      <div className="pt-1 border-t border-border/50">
                        <button
                          onClick={handleUndoLastPin}
                          disabled={!activeCountSession || activeCountSession.pins.filter((p) => (p.pageNumber ?? 1) === currentPage).length === 0}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          title="Remove last dropped pin on this page (U key also works)"
                        >
                          <Undo2 size={12} />
                          Undo last pin
                          {activeCountSession && activeCountSession.pins.filter((p) => (p.pageNumber ?? 1) === currentPage).length > 0 && (
                            <span className="ml-auto font-mono text-[10px] text-[#F5C518]">
                              {activeCountSession.pins.filter((p) => (p.pageNumber ?? 1) === currentPage).length} on pg {currentPage}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  </div>}
                </div>

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
                    {/* Count session rows — auto-appended below baseline materials */}
                    {countSessions.filter((cs) => cs.pins.length > 0).map((cs) => {
                      const isTotal = cs.priceMode === "total";
                      const extCost = cs.unitCost != null ? (isTotal ? cs.unitCost : cs.unitCost * cs.pins.length) : null;
                      const displayUnitCost = cs.unitCost != null ? (isTotal && cs.pins.length > 0 ? cs.unitCost / cs.pins.length : cs.unitCost) : null;
                      return (
                        <div key={cs.id} className="flex items-center gap-3 px-4 py-2.5 bg-[#F5C518]/5 hover:bg-[#F5C518]/10 transition-colors">
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <PinShapeSwatch shape={cs.iconId as PinShape} color={cs.color} size={13} />
                            <div>
                              <p className="text-xs text-foreground truncate">{cs.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Count Session · EA</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="w-18 h-8 flex items-center justify-end font-mono text-xs font-semibold text-foreground pr-1">{cs.pins.length}</span>
                            <span className="text-[10px] text-muted-foreground font-mono w-5">EA</span>
                            {extCost != null && (
                              <span className="text-[10px] font-mono text-[#F5C518] ml-1">${extCost.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-4 py-2.5 border-t border-border bg-secondary/20 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {materials.length} line items
                      {countSessions.filter(cs => cs.pins.length > 0).length > 0 && (
                        <span className="text-[#F5C518]"> + {countSessions.filter(cs => cs.pins.length > 0).length} count session{countSessions.filter(cs => cs.pins.length > 0).length !== 1 ? 's' : ''}</span>
                      )}
                    </span>
                    <span className="text-[10px] text-[#F5C518] font-mono">Changes saved automatically</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Delete session confirmation dialog */}
      {deletingSessionId && (() => {
        const sess = countSessions.find((cs) => cs.id === deletingSessionId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
              <h3 className="font-semibold text-foreground mb-2">Delete Session?</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Delete <span className="font-medium text-foreground">"{sess?.name}"</span> and its {sess?.pins.length ?? 0} pin{(sess?.pins.length ?? 0) !== 1 ? "s" : ""}? This cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeletingSessionId(null)} className="px-4 py-2 text-sm rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                <button onClick={() => confirmDeleteSession(deletingSessionId)} className="px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity font-medium">Delete</button>
              </div>
            </div>
          </div>
        );
      })()}
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
