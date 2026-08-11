/**
 * QuickBidPage — build a bid by counting, with no plan and no takeoff.
 *
 * For jobs where the counts are already known: a small commercial fit-out, a
 * house. The whole screen is one loop — type, pick, Enter — and it never leaves
 * the keyboard. Everything else (rollup, snapshot, overhead and profit) is the
 * Bid layer already built; this is an entry point on top of it, not a second
 * pricing model.
 *
 * ── What makes it fast ───────────────────────────────────────────────────────
 *  • The search box holds focus permanently and re-focuses after every add.
 *  • Arrow keys move the highlight, Enter adds — no mouse, no confirm step.
 *  • The quantity persists between adds, because counting runs in batches
 *    ("six of these, three of those") rather than resetting to 1 each time.
 *  • Counting the same assembly again ADDS to its existing line rather than
 *    stacking duplicate rows (the `merge` flag on bids.addAssembly). That line
 *    keeps its original snapshot: you are counting more of something already
 *    priced on this bid, not re-pricing it.
 *
 * ── Standing rules ───────────────────────────────────────────────────────────
 * Quantities use InlineNumberField, so they carry select-on-focus, Enter/blur
 * save, Escape revert and the save flash for free (CLAUDE.md § Editing fields).
 * The total updates optimistically with no spinner (§ Responsiveness).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Check, Copy, Plus, Search, X, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { InlineNumberField } from "@/components/InlineNumberField";
import { DuplicateUnitPanel } from "@/components/DuplicateUnitPanel";
import { selectOnFocus } from "@/lib/selectOnFocus";
import { smartSearch } from "@/lib/smartSearch";

const money = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

const round = (value: number, places = 2) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

/** How many results the arrow keys move through. Enough to choose, few enough to scan. */
const MAX_RESULTS = 7;

// ─── The counting screen ──────────────────────────────────────────────────────

