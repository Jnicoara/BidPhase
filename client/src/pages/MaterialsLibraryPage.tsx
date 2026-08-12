/**
 * MaterialsLibraryPage — the Foundation material catalog (Library § Materials).
 *
 * Distinct from MaterialDatabasePage (/matdb), which is the supply-house price
 * list. This is the catalog assemblies are built from.
 *
 * Fork behaviour is intentionally invisible here: the row is edited by id and
 * the server decides whether that means editing the user's own copy or forking
 * a shipped baseline first. The only UI consequence is the toast that appears
 * the first time a starter material is edited, and the fact that the row's id
 * can change underneath us — hence the refetch after every mutation.
 */
import { useCallback, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { selectOnFocus } from "@/lib/selectOnFocus";
import {
  Archive as ArchiveIcon, Boxes, Check, Loader2, Pencil, Plus, RotateCcw, Search, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { smartSearch } from "@/lib/smartSearch";
import { ScopeFilter, ViewTabs, type LibraryView } from "@/components/library/LibraryControls";
import {
  ArchiveItemDialog, DeleteForeverDialog, type PendingItem,
} from "@/components/library/LibraryRemovalDialogs";
import { filterByScope, scopeCounts, type LibraryScope } from "@/lib/libraryScope";
import { AliasSuggestions } from "@/components/AliasSuggestions";

// ─── Types & helpers ──────────────────────────────────────────────────────────

/**
 * Mirrors MATERIAL_CATEGORIES in drizzle/schema.ts, which is the source of
 * truth — the client does not import from drizzle, so this is kept in step by
 * hand, same as UNITS below. Order here is the order the sections render in.
 */
const CATEGORIES = [
  "Wire & Cable",
  "Conduit",
  "Conduit Fittings",
  "Boxes",
  "Receptacles",
  "Switches",
  "Wall Plates & Misc",
  "Panels & Breakers",
  "Lighting Hardware",
] as const;

type Category = (typeof CATEGORIES)[number];

type Material = {
  id: number;
  userId: number | null;
  baselineId: number | null;
  name: string;
  unitOfSale: "each" | "foot" | "box";
  costPerUnit: string;
  category: Category | null;
  /** Space-separated trade slang, fed to smartSearch. Editable inline. */
  searchAliases: string | null;
};

/**
 * Ask for alias suggestions for a draft. Shared by the add form and the inline
 * editor so both offer the same help, and so neither can throw at the component
 * — `AliasSuggestions` promises its button resolves to a list either way.
 */
type SuggestAliases = (
  name: string,
  category: Category | null,
  existing: string | null
) => Promise<string[]>;

const UNITS: Material["unitOfSale"][] = ["each", "foot", "box"];

/**
 * Radix Select cannot hold an empty-string value, so "no category" travels
 * through the pickers as this sentinel and is converted at the edges.
 */
const NO_CATEGORY = "__none__";

/** decimal(10,4) — mirrors the bound the router enforces. */
const MAX_COST = 999999.9999;

const formatCost = (value: string) =>
  Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

const UNIT_LABEL: Record<Material["unitOfSale"], string> = {
  each: "each",
  foot: "per ft",
  box: "per box",
};

type Draft = {
  name: string;
  unitOfSale: Material["unitOfSale"];
  costPerUnit: string;
  category: Category | null;
  /**
   * Per-item trade slang — the second alias layer.
   *
   * Collected here because a material added by hand previously got none at
   * all, which made it findable by generic trade words and invisible to the
   * specific ones every seeded material supports.
   */
  searchAliases: string;
};

const emptyDraft: Draft = {
  name: "", unitOfSale: "each", costPerUnit: "", category: null, searchAliases: "",
};

/** Shared validation for both the add form and inline edits. */
function validateDraft(draft: Draft): string | null {
  if (!draft.name.trim()) return "Give the material a name.";
  const cost = Number(draft.costPerUnit);
  if (draft.costPerUnit.trim() === "" || Number.isNaN(cost)) return "Enter a cost.";
  if (cost < 0) return "Cost cannot be negative.";
  if (cost > MAX_COST) return "That cost is too large.";
  return null;
}

// ─── Category picker ──────────────────────────────────────────────────────────

/** Shared by the add form and the inline editor so both offer the same shelves. */
function CategorySelect({
  value,
  onChange,
  className,
}: {
  value: Category | null;
  onChange: (value: Category | null) => void;
  className?: string;
}) {
  return (
    <Select
      value={value ?? NO_CATEGORY}
      onValueChange={next => onChange(next === NO_CATEGORY ? null : (next as Category))}
    >
      <SelectTrigger className={cn("h-8 w-44 text-sm", className)} aria-label="Category">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_CATEGORY}>
          <span className="text-muted-foreground">No category</span>
        </SelectItem>
        {CATEGORIES.map(category => (
          <SelectItem key={category} value={category}>{category}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Origin badge ─────────────────────────────────────────────────────────────

function OriginBadge({ material }: { material: Material }) {
  if (material.userId === null) {
    return <Badge variant="outline" className="text-xs text-muted-foreground">Starter</Badge>;
  }
  if (material.baselineId != null) {
    // "Your copy" rather than "Edited" on purpose: after a revert the row is
    // still the user's own fork, just holding starter content again. Labelling
    // by ownership is always true; labelling by edited-ness would go stale.
    return (
      <Badge variant="outline" className="text-xs bg-[#F5C518]/15 text-[#F5C518] border-[#F5C518]/30">
        Your copy
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-xs">Yours</Badge>;
}

// ─── Editable row ─────────────────────────────────────────────────────────────

function MaterialRow({
  material,
  isBusy,
  showCategory,
  isArchived,
  onSave,
  onSuggestAliases,
  onRevert,
  onRemove,
  onRestore,
  onDeleteForever,
}: {
  material: Material;
  isBusy: boolean;
  /** True while searching, where the flat list has no section header to lean on. */
  showCategory: boolean;
  /** Rendering the Archived view — different actions, no inline editing. */
  isArchived?: boolean;
  onSave: (id: number, draft: Draft) => Promise<void>;
  onSuggestAliases: SuggestAliases;
  onRevert: (material: Material) => void;
  onRemove: (material: Material) => void;
  onRestore?: (material: Material) => void;
  onDeleteForever?: (material: Material) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const startEditing = () => {
    setDraft({
      name: material.name,
      unitOfSale: material.unitOfSale,
      costPerUnit: String(Number(material.costPerUnit)),
      category: material.category,
      // Seeded from the row, so the field opens showing the slang the material
      // already carries. That is what makes it safe for the save to send this
      // key at all: an untouched editor sends back exactly what was there, so
      // editing a price still cannot wipe the aliases that make the row
      // findable — the protection moved from "never send it" to "always start
      // from the truth", and editing the terms is now possible either way.
      searchAliases: material.searchAliases ?? "",
    });
    setEditing(true);
  };

  const save = async () => {
    const problem = validateDraft(draft);
    if (problem) {
      toast.error(problem);
      return;
    }
    await onSave(material.id, draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="px-4 py-3 border-b border-border last:border-0 bg-muted/20">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={draft.name}
            onChange={e => setDraft({ ...draft, name: e.target.value })}
            className="h-8 flex-1 min-w-[12rem] text-sm"
            placeholder="Material name"
            autoFocus
          />
          <CategorySelect
            value={draft.category}
            onChange={category => setDraft({ ...draft, category })}
          />
          <Select
            value={draft.unitOfSale}
            onValueChange={value => setDraft({ ...draft, unitOfSale: value as Material["unitOfSale"] })}
          >
            <SelectTrigger className="h-8 w-28 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {UNITS.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            value={draft.costPerUnit}
            onChange={e => setDraft({ ...draft, costPerUnit: e.target.value })}
            className="h-8 w-28 text-sm text-right"
            inputMode="decimal"
            onFocus={selectOnFocus}
            placeholder="0.00"
          />
          <div className="flex items-center gap-1">
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={save} disabled={isBusy}>
              {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setEditing(false)}
              disabled={isBusy}
            >
              <X className="w-3 h-3" /> Cancel
            </Button>
          </div>
        </div>

        {/* Aliases are editable here for the same reason they are collected on
            the add form: they are the only thing that makes a material findable
            by what it is actually called. Until now they could be set once at
            creation and never corrected, which left a typo'd or missing term
            permanently wrong on a row the user could otherwise edit freely.
            Starter rows included — editing one forks it, so the fork carries
            the slang the user chose rather than the shipped list. */}
        <div className="mt-2">
          <AliasSuggestions
            value={draft.searchAliases}
            onChange={searchAliases => setDraft({ ...draft, searchAliases })}
            disabled={isBusy}
            onRequest={() =>
              onSuggestAliases(draft.name, draft.category, draft.searchAliases || null)
            }
          />
          <p className="text-[0.7rem] text-muted-foreground mt-1">
            What people type instead of the catalog name. Clearing this makes the material
            findable only by the words in its name.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20 transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{material.name}</span>
          <OriginBadge material={material} />
          {showCategory && (
            <span className="text-xs text-muted-foreground truncate">
              {material.category ?? "Uncategorized"}
            </span>
          )}
        </div>
      </div>

      <span className="text-xs text-muted-foreground w-16 shrink-0">{UNIT_LABEL[material.unitOfSale]}</span>
      <span className="text-sm font-mono w-24 text-right shrink-0">{formatCost(material.costPerUnit)}</span>

      <div className="flex items-center gap-0.5 w-28 justify-end shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          onClick={startEditing}
          disabled={isBusy}
          title={material.userId === null ? "Edit — creates your own copy" : "Edit"}
          aria-label={`Edit ${material.name}`}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>

        {material.baselineId != null && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            onClick={() => onRevert(material)}
            disabled={isBusy}
            title="Undo your changes and restore the starter version"
            aria-label={`Revert ${material.name}`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        )}

        {/* Archived rows offer the way back and the way out; the working list
            offers Archive. The inline "Sure?" two-step this replaced is gone —
            the dialog says what actually happens, which "Sure?" never did. */}
        {isArchived ? (
          <>
            <Button
              size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
              onClick={() => onRestore?.(material)}
              aria-label={`Restore ${material.name}`}
            >
              <RotateCcw className="w-3 h-3" /> Restore
            </Button>
            <Button
              size="sm" variant="ghost"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onDeleteForever?.(material)}
              title="Delete permanently — cannot be undone"
              aria-label={`Delete ${material.name} forever`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : material.userId !== null && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
            onClick={() => onRemove(material)}
            disabled={isBusy}
            title="Archive — out of the working list, restorable any time"
            aria-label={`Archive ${material.name}`}
          >
            <ArchiveIcon className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MaterialsLibraryPage() {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [view, setView] = useState<LibraryView>("active");
  const [scope, setScope] = useState<LibraryScope>("all");
  const [pendingArchive, setPendingArchive] = useState<PendingItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingItem | null>(null);

  const { data: materials = [], isLoading, refetch } = trpc.materials.list.useQuery({ status: view });
  const { data: archivedRows = [] } = trpc.materials.list.useQuery({ status: "archived" });

  const onError = (e: { message: string }) => toast.error(e.message);
  const utils = trpc.useUtils();
  const refreshAll = () => { void utils.materials.list.invalidate(); void refetch(); };

  const createMaterial = trpc.materials.create.useMutation({ onError });
  const suggestAliases = trpc.materials.suggestAliases.useMutation();
  const updateMaterial = trpc.materials.update.useMutation({ onError });
  const revertMaterial = trpc.materials.revert.useMutation({ onError });

  const archiveMaterial = trpc.materials.archive.useMutation({
    onError,
    onSuccess: () => { toast.success("Archived — restore it any time."); refreshAll(); },
  });
  const restoreMaterial = trpc.materials.restore.useMutation({
    onError,
    onSuccess: () => { toast.success("Back in the working list."); refreshAll(); },
  });
  const deleteForever = trpc.materials.deleteForever.useMutation({
    onError,
    onSuccess: () => { toast.success("Deleted permanently."); refreshAll(); },
  });

  const isBusy =
    createMaterial.isPending || updateMaterial.isPending ||
    revertMaterial.isPending || archiveMaterial.isPending;

  // smartSearch caches its index by array identity, so this must stay memoised.
  //
  // searchAliases feeds the index's non-name text, which scores below the name
  // itself — enough to surface "Duplex receptacle" for "plug", never enough to
  // outrank an item the query actually names.
  //
  // `category` is deliberately NOT indexed. It reads like a free win, but every
  // item on a shelf inherits the shelf's words: indexing it made "panel" return
  // both breakers (category "Panels & Breakers") and "cover plate" return wire
  // nuts (category "Wall Plates & Misc"). The sections are already visible on
  // screen; the search box should match materials, not shelves.
  const searchable = useMemo(
    () => materials.map(m => ({
      id: String(m.id),
      description: m.name,
      unit: m.unitOfSale,
      searchAliases: m.searchAliases,
    })),
    [materials]
  );

  const searching = query.trim().length > 0;

  const visible = useMemo(() => {
    // Scope first: "Mine" is about what you own, and applying it before the
    // search means the result count matches what the filter promised.
    const inScope = filterByScope(materials, scope);
    if (!searching) return inScope;
    const hits = smartSearch(searchable, query, 500);
    const order = new Map(hits.map((hit, index) => [Number(hit.id), index]));
    return inScope
      .filter(m => order.has(m.id))
      .sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  }, [materials, searchable, query, searching, scope]);

  /**
   * Browsing shelves the catalog by category, in the declared order, with
   * Uncategorized last and empty sections dropped. Searching deliberately does
   * NOT group: sections would bury the best match under whichever shelf it
   * happens to sit on, so those results stay flat and relevance-ordered, and
   * each row prints its own category instead.
   *
   * Rows arrive name-sorted from the server, so no per-group sort is needed.
   */
  const groups = useMemo(() => {
    if (searching) return [];
    const byCategory = new Map<string, Material[]>();
    for (const material of visible as Material[]) {
      const key = material.category ?? "Uncategorized";
      const bucket = byCategory.get(key);
      if (bucket) bucket.push(material);
      else byCategory.set(key, [material]);
    }
    return [...CATEGORIES, "Uncategorized"]
      .map(label => ({ label, items: byCategory.get(label) ?? [] }))
      .filter(group => group.items.length > 0);
  }, [visible, searching]);

  const handleSave = useCallback(async (id: number, draft: Draft) => {
    setBusyId(id);
    try {
      const result = await updateMaterial.mutateAsync({
        id,
        name: draft.name.trim(),
        unitOfSale: draft.unitOfSale,
        costPerUnit: Number(draft.costPerUnit),
        category: draft.category,
        // Sent unconditionally now the editor shows it: blank means the user
        // cleared the field, which is a real edit, where omitting the key
        // would quietly keep the old terms and make the clear look like it
        // failed.
        //
        // Cleared stores "" and NOT null, which matters more than it looks.
        // `backfillMaterialMetadata` (server/db.ts) refills any fork whose
        // aliases are NULL from its baseline on every startup — NULL there
        // means "predates the column, inherit it". Saving a deliberate clear
        // as NULL would put the starter's slang back the next time the server
        // booted, and search failures of that kind are invisible until someone
        // notices their results are wrong. Empty text says "the user says this
        // has none", and reads identically to NULL everywhere else: smartSearch
        // coalesces both to "".
        searchAliases: draft.searchAliases.trim(),
      });
      if (result.forked) {
        toast.success(`Saved as your own copy — the starter "${result.material?.name}" is unchanged.`);
      } else {
        toast.success("Material updated");
      }
      await refetch();
    } catch {
      // onError already surfaced it
    } finally {
      setBusyId(null);
    }
  }, [updateMaterial, refetch]);

  /**
   * Suggestions for whichever draft is asking — the add form or a row editor.
   *
   * Never rejects. `AliasSuggestions` documents its request as resolving to a
   * list whatever happens, and a failed suggestion is a missing convenience,
   * not a broken save: the free-text field beside it still works.
   */
  const requestAliasSuggestions = useCallback<SuggestAliases>(
    async (name, category, existing) => {
      if (!name.trim()) {
        toast.error("Give the material a name first — suggestions come from it.");
        return [];
      }
      try {
        const result = await suggestAliases.mutateAsync({
          name: name.trim(),
          category,
          existing,
        });
        return result.suggestions;
      } catch {
        toast.error("Couldn't fetch suggestions — type the terms people use for it yourself.");
        return [];
      }
    },
    [suggestAliases]
  );

  const handleRevert = useCallback(async (material: Material) => {
    setBusyId(material.id);
    try {
      await revertMaterial.mutateAsync({ id: material.id });
      toast.success("Restored the starter version");
      await refetch();
    } catch {
      /* handled by onError */
    } finally {
      setBusyId(null);
    }
  }, [revertMaterial, refetch]);

  /** Asks first. The archive itself happens from the dialog's confirm. */
  const handleRemove = useCallback((material: Material) => {
    setPendingArchive({ id: material.id, name: material.name });
  }, []);

  const handleCreate = useCallback(async () => {
    const problem = validateDraft(newDraft);
    if (problem) {
      toast.error(problem);
      return;
    }
    try {
      await createMaterial.mutateAsync({
        name: newDraft.name.trim(),
        unitOfSale: newDraft.unitOfSale,
        costPerUnit: Number(newDraft.costPerUnit),
        category: newDraft.category,
        searchAliases: newDraft.searchAliases.trim() || null,
      });
      toast.success(`Added "${newDraft.name.trim()}"`);
      setNewDraft(emptyDraft);
      setAdding(false);
      await refetch();
    } catch {
      /* handled by onError */
    }
  }, [createMaterial, newDraft, refetch]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Boxes className="w-5 h-5 text-primary" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold">Materials</h1>
            <p className="text-xs text-muted-foreground">
              The catalog your assemblies are built from. Starter prices are estimates — replace them with your own.
            </p>
          </div>
          <Button size="sm" className="h-8 gap-1.5 text-xs shrink-0" onClick={() => setAdding(v => !v)}>
            <Plus className="w-3.5 h-3.5" /> Add material
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search materials…"
            className="h-9 pl-9 text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <ViewTabs view={view} onChange={setView} archivedCount={archivedRows.length} />
          <ScopeFilter scope={scope} onChange={setScope} counts={scopeCounts(materials)} />
        </div>

        {/* Add form */}
        {adding && (
          <div className="rounded-xl border border-border bg-card px-4 py-3 mb-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={newDraft.name}
                onChange={e => setNewDraft({ ...newDraft, name: e.target.value })}
                className="h-8 flex-1 min-w-[12rem] text-sm"
                placeholder="Material name"
                autoFocus
              />
              <CategorySelect
                value={newDraft.category}
                onChange={category => setNewDraft({ ...newDraft, category })}
              />
              <Select
                value={newDraft.unitOfSale}
                onValueChange={value => setNewDraft({ ...newDraft, unitOfSale: value as Material["unitOfSale"] })}
              >
                <SelectTrigger className="h-8 w-28 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                value={newDraft.costPerUnit}
                onChange={e => setNewDraft({ ...newDraft, costPerUnit: e.target.value })}
                className="h-8 w-28 text-sm text-right"
                inputMode="decimal"
                onFocus={selectOnFocus}
                placeholder="0.00"
              />
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleCreate} disabled={createMaterial.isPending}>
                {createMaterial.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 text-xs"
                onClick={() => { setAdding(false); setNewDraft(emptyDraft); }}
              >
                <X className="w-3 h-3" /> Cancel
              </Button>
            </div>

            {/* The second alias layer. A material added here used to get none
                at all, leaving it findable by generic trade words and
                invisible to the specific ones — the exact thing every seeded
                material carries. */}
            <div className="mt-2">
              <AliasSuggestions
                value={newDraft.searchAliases}
                onChange={searchAliases => setNewDraft({ ...newDraft, searchAliases })}
                disabled={createMaterial.isPending}
                onRequest={() =>
                  requestAliasSuggestions(
                    newDraft.name,
                    newDraft.category,
                    newDraft.searchAliases || null
                  )
                }
              />
              <p className="text-[0.7rem] text-muted-foreground mt-1">
                What people type instead of the catalog name — “spring nut”, “1900”, “gem box”.
                Optional, but it is what makes a material findable the way it is asked for.
              </p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Column headers */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
            <span className="flex-1">Material</span>
            <span className="w-16 shrink-0">Unit</span>
            <span className="w-24 text-right shrink-0">Cost</span>
            <span className="w-28 shrink-0" />
          </div>

          {isLoading ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading materials…</div>
          ) : visible.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              {query
                ? <>No materials match “{query}”.</>
                : <>No materials yet. Add your first one to get started.</>}
            </div>
          ) : searching ? (
            visible.map(material => (
              <MaterialRow
                key={material.id}
                material={material as Material}
                isBusy={isBusy && busyId === material.id}
                showCategory
                onSave={handleSave}
                onSuggestAliases={requestAliasSuggestions}
                onRevert={handleRevert}
                onRemove={handleRemove}
                isArchived={view === "archived"}
                onRestore={m => restoreMaterial.mutate({ id: m.id })}
                onDeleteForever={m => setPendingDelete({ id: m.id, name: m.name })}
              />
            ))
          ) : (
            groups.map(group => (
              <div key={group.label}>
                <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/40 border-b border-border">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </span>
                  <span className="text-xs text-muted-foreground/70">{group.items.length}</span>
                </div>
                {group.items.map(material => (
                  <MaterialRow
                    key={material.id}
                    material={material}
                    isBusy={isBusy && busyId === material.id}
                    showCategory={false}
                    onSave={handleSave}
                    onSuggestAliases={requestAliasSuggestions}
                    onRevert={handleRevert}
                    onRemove={handleRemove}
                    isArchived={view === "archived"}
                    onRestore={m => restoreMaterial.mutate({ id: m.id })}
                    onDeleteForever={m => setPendingDelete({ id: m.id, name: m.name })}
                  />
                ))}
              </div>
            ))
          )}
        </div>

        <p className={cn("text-xs text-muted-foreground mt-2")}>
          {view === "active"
            ? "Editing a starter material gives you your own copy — the original stays untouched, and you can restore it any time with the undo button. Removing one archives it rather than deleting it."
            : "Restoring puts a material back in the working list. Deleting forever cannot be undone."}
        </p>
      </div>

      <ArchiveItemDialog
        pending={pendingArchive}
        noun="material"
        stillUsedNote="Assemblies that already use it keep working — an archived material keeps its place in every recipe it is part of."
        onClose={() => setPendingArchive(null)}
        onConfirm={id => archiveMaterial.mutate({ id })}
      />
      <DeleteForeverDialog
        pending={pendingDelete}
        noun="material"
        keepsNote="Bids that already priced it keep the costs they were quoted at."
        onClose={() => setPendingDelete(null)}
        onConfirm={id => deleteForever.mutate({ id })}
      />
    </div>
  );
}
