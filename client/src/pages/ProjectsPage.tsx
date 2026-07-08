/**
 * ProjectsPage — v5.46
 * Classic card-grid layout for project management.
 * - Dashed "+" card at end of grid to create a new project (name only)
 * - Existing project cards: large name, created date, Open / Rename / Delete action row
 * - Search bar at top for filtering
 */
import { useState, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Plus, Search, Pencil, Trash2, Loader2, FolderOpen, X, Check,
  User, MapPin, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ProjectStatus = "Bidding" | "Won" | "In Progress" | "Lost";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  Bidding:       "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  Won:           "bg-green-500/20 text-green-400 border border-green-500/30",
  "In Progress": "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  Lost:          "bg-zinc-600/40 text-zinc-400 border border-zinc-600/30",
};

interface ProjectsPageProps {
  onOpenProject: (projectId: number) => void;
}

export default function ProjectsPage({ onOpenProject }: ProjectsPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const { data: allProjects = [], isLoading, refetch } = trpc.projects.list.useQuery();

  const createProject = trpc.projects.create.useMutation({
    onSuccess: (project) => {
      toast.success("Project created");
      refetch();
      setShowNewInput(false);
      setNewName("");
      onOpenProject(project.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => { refetch(); setEditingId(null); },
    onError: (e) => toast.error(e.message),
  });

  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => { refetch(); setDeletingId(null); toast.success("Project deleted"); },
    onError: (e) => toast.error(e.message),
  });

  // Focus the new-project input when it appears
  useEffect(() => {
    if (showNewInput) {
      setTimeout(() => newInputRef.current?.focus(), 50);
    }
  }, [showNewInput]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allProjects;
    return allProjects.filter(p =>
      (p.name ?? "").toLowerCase().includes(q) ||
      (p.customerName ?? "").toLowerCase().includes(q) ||
      (p.address ?? "").toLowerCase().includes(q)
    );
  }, [allProjects, searchQuery]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createProject.mutate({ name });
  };

  const handleRename = (id: number) => {
    const name = editName.trim();
    if (!name) { setEditingId(null); return; }
    updateProject.mutate({ id, name });
  };

  const handleDelete = (id: number) => {
    if (deletingId === id) {
      deleteProject.mutate({ id });
    } else {
      setDeletingId(id);
      // Auto-cancel confirm after 3 s
      setTimeout(() => setDeletingId(prev => prev === id ? null : prev), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── Header ── */}
      <div className="border-b border-border/40 px-6 py-5 flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allProjects.length} project{allProjects.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search projects…"
            className={cn(
              "w-full h-10 pl-9 pr-8 text-sm rounded-lg",
              "bg-card border border-border/60 text-foreground placeholder:text-muted-foreground",
              "focus:border-[#F5C518]/60 focus:outline-none focus:ring-1 focus:ring-[#F5C518]/20",
              "transition-colors duration-150"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
            <Loader2 size={22} className="animate-spin" />
            <span>Loading projects…</span>
          </div>
        ) : filteredProjects.length === 0 && !searchQuery ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F5C518]/10 border border-[#F5C518]/20 flex items-center justify-center">
              <span
                className="font-bold text-[#F5C518] text-2xl"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >BP</span>
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">No projects yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload a PDF plan and start measuring in under a minute.
              </p>
            </div>
            <button
              onClick={() => setShowNewInput(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F5C518] text-black text-sm font-bold hover:bg-[#F5C518]/90 active:scale-[0.97] transition-all duration-150"
            >
              <Plus size={16} />
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map(project => {
              const isEditing = editingId === project.id;
              const isConfirmingDelete = deletingId === project.id;
              const status = (project.status ?? "Bidding") as ProjectStatus;

              return (
                <div
                  key={project.id}
                  className={cn(
                    "group relative rounded-xl border bg-card flex flex-col cursor-pointer min-h-[160px]",
                    "transition-all duration-150 hover:shadow-lg hover:shadow-black/20",
                    "border-border hover:border-border/80"
                  )}
                  onClick={() => { if (!isEditing) onOpenProject(project.id); }}
                >
                  {/* Card body */}
                  <div className="flex-1 px-5 pt-5 pb-3">
                    {/* Status badge */}
                    <div className="mb-3">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold",
                        STATUS_STYLES[status]
                      )}>
                        {status}
                      </span>
                    </div>

                    {/* Project name */}
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
                            if (e.key === "Enter") handleRename(project.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onBlur={() => handleRename(project.id)}
                          className="flex-1 min-w-0 bg-transparent border-b border-[#F5C518] text-lg text-foreground outline-none font-bold pb-0.5"
                        />
                        <button
                          onMouseDown={e => { e.preventDefault(); handleRename(project.id); }}
                          className="text-[#F5C518] p-1 rounded hover:bg-[#F5C518]/10"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <h3
                        className="text-xl font-bold text-foreground leading-snug line-clamp-2"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {project.name}
                      </h3>
                    )}

                    {/* Meta info */}
                    <div className="mt-2 space-y-1">
                      {project.customerName && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User size={11} className="shrink-0" />
                          <span className="truncate">{project.customerName}</span>
                        </div>
                      )}
                      {project.address && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin size={11} className="shrink-0" />
                          <span className="truncate">{project.address}</span>
                        </div>
                      )}
                      {project.bidDate && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar size={11} className="shrink-0" />
                          <span>{new Date(project.bidDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {!project.customerName && !project.address && !project.bidDate && (
                        <p className="text-[11px] text-muted-foreground/40 italic">
                          {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action row */}
                  <div
                    className="flex items-center justify-between px-4 py-3 border-t border-border/50 gap-2"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onOpenProject(project.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-[#F5C518] hover:bg-[#F5C518]/10 transition-colors border border-[#F5C518]/20 hover:border-[#F5C518]/40"
                    >
                      Open
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          if (isEditing) {
                            setEditingId(null);
                          } else {
                            setEditingId(project.id);
                            setEditName(project.name);
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                        title="Rename"
                      >
                        <Pencil size={12} />
                        <span>Rename</span>
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        disabled={deleteProject.isPending && deletingId === project.id}
                        className={cn(
                          "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs transition-colors",
                          isConfirmingDelete
                            ? "text-red-400 bg-red-500/10 border border-red-500/30 font-semibold"
                            : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        )}
                        title={isConfirmingDelete ? "Click again to confirm delete" : "Delete"}
                      >
                        {deleteProject.isPending && deletingId === project.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                        <span>{isConfirmingDelete ? "Confirm?" : "Delete"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ── New project dashed card ── */}
            {!showNewInput && !searchQuery && (
              <button
                onClick={() => setShowNewInput(true)}
                className={cn(
                  "rounded-xl border-2 border-dashed border-border hover:border-[#F5C518]/40",
                  "bg-transparent hover:bg-[#F5C518]/5 transition-all duration-150",
                  "flex flex-col items-center justify-center gap-2 p-6 min-h-[160px]",
                  "text-muted-foreground hover:text-[#F5C518] active:scale-[0.98]"
                )}
              >
                <Plus size={28} />
                <span
                  className="text-sm font-medium"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  New Project
                </span>
              </button>
            )}

            {/* ── Inline new project input (replaces the dashed card) ── */}
            {showNewInput && !searchQuery && (
              <div className={cn(
                "rounded-xl border-2 border-[#F5C518]/40 bg-card",
                "flex flex-col items-center justify-center gap-3 p-6 min-h-[160px]"
              )}>
                <input
                  ref={newInputRef}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") { setShowNewInput(false); setNewName(""); }
                  }}
                  placeholder="Project name…"
                  className={cn(
                    "w-full h-10 px-3 text-sm rounded-lg",
                    "bg-background border border-border/60 text-foreground placeholder:text-muted-foreground",
                    "focus:border-[#F5C518]/60 focus:outline-none focus:ring-1 focus:ring-[#F5C518]/20"
                  )}
                />
                <div className="flex gap-2 w-full">
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || createProject.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-[#F5C518] hover:bg-[#e6b800] text-black text-xs font-bold disabled:opacity-50 transition-colors"
                  >
                    {createProject.isPending ? <Loader2 size={14} className="animate-spin" /> : (
                      <>
                        <Check size={14} />
                        Create
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => { setShowNewInput(false); setNewName(""); }}
                    className="h-9 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No search results */}
        {searchQuery && filteredProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FolderOpen size={40} className="text-muted-foreground/30 mb-3" />
            <p className="text-base font-medium text-muted-foreground">No projects match "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
