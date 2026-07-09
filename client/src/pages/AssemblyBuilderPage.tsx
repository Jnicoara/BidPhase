import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import {
  Plus, Trash2, ChevronDown, ChevronRight, Search,
  Pencil, X, Check, Package, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MasterItem {
  id: number;
  itemCode: string | null;
  category: string | null;
  description: string;
  unit: string;
  masterMaterialCost: string;
  masterLaborHours: string;
}

interface AssemblyItemRow {
  id: number;
  assemblyId: number;
  masterItemId: number;
  qty: string;
  sortOrder: number;
  // Flat joined fields from getMasterAssemblyWithItems
  itemCode: string | null;
  description: string;
  unit: string;
  masterMaterialCost: string;
  masterLaborHours: string;
  category: string | null;
}

interface Assembly {
  id: number;
  name: string;
  description: string | null;
  phase: string | null;
  isActive: boolean;
  items?: AssemblyItemRow[];
}

// ─── Assembly Card ─────────────────────────────────────────────────────────────

function AssemblyCard({
  assembly,
  showLabor,
  onDelete,
  onRefresh,
}: {
  assembly: Assembly;
  showLabor: boolean;
  onDelete: (id: number) => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(assembly.name);
  const [descVal, setDescVal] = useState(assembly.description ?? "");
  const [phaseVal, setPhaseVal] = useState(assembly.phase ?? "");
  const [addingItem, setAddingItem] = useState(false);
  const [itemSearch, setItemSearch] = useState("");

  const { data: detail, refetch: refetchDetail } = trpc.masterAssemblies.get.useQuery(
    { id: assembly.id },
    { enabled: expanded }
  );
  const { data: allItems } = trpc.masterItems.list.useQuery(undefined, { enabled: addingItem });

  const updateAssembly = trpc.masterAssemblies.update.useMutation({
    onSuccess: () => { onRefresh(); setEditingName(false); },
    onError: (e) => toast.error(e.message),
  });
  const addItem = trpc.masterAssemblies.addItem.useMutation({
    onSuccess: () => { refetchDetail(); setAddingItem(false); setItemSearch(""); },
    onError: (e) => toast.error(e.message),
  });
  const removeItem = trpc.masterAssemblies.removeItem.useMutation({
    onSuccess: () => refetchDetail(),
    onError: (e) => toast.error(e.message),
  });
  const updateItem = trpc.masterAssemblies.updateItem.useMutation({
    onSuccess: () => refetchDetail(),
    onError: (e) => toast.error(e.message),
  });

  const items = detail?.items ?? [];

  const totalMat = items.reduce((s, i) => {
    const cost = parseFloat(i.masterMaterialCost ?? "0");
    const qty = parseFloat(i.qty);
    return s + cost * qty;
  }, 0);

  const totalLabor = items.reduce((s, i) => {
    const hrs = parseFloat(i.masterLaborHours ?? "0");
    const qty = parseFloat(i.qty);
    return s + hrs * qty;
  }, 0);

  const filteredItems = useMemo(() => {
    if (!allItems) return [];
    const q = itemSearch.toLowerCase();
    return allItems.filter(
      (m: MasterItem) =>
        m.description.toLowerCase().includes(q) ||
        (m.itemCode ?? "").toLowerCase().includes(q) ||
        (m.category ?? "").toLowerCase().includes(q)
    );
  }, [allItems, itemSearch]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        <Layers className="w-4 h-4 text-primary shrink-0" />

        {editingName ? (
          <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
            <Input
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              className="h-7 text-sm"
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => updateAssembly.mutate({ id: assembly.id, name: nameVal, description: descVal || null, phase: phaseVal || null })}
            >
              <Check className="w-3 h-3 text-green-500" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingName(false)}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm truncate">{assembly.name}</span>
            {assembly.phase && (
              <Badge variant="outline" className="ml-2 text-xs">{assembly.phase}</Badge>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          <span className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}</span>
          {!editingName && (
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingName(true)}>
              <Pencil className="w-3 h-3" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => onDelete(assembly.id)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {/* Description / Phase inline edit */}
          <div className="flex gap-2">
            <Input
              placeholder="Description (optional)"
              value={descVal}
              onChange={e => setDescVal(e.target.value)}
              onBlur={() => {
                if (descVal !== (assembly.description ?? "")) {
                  updateAssembly.mutate({ id: assembly.id, name: nameVal, description: descVal || null, phase: phaseVal || null });
                }
              }}
              className="h-7 text-xs flex-1"
            />
            <Input
              placeholder="Phase"
              value={phaseVal}
              onChange={e => setPhaseVal(e.target.value)}
              onBlur={() => {
                if (phaseVal !== (assembly.phase ?? "")) {
                  updateAssembly.mutate({ id: assembly.id, name: nameVal, description: descVal || null, phase: phaseVal || null });
                }
              }}
              className="h-7 text-xs w-28"
            />
          </div>

          {/* Items table */}
          {items.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 text-muted-foreground">
                    <th className="text-left px-3 py-2 font-medium">Description</th>
                    <th className="text-center px-2 py-2 font-medium w-16">Qty</th>
                    <th className="text-center px-2 py-2 font-medium w-20">Unit</th>
                    <th className="text-right px-2 py-2 font-medium w-24">Mat Cost</th>
                    {showLabor && <th className="text-right px-2 py-2 font-medium w-20">Labor Hrs</th>}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row: AssemblyItemRow) => (
                    <AssemblyItemEditRow
                      key={row.id}
                      row={row}
                      showLabor={showLabor}
                      onQtyChange={(qty) => updateItem.mutate({ id: row.id, qty })}
                      onRemove={() => removeItem.mutate({ id: row.id })}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted/20 font-medium">
                    <td className="px-3 py-2 text-xs text-muted-foreground" colSpan={2}>Totals</td>
                    <td />
                    <td className="text-right px-2 py-2 text-xs">${totalMat.toFixed(2)}</td>
                    {showLabor && <td className="text-right px-2 py-2 text-xs">{totalLabor.toFixed(2)} hrs</td>}
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Add item */}
          {addingItem ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Search className="w-3 h-3 text-muted-foreground" />
                <Input
                  placeholder="Search materials..."
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  className="h-7 text-xs flex-1"
                  autoFocus
                />
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddingItem(false); setItemSearch(""); }}>
                  Cancel
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {filteredItems.slice(0, 50).map((m: MasterItem) => (
                  <button
                    key={m.id}
                    className="w-full text-left px-3 py-2 hover:bg-muted/40 transition-colors"
                    onClick={() => addItem.mutate({ assemblyId: assembly.id, masterItemId: m.id, qty: 1 })}
                  >
                    <div className="text-xs font-medium truncate">{m.description}</div>
                    <div className="text-xs text-muted-foreground flex gap-3">
                      {m.itemCode && <span>{m.itemCode}</span>}
                      {m.category && <span>{m.category}</span>}
                      <span>${parseFloat(m.masterMaterialCost).toFixed(2)}/{m.unit}</span>
                      {showLabor && parseFloat(m.masterLaborHours) > 0 && (
                        <span>{parseFloat(m.masterLaborHours).toFixed(3)} hrs</span>
                      )}
                    </div>
                  </button>
                ))}
                {filteredItems.length === 0 && (
                  <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                    No materials found. Add items to your Materials DB first.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => setAddingItem(true)}
            >
              <Plus className="w-3 h-3" /> Add Item
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function AssemblyItemEditRow({
  row,
  showLabor,
  onQtyChange,
  onRemove,
}: {
  row: AssemblyItemRow;
  showLabor: boolean;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
}) {
  const [qty, setQty] = useState(parseFloat(row.qty).toString());

  const matCost = parseFloat(row.masterMaterialCost ?? "0");
  const laborHrs = parseFloat(row.masterLaborHours ?? "0");
  const qtyNum = parseFloat(qty) || 0;

  return (
    <tr className="border-t border-border hover:bg-muted/20 transition-colors">
      <td className="px-3 py-1.5">
        <div className="text-xs font-medium truncate max-w-[200px]">{row.description ?? "—"}</div>
        {row.itemCode && <div className="text-xs text-muted-foreground">{row.itemCode}</div>}
      </td>
      <td className="px-2 py-1.5 text-center">
        <Input
          type="number"
          value={qty}
          min={0}
          step={0.01}
          onChange={e => setQty(e.target.value)}
          onBlur={() => {
            const n = parseFloat(qty);
            if (!isNaN(n) && n !== parseFloat(row.qty)) onQtyChange(n);
          }}
          className="h-6 text-xs text-center w-14 px-1"
        />
      </td>
      <td className="px-2 py-1.5 text-center text-xs text-muted-foreground">{row.unit ?? "EA"}</td>
      <td className="px-2 py-1.5 text-right text-xs">${(matCost * qtyNum).toFixed(2)}</td>
      {showLabor && <td className="px-2 py-1.5 text-right text-xs">{(laborHrs * qtyNum).toFixed(3)}</td>}
      <td className="px-2 py-1.5 text-center">
        <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive hover:text-destructive" onClick={onRemove}>
          <X className="w-3 h-3" />
        </Button>
      </td>
    </tr>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AssemblyBuilderPage() {
  const showLabor = useFeatureFlag("enable_labor_units");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhase, setNewPhase] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: assemblies = [], refetch } = trpc.masterAssemblies.list.useQuery();

  const createAssembly = trpc.masterAssemblies.create.useMutation({
    onSuccess: () => {
      refetch();
      setCreating(false);
      setNewName("");
      setNewPhase("");
      toast.success("Assembly created");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteAssembly = trpc.masterAssemblies.delete.useMutation({
    onSuccess: () => { refetch(); setDeleteConfirm(null); toast.success("Assembly deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (assemblies as Assembly[]).filter(
      a => a.name.toLowerCase().includes(q) || (a.phase ?? "").toLowerCase().includes(q)
    );
  }, [assemblies, search]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">Assembly Builder</h1>
              <p className="text-xs text-muted-foreground">Create and manage reusable material assemblies</p>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setCreating(true)}
          >
            <Plus className="w-4 h-4" /> New Assembly
          </Button>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search assemblies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {/* New assembly form */}
        {creating && (
          <div className="rounded-xl border border-primary/40 bg-card p-4 space-y-3">
            <p className="text-sm font-medium">New Assembly</p>
            <div className="flex gap-2">
              <Input
                placeholder="Assembly name *"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="h-8 text-sm flex-1"
                autoFocus
                onKeyDown={e => { if (e.key === "Enter" && newName.trim()) createAssembly.mutate({ name: newName.trim(), phase: newPhase || undefined }); }}
              />
              <Input
                placeholder="Phase (optional)"
                value={newPhase}
                onChange={e => setNewPhase(e.target.value)}
                className="h-8 text-sm w-36"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!newName.trim() || createAssembly.isPending}
                onClick={() => createAssembly.mutate({ name: newName.trim(), phase: newPhase || undefined })}
              >
                Create
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setNewName(""); setNewPhase(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Assembly list */}
        {filtered.length === 0 && !creating && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {search ? "No assemblies match your search" : "No assemblies yet"}
            </p>
            {!search && (
              <p className="text-xs text-muted-foreground mt-1">
                Create your first assembly to group materials for quick takeoff
              </p>
            )}
          </div>
        )}

        {filtered.map((a: Assembly) => (
          <AssemblyCard
            key={a.id}
            assembly={a}
            showLabor={showLabor}
            onDelete={(id) => setDeleteConfirm(id)}
            onRefresh={refetch}
          />
        ))}
      </div>

      {/* Delete confirm dialog */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <p className="font-semibold">Delete Assembly?</p>
            <p className="text-sm text-muted-foreground">
              This will permanently delete the assembly and all its items. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteAssembly.mutate({ id: deleteConfirm })}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
