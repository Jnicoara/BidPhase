/**
 * ProjectDetailPage — v5.45
 * Full project workspace with:
 *   - Editable header (name, customer, address, bid date, status, notes)
 *   - Tab bar: Estimating | Assemblies | Bid Summary | BOM/RFQ
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Pencil,
  Check,
  X,
  ChevronDown,
  Loader2,
  Calendar,
  User,
  MapPin,
  FileText,
  Layers,
  BarChart3,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Tab content
import ProjectAssembliesTab from "./tabs/ProjectAssembliesTab";
import BidSummaryTab from "./tabs/BidSummaryTab";
import BomRfqTab from "./tabs/BomRfqTab";

type ProjectStatus = "Bidding" | "Won" | "In Progress" | "Lost";
type DetailTab = "estimating" | "assemblies" | "bid-summary" | "bom";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  Bidding: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  Won: "bg-green-500/20 text-green-400 border border-green-500/30",
  "In Progress": "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  Lost: "bg-zinc-600/40 text-zinc-400 border border-zinc-600/30",
};

interface ProjectDetailPageProps {
  projectId: number;
  onBack: () => void;
  /** Pass through so the estimating workspace can open the L&M page */
  onOpenMaterialList?: () => void;
}

export default function ProjectDetailPage({
  projectId,
  onBack,
  onOpenMaterialList,
}: ProjectDetailPageProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("estimating");

  const {
    data: project,
    isLoading,
    refetch,
  } = trpc.projects.get.useQuery({ id: projectId });
  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Project updated");
    },
    onError: e => toast.error(e.message),
  });

  // ── Inline editing state ──────────────────────────────────────────────────
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const startEdit = (field: string, current: string | null | undefined) => {
    setEditingField(field);
    setEditValues(prev => ({ ...prev, [field]: current ?? "" }));
  };

  const cancelEdit = () => setEditingField(null);

  const saveField = (field: string) => {
    const val = editValues[field]?.trim() ?? "";
    updateProject.mutate({ id: projectId, [field]: val || null } as Parameters<
      typeof updateProject.mutate
    >[0]);
    setEditingField(null);
  };

  const saveStatus = (val: ProjectStatus) => {
    updateProject.mutate({ id: projectId, status: val });
  };

  /**
   * The legacy estimating workspace this used to embed is gone, along with the
   * separate material catalog it priced from. Estimating happens on Bids now,
   * against the one real catalog — so this points there rather than rendering
   * a surface that would quietly disagree with it.
   */
  const renderEstimatingTab = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
      <p className="text-sm text-muted-foreground max-w-sm">
        Estimating moved to <span className="text-foreground">Bids</span>, which
        prices from the same materials catalog as the rest of the app.
      </p>
      <Button
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => {
          window.location.hash = "/bids";
        }}
      >
        Go to Bids
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-24 text-muted-foreground gap-3">
        <Loader2 size={24} className="animate-spin" />
        <span>Loading project…</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          Project not found.
        </p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          Go back
        </Button>
      </div>
    );
  }

  const TABS: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
    { id: "estimating", label: "Estimating", icon: <FileText size={15} /> },
    { id: "assemblies", label: "Assemblies", icon: <Layers size={15} /> },
    { id: "bid-summary", label: "Bid Summary", icon: <BarChart3 size={15} /> },
    { id: "bom", label: "BOM / RFQ", icon: <Package size={15} /> },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Project header ── */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur-sm px-5 py-4 shrink-0">
        {/* Back + name row */}
        <div className="flex items-start gap-3 mb-3">
          <button
            onClick={onBack}
            className="mt-1 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 min-w-0">
            {editingField === "name" ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editValues.name ?? ""}
                  onChange={e =>
                    setEditValues(p => ({ ...p, name: e.target.value }))
                  }
                  className="h-9 text-xl font-bold bg-background border-[#F5C518]/40 max-w-md"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === "Enter") saveField("name");
                    if (e.key === "Escape") cancelEdit();
                  }}
                />
                <button
                  onClick={() => saveField("name")}
                  className="text-green-400 hover:text-green-300 p-1"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="text-xl font-bold text-foreground truncate">
                  {project.name}
                </h2>
                <button
                  onClick={() => startEdit("name", project.name)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-all"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
              {/* Status */}
              <Select
                value={project.status ?? "Bidding"}
                onValueChange={v => saveStatus(v as ProjectStatus)}
              >
                <SelectTrigger
                  className={cn(
                    "h-6 w-auto px-2.5 py-0 text-xs font-semibold border rounded-full gap-1.5 cursor-pointer",
                    STATUS_STYLES[
                      (project.status as ProjectStatus) ?? "Bidding"
                    ]
                  )}
                >
                  <SelectValue />
                  <ChevronDown size={11} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bidding">Bidding</SelectItem>
                  <SelectItem value="Won">Won</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                </SelectContent>
              </Select>

              {/* Customer */}
              <EditableMetaField
                icon={<User size={13} />}
                value={project.customerName}
                placeholder="Add customer"
                field="customerName"
                editingField={editingField}
                editValues={editValues}
                onStart={startEdit}
                onSave={saveField}
                onCancel={cancelEdit}
                onChange={setEditValues}
              />

              {/* Address */}
              <EditableMetaField
                icon={<MapPin size={13} />}
                value={project.address}
                placeholder="Add address"
                field="address"
                editingField={editingField}
                editValues={editValues}
                onStart={startEdit}
                onSave={saveField}
                onCancel={cancelEdit}
                onChange={setEditValues}
              />

              {/* Bid date */}
              <EditableDateField
                value={project.bidDate}
                editingField={editingField}
                editValues={editValues}
                onStart={startEdit}
                onSave={saveField}
                onCancel={cancelEdit}
                onChange={setEditValues}
              />
            </div>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex gap-1 -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-all",
                activeTab === tab.id
                  ? "border-[#F5C518] text-[#F5C518] bg-[#F5C518]/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === "estimating" && renderEstimatingTab()}
        {activeTab === "assemblies" && (
          <ProjectAssembliesTab projectId={projectId} />
        )}
        {activeTab === "bid-summary" && <BidSummaryTab projectId={projectId} />}
        {activeTab === "bom" && <BomRfqTab projectId={projectId} />}
      </div>
    </div>
  );
}

