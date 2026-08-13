/**
 * ProjectAssembliesTab — v5.45
 * Manage assemblies on a project:
 *   - Add from master library or create blank
 *   - Per-item qty, override material cost, override labor hours
 *   - Reset individual item overrides back to master values
 *   - Phase tagging per assembly
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Plus,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Loader2,
  Layers,
  Pencil,
  Check,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ProjectAssembliesTabProps {
  projectId: number;
}

export default function ProjectAssembliesTab({
  projectId,
}: ProjectAssembliesTabProps) {
  const utils = trpc.useUtils();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(
    () => new Set<number>()
  );
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: assemblies = [], isLoading } =
    trpc.projectAssemblies.list.useQuery({ projectId });
  const deleteAssembly = trpc.projectAssemblies.delete.useMutation({
    onSuccess: () => {
      utils.projectAssemblies.list.invalidate({ projectId });
      toast.success("Assembly removed");
    },
    onError: e => toast.error(e.message),
  });

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 size={20} className="animate-spin" /> Loading assemblies…
      </div>
    );

  return (
    <div className="p-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Project Assemblies
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Add assemblies from your master library or build custom ones for
            this project.
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-[#F5C518] hover:bg-[#e6b800] text-black font-semibold gap-2 h-9"
        >
          <Plus size={15} /> Add Assembly
        </Button>
      </div>

      {/* Assembly list */}
      {assemblies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/40 rounded-xl">
          <Layers size={40} className="text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">No assemblies yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Add assemblies from your master library or create a custom one
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {assemblies.map(
            assembly =>
              assembly && (
                <AssemblyCard
                  key={assembly.id}
                  assembly={assembly}
                  projectId={projectId}
                  expanded={expandedIds.has(assembly.id)}
                  onToggle={() => toggleExpand(assembly.id)}
                  onDelete={() => deleteAssembly.mutate({ id: assembly.id })}
                />
              )
          )}
        </div>
      )}

      {/* Add Assembly Modal */}
      <AddAssemblyModal
        open={showAddModal}
        projectId={projectId}
        onClose={() => setShowAddModal(false)}
        onAdded={() => {
          utils.projectAssemblies.list.invalidate({ projectId });
          setShowAddModal(false);
        }}
      />
    </div>
  );
}

