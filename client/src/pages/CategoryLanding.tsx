/**
 * HelixBid — Home Screen
 *
 * Merged branded landing + project list.
 * Design: Tactical Dark Mode SaaS, Safety Yellow (#F5C518) accent.
 * - HelixBid branding at top
 * - Project list below (all 4 category stores merged into one view)
 * - "New Project" CTA prominent
 */
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand/BrandMark";
import { useApp } from "@/contexts/AppContext";
import type { CivilProject } from "@/contexts/AppContext";

interface ProjectLike {
  id: string;
  name: string;
  createdAt: number;
  category: "civil" | "commercial" | "residential" | "industrial";
}

export default function CategoryLanding({
  onSelect,
}: {
  onSelect?: (
    cat: "civil" | "commercial" | "residential" | "industrial",
    projectId?: string
  ) => void;
} = {}) {
  const {
    civilCatProjects,
    commercialCatProjects,
    residentialCatProjects,
    industrialCatProjects,
    addCivilCatProject,
    addCommercialCatProject,
    addResidentialCatProject,
    addIndustrialCatProject,
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
    permanentlyDeleteProject,
    emptyTrash,
    activeCivilCatId,
    activeCommercialCatId,
    activeResidentialCatId,
    activeIndustrialCatId,
  } = useApp();

  // Merge all projects into one flat list with category tag
  const allProjects: ProjectLike[] = [
    ...civilCatProjects.map(p => ({ ...p, category: "civil" as const })),
    ...commercialCatProjects.map(p => ({
      ...p,
      category: "commercial" as const,
    })),
    ...residentialCatProjects.map(p => ({
      ...p,
      category: "residential" as const,
    })),
    ...industrialCatProjects.map(p => ({
      ...p,
      category: "industrial" as const,
    })),
  ].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)); // newest first

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [pendingTrashId, setPendingTrashId] = useState<string | null>(null);
  const [undoId, setUndoId] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const visibleTrash = trashedProjects.filter(
    t => now - t.deletedAt < THIRTY_DAYS
  );

  // Helper: get the right store actions for a category
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
    // Default new projects to "civil" category (category is just a storage bucket now, not user-facing)
    addCivilCatProject(newName.trim());
    setNewName("");
    setShowNew(false);
    // Navigate directly to the PDF tool with the new project
    setTimeout(() => {
      window.location.hash = `/civil/__new__`;
    }, 80);
  }

  function handleRename(proj: ProjectLike) {
    if (editName.trim())
      getRenameAction(proj.category)(proj.id, editName.trim());
    setEditingId(null);
  }

  function handleOpen(proj: ProjectLike) {
    getSwitchAction(proj.category)(proj.id);
    // Navigate directly to the PDF tool with this project (skip intermediate page)
    window.location.hash = `/${proj.category}/${proj.id}`;
  }

  function handleTrashClick(proj: ProjectLike) {
    setPendingTrashId(proj.id);
  }

  function confirmTrash(id: string) {
    const proj = allProjects.find(p => p.id === id);
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
    return () => {
      if (undoTimer) clearTimeout(undoTimer);
    };
  }, [undoTimer]);

  const pendingProj = allProjects.find(p => p.id === pendingTrashId);

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* ── Branded Header ───────────────────────────────────────────────────── */}
      <div className="shrink-0 px-8 pt-10 pb-6 border-b border-border/40">
        <div className="max-w-4xl mx-auto flex items-end justify-between gap-4">
          <div>
            <h1
              className="text-5xl font-black tracking-tight text-foreground leading-none"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Bid<span className="text-[#F5C518]">Phase</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Electrical takeoff, simplified.
            </p>
          </div>

          {/* Trash shortcut — only shown when there are trashed projects */}
          {visibleTrash.length > 0 && (
            <button
              onClick={() => (window.location.hash = "/trash")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-muted/20 border border-border/50 shrink-0"
            >
              <Trash2 size={13} />
              Trash ({visibleTrash.length})
            </button>
          )}
        </div>

        {/* Inline new project form */}
        {showNew && (
          <div className="max-w-4xl mx-auto mt-4">
            <div className="flex items-center gap-3 p-4 rounded-xl border border-[#F5C518]/40 bg-card">
              <div className="w-9 h-9 rounded-lg bg-[#F5C518]/10 flex items-center justify-center shrink-0">
                <Plus size={16} className="text-[#F5C518]" />
              </div>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleNew();
                  if (e.key === "Escape") {
                    setShowNew(false);
                    setNewName("");
                  }
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
                onClick={() => {
                  setShowNew(false);
                  setNewName("");
                }}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Project Grid ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="max-w-4xl mx-auto">
          {allProjects.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#F5C518]/10 flex items-center justify-center">
                <BrandMark size={34} />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">
                  No projects yet
                </p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allProjects.map(proj => {
                const isActive = proj.id === getActiveId(proj.category);
                const isEditing = editingId === proj.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => {
                      if (!isEditing) handleOpen(proj);
                    }}
                    className={cn(
                      "group relative rounded-xl border bg-card flex flex-col cursor-pointer min-h-[160px]",
                      "transition-all duration-150 hover:shadow-lg",
                      isActive
                        ? "border-[#F5C518]/60 shadow-[0_0_0_1px_rgba(245,197,24,0.2)]"
                        : "border-border hover:border-border/80"
                    )}
                  >
                    {/* Card body */}
                    <div className="flex-1 px-5 pt-6 pb-4">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div
                            className="flex items-center gap-1.5"
                            onClick={e => e.stopPropagation()}
                          >
                            <input
                              autoFocus
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") handleRename(proj);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              onBlur={() => handleRename(proj)}
                              className="flex-1 min-w-0 bg-transparent border-b border-[#F5C518] text-lg text-foreground outline-none font-bold pb-0.5"
                            />
                            <button
                              onMouseDown={e => {
                                e.preventDefault();
                                handleRename(proj);
                              }}
                              className="text-[#F5C518] text-xs px-1.5 py-0.5 rounded hover:bg-[#F5C518]/10 shrink-0"
                            >
                              ✓
                            </button>
                          </div>
                        ) : (
                          <h3
                            className="text-xl font-bold text-foreground leading-snug"
                            style={{
                              fontFamily: "'Space Grotesk', sans-serif",
                            }}
                          >
                            {proj.name}
                          </h3>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-2">
                          {proj.createdAt
                            ? new Date(proj.createdAt).toLocaleDateString()
                            : ""}
                        </p>
                      </div>
                    </div>

                    {/* Action row */}
                    <div
                      className="flex items-center justify-between px-4 py-3 border-t border-border/50 gap-2"
                      onClick={e => e.stopPropagation()}
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

              {/* New project dashed card */}
              {!showNew && (
                <button
                  onClick={() => setShowNew(true)}
                  className={cn(
                    "rounded-xl border-2 border-dashed border-border hover:border-[#F5C518]/40",
                    "bg-transparent hover:bg-[#F5C518]/5 transition-all duration-150",
                    "flex flex-col items-center justify-center gap-2 p-6 min-h-[160px]",
                    "text-muted-foreground hover:text-[#F5C518]"
                  )}
                >
                  <Plus size={24} />
                  <span
                    className="text-sm font-medium"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    New Project
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer hint ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-center pb-4">
        <p className="text-[11px] text-muted-foreground/30 font-mono tracking-wide">
          Click the BP logo at any time to return here
        </p>
      </div>

      {/* ── Trash confirmation dialog ─────────────────────────────────────────── */}
      {pendingTrashId && pendingProj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-foreground mb-2">
              Move to Trash?
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              Move{" "}
              <span className="font-medium text-foreground">
                "{pendingProj.name}"
              </span>{" "}
              to trash? You can restore it within 30 days.
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

      {/* ── Undo toast ───────────────────────────────────────────────────────── */}
      {undoId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-card border border-border shadow-2xl">
          <span className="text-sm text-foreground">
            Project moved to trash
          </span>
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