// ── Inline editable meta field ─────────────────────────────────────────────────
function EditableMetaField({
  icon,
  value,
  placeholder,
  field,
  editingField,
  editValues,
  onStart,
  onSave,
  onCancel,
  onChange,
}: {
  icon: React.ReactNode;
  value: string | null | undefined;
  placeholder: string;
  field: string;
  editingField: string | null;
  editValues: Record<string, string>;
  onStart: (f: string, v: string | null | undefined) => void;
  onSave: (f: string) => void;
  onCancel: () => void;
  onChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  if (editingField === field) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={editValues[field] ?? ""}
          onChange={e => onChange(p => ({ ...p, [field]: e.target.value }))}
          className="h-7 text-sm bg-background border-[#F5C518]/40 w-48"
          autoFocus
          onKeyDown={e => {
            if (e.key === "Enter") onSave(field);
            if (e.key === "Escape") onCancel();
          }}
        />
        <button onClick={() => onSave(field)} className="text-green-400 p-0.5">
          <Check size={13} />
        </button>
        <button onClick={onCancel} className="text-muted-foreground p-0.5">
          <X size={13} />
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => onStart(field, value)}
      className={cn(
        "flex items-center gap-1.5 text-sm transition-colors group/meta",
        value
          ? "text-muted-foreground hover:text-foreground"
          : "text-muted-foreground/40 hover:text-muted-foreground"
      )}
    >
      {icon}
      <span>{value ?? placeholder}</span>
      <Pencil
        size={11}
        className="opacity-0 group-hover/meta:opacity-60 transition-opacity"
      />
    </button>
  );
}

function EditableDateField({
  value,
  editingField,
  editValues,
  onStart,
  onSave,
  onCancel,
  onChange,
}: {
  value: Date | string | null | undefined;
  editingField: string | null;
  editValues: Record<string, string>;
  onStart: (f: string, v: string | null | undefined) => void;
  onSave: (f: string) => void;
  onCancel: () => void;
  onChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const field = "bidDate";
  const dateStr = value ? new Date(value).toISOString().split("T")[0] : null;
  const displayDate = value ? new Date(value).toLocaleDateString() : null;

  if (editingField === field) {
    return (
      <div className="flex items-center gap-1">
        <Input
          type="date"
          value={editValues[field] ?? ""}
          onChange={e => onChange(p => ({ ...p, [field]: e.target.value }))}
          className="h-7 text-sm bg-background border-[#F5C518]/40 w-40"
          autoFocus
          onKeyDown={e => {
            if (e.key === "Enter") onSave(field);
            if (e.key === "Escape") onCancel();
          }}
        />
        <button onClick={() => onSave(field)} className="text-green-400 p-0.5">
          <Check size={13} />
        </button>
        <button onClick={onCancel} className="text-muted-foreground p-0.5">
          <X size={13} />
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => onStart(field, dateStr)}
      className={cn(
        "flex items-center gap-1.5 text-sm transition-colors group/meta",
        displayDate
          ? "text-muted-foreground hover:text-foreground"
          : "text-muted-foreground/40 hover:text-muted-foreground"
      )}
    >
      <Calendar size={13} />
      <span>{displayDate ?? "Add bid date"}</span>
      <Pencil
        size={11}
        className="opacity-0 group-hover/meta:opacity-60 transition-opacity"
      />
    </button>
  );
}
