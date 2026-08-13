/**
 * Supplier Pricing — put your supply house's prices on the real catalog.
 *
 * ── One catalog, not two ─────────────────────────────────────────────────────
 * This screen used to run on its own separate 1,103-item dataset that shared
 * nothing with the Materials library. Two lists meant two answers to "what does
 * a #12 THHN cost", and a bid could be built from either. It now reads and
 * writes the SAME `materials` rows as everything else — the price you set here
 * is the price an assembly uses, immediately, because it is the same row.
 *
 * What this screen adds over the Materials library is the supply-house lens:
 * whose price this is, and how old. Everything else about a material —
 * name, category, aliases — is edited on Materials.
 *
 * ── Staleness is the whole point ─────────────────────────────────────────────
 * A missing price is already shouted about (`shared/materialPricing.ts`). The
 * quiet failure is a real-looking number nobody has re-checked since copper
 * moved. Age colouring is in `shared/priceStaleness.ts`, which takes the clock
 * as a parameter so the 30/90-day bands are testable.
 *
 * ── Editing rules ────────────────────────────────────────────────────────────
 * The price is an InlineNumberField, so it gets all five rules from
 * CLAUDE.md § Editing fields without this file re-implementing any of them.
 * Writing a price stamps `priceUpdatedAt` on the server, not here — every route
 * to a price has to age the same way.
 */
import { useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowLeft,
  Upload,
  Search,
  X,
  Store,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineNumberField } from "@/components/InlineNumberField";
import { smartSearch } from "@/lib/smartSearch";
import {
  PRICE_AGE_CLASSES,
  priceAgeDisplay,
  summarisePriceAges,
  type PriceAge,
} from "@shared/priceStaleness";

type Material = {
  id: number;
  userId: number | null;
  name: string;
  category: string | null;
  unitOfSale: string;
  costPerUnit: string;
  supplierName: string | null;
  priceUpdatedAt: Date | string | null;
  searchAliases: string | null;
};

const AGE_FILTERS: Array<{ key: PriceAge | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "stale", label: "Over 90 days" },
  { key: "aging", label: "30–90 days" },
  { key: "fresh", label: "Under 30 days" },
  { key: "unpriced", label: "No price" },
];