// ── Assembly card ──────────────────────────────────────────────────────────────
function AssemblyCard({
  assembly,
  projectId,
  expanded,
  onToggle,
  onDelete,
}: {
  assembly: {
    id: number;
    name: string;
    phase?: string | null;
    items?: Array<{
      id: number;
      description: string;
      unit: string;
      qty: string | number;
      masterMaterialCost: string | number;
      masterLaborHours: string | number;
      overrideMaterialCost: string | number;
      overrideLaborHours: string | number;
    }>;
  };
  projectId: number;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const utils = trpc.useUtils();
  const updateItem = trpc.projectAssemblies.updateItem.useMutation({
    onSuccess: () => utils.projectAssemblies.list.invalidate({ projectId }),
    onError: e => toast.error(e.message),
  });
  const resetItem = trpc.projectAssemblies.resetItem.useMutation({
    onSuccess: () => {
      utils.projectAssemblies.list.invalidate({ projectId });
      toast.success("Reset to master values");
    },
    onError: e => toast.error(e.message),
  });
  const deleteItem = trpc.projectAssemblies.deleteItem.useMutation({
    onSuccess: () => utils.projectAssemblies.list.invalidate({ projectId }),
    onError: e => toast.error(e.message),
  });

  const items = assembly.items ?? [];
  type AsmItem = {
    overrideMaterialCost?: string | number | null;
    masterMaterialCost?: string | number | null;
    overrideLaborHours?: string | number | null;
    masterLaborHours?: string | number | null;
    qty?: string | number | null;
  };
  const totalMat = (items as AsmItem[]).reduce(
    (s, i) =>
      s +
      parseFloat(String(i.overrideMaterialCost ?? i.masterMaterialCost ?? 0)) *
        parseFloat(String(i.qty ?? 1)),
    0
  );
  const totalLab = (items as AsmItem[]).reduce(
    (s, i) =>
      s +
      parseFloat(String(i.overrideLaborHours ?? i.masterLaborHours ?? 0)) *
        parseFloat(String(i.qty ?? 1)),
    0
  );

  return (
    <div className="border border-border/40 rounded-xl bg-card overflow-hidden">
      {/* Assembly header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              {assembly.name}
            </span>
            {assembly.phase && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {assembly.phase}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-0.5 text-xs text-muted-foreground">
            <span>
              {items.length} item{items.length !== 1 ? "s" : ""}
            </span>
            <span>Mat: ${totalMat.toFixed(2)}</span>
            <span>Labor: {totalLab.toFixed(2)} hrs</span>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors rounded-md hover:bg-red-400/10"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Expanded item table */}
      {expanded && (
        <div className="border-t border-border/30">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground/60 italic px-4 py-3">
              No items in this assembly
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/20">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">
                      Description
                    </th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground w-20">
                      Unit
                    </th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground w-20">
                      Qty
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground w-28">
                      Mat Cost/Unit
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground w-28">
                      Labor Hrs/Unit
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground w-28">
                      Ext Mat
                    </th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground w-28">
                      Ext Labor
                    </th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    items as Array<{
                      id: number;
                      description: string;
                      unit: string;
                      qty: string | number;
                      masterMaterialCost: string | number;
                      masterLaborHours: string | number;
                      overrideMaterialCost: string | number;
                      overrideLaborHours: string | number;
                    }>
                  ).map(item => (
                    <AssemblyItemRow
                      key={item.id}
                      item={item}
                      onUpdateQty={qty =>
                        updateItem.mutate({ id: item.id, qty })
                      }
                      onOverrideMat={v =>
                        updateItem.mutate({
                          id: item.id,
                          overrideMaterialCost: v,
                        })
                      }
                      onOverrideLab={v =>
                        updateItem.mutate({
                          id: item.id,
                          overrideLaborHours: v,
                        })
                      }
                      onReset={() => resetItem.mutate({ id: item.id })}
                      onDelete={() => deleteItem.mutate({ id: item.id })}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border/30 bg-muted/10">
                    <td
                      colSpan={5}
                      className="px-4 py-2 text-xs font-semibold text-muted-foreground text-right"
                    >
                      Totals:
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-foreground">
                      ${totalMat.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-foreground">
                      {totalLab.toFixed(2)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Assembly item row ─────────────────────────────────────────────────────────
function AssemblyItemRow({
  item,
  onUpdateQty,
  onOverrideMat,
  onOverrideLab,
  onReset,
  onDelete,
}: {
  item: {
    id: number;
    description: string;
    unit: string;
    qty: string | number;
    masterMaterialCost: string | number;
    masterLaborHours: string | number;
    overrideMaterialCost: string | number;
    overrideLaborHours: string | number;
  };
  onUpdateQty: (v: number) => void;
  onOverrideMat: (v: number) => void;
  onOverrideLab: (v: number) => void;
  onReset: () => void;
  onDelete: () => void;
}) {
  const qty = parseFloat(String(item.qty ?? 1));
  const masterMat = parseFloat(String(item.masterMaterialCost ?? 0));
  const masterLab = parseFloat(String(item.masterLaborHours ?? 0));
  const overrideMat = parseFloat(
    String(item.overrideMaterialCost ?? masterMat)
  );
  const overrideLab = parseFloat(String(item.overrideLaborHours ?? masterLab));

  const matOverridden = Math.abs(overrideMat - masterMat) > 0.0001;
  const labOverridden = Math.abs(overrideLab - masterLab) > 0.0001;
  const hasOverride = matOverridden || labOverridden;

  return (
    <tr className="border-b border-border/20 hover:bg-muted/10 transition-colors">
      <td className="px-4 py-2 text-foreground">{item.description}</td>
      <td className="px-3 py-2 text-center text-muted-foreground">
        {item.unit}
      </td>
      <td className="px-3 py-2 text-center">
        <InlineNumberInput
          value={qty}
          onCommit={onUpdateQty}
          min={0}
          step={1}
          className="w-16 text-center"
        />
      </td>
      <td className="px-3 py-2 text-right">
        <InlineNumberInput
          value={overrideMat}
          onCommit={onOverrideMat}
          min={0}
          step={0.01}
          className={cn(
            "w-24 text-right",
            matOverridden && "text-yellow-400 border-yellow-500/40"
          )}
          prefix="$"
        />
      </td>
      <td className="px-3 py-2 text-right">
        <InlineNumberInput
          value={overrideLab}
          onCommit={onOverrideLab}
          min={0}
          step={0.001}
          className={cn(
            "w-24 text-right",
            labOverridden && "text-yellow-400 border-yellow-500/40"
          )}
        />
      </td>
      <td className="px-3 py-2 text-right text-foreground font-medium">
        ${(overrideMat * qty).toFixed(2)}
      </td>
      <td className="px-3 py-2 text-right text-foreground font-medium">
        {(overrideLab * qty).toFixed(3)}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1">
          {hasOverride && (
            <button
              onClick={onReset}
              title="Reset to master values"
              className="p-1 text-yellow-400/70 hover:text-yellow-400 transition-colors rounded"
            >
              <RotateCcw size={13} />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1 text-muted-foreground hover:text-red-400 transition-colors rounded"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Inline number input ───────────────────────────────────────────────────────
function InlineNumberInput({
  value,
  onCommit,
  min,
  step,
  className,
  prefix,
}: {
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  step?: number;
  className?: string;
  prefix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (!editing) {
    return (
      <button
        onClick={() => {
          setEditing(true);
          setDraft(String(value));
        }}
        className={cn(
          "text-sm text-foreground hover:text-[#F5C518] transition-colors px-1 py-0.5 rounded hover:bg-[#F5C518]/10",
          className
        )}
      >
        {prefix}
        {value % 1 === 0
          ? value.toFixed(0)
          : value.toFixed(step && step < 0.01 ? 3 : 2)}
      </button>
    );
  }

  return (
    <input
      type="number"
      value={draft}
      min={min}
      step={step}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => {
        const n = parseFloat(draft);
        if (!isNaN(n) && n !== value) onCommit(n);
        setEditing(false);
      }}
      onKeyDown={e => {
        if (e.key === "Enter") {
          const n = parseFloat(draft);
          if (!isNaN(n)) onCommit(n);
          setEditing(false);
        }
        if (e.key === "Escape") setEditing(false);
      }}
      className={cn(
        "text-sm bg-background border border-[#F5C518]/40 rounded px-1.5 py-0.5 focus:outline-none focus:border-[#F5C518]",
        className
      )}
      autoFocus
    />
  );
}

// ── Add Assembly Modal ─────────────────────────────────────────────────────────
function AddAssemblyModal({
  open,
  projectId,
  onClose,
  onAdded,
}: {
  open: boolean;
  projectId: number;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [mode, setMode] = useState<"master" | "blank">("master");
  const [selectedMasterId, setSelectedMasterId] = useState<string>("");
  const [blankName, setBlankName] = useState("");
  const [phase, setPhase] = useState("");

  const { data: masterAssemblies = [] } = trpc.masterAssemblies.list.useQuery();

  const addFromMaster = trpc.projectAssemblies.addFromMaster.useMutation({
    onSuccess: () => {
      toast.success("Assembly added");
      onAdded();
    },
    onError: e => toast.error(e.message),
  });

  const createBlank = trpc.projectAssemblies.createBlank.useMutation({
    onSuccess: () => {
      toast.success("Assembly created");
      onAdded();
    },
    onError: e => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "master") {
      if (!selectedMasterId) return;
      addFromMaster.mutate({
        projectId,
        masterAssemblyId: parseInt(selectedMasterId),
        phase: phase.trim() || undefined,
      });
    } else {
      if (!blankName.trim()) return;
      createBlank.mutate({
        projectId,
        name: blankName.trim(),
        phase: phase.trim() || undefined,
      });
    }
  };

  const isPending = addFromMaster.isPending || createBlank.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md bg-card border-border/60">
        <DialogHeader>
          <DialogTitle>Add Assembly</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-border/40 overflow-hidden">
            {(["master", "blank"] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 py-2 text-sm font-medium transition-colors",
                  mode === m
                    ? "bg-[#F5C518] text-black"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "master" ? "From Master Library" : "Blank Assembly"}
              </button>
            ))}
          </div>

          {mode === "master" ? (
            <div className="space-y-1.5">
              <Label>Master Assembly</Label>
              {masterAssemblies.length === 0 ? (
                <p className="text-sm text-muted-foreground/60 italic">
                  No master assemblies yet. Create them in Settings → Master
                  Library.
                </p>
              ) : (
                <Select
                  value={selectedMasterId}
                  onValueChange={setSelectedMasterId}
                >
                  <SelectTrigger className="bg-background border-border/60">
                    <SelectValue placeholder="Select an assembly…" />
                  </SelectTrigger>
                  <SelectContent>
                    {masterAssemblies.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Assembly Name *</Label>
              <Input
                value={blankName}
                onChange={e => setBlankName(e.target.value)}
                placeholder="e.g. Panel Feed, Lighting Circuit"
                className="bg-background border-border/60"
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Phase (optional)</Label>
            <Input
              value={phase}
              onChange={e => setPhase(e.target.value)}
              placeholder="e.g. Phase 1, Rough-In, Trim-Out"
              className="bg-background border-border/60"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isPending ||
                (mode === "master" && !selectedMasterId) ||
                (mode === "blank" && !blankName.trim())
              }
              className="flex-1 bg-[#F5C518] hover:bg-[#e6b800] text-black font-semibold"
            >
              {isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Add Assembly"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
