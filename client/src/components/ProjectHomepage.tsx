/**
 * ProjectHomepage — project list with larger edit/delete, trash system, and inline rename.
 *
 * Design: Tactical Dark Mode SaaS, Safety Yellow (#F5C518) accent.
 */
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, RotateCcw, X, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexts/AppContext";
import type { CivilProject } from "@/contexts/AppContext";

// Minimal project shape accepted by ProjectHomepage
interface ProjectLike {
  id: string;
  name: string;
  createdAt: number;
  state?: unknown;
}

interface ProjectHomepageProps {
  projects: ProjectLike[];
  activeId: string;
  onOpen: (id: string) => void;
  onNew: (name?: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onSwitch?: (id: string) => void;
  category?: "civil" | "commercial" | "residential";
}

export default function ProjectHomepage({
  projects,
  activeId,
  onOpen,
  onNew,
  onRename,
  onDelete,
  onSwitch,
  category,
}: ProjectHomepageProps) {
  const { trashedProjects, trashProject, restoreProject, permanentlyDeleteProject, emptyTrash } = useApp();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  // Trash confirmation: id of project being soft-deleted
  const [pendingTrashId, setPendingTrashId] = useState<string | null>(null);
  // Undo toast: recently trashed project id
  const [undoId, setUndoId] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  // Trash view
  const [showTrash, setShowTrash] = useState(false);
  // Permanent delete confirmation in trash view
  const [permDeleteId, setPermDeleteId] = useState<string | null>(null);

  const categoryTrash = trashedProjects.filter((t) => t.category === category);
  // Auto-expire items older than 30 days from display (they stay in storage until emptyTrash)
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const visibleTrash = categoryTrash.filter((t) => now - t.deletedAt < THIRTY_DAYS);

  function handleNew() {
    if (!newName.trim()) return;
    onNew(newName.trim());
    setNewName("");
    setShowNew(false);
  }

  function handleRename(id: string) {
    if (editName.trim()) onRename(id, editName.trim());
    setEditingId(null);
  }

  function handleTrashClick(proj: ProjectLike) {
    setPendingTrashId(proj.id);
  }

  function confirmTrash(id: string) {
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;
    // Soft-delete: move to trash
    trashProject(proj as CivilProject, category ?? "civil");
    onDelete(id);
    setPendingTrashId(null);
    // Show undo toast for 5 seconds
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

  const pendingProj = projects.find((p) => p.id === pendingTrashId);

  if (showTrash) {
    return (
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
          <button
            onClick={() => setShowTrash(false)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
            Close Trash
          </button>
          <span className="flex-1" />
          {visibleTrash.length > 0 && (
            <button
              onClick={() => emptyTrash()}
              className="text-xs text-destructive hover:opacity-80 transition-opacity font-medium"
            >
              Empty Trash
            </button>
          )}
        </div>
        <div className="flex-1 overflow-auto p-6">
          {visibleTrash.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
              <Trash2 size={32} className="opacity-30" />
              <p className="text-sm">Trash is empty</p>
              <p className="text-xs opacity-60">Deleted projects appear here for 30 days</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl">
              <p className="text-xs text-muted-foreground mb-4">
                Projects are permanently deleted after 30 days. You can restore or permanently delete them here.
              </p>
              {visibleTrash.map((item) => {
                const daysLeft = Math.ceil((THIRTY_DAYS - (now - item.deletedAt)) / (24 * 60 * 60 * 1000));
                return (
                  <div key={item.project.id} className="flex items-center gap-4 px-4 py-3 rounded-xl border border-border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.project.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Deleted {new Date(item.deletedAt).toLocaleDateString()} · {daysLeft} day{daysLeft !== 1 ? "s" : ""} until permanent deletion
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => restoreProject(item.project.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#F5C518] border border-[#F5C518]/30 hover:bg-[#F5C518]/10 transition-colors"
                      >
                        <RotateCcw size={12} />
                        Restore
                      </button>
                      <button
                        onClick={() => setPermDeleteId(item.project.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 size={12} />
                        Delete Forever
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* Permanent delete confirmation */}
        {permDeleteId && (() => {
          const item = visibleTrash.find((t) => t.project.id === permDeleteId);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
                <h3 className="font-semibold text-foreground mb-2">Permanently Delete?</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  <span className="font-medium text-foreground">"{item?.project.name}"</span> will be permanently deleted and cannot be recovered.
                </p>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setPermDeleteId(null)} className="px-4 py-2 text-sm rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                  <button onClick={() => { permanentlyDeleteProject(permDeleteId); setPermDeleteId(null); }} className="px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity font-medium">Delete Forever</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Projects
        </h2>
        <div className="flex items-center gap-2">
          {visibleTrash.length > 0 && (
            <button
              onClick={() => setShowTrash(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/20"
            >
              <Trash2 size={13} />
              Trash ({visibleTrash.length})
            </button>
          )}
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F5C518] text-black text-xs font-semibold hover:bg-[#F5C518]/90 transition-colors"
          >
            <Plus size={13} />
            New Project
          </button>
        </div>
      </div>

      {/* Project grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => {
            const isActive = proj.id === activeId;
            const isEditing = editingId === proj.id;
            return (
              <div
                key={proj.id}
                onClick={() => { if (!isEditing) { onSwitch?.(proj.id); onOpen(proj.id); } }}
                className={cn(
                  "group relative rounded-xl border bg-card flex flex-col cursor-pointer",
                  "transition-all duration-150 hover:shadow-lg",
                  isActive
                    ? "border-[#F5C518]/60 shadow-[0_0_0_1px_rgba(245,197,24,0.2)]"
                    : "border-border hover:border-border/80"
                )}
              >
                {/* Card body */}
                <div className="flex-1 px-5 pt-5 pb-3">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      isActive ? "bg-[#F5C518]/15" : "bg-muted/30"
                    )}>
                      <FolderOpen size={18} className={isActive ? "text-[#F5C518]" : "text-muted-foreground"} />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(proj.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-transparent border-b border-[#F5C518] text-sm text-foreground outline-none font-medium pb-0.5"
                        />
                      ) : (
                        <h3 className="text-sm font-semibold text-foreground truncate leading-snug">
                          {proj.name}
                        </h3>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {proj.createdAt ? new Date(proj.createdAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action row — larger buttons */}
                <div
                  className="flex items-center justify-between px-4 py-3 border-t border-border/50 gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => { onSwitch?.(proj.id); onOpen(proj.id); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-[#F5C518] hover:bg-[#F5C518]/10 transition-colors border border-[#F5C518]/20 hover:border-[#F5C518]/40"
                  >
                    Open
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { setEditingId(proj.id); setEditName(proj.name); }}
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

          {/* New project card */}
          {showNew ? (
            <div className="rounded-xl border border-[#F5C518]/40 bg-card p-5 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
              <div className="w-10 h-10 rounded-lg bg-[#F5C518]/10 flex items-center justify-center">
                <Plus size={18} className="text-[#F5C518]" />
              </div>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNew();
                  if (e.key === "Escape") setShowNew(false);
                }}
                placeholder="Project name…"
                className="h-9 text-sm bg-background border border-border rounded-md px-3 text-foreground w-full focus:border-[#F5C518]/60 outline-none"
              />
              <div className="flex gap-2">
                <button onClick={handleNew} className="flex-1 py-2 rounded-md bg-[#F5C518] text-black text-xs font-semibold hover:bg-[#F5C518]/90 transition-colors">
                  Create
                </button>
                <button onClick={() => setShowNew(false)} className="px-3 py-2 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNew(true)}
              className={cn(
                "rounded-xl border-2 border-dashed border-border hover:border-[#F5C518]/40",
                "bg-transparent hover:bg-[#F5C518]/5 transition-all duration-150",
                "flex flex-col items-center justify-center gap-2 p-6 min-h-[140px]",
                "text-muted-foreground hover:text-[#F5C518]"
              )}
            >
              <Plus size={24} />
              <span className="text-sm font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                New Project
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Trash confirmation dialog */}
      {pendingTrashId && pendingProj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-foreground mb-2">Move to Trash?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Move <span className="font-medium text-foreground">"{pendingProj.name}"</span> to trash? You can restore it within 30 days.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setPendingTrashId(null)} className="px-4 py-2 text-sm rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button onClick={() => confirmTrash(pendingTrashId)} className="px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity font-medium">Move to Trash</button>
            </div>
          </div>
        </div>
      )}

      {/* Undo toast */}
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
