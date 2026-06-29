/**
 * BidPhase — Commercial Buildout (Assembly Multiplier)
 * Design: Tactical Dark Mode SaaS · Space Grotesk headers · JetBrains Mono outputs
 *
 * Features:
 * - Project homepage (card grid) → open project editor
 * - Embedded PlanPanel (resizable split pane, project-scoped)
 * - Assembly dropdown + quantity → itemized BOM + labor hours
 * - Count Mode: named sessions, cross-page pin totals, live BOM line per session
 */
import { useState, useEffect, useCallback } from "react";
import { useApp, type AssemblyMaterialLine, type CountPin, type CountSession } from "@/contexts/AppContext";
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
import { Building2, Clock, DollarSign, ChevronLeft, ChevronDown, ChevronUp, Plus, Trash2, Pencil, Check, X, Undo2 } from "lucide-react";
import { COUNT_ICONS, PIN_COLORS, DEFAULT_ICON_ID, DEFAULT_PIN_COLOR, type PinShape } from "@/lib/CountIcons";
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

/** Generates a short random ID for count sessions */
function sid() {
  return Math.random().toString(36).slice(2, 8);
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
  const { activeCommercialProject, setAssemblyState, setShowMaterialList } = useApp();
  const s = activeCommercialProject.state;
  const {
    assemblyId,
    quantity,
    iconId = DEFAULT_ICON_ID,
    pinColor = DEFAULT_PIN_COLOR,
    countSessions = [],
    activeCountSessionId,
  } = s;

  const selectedAssembly = ASSEMBLIES.find((a) => a.id === assemblyId) ?? ASSEMBLIES[0];
  const qty = Math.max(1, quantity || 1);
  const bom = buildBOM(selectedAssembly, qty);
  const totalLaborHours = parseFloat((selectedAssembly.blendedLaborHours * qty).toFixed(2));
  const totalMaterialCost = parseFloat((
    bom.reduce((sum, m) => sum + m.unitCost * m.quantity, 0) +
    countSessions.reduce((sum, cs) => {
      if (cs.unitCost == null || cs.pins.length === 0) return sum;
      return sum + (cs.priceMode === "total" ? cs.unitCost : cs.unitCost * cs.pins.length);
    }, 0)
  ).toFixed(2));

  // The currently active count session object
  const activeSession = countSessions.find((cs) => cs.id === activeCountSessionId) ?? null;

  // ── Session editing state ─────────────────────────────────────────────────
  const [newSessionName, setNewSessionName] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [countSessionsOpen, setCountSessionsOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  // Sync assembly state to project whenever assemblyId or qty changes
  useEffect(() => {
    setAssemblyState({ ...s, assemblyId, quantity: qty, materials: bom, totalLaborHours });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assemblyId, qty]);

  // ── Session helpers ───────────────────────────────────────────────────────
  const updateSessions = useCallback((sessions: CountSession[], activeId?: string) => {
    setAssemblyState({
      ...s,
      countSessions: sessions,
      activeCountSessionId: activeId !== undefined ? activeId : activeCountSessionId,
    });
  }, [s, setAssemblyState, activeCountSessionId]);

  const handleAddSession = () => {
    const name = newSessionName.trim() || `Count ${countSessions.length + 1}`;
    const newSession: CountSession = {
      id: sid(),
      name,
      iconId,
      color: pinColor,
      pins: [],
    };
    const updated = [...countSessions, newSession];
    updateSessions(updated, newSession.id);
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
    const updated = countSessions.map((cs) => cs.id === id ? { ...cs, name } : cs);
    updateSessions(updated);
    setEditingSessionId(null);
  };

  // ── Pin callbacks (passed to PlanPanel) ──────────────────────────────────
  const handlePinAdded = useCallback((pin: CountPin) => {
    if (!activeCountSessionId) return;
    const updated = countSessions.map((cs) =>
      cs.id === activeCountSessionId ? { ...cs, pins: [...cs.pins, pin] } : cs
    );
    // Also increment the assembly quantity to match total pin count
    const activeCs = updated.find((cs) => cs.id === activeCountSessionId);
    const totalPins = updated.reduce((sum, cs) => sum + cs.pins.length, 0);
    setAssemblyState({ ...s, countSessions: updated, quantity: Math.max(qty, totalPins), activeCountSessionId });
    void activeCs; // suppress unused warning
  }, [activeCountSessionId, countSessions, s, setAssemblyState, qty]);

  const handlePinRemoved = useCallback((pinId: string) => {
    if (!activeCountSessionId) return;
    const updated = countSessions.map((cs) =>
      cs.id === activeCountSessionId
        ? { ...cs, pins: cs.pins.filter((p) => p.id !== pinId) }
        : cs
    );
    const totalPins = updated.reduce((sum, cs) => sum + cs.pins.length, 0);
    setAssemblyState({ ...s, countSessions: updated, quantity: Math.max(1, totalPins), activeCountSessionId });
  }, [activeCountSessionId, countSessions, s, setAssemblyState]);

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
    const totalPins = updated.reduce((sum, cs) => sum + cs.pins.length, 0);
    setAssemblyState({ ...s, countSessions: updated, quantity: Math.max(1, totalPins), activeCountSessionId });
    toast.info("Last pin removed.");
  }, [activeCountSessionId, countSessions, currentPage, s, setAssemblyState]);

  const handleClearPagePins = useCallback((pageNumber: number) => {
    if (!activeCountSessionId) return;
    const updated = countSessions.map((cs) =>
      cs.id === activeCountSessionId
        ? { ...cs, pins: cs.pins.filter((p) => p.pageNumber !== pageNumber) }
        : cs
    );
    const totalPins = updated.reduce((sum, cs) => sum + cs.pins.length, 0);
    setAssemblyState({ ...s, countSessions: updated, quantity: Math.max(1, totalPins), activeCountSessionId });
  }, [activeCountSessionId, countSessions, s, setAssemblyState]);

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
            activeCountSession={activeSession}
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

                {/* ── Unit Count ─────────────────────────────────────────── */}
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

                  {/* Session list */}
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
                              isActive
                                ? "border-[#F5C518] bg-[#F5C518]/8"
                                : "border-border bg-muted/5 hover:border-border/80"
                            )}
                          >
                            {/* Shape swatch */}
                            <PinShapeSwatch shape={cs.iconId as PinShape} color={cs.color} size={16} />

                            {/* Name / edit input */}
                            {isEditing ? (
                              <input
                                autoFocus
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleRenameSession(cs.id);
                                  if (e.key === "Escape") setEditingSessionId(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 bg-transparent border-b border-[#F5C518] text-xs text-foreground outline-none font-mono"
                              />
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
                                  const updated = countSessions.map((x) =>
                                    x.id === cs.id ? { ...x, priceMode: (x.priceMode === "total" ? "per-unit" : "total") as "per-unit" | "total" } : x
                                  );
                                  setAssemblyState({ ...s, countSessions: updated });
                                }}
                                className="text-[9px] font-mono text-muted-foreground hover:text-[#F5C518] transition-colors border border-border rounded px-1 py-0.5 leading-none"
                              >{cs.priceMode === "total" ? "total" : "$/ea"}</button>
                              <span className="text-[9px] text-muted-foreground font-mono">$</span>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                placeholder="0.00"
                                value={cs.unitCost ?? ""}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  const updated = countSessions.map((x) =>
                                    x.id === cs.id ? { ...x, unitCost: isNaN(val) ? undefined : val } : x
                                  );
                                  setAssemblyState({ ...s, countSessions: updated });
                                }}
                                className="w-14 bg-transparent border-b border-border text-[10px] font-mono text-foreground outline-none focus:border-[#F5C518]/60 text-right"
                              />
                            </div>

                            {/* Pin count badge */}
                            <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                              {cs.pins.length} pin{cs.pins.length !== 1 ? "s" : ""}
                            </span>

                            {/* Delete only — rename via click on name */}
                            {isEditing ? (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); handleRenameSession(cs.id); }} className="text-[#F5C518] hover:opacity-70 transition-opacity"><Check size={12} /></button>
                                <button onClick={(e) => { e.stopPropagation(); setEditingSessionId(null); }} className="text-muted-foreground hover:text-foreground transition-colors"><X size={12} /></button>
                              </>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteSession(cs.id); }}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                              ><Trash2 size={11} /></button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* New session row */}
                  <div className="flex gap-2 pt-1">
                    <input
                      value={newSessionName}
                      onChange={(e) => setNewSessionName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSession()}
                      placeholder="Session name (e.g. Outlets - Room 101)"
                      className="flex-1 bg-input border border-border rounded-md px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-[#F5C518]/60 transition-colors font-mono"
                    />
                    <button
                      onClick={handleAddSession}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#F5C518]/15 text-[#F5C518] text-xs font-medium hover:bg-[#F5C518]/25 transition-colors shrink-0"
                    >
                      <Plus size={12} /> New
                    </button>
                  </div>

                  {/* Active session config: color + icon */}
                  {activeSession && (
                    <div className="pt-2 border-t border-border space-y-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Active: <span className="text-foreground">{activeSession.name}</span>
                      </p>

                      {/* Color picker */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Pin Color</Label>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {PIN_COLORS.map((c) => (
                            <button
                              key={c.hex}
                              title={c.label}
                              onClick={() => {
                                const updated = countSessions.map((cs) =>
                                  cs.id === activeSession.id ? { ...cs, color: c.hex } : cs
                                );
                                setAssemblyState({ ...s, countSessions: updated, pinColor: c.hex });
                              }}
                              className={cn(
                                "w-6 h-6 rounded-full border-2 transition-all",
                                activeSession.color === c.hex ? "border-white scale-110" : "border-transparent hover:border-white/50"
                              )}
                              style={{ backgroundColor: c.hex }}
                            />
                          ))}
                          <label className="relative w-6 h-6 rounded-full overflow-hidden border-2 border-dashed border-border hover:border-white/50 cursor-pointer" title="Custom color">
                            <input
                              type="color"
                              value={activeSession.color}
                              onChange={(e) => {
                                const updated = countSessions.map((cs) =>
                                  cs.id === activeSession.id ? { ...cs, color: e.target.value } : cs
                                );
                                setAssemblyState({ ...s, countSessions: updated, pinColor: e.target.value });
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <span className="flex items-center justify-center w-full h-full text-[8px] text-muted-foreground">+</span>
                          </label>
                          <span className="font-mono text-[10px] text-muted-foreground ml-1">{activeSession.color}</span>
                        </div>
                      </div>

                      {/* Shape picker — 4 simple shapes */}
                      <ShapeSelector
                        activeIconId={activeSession.iconId}
                        activeColor={activeSession.color}
                        onSelect={(id) => {
                          const updated = countSessions.map((cs) =>
                            cs.id === activeSession.id ? { ...cs, iconId: id } : cs
                          );
                          setAssemblyState({ ...s, countSessions: updated, iconId: id });
                        }}
                      />
                      {/* Undo last pin on current page */}
                      <div className="pt-1 border-t border-border/50">
                        <button
                          onClick={handleUndoLastPin}
                          disabled={!activeSession || activeSession.pins.filter((p) => (p.pageNumber ?? 1) === currentPage).length === 0}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                          title="Remove last dropped pin on this page (U key also works)"
                        >
                          <Undo2 size={12} />
                          Undo last pin
                          {activeSession && activeSession.pins.filter((p) => (p.pageNumber ?? 1) === currentPage).length > 0 && (
                            <span className="ml-auto font-mono text-[10px] text-[#F5C518]">
                              {activeSession.pins.filter((p) => (p.pageNumber ?? 1) === currentPage).length} on pg {currentPage}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  </div>}
                </div>


                {/* Inputs */}
                <div className="bp-card p-4 space-y-4">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Assembly Inputs
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

                {/* BOM Table — includes a line per count session */}
                <div className="bp-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Bill of Materials
                    </h2>
                    <button
                      onClick={() => setShowMaterialList(true)}
                      className="text-[10px] font-mono text-[#F5C518]/70 hover:text-[#F5C518] transition-colors"
                      title="Open full-screen material list"
                    >
                      Labor & Material →
                    </button>
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
                        {/* Unit Count lines — one row per session with its total pin count */}
                        {countSessions.filter((cs) => cs.pins.length > 0).map((cs) => {
                          const isTotal = cs.priceMode === "total";
                          const extCost = cs.unitCost != null ? (isTotal ? cs.unitCost : cs.unitCost * cs.pins.length) : null;
                          const displayUnitCost = cs.unitCost != null ? (isTotal && cs.pins.length > 0 ? cs.unitCost / cs.pins.length : cs.unitCost) : null;
                          return (
                            <tr key={cs.id} className="border-b border-border/50 bg-[#F5C518]/3 hover:bg-[#F5C518]/6 transition-colors">
                              <td className="px-4 py-2 text-foreground">
                                <div className="flex items-center gap-1.5">
                                  <PinShapeSwatch shape={cs.iconId as PinShape} color={cs.color} size={12} />
                                  {cs.name}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center font-mono text-muted-foreground">EA</td>
                              <td className="px-3 py-2 text-right font-mono font-semibold text-foreground">{cs.pins.length}</td>
                              <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                                {displayUnitCost != null ? `$${displayUnitCost.toFixed(2)}` : "—"}
                              </td>
                              <td className="px-4 py-2 text-right font-mono font-semibold text-[#F5C518]">
                                {extCost != null ? `$${extCost.toFixed(2)}` : "—"}
                              </td>
                            </tr>
                          );
                        })}
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

// ─── Pin shape swatch (inline SVG preview) ──────────────────────────────────
function PinShapeSwatch({ shape, color, size = 16 }: { shape: PinShape; color: string; size?: number }) {
  const icon = COUNT_ICONS.find((ic) => ic.id === shape) ?? COUNT_ICONS[0];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" className="shrink-0">
      {icon.paths.map((seg, pi) => (
        <path
          key={pi}
          d={seg.d}
          fill={seg.strokeOnly ? "none" : color}
          stroke={color}
          strokeWidth={seg.strokeWidth ?? 1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

// ─── Simple 4-shape picker ───────────────────────────────────────────────────
function ShapeSelector({
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
          <button
            key={icon.id}
            title={icon.label}
            onClick={() => onSelect(icon.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-md border text-[9px] transition-all flex-1",
              activeIconId === icon.id
                ? "border-[#F5C518] bg-[#F5C518]/10 text-foreground"
                : "border-border bg-muted/10 text-muted-foreground hover:border-border/80 hover:text-foreground"
            )}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
              {icon.paths.map((seg, pi) => (
                <path
                  key={pi}
                  d={seg.d}
                  fill={seg.strokeOnly ? "none" : (activeIconId === icon.id ? activeColor : "currentColor")}
                  stroke={activeIconId === icon.id ? activeColor : "currentColor"}
                  strokeWidth={seg.strokeWidth ?? 1.5}
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
  if (!proj) return null;

  return (
    <CommercialEditor
      projectId={resolvedOpenId}
      projectName={proj.name}
      onBack={() => setOpenProjectId(null)}
    />
  );
}
