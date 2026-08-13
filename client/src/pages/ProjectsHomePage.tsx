/**
 * ProjectsHomePage — v5.45
 * Clean homepage dedicated to finding and selecting projects.
 * Design: Tactical Dark Mode SaaS, Safety Yellow (#F5C518) accent.
 * - Large search bar at top (wildcard match: name, customer, address)
 * - Project grid: Name, Customer, Bid Date, Status badge
 * - "New Project" modal with all fields
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Search,
  Plus,
  Calendar,
  User,
  MapPin,
  ChevronRight,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type ProjectStatus = "Bidding" | "Won" | "In Progress" | "Lost";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  Bidding: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  Won: "bg-green-500/20 text-green-400 border border-green-500/30",
  "In Progress": "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  Lost: "bg-zinc-600/40 text-zinc-400 border border-zinc-600/30",
};

interface ProjectsHomePageProps {
  onOpenProject: (projectId: number) => void;
}

export default function ProjectsHomePage({
  onOpenProject,
}: ProjectsHomePageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);

  // Fetch all projects
  const {
    data: allProjects = [],
    isLoading,
    refetch,
  } = trpc.projects.list.useQuery();

  // Client-side wildcard filter across name, customerName, address
  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allProjects;
    return allProjects.filter(
      p =>
        (p.name ?? "").toLowerCase().includes(q) ||
        (p.customerName ?? "").toLowerCase().includes(q) ||
        (p.address ?? "").toLowerCase().includes(q)
    );
  }, [allProjects, searchQuery]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ── */}
      <div className="border-b border-border/40 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-foreground">Bid</span>
            <span className="text-[#F5C518]">Phase</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Electrical Estimating
          </p>
        </div>
        <Button
          onClick={() => setShowNewModal(true)}
          className="bg-[#F5C518] hover:bg-[#e6b800] text-black font-semibold gap-2 h-11 px-5 text-base"
        >
          <Plus size={18} />
          New Project
        </Button>
      </div>

      {/* ── Search bar ── */}
      <div className="px-6 py-5">
        <div className="relative max-w-2xl">
          <Search
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by project name, customer, or address…"
            className="pl-12 h-12 text-base bg-card border-border/60 focus:border-[#F5C518]/60 focus:ring-[#F5C518]/20 rounded-xl"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-muted-foreground">
            {filteredProjects.length} result
            {filteredProjects.length !== 1 ? "s" : ""} for "{searchQuery}"
          </p>
        )}
      </div>

      {/* ── Project grid ── */}
      <div className="px-6 pb-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
            <Loader2 size={24} className="animate-spin" />
            <span className="text-base">Loading projects…</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FolderOpen size={48} className="text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {searchQuery
                ? "No projects match your search"
                : "No projects yet"}
            </p>
            {!searchQuery && (
              <p className="text-sm text-muted-foreground/60 mt-1">
                Create your first project to get started
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map(project => (
              <button
                key={project.id}
                onClick={() => onOpenProject(project.id)}
                className={cn(
                  "group text-left bg-card border border-border/40 rounded-xl p-5",
                  "hover:border-[#F5C518]/40 hover:bg-card/80 hover:shadow-lg hover:shadow-black/20",
                  "transition-all duration-200 active:scale-[0.98]"
                )}
              >
                {/* Status badge */}
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                      STATUS_STYLES[
                        (project.status as ProjectStatus) ?? "Bidding"
                      ]
                    )}
                  >
                    {project.status ?? "Bidding"}
                  </span>
                  <ChevronRight
                    size={16}
                    className="text-muted-foreground/40 group-hover:text-[#F5C518]/60 transition-colors mt-0.5"
                  />
                </div>

                {/* Project name */}
                <h3 className="font-semibold text-foreground text-base leading-tight mb-3 line-clamp-2">
                  {project.name}
                </h3>

                {/* Meta info */}
                <div className="space-y-1.5">
                  {project.customerName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User
                        size={13}
                        className="shrink-0 text-muted-foreground/60"
                      />
                      <span className="truncate">{project.customerName}</span>
                    </div>
                  )}
                  {project.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin
                        size={13}
                        className="shrink-0 text-muted-foreground/60"
                      />
                      <span className="truncate">{project.address}</span>
                    </div>
                  )}
                  {project.bidDate && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar
                        size={13}
                        className="shrink-0 text-muted-foreground/60"
                      />
                      <span>
                        {new Date(project.bidDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {!project.customerName &&
                    !project.address &&
                    !project.bidDate && (
                      <p className="text-xs text-muted-foreground/40 italic">
                        No details added
                      </p>
                    )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── New Project Modal ── */}
      <NewProjectModal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={id => {
          refetch();
          setShowNewModal(false);
          onOpenProject(id);
        }}
      />
    </div>
  );
}

// ── New Project Modal ──────────────────────────────────────────────────────────
function NewProjectModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const [name, setName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [bidDate, setBidDate] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("Bidding");
  const [notes, setNotes] = useState("");

  const createProject = trpc.projects.create.useMutation({
    onSuccess: project => {
      toast.success("Project created");
      onCreated(project.id);
      // Reset form
      setName("");
      setCustomerName("");
      setAddress("");
      setBidDate("");
      setStatus("Bidding");
      setNotes("");
    },
    onError: e => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createProject.mutate({
      name: name.trim(),
      customerName: customerName.trim() || undefined,
      address: address.trim() || undefined,
      bidDate: bidDate || undefined,
      status,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg bg-card border-border/60">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-foreground">
              Project Name *
            </Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Main Street Office Build-Out"
              className="h-11 text-base bg-background border-border/60"
              autoFocus
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">
                Customer Name
              </Label>
              <Input
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="e.g. ABC Corp"
                className="h-11 bg-background border-border/60"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">
                Status
              </Label>
              <Select
                value={status}
                onValueChange={v => setStatus(v as ProjectStatus)}
              >
                <SelectTrigger className="h-11 bg-background border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bidding">Bidding</SelectItem>
                  <SelectItem value="Won">Won</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-foreground">
              Address
            </Label>
            <Input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. 123 Main St, Springfield, IL"
              className="h-11 bg-background border-border/60"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-foreground">
              Bid Date
            </Label>
            <Input
              type="date"
              value={bidDate}
              onChange={e => setBidDate(e.target.value)}
              className="h-11 bg-background border-border/60"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-foreground">
              Notes
            </Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Scope notes, special requirements…"
              className="bg-background border-border/60 resize-none"
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11 text-base"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createProject.isPending}
              className="flex-1 h-11 text-base bg-[#F5C518] hover:bg-[#e6b800] text-black font-semibold"
            >
              {createProject.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                "Create Project"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
