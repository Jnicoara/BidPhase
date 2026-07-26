/**
 * ProjectsPage — v5.47
 * Classic card-grid layout using the legacy AppContext project store.
 * Opening or creating a project routes directly to the PDF workspace (/#/civil/:id).
 * - Dashed "+" card at end of grid to create a new project (name only, inline)
 * - Existing project cards: large name, created date, Open / Rename / Delete action row
 */
import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Trash2, RotateCcw, X, Search, ChevronDown, ChevronUp, Building2, MapPin, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import type { CivilProject } from "@/contexts/AppContext";

const STATUS_OPTIONS: { value: CivilProject["status"]; label: string; color: string }[] = [
  { value: "bidding",     label: "Bidding",     color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  { value: "won",         label: "Won",         color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "in-progress", label: "In Progress", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "lost",        label: "Lost",        color: "bg-muted/30 text-muted-foreground border-border" },
];

interface ProjectLike extends CivilProject {
  category: "civil" | "commercial" | "residential" | "industrial";
}

export default function ProjectsPage() {
  const {
    civilCatProjects,
    commercialCatProjects,
    residentialCatProjects,
    industrialCatProjects,
    addCivilCatProject,
    renameCivilCatProject,
    renameCommercialCatProject,
    renameResidentialCatProject,
    renameIndustrialCatProject,
    deleteCivilCatProject,
    deleteCommercialCatProject,
    deleteResidentialCatProject,
    deleteIndustrialCatProject,
    switchCivilCatProject,
    switchCommercialCatProject,
    switchResidentialCatProject,
    switchIndustrialCatProject,
    trashedProjects,
    trashProject,
    restoreProject,
    activeCivilCatId,
    activeCommercialCatId,
    activeResidentialCatId,
    activeIndustrialCatId,
    updateProjectMeta,
  } = useApp();

  // Merge all projects into one flat list, newest first
  const allProjects: ProjectLike[] = [
    ...civilCatProjects.map((p) => ({ ...p, category: "civil" as const })),
    ...commercialCatProjects.map((p) => ({ ...p, category: "commercial" as const })),
    ...residentialCatProjects.map((p) => ({ ...p, category: "residential" as const })),
    ...industrialCatProjects.map((p) => ({ ...p, category: "industrial" as const })),
  ].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [pendingTrashId, setPendingTrashId] = useState<string | null>(null);
  const [undoId, setUndoId] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  // Which card has its meta fields expanded
  const [expandedMetaId, setExpandedMetaId] = useState<string | null>(null);

  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const visibleTrash = trashedProjects.filter((t) => now - t.deletedAt < THIRTY_DAYS);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allProjects;
    return allProjects.filter((p) => p.name.toLowerCase().includes(q));
  }, [allProjects, searchQuery]);

  function getRenameAction(cat: ProjectLike["category"]) {
    if (cat === "civil") return renameCivilCatProject;
    if (cat === "commercial") return renameCommercialCatProject;
    if (cat === "industrial") return renameIndustrialCatProject;
    return renameResidentialCatProject;
  }
  function getDeleteAction(cat: ProjectLike["category"]) {
    if (cat === "civil") return deleteCivilCatProject;
    if (cat === "commercial") return deleteCommercialCatProject;
    if (cat === "industrial") return deleteIndustrialCatProject;
    return deleteResidentialCatProject;
  }
  function getSwitchAction(cat: ProjectLike["category"]) {
    if (cat === "civil") return switchCivilCatProject;
    if (cat === "commercial") return switchCommercialCatProject;
    if (cat === "industrial") return switchIndustrialCatProject;
    return switchResidentialCatProject;
  }
  function getActiveId(cat: ProjectLike["category"]) {
    if (cat === "civil") return activeCivilCatId;
    if (cat === "commercial") return activeCommercialCatId;
    if (cat === "industrial") return activeIndustrialCatId;
    return activeResidentialCatId;
  }

  function handleNew() {
    if (!newName.trim()) return;
    addCivilCatProject(newName.trim());
    setNewName("");
    setShowNew(false);
    // Navigate directly to the PDF workspace with the new project
    setTimeout(() => {
      window.location.hash = `/civil/__new__`;
    }, 80);
  }

  function handleRename(proj: ProjectLike) {
    if (editName.trim()) getRenameAction(proj.category)(proj.id, editName.trim());
    setEditingId(null);
  }

  function handleOpen(proj: ProjectLike) {
    getSwitchAction(proj.category)(proj.id);
    window.location.hash = `/${proj.category}/${proj.id}`;
  }

  function handleTrashClick(proj: ProjectLike) {
    setPendingTrashId(proj.id);
  }

  function confirmTrash(id: string) {
    const proj = allProjects.find((p) => p.id === id);
    if (!proj) return;
    trashProject(proj as unknown as CivilProject, proj.category);
    getDeleteAction(proj.category)(id);
    setPendingTrashId(null);
    setUndoId(id);
    if (undoTimer) clearTimeout(undoTimer);
    const t = setTimeout(() => setUndoId(null), 5000);
    setUndoTimer(t);
  }

  function handleUndo() {
    if (!undoId) return;
    restoreProject(undoId);
    setUndoId(null);
    if (undoTimer) clearTimeout(undoTimer);
  }

  useEffect(() => {
    return () => { if (undoTimer) clearTimeout(undoTimer); };
  }, [undoTimer]);

  const pendingProj = allProjects.find((p) => p.id === pendingTrashId);

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* ── Header ── */}
      <div className="shrink-0 px-8 pt-8 pb-5 border-b border-border/40">
        <div className="max-w-5xl mx-auto flex items-end justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-black tracking-tight text-foreground leading-none"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Projects
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {allProjects.length} project{allProjects.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Trash shortcut */}
          {visibleTrash.length > 0 && (
            <button
              onClick={() => { window.location.hash = "/trash"; }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted/20 border border-border/50 shrink-0"
            >
              <Trash2 size={13} />
              Trash ({visibleTrash.length})
            </button>
          )}
        </div>

        {/* Search bar */}
        <div className="max-w-5xl mx-auto mt-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects…"
              className="w-full h-9 pl-9 pr-9 text-sm bg-muted/20 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:border-[#F5C518]/60 focus:bg-muted/30 outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-[11px] text-muted-foreground mt-1.5 ml-1">
              {filteredProjects.length} result{filteredProjects.length !== 1 ? "s" : ""} for "{searchQuery}"
            </p>
          )}
        </div>

        {/* Inline new project form */}
        {showNew && (
          <div className="max-w-5xl mx-auto mt-4">
            <div className="flex items-center gap-3 p-4 rounded-xl border border-[#F5C518]/40 bg-card">
              <div className="w-9 h-9 rounded-lg bg-[#F5C518]/10 flex items-center justify-center shrink-0">
                <Plus size={16} className="text-[#F5C518]" />
              </div>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNew();
                  if (e.key === "Escape") { setShowNew(false); setNewName(""); }
                }}
                placeholder="Project name…"
                className="flex-1 h-9 text-sm bg-background border border-border rounded-md px-3 text-foreground focus:border-[#F5C518]/60 outline-none"
              />
              <button
                onClick={handleNew}
                className="px-4 py-2 rounded-md bg-[#F5C518] text-black text-xs font-bold hover:bg-[#F5C518]/90 transition-colors shrink-0"
              >
                Create
              </button>
              <button
                onClick={() => { setShowNew(false); setNewName(""); }}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Project Grid ── */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="max-w-5xl mx-auto">
          {filteredProjects.length === 0 && searchQuery ? (
            /* No search results */
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <Search size={32} className="text-muted-foreground/30" />
              <div>
                <p className="text-base font-semibold text-foreground">No projects match "{searchQuery}"</p>
                <p className="text-sm text-muted-foreground mt-1">Try a different name or clear the search.</p>
              </div>
              <button
                onClick={() => setSearchQuery("")}
                className="text-sm text-[#F5C518] hover:text-[#F5C518]/80 transition-colors"
              >
                Clear search
              </button>
            </div>
          ) : allProjects.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#F5C518]/10 flex items-center justify-center">
                <span className="font-bold text-[#F5C518] text-2xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>HB</span>
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">No projects yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a PDF plan and start measuring in under a minute.
                </p>
              </div>
              <button
                onClick={() => setShowNew(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F5C518] text-black text-sm font-bold hover:bg-[#F5C518]/90 active:scale-[0.97] transition-all duration-150"
              >
                <Plus size={16} />
                Create your first project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProjects.map((proj) => {
                const isActive = proj.id === getActiveId(proj.category);
                const isEditing = editingId === proj.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => { if (!isEditing) handleOpen(proj); }}
                    className={cn(
                      "group relative rounded-xl border bg-card flex flex-col cursor-pointer min-h-[160px]",
                      "transition-all duration-150 hover:shadow-lg hover:shadow-black/20",
                      isActive
                        ? "border-[#F5C518]/60 shadow-[0_0_0_1px_rgba(245,197,24,0.2)]"
                        : "border-border hover:border-border/80"
                    )}
                  >
                    {/* Card body */}
                    <div className="flex-1 px-5 pt-5 pb-3">
                      {/* Status badge row */}
                      <div className="flex items-center justify-between mb-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={proj.status ?? ""}
                          onChange={(e) => updateProjectMeta(proj.id, { status: (e.target.value || undefined) as CivilProject["status"] })}
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full border outline-none cursor-pointer bg-transparent transition-colors",
                            proj.status
                              ? (STATUS_OPTIONS.find((s) => s.value === proj.status)?.color ?? "bg-muted/20 text-muted-foreground border-border")
                              : "text-muted-foreground border-border/50 hover:border-[#F5C518]/40"
                          )}
                        >
                          <option value="">No Status</option>
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value!}>{s.label}</option>
                          ))}
                        </select>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {proj.createdAt ? new Date(proj.createdAt).toLocaleDateString() : ""}
                        </span>
                      </div>

                      {/* Project name */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              autoFocus
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(proj);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              onBlur={() => handleRename(proj)}
                              className="flex-1 min-w-0 bg-transparent border-b border-[#F5C518] text-lg text-foreground outline-none font-bold pb-0.5"
                            />
                            <button
                              onMouseDown={(e) => { e.preventDefault(); handleRename(proj); }}
                              className="text-[#F5C518] text-xs px-1.5 py-0.5 rounded hover:bg-[#F5C518]/10 shrink-0"
                            >✓</button>
                          </div>
                        ) : (
                          <h3 className="text-xl font-bold text-foreground leading-snug" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            {proj.name}
                          </h3>
                        )}
                      </div>

                      {/* Meta preview (customer / address / bid date) */}
                      {(proj.customerName || proj.address || proj.bidDate) && (
                        <div className="mt-2 space-y-0.5">
                          {proj.customerName && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Building2 size={10} className="shrink-0" />
                              <span className="truncate">{proj.customerName}</span>
                            </div>
                          )}
                          {proj.address && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <MapPin size={10} className="shrink-0" />
                              <span className="truncate">{proj.address}</span>
                            </div>
                          )}
                          {proj.bidDate && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Calendar size={10} className="shrink-0" />
                              <span>{new Date(proj.bidDate + "T12:00:00").toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Expand/collapse meta edit fields */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedMetaId(expandedMetaId === proj.id ? null : proj.id); }}
                        className="mt-2.5 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {expandedMetaId === proj.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        {expandedMetaId === proj.id ? "Hide details" : "Add details"}
                      </button>

                      {/* Meta edit fields */}
                      {expandedMetaId === proj.id && (
                        <div className="mt-2.5 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="text-[10px] text-muted-foreground uppercase tracking-wide block mb-0.5">Customer Name</label>
                            <input
                              type="text"
                              value={proj.customerName ?? ""}
                              onChange={(e) => updateProjectMeta(proj.id, { customerName: e.target.value || undefined })}
                              placeholder="e.g. Acme Corp"
                              className="w-full h-7 px-2 text-xs bg-muted/20 border border-border rounded text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[#F5C518]/60 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground uppercase tracking-wide block mb-0.5">Address / Site</label>
                            <input
                              type="text"
                              value={proj.address ?? ""}
                              onChange={(e) => updateProjectMeta(proj.id, { address: e.target.value || undefined })}
                              placeholder="e.g. 123 Main St"
                              className="w-full h-7 px-2 text-xs bg-muted/20 border border-border rounded text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[#F5C518]/60 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground uppercase tracking-wide block mb-0.5">Bid Date</label>
                            <input
                              type="date"
                              value={proj.bidDate ?? ""}
                              onChange={(e) => updateProjectMeta(proj.id, { bidDate: e.target.value || undefined })}
                              className="w-full h-7 px-2 text-xs bg-muted/20 border border-border rounded text-foreground outline-none focus:border-[#F5C518]/60 transition-colors"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action row */}
                    <div
                      className="flex items-center justify-between px-4 py-3 border-t border-border/50 gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleOpen(proj)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-[#F5C518] hover:bg-[#F5C518]/10 transition-colors border border-[#F5C518]/20 hover:border-[#F5C518]/40"
                      >
                        Open
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            if (editingId === proj.id) {
                              setEditingId(null);
                            } else {
                              setEditingId(proj.id);
                              setEditName(proj.name);
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors border border-transparent hover:border-border/50"
                          title="Rename"
                        >
                          <Pencil size={13} />
                          <span>Rename</span>
                        </button>
                        <button
                          onClick={() => handleTrashClick(proj)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors border border-transparent hover:border-destructive/30"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Dashed new project card */}
              {!showNew && (
                <button
                  onClick={() => setShowNew(true)}
                  className={cn(
                    "rounded-xl border-2 border-dashed border-border hover:border-[#F5C518]/40",
                    "bg-transparent hover:bg-[#F5C518]/5 transition-all duration-150",
                    "flex flex-col items-center justify-center gap-2 p-6 min-h-[160px]",
                    "text-muted-foreground hover:text-[#F5C518] active:scale-[0.98]"
                  )}
                >
                  <Plus size={28} />
                  <span className="text-sm font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    New Project
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Trash confirmation dialog ── */}
      {pendingTrashId && pendingProj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-foreground mb-2">Move to Trash?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Move <span className="font-medium text-foreground">"{pendingProj.name}"</span> to trash? You can restore it within 30 days.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingTrashId(null)}
                className="px-4 py-2 text-sm rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmTrash(pendingTrashId)}
                className="px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity font-medium"
              >
                Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Undo toast ── */}
      {undoId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-card border border-border shadow-2xl">
          <span className="text-sm text-foreground">Project moved to trash</span>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#F5C518] hover:text-[#F5C518]/80 transition-colors"
          >
            <RotateCcw size={14} />
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
