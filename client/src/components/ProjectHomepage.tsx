/**
 * BidPhase — ProjectHomepage
 *
 * Shown when a tab first loads (or when user clicks the tab icon in the sidebar).
 * Displays a grid of project cards for the current category.
 * Clicking a card opens that project. "+ New Project" creates a blank one.
 *
 * Design: Tactical Dark Mode SaaS · Space Grotesk headers
 */
import { useState } from "react";
import { FolderOpen, Plus, Pencil, Trash2, Check, X, Calendar, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ProjectCard {
  id: string;
  name: string;
  createdAt: number;
  /** Optional summary line shown on the card */
  summary?: string;
}

interface ProjectHomepageProps {
  /** Category title shown in the header */
  title: string;
  /** Icon element shown in the header */
  icon: React.ReactNode;
  /** All projects for this category */
  projects: ProjectCard[];
  /** Currently active project id */
  activeId: string;
  /** Open a project (switches to editor view) */
  onOpen: (id: string) => void;
  /** Create a new blank project */
  onNew: (name: string) => void;
  /** Rename a project */
  onRename: (id: string, name: string) => void;
  /** Delete a project */
  onDelete: (id: string) => void;
}

export default function ProjectHomepage({
  title,
  icon,
  projects,
  activeId,
  onOpen,
  onNew,
  onRename,
  onDelete,
}: ProjectHomepageProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const commitEdit = (id: string) => {
    const t = editName.trim();
    if (t) { onRename(id, t); toast.success(`Renamed to "${t}"`); }
    setEditingId(null);
  };

  const handleNew = () => {
    const name = newName.trim() || `Job ${projects.length + 1}`;
    onNew(name);
    setNewName("");
    setShowNew(false);
    toast.success(`"${name}" created — load a PDF to get started.`);
  };

  const handleDelete = (id: string) => {
    if (projects.length <= 1) {
      toast.error("Can't delete the last project.");
      return;
    }
    setConfirmDeleteId(id);
  };
  const confirmDelete = (id: string) => {
    const proj = projects.find((p) => p.id === id);
    onDelete(id);
    setConfirmDeleteId(null);
    toast.info(`Deleted "${proj?.name ?? "project"}".`);
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="flex flex-col h-full overflow-auto bg-background">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-8 pb-6 border-b border-border shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-[#F5C518]/15 flex items-center justify-center">
            {icon}
          </div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {title}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          {projects.length} project{projects.length !== 1 ? "s" : ""} · Click a card to open
        </p>
      </div>

      {/* ── Project grid ───────────────────────────────────────────────────── */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
          {/* Existing project cards */}
          {projects.map((proj) => {
            const isActive = proj.id === activeId;
            return (
              <div
                key={proj.id}
                className={cn(
                  "group relative rounded-xl border transition-all duration-150 cursor-pointer",
                  "bg-card hover:bg-card/80",
                  isActive
                    ? "border-[#F5C518]/50 shadow-[0_0_0_1px_rgba(245,197,24,0.2)]"
                    : "border-border hover:border-[#F5C518]/30"
                )}
                onClick={() => onOpen(proj.id)}
              >
                {/* Active badge */}
                {isActive && (
                  <div className="absolute top-3 right-3 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#F5C518]/20 text-[#F5C518] uppercase tracking-wide">
                    Active
                  </div>
                )}

                <div className="p-4 pb-3">
                  {/* Folder icon */}
                  <div className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center mb-3">
                    <FolderOpen size={18} className={isActive ? "text-[#F5C518]" : "text-muted-foreground"} />
                  </div>

                  {/* Name — editable inline */}
                  {editingId === proj.id ? (
                    <div
                      className="flex items-center gap-1 mb-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(proj.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 h-6 text-sm bg-background border border-border rounded px-2 text-foreground"
                      />
                      <button
                        onClick={() => commitEdit(proj.id)}
                        className="text-green-400 hover:text-green-300 p-0.5"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <h3
                      className="text-sm font-semibold text-foreground mb-1 pr-8 truncate"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {proj.name}
                    </h3>
                  )}

                  {/* Summary */}
                  {proj.summary && (
                    <p className="text-[11px] text-muted-foreground font-mono truncate mb-2">
                      {proj.summary}
                    </p>
                  )}

                  {/* Date */}
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Calendar size={10} />
                    <span>{formatDate(proj.createdAt)}</span>
                  </div>
                </div>

                {/* Action row */}
                <div
                  className="flex items-center justify-between px-4 py-2 border-t border-border/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => onOpen(proj.id)}
                    className="text-[11px] font-medium text-[#F5C518] hover:text-[#F5C518]/80 transition-colors flex items-center gap-1"
                  >
                    <FileText size={11} /> Open
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingId(proj.id); setEditName(proj.name); }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Rename"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(proj.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── New Project card ─────────────────────────────────────────── */}
          {showNew ? (
            <div className="rounded-xl border border-[#F5C518]/40 bg-card p-4 flex flex-col gap-3">
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
                className="h-8 text-sm bg-background border border-border rounded px-2 text-foreground w-full"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleNew}
                  className="flex-1 py-1.5 rounded bg-[#F5C518] text-black text-xs font-semibold hover:bg-[#F5C518]/90 transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNew(false)}
                  className="px-3 py-1.5 rounded border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
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
      {/* Delete project confirmation dialog */}
      {confirmDeleteId && (() => {
        const proj = projects.find((p) => p.id === confirmDeleteId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
              <h3 className="font-semibold text-foreground mb-2">Delete Project?</h3>
              <p className="text-sm text-muted-foreground mb-5">
                Delete <span className="font-medium text-foreground">"{proj?.name}"</span>? All runs, pins, and sessions will be lost. This cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 text-sm rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                <button onClick={() => confirmDelete(confirmDeleteId)} className="px-4 py-2 text-sm rounded-md bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity font-medium">Delete</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