function QuickAdd({ bidId, onBack }: { bidId: number; onBack: () => void }) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [qty, setQty] = useState("1");
  const [unitLabel, setUnitLabel] = useState("");
  const [showDuplicate, setShowDuplicate] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const detailQuery = trpc.bids.get.useQuery({ id: bidId });
  const { data: assemblies = [] } = trpc.assemblies.list.useQuery();
  const { data: kits = [] } = trpc.kits.list.useQuery();
  const { data: units = [] } = trpc.bids.units.useQuery({ bidId });

  const refresh = useCallback(() => {
    void utils.bids.get.invalidate({ id: bidId });
    void utils.bids.units.invalidate({ bidId });
    void utils.bids.list.invalidate();
  }, [utils, bidId]);

  const addAssembly = trpc.bids.addAssembly.useMutation({
    onError: error => toast.error(error.message),
    onSettled: refresh,
  });

  const addKit = trpc.bids.addKit.useMutation({
    onError: error => toast.error(error.message),
    onSuccess: result => {
      toast.success(
        `Added ${result.kitName} — ${result.lineIds.length} line${result.lineIds.length === 1 ? "" : "s"}` +
        (result.skipped.length ? `, skipped ${result.skipped.length}` : "")
      );
    },
    onSettled: refresh,
  });

  const updateLine = trpc.bids.updateLine.useMutation({
    onMutate: async vars => {
      await utils.bids.get.cancel({ id: bidId });
      const previous = utils.bids.get.getData({ id: bidId });
      utils.bids.get.setData({ id: bidId }, old => old && ({
        ...old,
        lines: old.lines.map(line =>
          line.id === vars.id && vars.qty !== undefined
            ? { ...line, qty: String(vars.qty) }
            : line
        ),
      }));
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) utils.bids.get.setData({ id: bidId }, context.previous);
      toast.error(error.message);
    },
    onSettled: refresh,
  });

  const removeLine = trpc.bids.removeLine.useMutation({
    onMutate: async vars => {
      await utils.bids.get.cancel({ id: bidId });
      const previous = utils.bids.get.getData({ id: bidId });
      utils.bids.get.setData({ id: bidId }, old => old && ({
        ...old,
        lines: old.lines.filter(line => line.id !== vars.id),
      }));
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) utils.bids.get.setData({ id: bidId }, context.previous);
      toast.error(error.message);
    },
    onSettled: refresh,
  });

  // smartSearch caches its index by array identity, so this must stay memoised.
  // Assemblies get the same trade-slang matching as materials, so "recep" finds
  // "Duplex receptacle standard" without typing it out.
  const searchable = useMemo(
    () => assemblies.map(a => ({ id: String(a.id), description: a.name, category: a.category })),
    [assemblies]
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const hits = smartSearch(searchable, query, MAX_RESULTS);
    const byId = new Map(assemblies.map(a => [a.id, a]));
    return hits
      .map(hit => byId.get(Number(hit.id)))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
  }, [query, searchable, assemblies]);

  // Keep the highlight inside the result list as it shrinks under typing.
  useEffect(() => { setHighlight(0); }, [query]);

  const focusSearch = useCallback(() => {
    // rAF so focus lands after React has committed the re-render.
    requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  const add = useCallback((assemblyId: number) => {
    const amount = Number(qty);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a quantity greater than zero.");
      return;
    }
    addAssembly.mutate({
      bidId,
      assemblyId,
      qty: amount,
      unitLabel: unitLabel.trim() || null,
      // Count more of the same thing onto one line instead of stacking rows.
      merge: true,
    });
    setQuery("");
    focusSearch();
  }, [addAssembly, bidId, qty, unitLabel, focusSearch]);

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight(h => Math.min(h + 1, results.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const chosen = results[highlight];
      if (chosen) add(chosen.id);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setQuery("");
    }
  };

  const detail = detailQuery.data;
  const lines = detail?.lines ?? [];
  // Newest first: what you just counted is what you want to check.
  const recent = [...lines].reverse();

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={onBack}>
            <ArrowLeft className="w-3.5 h-3.5" /> Bids
          </Button>
          <Zap className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">
              {detail?.bid.name ?? "Quick bid"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {lines.length} line{lines.length === 1 ? "" : "s"} · counting mode
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-muted-foreground">Bid price</div>
            <div className="font-mono text-base text-[#F5C518]">
              {detail ? money(detail.totals.finalPrice) : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="max-w-4xl space-y-4">
          {/* The loop: type, arrow, Enter */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[16rem]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  ref={searchRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={onSearchKeyDown}
                  placeholder="Count an assembly — type, then Enter"
                  className="h-10 pl-9 text-sm"
                  autoFocus
                  aria-label="Search assemblies to count"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Qty</span>
                <Input
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  className="h-10 w-20 text-sm text-right"
                  inputMode="decimal"
                  onFocus={selectOnFocus}
                  aria-label="Quantity to add"
                />
              </div>
              <Input
                value={unitLabel}
                onChange={e => setUnitLabel(e.target.value)}
                className="h-10 w-36 text-sm"
                placeholder="Unit (optional)"
                aria-label="Unit label"
              />
            </div>

            {results.length > 0 ? (
              <div className="rounded-lg border border-border overflow-hidden">
                {results.map((assembly, index) => (
                  <button
                    key={assembly.id}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => add(assembly.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors border-b border-border last:border-0",
                      index === highlight ? "bg-[#F5C518]/10 text-foreground" : "hover:bg-muted/40"
                    )}
                  >
                    <Plus className={cn(
                      "w-3.5 h-3.5 shrink-0",
                      index === highlight ? "text-[#F5C518]" : "text-muted-foreground"
                    )} />
                    <span className="flex-1 truncate">{assembly.name}</span>
                    <span className="text-xs text-muted-foreground">{assembly.category}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {round(Number(assembly.baseLaborHours), 2)} h
                    </span>
                    {index === highlight && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">Enter</Badge>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {query.trim()
                  ? <>Nothing matches “{query}”.</>
                  : <>Type to search. <span className="text-foreground">↑↓</span> to choose,{" "}
                     <span className="text-foreground">Enter</span> to add,{" "}
                     <span className="text-foreground">Esc</span> to clear. The quantity sticks
                     between adds, and counting the same assembly again adds to its line.</>}
              </p>
            )}
          </div>

          {/* Whole rooms in one go */}
          {kits.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Or drop in a kit
              </div>
              <div className="flex flex-wrap gap-1.5">
                {kits.map(kit => (
                  <button
                    key={kit.id}
                    onClick={() => {
                      const amount = Number(qty);
                      addKit.mutate({
                        bidId,
                        kitId: kit.id,
                        qty: Number.isFinite(amount) && amount > 0 ? amount : 1,
                        unitLabel: unitLabel.trim() || null,
                      });
                      focusSearch();
                    }}
                    className="px-2.5 py-1 rounded-md text-xs border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  >
                    {kit.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                A kit lands as separate line items, each frozen and each editable — so one room
                being different is just an edit to that line.
              </p>
            </div>
          )}

          {/* Repeating units — the same generator the Bids screen uses */}
          <div className="space-y-2">
            <button
              onClick={() => setShowDuplicate(v => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {showDuplicate ? "Hide" : "Repeat a unit"}
              {units.length > 0 && (
                <span className="text-muted-foreground/70">({units.length} on this bid)</span>
              )}
            </button>
            {showDuplicate && (
              <DuplicateUnitPanel bidId={bidId} units={units} onDone={refresh} />
            )}
          </div>

          {/* What has been counted, newest first */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
              <span className="flex-1">Counted</span>
              <span className="w-16 text-right shrink-0">Qty</span>
              <span className="w-24 text-right shrink-0">Cost</span>
              <span className="w-8 shrink-0" />
            </div>

            {!detail ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</div>
            ) : recent.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nothing counted yet. Search above and press Enter.
              </div>
            ) : (
              recent.map(line => (
                <div
                  key={line.id}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 hover:bg-muted/20 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm truncate">{line.name}</span>
                    {line.unitLabel && (
                      <span className="ml-2 text-xs text-muted-foreground">{line.unitLabel}</span>
                    )}
                  </div>
                  <InlineNumberField
                    value={Number(line.qty)}
                    onSave={next => updateLine.mutate({ bidId, id: line.id, qty: next })}
                    rules={{ min: 0, max: 999999 }}
                    className="h-7 w-16 text-sm"
                    ariaLabel={`Quantity of ${line.name}`}
                  />
                  <span className="font-mono text-sm w-24 text-right shrink-0">
                    {money(line.breakdown.directCost)}
                  </span>
                  <Button
                    size="sm" variant="ghost"
                    className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => removeLine.mutate({ bidId, id: line.id })}
                    aria-label={`Remove ${line.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {detail && lines.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <div>
                <div className="text-xs text-muted-foreground">Direct cost</div>
                <div className="font-mono text-sm">{money(detail.totals.directCost)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Labor</div>
                <div className="font-mono text-sm">
                  {round(detail.totals.totalLaborHours, 2)} h
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  {detail.settings.profit.method === "markup" ? "Markup" : "Target margin"}{" "}
                  {round(detail.settings.profit.value * 100, 2)}%
                  <span className="ml-1 text-muted-foreground/70">
                    ({detail.settings.profitSource === "bid" ? "this bid" : "company"})
                  </span>
                </div>
                <div className="font-mono text-sm">{money(detail.totals.profitAmount)}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-xs text-muted-foreground">Bid price</div>
                <div className="font-mono text-lg text-[#F5C518]">
                  {money(detail.totals.finalPrice)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Bid chooser ──────────────────────────────────────────────────────────────

export default function QuickBidPage() {
  const [bidId, setBidId] = useState<number | null>(null);
  const [name, setName] = useState("");

  const utils = trpc.useUtils();
  const { data: bids = [], isLoading } = trpc.bids.list.useQuery();

  const createBid = trpc.bids.create.useMutation({
    onError: error => toast.error(error.message),
    onSuccess: bid => { if (bid) setBidId(bid.id); },
    onSettled: () => { void utils.bids.list.invalidate(); },
  });

  if (bidId !== null) {
    return <QuickAdd bidId={bidId} onBack={() => setBidId(null)} />;
  }

  const start = () => {
    if (!name.trim()) { toast.error("Give the bid a name."); return; }
    createBid.mutate({ name: name.trim() });
    setName("");
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-primary" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold">Quick bid</h1>
            <p className="text-xs text-muted-foreground">
              Build a bid by counting, with no plan takeoff — for jobs where you already know the
              numbers.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="max-w-2xl space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Start a new one
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") start(); }}
                placeholder="Bid name — e.g. Oak Street remodel"
                className="h-9 flex-1 min-w-[14rem] text-sm"
                autoFocus
              />
              <Button size="sm" className="h-9 gap-1.5 text-xs" onClick={start}>
                <Check className="w-3.5 h-3.5" /> Start counting
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
              Or carry on with an existing bid
            </div>
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading bids…</div>
            ) : bids.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No bids yet — name one above to begin.
              </div>
            ) : (
              bids.map(bid => (
                <button
                  key={bid.id}
                  onClick={() => setBidId(bid.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <span className="flex-1 min-w-0 text-sm font-medium truncate">{bid.name}</span>
                  <Badge variant="outline" className="text-xs">{bid.status}</Badge>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
