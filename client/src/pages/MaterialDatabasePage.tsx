/**
 * MaterialDatabasePage — Supply House Material Database Manager
 *
 * Features:
 *  1. CSV Import with column-mapping screen + replace-all confirmation
 *  2. Inline-editable table (User_Price saves immediately)
 *  3. Age indicators on Last_Updated (green <30d, yellow 30-90d, red >90d)
 *  4. Reset-to-default button (undo icon) with confirmation
 *  5. Red-flag rows where both userPrice and defaultPrice are missing
 *  6. + Add Custom Material quick-entry form
 */
import { useState, useRef, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Upload, Plus, Trash2, Loader2, AlertCircle, Database,
  RotateCcw, ChevronDown, ChevronRight, Search, X, Check,
  ArrowLeft, FileSpreadsheet, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

type Material = {
  id: number;
  itemCode: string | null;
  category: string | null;
  description: string;
  unit: string | null;
  defaultPrice: number | null;
  userPrice: number | null;
  lastUpdated: Date | null;
  unitMaterialCost: number | null;
};

type ColumnMapping = {
  itemId: string;
  category: string;
  description: string;
  unit: string;
  userPrice: string;
  defaultPrice: string;
};

const REQUIRED_APP_COLS = ["description"] as const;
const APP_COLUMNS: { key: keyof ColumnMapping; label: string; required: boolean; hint: string }[] = [
  { key: "description", label: "Description", required: true, hint: "Item name / description" },
  { key: "category", label: "Category", required: false, hint: "Category or trade section" },
  { key: "itemId", label: "Item ID / Code", required: false, hint: "SKU, item code, or ID (auto-generated if missing)" },
  { key: "unit", label: "Unit (EA, FT, etc.)", required: false, hint: "Unit of measure" },
  { key: "userPrice", label: "User_Price", required: false, hint: "Your supply house price" },
  { key: "defaultPrice", label: "Default_Price", required: false, hint: "App baseline price" },
];

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSVRaw(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
  return { headers, rows };
}

function autoDetectMapping(headers: string[]): Partial<ColumnMapping> {
  const lower = headers.map((h) => h.toLowerCase());
  const find = (candidates: string[]) => {
    for (const c of candidates) {
      const idx = lower.findIndex((h) => h.includes(c));
      if (idx >= 0) return headers[idx];
    }
    return "";
  };
  return {
    description: find(["description", "desc", "name", "item", "material"]),
    category: find(["category", "cat", "section", "trade", "phase", "type"]),
    itemId: find(["item_id", "itemid", "item_code", "itemcode", "code", "sku", "id", "part"]),
    unit: find(["unit", "uom", "measure"]),
    userPrice: find(["user_price", "userprice", "my_price", "myprice", "supply_price", "cost", "price"]),
    defaultPrice: find(["default_price", "defaultprice", "base_price", "baseprice", "list_price", "listprice"]),
  };
}

// ─── Age indicator ────────────────────────────────────────────────────────────

function ageClass(lastUpdated: Date | null): string {
  if (!lastUpdated) return "";
  const days = (Date.now() - new Date(lastUpdated).getTime()) / 86_400_000;
  if (days <= 30) return "text-emerald-400";
  if (days <= 90) return "text-yellow-400";
  return "text-red-400";
}

function ageLabel(lastUpdated: Date | null): string {
  if (!lastUpdated) return "—";
  const d = new Date(lastUpdated);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Effective price helper ───────────────────────────────────────────────────

function effectivePrice(m: Material): number | null {
  if (m.userPrice != null && m.userPrice > 0) return m.userPrice;
  if (m.defaultPrice != null && m.defaultPrice > 0) return m.defaultPrice;
  if (m.unitMaterialCost != null && m.unitMaterialCost > 0) return m.unitMaterialCost;
  return null;
}

function isMissingPrice(m: Material): boolean {
  return effectivePrice(m) === null;
}

// ─── Inline price editor ──────────────────────────────────────────────────────

function PriceCell({
  material,
  onSave,
  onReset,
}: {
  material: Material;
  onSave: (id: number, price: number | null) => void;
  onReset: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [resetPending, setResetPending] = useState(false);
  const missing = isMissingPrice(material);
  const hasUserPrice = material.userPrice != null;
  const hasDefault = (material.defaultPrice ?? 0) > 0 || (material.unitMaterialCost ?? 0) > 0;

  const commit = () => {
    const val = parseFloat(draft);
    if (!isNaN(val) && val >= 0) {
      onSave(material.id, val);
    } else if (draft.trim() === "") {
      onSave(material.id, null);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground text-xs">$</span>
        <input
          autoFocus
          type="number"
          step="0.01"
          min="0"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-20 bg-transparent border-b border-[#F5C518] outline-none text-[#F5C518] font-mono text-xs py-0.5"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 group">
      {/* Reset confirmation mini-dialog */}
      {resetPending && (
        <div className="flex items-center gap-1 text-[10px] bg-card border border-border rounded px-2 py-1 shadow-lg z-10">
          <span className="text-muted-foreground">Reset to default?</span>
          <button
            onClick={() => { onReset(material.id); setResetPending(false); }}
            className="text-emerald-400 hover:text-emerald-300 font-medium px-1"
          >Yes</button>
          <button
            onClick={() => setResetPending(false)}
            className="text-muted-foreground hover:text-foreground px-1"
          >No</button>
        </div>
      )}

      {/* Price display */}
      <button
        onClick={() => { setDraft(String(material.userPrice ?? "")); setEditing(true); }}
        className={cn(
          "font-mono text-xs px-1.5 py-0.5 rounded transition-colors",
          missing
            ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
            : hasUserPrice
            ? "text-[#F5C518] hover:bg-[#F5C518]/10"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
        )}
        title={missing ? "No price set — click to add. Required for bid calculations." : "Click to edit user price"}
      >
        {missing
          ? "⚠ No price"
          : hasUserPrice
          ? `$${material.userPrice!.toFixed(2)}`
          : material.defaultPrice != null
          ? `$${material.defaultPrice.toFixed(2)}`
          : `$${(material.unitMaterialCost ?? 0).toFixed(2)}`}
      </button>

      {/* Source badge */}
      {!missing && (
        <span className={cn(
          "text-[9px] px-1 rounded",
          hasUserPrice ? "bg-[#F5C518]/15 text-[#F5C518]/80" : "bg-muted/40 text-muted-foreground"
        )}>
          {hasUserPrice ? "custom" : "default"}
        </span>
      )}

      {/* Reset button — only show when userPrice exists and a default is available */}
      {hasUserPrice && hasDefault && !resetPending && (
        <button
          onClick={() => setResetPending(true)}
          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-muted-foreground hover:text-amber-400"
          title="Reset to default price"
        >
          <RotateCcw size={10} />
        </button>
      )}
    </div>
  );
}

// ─── Column Mapping Screen ────────────────────────────────────────────────────

function ColumnMappingDialog({
  headers,
  rowCount,
  onConfirm,
  onCancel,
}: {
  headers: string[];
  rowCount: number;
  onConfirm: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}) {
  const [mapping, setMapping] = useState<ColumnMapping>(() => {
    const auto = autoDetectMapping(headers);
    return {
      description: auto.description ?? "",
      category: auto.category ?? "",
      itemId: auto.itemId ?? "",
      unit: auto.unit ?? "",
      userPrice: auto.userPrice ?? "",
      defaultPrice: auto.defaultPrice ?? "",
    };
  });

  const canProceed = mapping.description !== "";

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileSpreadsheet size={18} className="text-[#F5C518]" />
          Map CSV Columns
        </DialogTitle>
        <DialogDescription>
          Your file has <strong>{rowCount}</strong> rows and{" "}
          <strong>{headers.length}</strong> columns. Select which column maps to each
          required field. Auto-detection has been applied — review and adjust as needed.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 py-2">
        {APP_COLUMNS.map((col) => (
          <div key={col.key} className="grid grid-cols-[140px_1fr] items-center gap-3">
            <div>
              <span className="text-sm font-medium">{col.label}</span>
              {col.required && <span className="text-red-400 ml-1 text-xs">*</span>}
              <p className="text-[10px] text-muted-foreground">{col.hint}</p>
            </div>
            <Select
              value={mapping[col.key] || "__none__"}
              onValueChange={(v) => setMapping((p) => ({ ...p, [col.key]: v === "__none__" ? "" : v }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="— skip —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— skip —</SelectItem>
                {headers.map((h) => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {!canProceed && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
          <AlertCircle size={12} />
          You must map the <strong>Description</strong> column to continue.
        </div>
      )}

      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button
          disabled={!canProceed}
          onClick={() => onConfirm(mapping)}
          className="bg-[#F5C518] text-black hover:bg-[#F5C518]/90"
        >
          Continue to Import
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ─── Replace Confirmation Dialog ──────────────────────────────────────────────

function ReplaceConfirmDialog({
  rowCount,
  existingCount,
  onConfirm,
  onCancel,
}: {
  rowCount: number;
  existingCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim().toUpperCase() === "REPLACE";

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-red-400">
          <AlertTriangle size={18} />
          Replace Entire Database?
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed">
          This will <strong className="text-red-400">permanently delete all {existingCount} existing
          materials</strong> and replace them with the <strong>{rowCount} rows</strong> from your CSV.
          <br /><br />
          All custom pricing (User_Price) and Last_Updated dates will be wiped. This cannot be undone.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 py-2">
        <p className="text-xs text-muted-foreground">
          Type <span className="font-mono font-bold text-red-400">REPLACE</span> to confirm:
        </p>
        <input
          autoFocus
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Type REPLACE to confirm"
          className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-red-500/60 font-mono"
        />
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button
          disabled={!confirmed}
          onClick={onConfirm}
          variant="destructive"
        >
          Replace Database
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ─── Add Custom Material Dialog ───────────────────────────────────────────────

function AddMaterialDialog({
  onAdd,
  onClose,
}: {
  onAdd: (data: { description: string; category: string; itemCode: string; unit: string; defaultPrice: number | null; userPrice: number | null }) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    description: "",
    category: "",
    itemCode: "",
    unit: "EA",
    defaultPrice: "",
    userPrice: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const canSubmit = form.description.trim().length > 0;

  const handleSubmit = () => {
    onAdd({
      description: form.description.trim(),
      category: form.category.trim(),
      itemCode: form.itemCode.trim(),
      unit: form.unit.trim() || "EA",
      defaultPrice: form.defaultPrice ? parseFloat(form.defaultPrice) : null,
      userPrice: form.userPrice ? parseFloat(form.userPrice) : null,
    });
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Plus size={16} className="text-[#F5C518]" />
          Add Custom Material
        </DialogTitle>
        <DialogDescription>
          Manually add a single item to your material database.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 py-2">
        {[
          { key: "description" as const, label: "Description *", placeholder: "e.g. 1/2\" EMT Conduit", required: true },
          { key: "category" as const, label: "Category", placeholder: "e.g. Conduit & Fittings", required: false },
          { key: "itemCode" as const, label: "Item Code / SKU", placeholder: "e.g. EMT-050", required: false },
          { key: "unit" as const, label: "Unit", placeholder: "EA, FT, LF, etc.", required: false },
        ].map(({ key, label, placeholder, required }) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{label}</label>
            <input
              type="text"
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
              placeholder={placeholder}
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-[#F5C518]/60 placeholder:text-muted-foreground/50"
            />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Default Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.defaultPrice}
              onChange={(e) => set("defaultPrice", e.target.value)}
              placeholder="0.00"
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-[#F5C518]/60 font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">User Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.userPrice}
              onChange={(e) => set("userPrice", e.target.value)}
              placeholder="0.00"
              className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-[#F5C518]/60 font-mono"
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="bg-[#F5C518] text-black hover:bg-[#F5C518]/90"
        >
          Add Item
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface MaterialDatabasePageProps {
  onBack?: () => void;
}

export default function MaterialDatabasePage({ onBack }: MaterialDatabasePageProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["__all__"]));

  // ── CSV import state machine ──────────────────────────────────────────────
  type ImportStage =
    | { stage: "idle" }
    | { stage: "mapping"; headers: string[]; rows: Record<string, string>[] }
    | { stage: "confirm-replace"; headers: string[]; rows: Record<string, string>[]; mapping: ColumnMapping }
    | { stage: "importing" };

  const [importState, setImportState] = useState<ImportStage>({ stage: "idle" });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ── tRPC ──────────────────────────────────────────────────────────────────
  const utils = trpc.useUtils();
  const { data: materials = [], isLoading } = trpc.data.materials.list.useQuery();

  const bulkImport = trpc.data.materials.bulkImport.useMutation({
    onSuccess: (res) => {
      toast.success(`Imported ${res.count} items successfully`);
      utils.data.materials.list.invalidate();
      setImportState({ stage: "idle" });
    },
    onError: (err) => {
      toast.error(`Import failed: ${err.message}`);
      setImportState({ stage: "idle" });
    },
  });

  const updatePrice = trpc.data.materials.updatePrice.useMutation({
    onSuccess: () => utils.data.materials.list.invalidate(),
    onError: (err) => toast.error(err.message),
  });

  const resetPrice = trpc.data.materials.resetPrice.useMutation({
    onSuccess: () => { toast.success("Price reset to default"); utils.data.materials.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });

  const addSingle = trpc.data.materials.addSingle.useMutation({
    onSuccess: () => { toast.success("Item added"); utils.data.materials.list.invalidate(); setShowAddDialog(false); },
    onError: (err) => toast.error(err.message),
  });

  const deleteMaterial = trpc.data.materials.delete.useMutation({
    onSuccess: () => { utils.data.materials.list.invalidate(); setDeletingId(null); },
    onError: (err) => toast.error(err.message),
  });

  const seedFromCatalog = trpc.data.materials.seedFromCatalog.useMutation({
    onSuccess: (res) => {
      toast.success(`Loaded ${res.count} items from the master catalog`);
      utils.data.materials.list.invalidate();
    },
    onError: (err) => toast.error(`Seed failed: ${err.message}`),
  });

  // ── File pick ─────────────────────────────────────────────────────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = "";

    const text = await file.text();
    const { headers, rows } = parseCSVRaw(text);

    if (headers.length === 0 || rows.length === 0) {
      toast.error("No data found. Make sure your CSV has a header row and at least one data row.");
      return;
    }

    setImportState({ stage: "mapping", headers, rows });
  };

  // ── After column mapping confirmed ────────────────────────────────────────
  const handleMappingConfirm = (mapping: ColumnMapping) => {
    const { rows, headers } = importState as { stage: "mapping"; headers: string[]; rows: Record<string, string>[] };
    if (materials.length > 0) {
      setImportState({ stage: "confirm-replace", headers, rows, mapping });
    } else {
      executeImport(rows, mapping, false);
    }
  };

  // ── Execute the actual import ─────────────────────────────────────────────
  const executeImport = (
    rows: Record<string, string>[],
    mapping: ColumnMapping,
    replaceAll: boolean
  ) => {
    setImportState({ stage: "importing" });
    const items = rows
      .map((row, idx) => {
        const get = (col: string) => (col ? row[col]?.trim() ?? "" : "");
        const desc = get(mapping.description);
        if (!desc) return null;
        const up = parseFloat(get(mapping.userPrice));
        const dp = parseFloat(get(mapping.defaultPrice));
        return {
          description: desc,
          category: get(mapping.category) || undefined,
          itemCode: get(mapping.itemId) || `AUTO-${idx + 1}`,
          unit: get(mapping.unit) || "EA",
          userPrice: isNaN(up) ? undefined : up,
          defaultPrice: isNaN(dp) ? undefined : dp,
          unitMaterialCost: isNaN(dp) ? (isNaN(up) ? 0 : up) : dp,
          source: "import" as const,
        };
      })
      .filter(Boolean) as Parameters<typeof bulkImport.mutate>[0]["items"];

    if (items.length === 0) {
      toast.error("No valid rows found after mapping. Check that your Description column has data.");
      setImportState({ stage: "idle" });
      return;
    }

    bulkImport.mutate({ items, replaceAll });
  };

  // ── Grouped materials ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return materials;
    const q = search.toLowerCase();
    return materials.filter(
      (m) =>
        m.description.toLowerCase().includes(q) ||
        (m.category ?? "").toLowerCase().includes(q) ||
        (m.itemCode ?? "").toLowerCase().includes(q)
    );
  }, [materials, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Material[]>();
    for (const m of filtered) {
      const cat = m.category ?? "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(m as Material);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggleCategory = (cat: string) =>
    setExpandedCategories((p) => {
      const n = new Set(p);
      n.has(cat) ? n.delete(cat) : n.add(cat);
      return n;
    });

  const missingPriceCount = materials.filter((m) => isMissingPrice(m as Material)).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors mr-1">
              <ArrowLeft size={16} />
            </button>
          )}
          <Database size={18} className="text-[#F5C518]" />
          <div>
            <h1 className="text-base font-semibold leading-tight">Material Database</h1>
            <p className="text-[11px] text-muted-foreground">
              {materials.length} items
              {missingPriceCount > 0 && (
                <span className="ml-2 text-red-400">· {missingPriceCount} missing price</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items…"
              className="pl-7 pr-3 py-1.5 bg-muted/30 border border-border/60 rounded-lg text-xs outline-none focus:border-[#F5C518]/60 w-44"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={10} />
              </button>
            )}
          </div>

          {/* Add custom */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddDialog(true)}
            className="gap-1.5 text-xs h-8"
          >
            <Plus size={12} />
            Add Custom Material
          </Button>

          {/* Import */}
          <Button
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="gap-1.5 text-xs h-8 bg-[#F5C518] text-black hover:bg-[#F5C518]/90"
            disabled={importState.stage === "importing"}
          >
            {importState.stage === "importing" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Upload size={12} />
            )}
            Import Material List
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 px-5 py-2 border-b border-border/30 text-[10px] text-muted-foreground shrink-0">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F5C518]/60 inline-block" /> Custom price (User_Price)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" /> Default price</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/60 inline-block" /> Missing price — quote required</span>
        <span className="ml-auto flex items-center gap-3">
          <span className="text-emerald-400">● &lt;30 days</span>
          <span className="text-yellow-400">● 30–90 days</span>
          <span className="text-red-400">● &gt;90 days</span>
          <span className="text-muted-foreground/50">Last_Updated age</span>
        </span>
      </div>

      {/* ── Table header ── */}
      <div className="grid grid-cols-[1fr_100px_80px_130px_130px_36px] gap-2 px-5 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/40 shrink-0">
        <span>Description</span>
        <span>Item Code</span>
        <span>Unit</span>
        <span>User_Price</span>
        <span>Last_Updated</span>
        <span />
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
            <Loader2 size={16} className="animate-spin" />
            Loading materials…
          </div>
        )}

        {!isLoading && materials.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-6 text-center px-8">
            <Database size={48} className="text-muted-foreground/20" />
            <div>
              <p className="text-base font-semibold text-foreground">Your material database is empty</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Load the built-in master catalog of 623 common electrical items with baseline prices,
                or import your own supply house CSV.
              </p>
            </div>
            {/* Primary CTA — load master catalog */}
            <div className="bg-[#F5C518]/10 border border-[#F5C518]/30 rounded-xl p-5 max-w-sm w-full">
              <p className="text-sm font-semibold text-[#F5C518] mb-1">Recommended: Load Master Catalog</p>
              <p className="text-xs text-muted-foreground mb-4">
                623 items across Distribution, Conduit, Wire, Rough-in, Devices &amp; Civil.
                Prices are editable — update them with your own supply house quotes at any time.
              </p>
              <Button
                className="w-full bg-[#F5C518] text-black hover:bg-[#F5C518]/90 font-semibold"
                disabled={seedFromCatalog.isPending}
                onClick={() => seedFromCatalog.mutate({ replaceAll: false })}
              >
                {seedFromCatalog.isPending ? (
                  <><Loader2 size={14} className="animate-spin mr-2" />Loading catalog…</>
                ) : (
                  <><Database size={14} className="mr-2" />Load Master Catalog (623 items)</>
                )}
              </Button>
            </div>
            {/* Secondary options */}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)} className="gap-1.5 text-xs">
                <Plus size={12} />Add Custom Material
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="gap-1.5 text-xs"
              >
                <Upload size={12} />Import CSV
              </Button>
            </div>
          </div>
        )}

        {!isLoading && materials.length > 0 && filtered.length === 0 && (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            No items match your search.
          </div>
        )}

        {grouped.map(([category, items]) => (
          <div key={category}>
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center gap-2 px-5 py-2 bg-muted/20 hover:bg-muted/30 transition-colors border-b border-border/30 text-left"
            >
              {expandedCategories.has(category) ? (
                <ChevronDown size={12} className="text-muted-foreground" />
              ) : (
                <ChevronRight size={12} className="text-muted-foreground" />
              )}
              <span className="text-xs font-semibold text-foreground">{category}</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{items.length}</Badge>
              {items.some((m) => isMissingPrice(m)) && (
                <span className="text-[10px] text-red-400 ml-1">
                  ⚠ {items.filter((m) => isMissingPrice(m)).length} missing price
                </span>
              )}
            </button>

            {/* Rows */}
            {expandedCategories.has(category) && items.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "grid grid-cols-[1fr_100px_80px_130px_130px_36px] gap-2 px-5 py-2 border-b border-border/20 hover:bg-muted/10 transition-colors items-center",
                  isMissingPrice(m) && "bg-red-500/5"
                )}
              >
                {/* Description */}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{m.description}</p>
                </div>

                {/* Item Code */}
                <span className="text-[10px] font-mono text-muted-foreground truncate">{m.itemCode ?? "—"}</span>

                {/* Unit */}
                <span className="text-[10px] text-muted-foreground">{m.unit ?? "EA"}</span>

                {/* User_Price (inline editable) */}
                <PriceCell
                  material={m}
                  onSave={(id, price) => updatePrice.mutate({ id, userPrice: price })}
                  onReset={(id) => resetPrice.mutate({ id })}
                />

                {/* Last_Updated */}
                <span className={cn("text-[10px] font-mono", ageClass(m.lastUpdated))}>
                  {ageLabel(m.lastUpdated)}
                </span>

                {/* Delete */}
                <button
                  onClick={() => setDeletingId(m.id)}
                  className="text-muted-foreground/40 hover:text-red-400 transition-colors"
                  title="Delete item"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Dialogs ── */}
      <Dialog
        open={importState.stage === "mapping"}
        onOpenChange={(o) => { if (!o) setImportState({ stage: "idle" }); }}
      >
        {importState.stage === "mapping" && (
          <ColumnMappingDialog
            headers={importState.headers}
            rowCount={importState.rows.length}
            onConfirm={handleMappingConfirm}
            onCancel={() => setImportState({ stage: "idle" })}
          />
        )}
      </Dialog>

      <Dialog
        open={importState.stage === "confirm-replace"}
        onOpenChange={(o) => { if (!o) setImportState({ stage: "idle" }); }}
      >
        {importState.stage === "confirm-replace" && (
          <ReplaceConfirmDialog
            rowCount={importState.rows.length}
            existingCount={materials.length}
            onConfirm={() => {
              const s = importState as Extract<typeof importState, { stage: "confirm-replace" }>;
              executeImport(s.rows, s.mapping, true);
            }}
            onCancel={() => setImportState({ stage: "idle" })}
          />
        )}
      </Dialog>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        {showAddDialog && (
          <AddMaterialDialog
            onAdd={(data) =>
              addSingle.mutate({
                description: data.description,
                category: data.category || undefined,
                itemCode: data.itemCode || undefined,
                unit: data.unit,
                defaultPrice: data.defaultPrice ?? undefined,
                userPrice: data.userPrice ?? undefined,
                unitMaterialCost: data.defaultPrice ?? 0,
                source: "custom",
              })
            }
            onClose={() => setShowAddDialog(false)}
          />
        )}
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deletingId !== null} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Material?</DialogTitle>
            <DialogDescription>This item will be permanently removed from your database.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => { if (deletingId) deleteMaterial.mutate({ id: deletingId }); }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