export default function MaterialDatabasePage({
  onBack,
}: {
  onBack?: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: materials = [], isLoading } = trpc.materials.list.useQuery({
    status: "active",
  }) as { data: Material[]; isLoading: boolean };

  const [query, setQuery] = useState("");
  const [ageFilter, setAgeFilter] = useState<PriceAge | "all">("all");
  const [importOpen, setImportOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * One clock for the whole render. Calling `new Date()` per row would let a
   * list straddle midnight and colour two identical prices differently.
   */
  const now = useMemo(() => new Date(), [materials]);
  const tally = useMemo(
    () => summarisePriceAges(materials, now),
    [materials, now]
  );

  const refresh = () => {
    void utils.materials.list.invalidate();
  };

  const updateMaterial = trpc.materials.update.useMutation({
    onError: error => toast.error(error.message),
    onSuccess: () => refresh(),
  });

  const rows = useMemo(() => {
    let list = materials;
    if (ageFilter !== "all") {
      list = list.filter(
        m => priceAgeDisplay(m.priceUpdatedAt, now).age === ageFilter
      );
    }
    if (query.trim()) {
      // smartSearch scores aliases below the item's own name, which is what
      // keeps "recep" returning the receptacle rather than its wall plate.
      const searchable = list.map(m => ({
        id: String(m.id),
        description: m.name,
        category: m.category,
        unit: m.unitOfSale,
        searchAliases: m.searchAliases,
        supplierName: m.supplierName,
      }));
      const hits = smartSearch(searchable, query, 500);
      const order = new Map(hits.map((h, i) => [h.id, i]));
      list = list
        .filter(m => order.has(String(m.id)))
        .sort((a, b) => order.get(String(a.id))! - order.get(String(b.id))!);
    }
    return list;
  }, [materials, query, ageFilter, now]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 48,
    overscan: 12,
  });

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Header ── */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs"
              onClick={onBack}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold">Supplier Pricing</h1>
            <p className="text-xs text-muted-foreground">
              Your supply house's prices, on the same catalog everything else
              uses. Set a price here and every assembly that uses it follows.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs shrink-0"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="w-3.5 h-3.5" /> Import price list
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* ── Search + age filters ── */}
        <div className="px-6 pt-4 pb-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search materials…"
              className="pl-9 h-9"
              aria-label="Search materials"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {AGE_FILTERS.map(filter => {
              const count =
                filter.key === "all" ? materials.length : tally[filter.key];
              const active = ageFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  onClick={() => setAgeFilter(filter.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
                    active
                      ? "border-[#F5C518]/50 bg-[#F5C518]/10 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {filter.key !== "all" && filter.key !== "unpriced" && (
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        filter.key === "fresh" && "bg-emerald-400",
                        filter.key === "aging" && "bg-amber-400",
                        filter.key === "stale" && "bg-red-400"
                      )}
                    />
                  )}
                  {filter.label}
                  <span className="text-muted-foreground/70">{count}</span>
                </button>
              );
            })}
          </div>

          {tally.stale > 0 && ageFilter !== "stale" && (
            <button
              onClick={() => setAgeFilter("stale")}
              className="flex items-center gap-2 text-xs text-red-400 hover:underline"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {tally.stale} price{tally.stale === 1 ? "" : "s"} over 90 days old
              — bidding from these is bidding on old numbers.
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="flex-1 min-h-0 px-6 pb-6">
          <div className="h-full rounded-xl border border-border bg-card overflow-hidden flex flex-col">
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground shrink-0">
              <span className="flex-1">Material</span>
              <span className="w-40 shrink-0">Supplier</span>
              <span className="w-28 text-right shrink-0">Price</span>
              <span className="w-20 text-right shrink-0">Age</span>
            </div>

            {isLoading ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : rows.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nothing matches. Clear the search or pick a different age
                filter.
              </div>
            ) : (
              <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
                <div
                  style={{
                    height: rowVirtualizer.getTotalSize(),
                    position: "relative",
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map(virtual => {
                    const material = rows[virtual.index];
                    const age = priceAgeDisplay(material.priceUpdatedAt, now);
                    return (
                      <div
                        key={material.id}
                        data-index={virtual.index}
                        ref={rowVirtualizer.measureElement}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtual.start}px)`,
                        }}
                        className="flex items-center gap-3 px-4 py-2 border-b border-border hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">
                            {material.name}
                          </div>
                          {material.category && (
                            <div className="text-xs text-muted-foreground truncate">
                              {material.category} · per {material.unitOfSale}
                            </div>
                          )}
                        </div>

                        <div className="w-40 shrink-0">
                          <Input
                            defaultValue={material.supplierName ?? ""}
                            placeholder="—"
                            className="h-7 text-xs"
                            aria-label={`Supplier for ${material.name}`}
                            onBlur={e => {
                              const next = e.target.value.trim() || null;
                              if (next === (material.supplierName ?? null))
                                return;
                              updateMaterial.mutate({
                                id: material.id,
                                supplierName: next,
                              });
                            }}
                          />
                        </div>

                        <div className="w-28 shrink-0 flex justify-end">
                          <InlineNumberField
                            value={Number(material.costPerUnit)}
                            ariaLabel={`Price for ${material.name}`}
                            className="h-7 w-24 text-xs text-right"
                            rules={{ min: 0, allowEmpty: false }}
                            onSave={next =>
                              updateMaterial.mutate({
                                id: material.id,
                                costPerUnit: next,
                              })
                            }
                          />
                        </div>

                        <div
                          className={cn(
                            "w-20 text-right shrink-0 text-xs font-mono",
                            PRICE_AGE_CLASSES[age.age]
                          )}
                          title={age.title}
                        >
                          {age.label}
                          <span className="sr-only"> — {age.title}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {importOpen && (
        <ImportPriceListDialog
          onClose={() => setImportOpen(false)}
          onDone={refresh}
        />
      )}
    </div>
  );
}

/**
 * CSV price import, carried over from the old screen and re-pointed.
 *
 * It PRICES existing materials and never creates new ones. A supplier sheet is
 * full of items this contractor does not stock; inserting each unmatched line
 * would rebuild the two-catalog problem one import at a time, with rows nobody
 * curated. Unmatched names come back as a list instead.
 */
function ImportPriceListDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [supplier, setSupplier] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState<{
    priced: string[];
    unmatched: string[];
  } | null>(null);

  const importPrices = trpc.materials.importPrices.useMutation({
    onError: error => toast.error(error.message),
    onSuccess: data => {
      setResult(data);
      toast.success(
        `Priced ${data.priced.length} material${data.priced.length === 1 ? "" : "s"}` +
          (data.unmatched.length
            ? `, ${data.unmatched.length} name${data.unmatched.length === 1 ? "" : "s"} matched nothing`
            : "")
      );
      onDone();
    },
  });

  /** Name,Price — the two columns every supply-house export has. */
  const parse = (raw: string) => {
    const lines = raw.split(/\r?\n/).filter(l => l.trim());
    const out: Array<{ name: string; costPerUnit: number }> = [];
    for (const line of lines) {
      const cells = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      if (cells.length < 2) continue;
      const name = cells[0];
      const cost = Number(cells[cells.length - 1].replace(/[$,]/g, ""));
      // Skips the header row for free: "Price" is not a number.
      if (!name || !Number.isFinite(cost) || cost < 0) continue;
      out.push({ name, costPerUnit: cost });
    }
    return out;
  };

  const parsed = parse(text);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Import a price list</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Paste two columns — material name, then price. Names are matched
            against your catalog; anything that matches nothing is reported back
            rather than added.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5" /> Supplier
          </label>
          <Input
            value={supplier}
            onChange={e => setSupplier(e.target.value)}
            placeholder="e.g. Platt"
            className="h-8 text-sm"
            aria-label="Supplier name"
          />
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={8}
          placeholder={'#12 THHN, 0.42\n1/2" EMT, 1.18'}
          aria-label="Price list rows"
          className="w-full rounded-md border border-border bg-background p-2 text-xs font-mono"
        />

        {result ? (
          <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
            <div className="text-emerald-400">
              Priced {result.priced.length}.
            </div>
            {result.unmatched.length > 0 && (
              <div className="text-amber-400">
                No match for: {result.unmatched.slice(0, 20).join(", ")}
                {result.unmatched.length > 20
                  ? ` and ${result.unmatched.length - 20} more`
                  : ""}
              </div>
            )}
          </div>
        ) : (
          parsed.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {parsed.length} row{parsed.length === 1 ? "" : "s"} ready.
            </p>
          )
        )}

        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>
            {result ? "Done" : "Cancel"}
          </Button>
          {!result && (
            <Button
              size="sm"
              disabled={
                !supplier.trim() ||
                parsed.length === 0 ||
                importPrices.isPending
              }
              onClick={() =>
                importPrices.mutate({
                  supplierName: supplier.trim(),
                  rows: parsed,
                })
              }
            >
              Apply to {parsed.length}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
