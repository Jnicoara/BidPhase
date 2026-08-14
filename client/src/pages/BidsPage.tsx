/**
 * BidsPage — the Foundation bid layer (list + detail).
 *
 * A bid is line items (assemblies frozen at add time) plus the settings that
 * turn their sum into a price. Distinct from the legacy /projects screens,
 * which belong to the master_* system.
 *
 * ── Deliberately plain ───────────────────────────────────────────────────────
 * The add-assembly control is a search box and a quantity, nothing more. The
 * Quick-bid flow is the next build step and layers onto this same data, so
 * investing in takeoff-style entry UI here would be work thrown away.
 *
 * ── All math is server-side, through the shared engine ───────────────────────
 * Totals come from bids.get, which runs the snapshot inputs through
 * shared/pricing.ts. This screen formats numbers; it never computes a price.
 *
 * ── Responsiveness (CLAUDE.md § Responsiveness) ──────────────────────────────
 * Quantity edits and line removal are optimistic against the cached detail, so
 * the rollup moves as you type with no spinner. The line list is not paginated:
 * a bid of a few hundred lines renders fine, and the Quick-bid step is where
 * windowing belongs if bids ever get big enough to need it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Archive,
  ArrowLeft,
  CalendarDays,
  Check,
  FileSignature,
  FileText,
  Plus,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InlineNumberField } from "@/components/InlineNumberField";
import { asPercent, fromPercent } from "@/lib/inlineEdit";
import { selectOnFocus } from "@/lib/selectOnFocus";
import { DuplicateUnitPanel } from "@/components/DuplicateUnitPanel";
import { UnitLinkBadge } from "@/components/UnitLinkBadge";
import { UnitTemplateActions } from "@/components/UnitTemplateActions";
import { ArchiveBidDialog } from "@/components/ArchiveBidDialog";
import { ClientLinkField } from "@/components/ClientLinkField";
import { BidTaxControls } from "@/components/BidTaxControls";
import { BidExtrasPanel } from "@/components/BidExtrasPanel";
import { type PendingArchive } from "@/lib/archiveBid";
import { RETENTION_DAYS } from "@shared/retention";

const STATUSES = ["Draft", "Active", "Won", "Lost"] as const;
type Status = (typeof STATUSES)[number];

const INHERIT = "__inherit__";

const money = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const round = (value: number, places = 2) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const STATUS_STYLES: Record<Status, string> = {
  Draft: "text-muted-foreground",
  Active: "bg-[#F5C518]/15 text-[#F5C518] border-[#F5C518]/30",
  Won: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Lost: "bg-destructive/15 text-destructive border-destructive/30",
};

// ─── Due date ─────────────────────────────────────────────────────────────────

/**
 * The bid's submission deadline, following CLAUDE.md § Editing fields: commits
 * on Enter and on blur, Escape abandons back to the saved value, and a real
 * save flashes green.
 *
 * Not InlineNumberField — that one parses numbers. A date input needs no
 * select-on-focus either: the browser's picker already selects a segment when
 * it takes focus.
 */
function DueDateField({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (next: string | null) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [flash, setFlash] = useState(false);
  const editing = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (editing.current) return;
    setDraft(value ?? "");
  }, [value]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    []
  );

  const commit = () => {
    const saved = value ?? "";
    if (draft === saved) return; // nothing moved: no write, no flash
    onSave(draft === "" ? null : draft); // clearing the box clears the deadline
    setFlash(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFlash(false), 1100);
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <Input
        type="date"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onFocus={() => {
          editing.current = true;
        }}
        onBlur={() => {
          editing.current = false;
          commit();
        }}
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            setDraft(value ?? "");
            editing.current = false;
            (e.target as HTMLInputElement).blur();
          }
        }}
        aria-label="Bid due date"
        className={cn(
          "h-8 w-36 text-sm transition-colors duration-200",
          flash && "border-emerald-500 bg-emerald-500/10 text-emerald-300"
        )}
      />
      <span className="sr-only" role="status" aria-live="polite">
        {flash ? "Due date saved" : ""}
      </span>
    </span>
  );
}

// ─── Bid detail ───────────────────────────────────────────────────────────────

function BidDetail({ bidId, onBack }: { bidId: number; onBack: () => void }) {
  const [assemblyQuery, setAssemblyQuery] = useState("");
  const [addQty, setAddQty] = useState("1");
  const [addUnit, setAddUnit] = useState("");

  const utils = trpc.useUtils();
  const detailQuery = trpc.bids.get.useQuery({ id: bidId });
  const { data: assemblies = [] } = trpc.assemblies.list.useQuery();
  const { data: units = [] } = trpc.bids.units.useQuery({ bidId });
  const { data: unitStates = [] } = trpc.bids.unitStates.useQuery({ bidId });
  const { data: sheets = [] } = trpc.bidPdfs.list.useQuery({ bidId });
  const sheetCount = sheets.length;

  /**
   * Link state for a unit header. Looked up rather than joined onto the line
   * groups because a unit's role depends on the OTHER units pointing at it,
   * which the per-line data has no way to know.
   */
  const unitStateFor = useCallback(
    (label: string) => unitStates.find(s => s.label === label),
    [unitStates]
  );

  const refresh = useCallback(() => {
    void utils.bids.get.invalidate({ id: bidId });
    void utils.bids.units.invalidate({ bidId });
    // Pushing, forking and archiving all change roles rather than lines, so a
    // refresh that skipped this would leave stale badges beside fresh totals.
    void utils.bids.unitStates.invalidate({ bidId });
    void utils.bids.list.invalidate();
  }, [utils, bidId]);

  const addAssembly = trpc.bids.addAssembly.useMutation({
    onError: error => toast.error(error.message),
    onSettled: refresh,
  });

  const updateLine = trpc.bids.updateLine.useMutation({
    onMutate: async vars => {
      await utils.bids.get.cancel({ id: bidId });
      const previous = utils.bids.get.getData({ id: bidId });
      // Only the qty is worth predicting — the rollup follows from the refetch.
      utils.bids.get.setData(
        { id: bidId },
        old =>
          old && {
            ...old,
            lines: old.lines.map(line =>
              line.id === vars.id && vars.qty !== undefined
                ? { ...line, qty: String(vars.qty) }
                : line
            ),
          }
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous)
        utils.bids.get.setData({ id: bidId }, context.previous);
      toast.error(error.message);
    },
    onSettled: refresh,
  });

  const removeLine = trpc.bids.removeLine.useMutation({
    onMutate: async vars => {
      await utils.bids.get.cancel({ id: bidId });
      const previous = utils.bids.get.getData({ id: bidId });
      utils.bids.get.setData(
        { id: bidId },
        old =>
          old && {
            ...old,
            lines: old.lines.filter(line => line.id !== vars.id),
          }
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous)
        utils.bids.get.setData({ id: bidId }, context.previous);
      toast.error(error.message);
    },
    onSettled: refresh,
  });

  const updateBid = trpc.bids.update.useMutation({
    onError: error => toast.error(error.message),
    onSettled: refresh,
  });

  const assemblyResults = useMemo(() => {
    const q = assemblyQuery.trim().toLowerCase();
    if (!q) return [];
    return assemblies.filter(a => a.name.toLowerCase().includes(q)).slice(0, 8);
  }, [assemblies, assemblyQuery]);

  if (!detailQuery.data) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center text-sm text-muted-foreground">
        Loading bid…
      </div>
    );
  }

  const {
    bid,
    lines,
    totals,
    settings,
    company,
    client,
    salesTax,
    taxRate,
    taxNote,
  } = detailQuery.data;

  /** Lines grouped by unit, with un-labelled lines last under a null key. */
  const groups: Array<{ label: string | null; lines: typeof lines }> = [];
  for (const line of lines) {
    const key = line.unitLabel ?? null;
    const existing = groups.find(g => g.label === key);
    if (existing) existing.lines.push(line);
    else groups.push({ label: key, lines: [line] });
  }
  groups.sort((a, b) => (a.label === null ? 1 : b.label === null ? -1 : 0));

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 text-xs"
            onClick={onBack}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Bids
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{bid.name}</h1>
            <p className="text-xs text-muted-foreground">
              {lines.length} line{lines.length === 1 ? "" : "s"}
              {bid.trades?.length ? ` · ${bid.trades.join(", ")}` : ""}
            </p>
          </div>
          {/* Plans live on their own screen (the takeoff surface). The count
              sits on the button so an estimator can see whether this job has
              drawings attached without opening anything. */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs shrink-0"
            onClick={() => {
              window.location.hash = `/bids/${bid.id}/plans`;
            }}
          >
            <FileText className="w-3.5 h-3.5" />
            Plans
            {sheetCount > 0 && (
              <span className="text-muted-foreground">{sheetCount}</span>
            )}
          </Button>

          {/* The way out of the app: this bid as a document a client receives.
              Its own screen rather than a dialog, because it is a full page
              being composed and it has to be printable. */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs shrink-0"
            onClick={() => {
              window.location.hash = `/bids/${bid.id}/proposal`;
            }}
          >
            <FileSignature className="w-3.5 h-3.5" />
            Proposal
          </Button>

          <DueDateField
            value={bid.dueDate}
            onSave={dueDate => updateBid.mutate({ id: bid.id, dueDate })}
          />

          <Select
            value={bid.status}
            onValueChange={status =>
              updateBid.mutate({ id: bid.id, status: status as Status })
            }
          >
            <SelectTrigger className="h-8 w-28 text-sm" aria-label="Bid status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-4 min-w-0">
            {/* Add an assembly — deliberately minimal */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Add an assembly
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[14rem]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={assemblyQuery}
                    onChange={e => setAssemblyQuery(e.target.value)}
                    placeholder="Search the assembly library…"
                    className="h-8 pl-9 text-sm"
                  />
                </div>
                <Input
                  value={addQty}
                  onChange={e => setAddQty(e.target.value)}
                  className="h-8 w-16 text-sm text-right"
                  inputMode="decimal"
                  onFocus={selectOnFocus}
                  aria-label="Quantity"
                />
                <Input
                  value={addUnit}
                  onChange={e => setAddUnit(e.target.value)}
                  className="h-8 w-32 text-sm"
                  placeholder="Unit (optional)"
                  aria-label="Unit label"
                />
              </div>

              {assemblyResults.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  {assemblyResults.map(assembly => (
                    <button
                      key={assembly.id}
                      onClick={() => {
                        const qty = Number(addQty);
                        if (!(qty > 0)) {
                          toast.error("Enter a quantity greater than zero.");
                          return;
                        }
                        addAssembly.mutate({
                          bidId,
                          assemblyId: assembly.id,
                          qty,
                          unitLabel: addUnit.trim() || null,
                        });
                        setAssemblyQuery("");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/40 transition-colors border-b border-border last:border-0"
                    >
                      <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate">{assembly.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {assembly.category}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Adding freezes that assembly’s costs onto the bid. Later library
                edits will not change what is already here.
              </p>
            </div>

            <DuplicateUnitPanel bidId={bidId} units={units} onDone={refresh} />

            {/* Line items */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
                <span className="flex-1">Line item</span>
                <span className="w-16 text-right shrink-0">Qty</span>
                <span className="w-24 text-right shrink-0">Hours</span>
                <span className="w-24 text-right shrink-0">Cost</span>
                <span className="w-8 shrink-0" />
              </div>

              {lines.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No line items yet. Search the assembly library above to add
                  the first one.
                </div>
              ) : (
                groups.map(group => (
                  <div key={group.label ?? "__loose__"}>
                    {group.label && (
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/40 border-b border-border">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {group.label}
                        </span>
                        {unitStateFor(group.label) && (
                          <>
                            <UnitLinkBadge state={unitStateFor(group.label)!} />
                            <UnitTemplateActions
                              bidId={bidId}
                              state={unitStateFor(group.label)!}
                              onDone={refresh}
                            />
                          </>
                        )}
                        <span className="text-xs text-muted-foreground/70 ml-auto font-mono">
                          {money(
                            group.lines.reduce(
                              (sum, l) => sum + l.breakdown.directCost,
                              0
                            )
                          )}
                        </span>
                      </div>
                    )}
                    {group.lines.map(line => (
                      <div
                        key={line.id}
                        className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 hover:bg-muted/20 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm truncate">{line.name}</span>
                          {line.snapshotModifierNames?.length ? (
                            <div className="text-xs text-muted-foreground truncate">
                              {line.snapshotModifierNames.join(", ")} · frozen{" "}
                              {new Date(line.snapshotAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </div>
                          ) : null}
                        </div>
                        <InlineNumberField
                          value={Number(line.qty)}
                          onSave={qty =>
                            updateLine.mutate({ bidId, id: line.id, qty })
                          }
                          rules={{ min: 0, max: 999999 }}
                          className="h-7 w-16 text-sm"
                          ariaLabel={`Quantity of ${line.name}`}
                        />
                        <span className="font-mono text-xs w-24 text-right shrink-0 text-muted-foreground">
                          {round(line.breakdown.totalLaborHours, 2)} h
                        </span>
                        <span className="font-mono text-sm w-24 text-right shrink-0">
                          {money(line.breakdown.directCost)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            removeLine.mutate({ bidId, id: line.id })
                          }
                          aria-label={`Remove ${line.name}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Rollup */}
          <div className="lg:sticky lg:top-0 h-fit space-y-4">
            {/* Who the work is for. Above the total because it is part of what
                the bid IS rather than part of what it costs, and because the
                proposal reads it. Entirely optional — see ClientLinkField. */}
            <div className="rounded-xl border border-border bg-card p-4">
              <ClientLinkField
                bid={{
                  id: bid.id,
                  clientId: bid.clientId,
                  clientName: bid.clientName,
                  siteAddress: bid.siteAddress,
                }}
                client={client}
                onLink={clientId => updateBid.mutate({ id: bid.id, clientId })}
              />
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Bid total
              </div>
              <div className="flex items-baseline justify-between gap-3 py-1">
                <span className="text-xs text-muted-foreground">Materials</span>
                <span className="font-mono text-sm">
                  {money(totals.materialCost)}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-1">
                <span className="text-xs text-muted-foreground">
                  Labor ({round(totals.totalLaborHours, 2)} h)
                </span>
                <span className="font-mono text-sm">
                  {money(totals.laborCost)}
                </span>
              </div>

              {/*
                The productivity step, shown only when it is doing something.
                At 0% there is nothing to explain and a row saying so would be
                noise on every bid forever.

                It shows the arithmetic rather than the result: the hours an
                estimator would recognise from their assemblies, the adjustment,
                and what it came to. Without this the total silently disagrees
                with the hours on the recipes and the only way to find out why
                is to go looking in Settings.
              */}
              {settings.productivityPct !== 0 && (
                <div className="flex items-baseline justify-between gap-3 pl-3 pb-1">
                  <span className="text-[11px] text-muted-foreground/80">
                    {round(totals.laborHoursBeforeProductivity, 2)} h after
                    modifiers, {settings.productivityPct > 0 ? "+" : ""}
                    {round(settings.productivityPct * 100, 2)}% productivity
                  </span>
                  <span
                    className="font-mono text-[11px] text-muted-foreground/80"
                    title={
                      settings.productivitySource === "bid"
                        ? "Set on this bid"
                        : "Your company default"
                    }
                  >
                    {settings.productivitySource === "bid"
                      ? "this bid"
                      : "company"}
                  </span>
                </div>
              )}
              <div className="border-t border-border my-2" />
              <div className="flex items-baseline justify-between gap-3 py-1">
                <span className="text-xs font-medium">Direct cost</span>
                <span className="font-mono text-sm">
                  {money(totals.directCost)}
                </span>
              </div>
              {settings.overhead.enabled && (
                <div className="flex items-baseline justify-between gap-3 py-1">
                  <span className="text-xs text-muted-foreground">
                    Overhead
                  </span>
                  <span className="font-mono text-sm">
                    {money(totals.overheadAmount)}
                  </span>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3 py-1">
                <span className="text-xs text-muted-foreground capitalize">
                  {settings.profit.method === "markup"
                    ? "Markup"
                    : "Target margin"}{" "}
                  {round(settings.profit.value * 100, 2)}%
                </span>
                <span className="font-mono text-sm">
                  {money(totals.profitAmount)}
                </span>
              </div>
              <div className="border-t border-border my-2" />
              <div className="flex items-baseline justify-between gap-3 py-1">
                <span className="text-sm font-medium">Bid price</span>
                <span className="font-mono text-base text-[#F5C518]">
                  {money(totals.finalPrice)}
                </span>
              </div>

              {totals.expensesTotal > 0 && (
                <div className="flex items-baseline justify-between gap-3 py-1">
                  <span className="text-xs text-muted-foreground">
                    Additional expenses
                  </span>
                  <span className="font-mono text-sm">
                    {money(totals.expensesTotal)}
                  </span>
                </div>
              )}

              {/* With tax switched off, the tax block below never renders — so
                  a bid carrying expenses would show a Bid price and a charge
                  with nothing tying them together. This is that total. */}
              {totals.expensesTotal > 0 && salesTax.status === "disabled" && (
                <div className="flex items-baseline justify-between gap-3 py-1">
                  <span className="text-sm font-medium">Total due</span>
                  <span className="font-mono text-base text-[#F5C518]">
                    {money(totals.totalDue)}
                  </span>
                </div>
              )}

              {/*
                Sales tax, BELOW the bid price and never inside it.

                A tax line folded into the total is one the estimator cannot
                check against the rate they believe applies — and the reason
                there is no tax is as important as the amount when there is,
                which is why `taxNote` gets a line of its own rather than
                leaving an unexplained absence.
              */}
              {salesTax.status !== "disabled" && (
                <>
                  <div className="border-t border-border my-2" />
                  <div className="flex items-baseline justify-between gap-3 py-1">
                    <span className="text-xs text-muted-foreground">
                      Sales tax
                      {salesTax.status === "ok" && salesTax.ratePct !== null
                        ? ` (${salesTax.ratePct}%)`
                        : ""}
                      {salesTax.status === "exempt" ? " — exempt" : ""}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-sm",
                        salesTax.status === "no-rate" && "text-destructive"
                      )}
                    >
                      {salesTax.status === "no-rate"
                        ? "not set"
                        : money(salesTax.amount)}
                    </span>
                  </div>

                  {taxNote && (
                    <p
                      className={cn(
                        "text-xs",
                        salesTax.status === "no-rate"
                          ? "text-destructive"
                          : "text-muted-foreground"
                      )}
                    >
                      {taxNote}
                    </p>
                  )}

                  {/* Where the rate came from — a tax figure nobody can trace
                      is a tax figure nobody can defend in an audit. */}
                  {salesTax.status === "ok" && taxRate.source !== "none" && (
                    <p className="text-xs text-muted-foreground">
                      {taxRate.source === "bid-override"
                        ? "Rate entered on this bid."
                        : taxRate.source === "bid-jurisdiction"
                          ? `${taxRate.jurisdictionName} — chosen on this bid.`
                          : `${taxRate.jurisdictionName} — matched on ${taxRate.matchedOn.join(", ")}.`}
                    </p>
                  )}

                  {salesTax.status !== "no-rate" && (
                    <div className="flex items-baseline justify-between gap-3 py-1">
                      <span className="text-sm font-medium">Total due</span>
                      <span className="font-mono text-base text-[#F5C518]">
                        {money(totals.totalDue)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <BidExtrasPanel bidId={bid.id} />

            {salesTax.status !== "disabled" && (
              <BidTaxControls
                bidId={bid.id}
                exempt={bid.taxExempt}
                exemptReason={bid.taxExemptReason}
                jurisdictionId={bid.taxJurisdictionId}
                rateOverridePct={
                  bid.taxRateOverridePct === null
                    ? null
                    : Number(bid.taxRateOverridePct)
                }
                onChange={patch => updateBid.mutate({ id: bid.id, ...patch })}
              />
            )}

            {/* Settings, with their source stated */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Pricing settings
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    Overhead
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {settings.overheadSource === "bid"
                      ? "This bid"
                      : "Company default"}
                  </Badge>
                </div>
                <Select
                  value={
                    bid.overheadEnabled === null
                      ? INHERIT
                      : bid.overheadEnabled
                        ? "on"
                        : "off"
                  }
                  onValueChange={value =>
                    updateBid.mutate({
                      id: bid.id,
                      overheadEnabled:
                        value === INHERIT ? null : value === "on",
                      ...(value === "on" && bid.overheadValue === null
                        ? {
                            overheadMode: company.overheadMode,
                            overheadValue: company.overheadValue,
                          }
                        : {}),
                    })
                  }
                >
                  <SelectTrigger
                    className="h-8 text-sm"
                    aria-label="Overhead setting"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={INHERIT}>
                      Use company default (
                      {company.overheadEnabled ? "on" : "off"})
                    </SelectItem>
                    <SelectItem value="on">On for this bid</SelectItem>
                    <SelectItem value="off">Off for this bid</SelectItem>
                  </SelectContent>
                </Select>
                {bid.overheadEnabled === true && (
                  <div className="flex items-center gap-2">
                    <Select
                      value={bid.overheadMode ?? "percentage"}
                      onValueChange={mode =>
                        updateBid.mutate({
                          id: bid.id,
                          overheadMode: mode as "percentage" | "flat",
                        })
                      }
                    >
                      <SelectTrigger className="h-7 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="flat">Flat $</SelectItem>
                      </SelectContent>
                    </Select>
                    <InlineNumberField
                      value={
                        bid.overheadMode === "flat"
                          ? Number(bid.overheadValue ?? 0)
                          : asPercent(Number(bid.overheadValue ?? 0))
                      }
                      onSave={raw =>
                        updateBid.mutate({
                          id: bid.id,
                          overheadValue:
                            bid.overheadMode === "flat"
                              ? raw
                              : fromPercent(raw),
                        })
                      }
                      rules={{ min: 0 }}
                      className="h-7 w-20 text-xs"
                      ariaLabel="Overhead value"
                      suffix={bid.overheadMode === "flat" ? undefined : "%"}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Profit</span>
                  <Badge variant="outline" className="text-xs">
                    {settings.profitSource === "bid"
                      ? "This bid"
                      : "Company default"}
                  </Badge>
                </div>
                <Select
                  value={bid.profitMethod ?? INHERIT}
                  onValueChange={value =>
                    updateBid.mutate({
                      id: bid.id,
                      profitMethod:
                        value === INHERIT
                          ? null
                          : (value as "markup" | "margin"),
                      profitValue:
                        value === INHERIT ? null : company.profitValue,
                    })
                  }
                >
                  <SelectTrigger
                    className="h-8 text-sm"
                    aria-label="Profit method"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={INHERIT}>
                      Use company default ({company.profitMethod})
                    </SelectItem>
                    <SelectItem value="markup">
                      Markup % for this bid
                    </SelectItem>
                    <SelectItem value="margin">
                      Target margin % for this bid
                    </SelectItem>
                  </SelectContent>
                </Select>
                {bid.profitMethod && (
                  <InlineNumberField
                    value={asPercent(Number(bid.profitValue ?? 0))}
                    onSave={raw =>
                      updateBid.mutate({
                        id: bid.id,
                        profitValue: fromPercent(raw),
                      })
                    }
                    // Below 99%: at 100% the target-margin formula divides by zero.
                    rules={{ min: 0, max: 98.99 }}
                    className="h-7 w-20 text-xs"
                    ariaLabel="Profit value"
                    suffix="%"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Markup and target margin are different numbers on the same
                  cost — the method is always an explicit choice.
                </p>
              </div>

              {/*
                ── Productivity, for THIS bid ────────────────────────────────
                Deliberately carries no company-wide warning. Overriding a
                setting on one bid is an ordinary local edit and has to keep
                feeling like one; the broad notice lives only on the company
                control in Settings, and putting it here as well would train
                people to read past it in the one place it matters.
              */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">Productivity</span>
                  <Badge variant="outline" className="text-[10px]">
                    {settings.productivitySource === "bid"
                      ? "This bid"
                      : "Company"}
                  </Badge>
                </div>
                <Select
                  value={bid.productivityPct === null ? INHERIT : "custom"}
                  onValueChange={value =>
                    updateBid.mutate({
                      id: bid.id,
                      productivityPct:
                        value === INHERIT ? null : company.productivityPct,
                    })
                  }
                >
                  <SelectTrigger
                    className="h-8 text-sm"
                    aria-label="Productivity setting"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={INHERIT}>
                      Use company default ({asPercent(company.productivityPct)}
                      %)
                    </SelectItem>
                    <SelectItem value="custom">Set for this bid</SelectItem>
                  </SelectContent>
                </Select>
                {bid.productivityPct !== null && (
                  <InlineNumberField
                    value={asPercent(Number(bid.productivityPct ?? 0))}
                    onSave={raw =>
                      updateBid.mutate({
                        id: bid.id,
                        productivityPct: fromPercent(raw),
                      })
                    }
                    // Signed: a crew that beats book hours is as real as one
                    // that does not. Floored above −100%, where every job would
                    // price at no labor at all.
                    rules={{ min: -90, max: 200 }}
                    className="h-7 w-20 text-xs"
                    ariaLabel="Productivity factor for this bid"
                    suffix="%"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Adjusts every labor hour on this bid, applied after
                  job-condition modifiers rather than added to them.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── List ─────────────────────────────────────────────────────────────────────

export default function BidsPage({
  initialBidId,
}: { initialBidId?: number } = {}) {
  // Seeded from /bids/:id so the Dashboard can link straight into one bid.
  // State, not derived: once open, closing must be able to return to the list
  // without the route dragging it back in.
  const [openId, setOpenId] = useState<number | null>(initialBidId ?? null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<PendingArchive | null>(
    null
  );

  const utils = trpc.useUtils();
  const { data: bids = [], isLoading } = trpc.bids.list.useQuery();
  const { data: archived = [] } = trpc.bids.archived.useQuery();

  const createBid = trpc.bids.create.useMutation({
    onError: error => toast.error(error.message),
    onSuccess: bid => {
      if (bid) setOpenId(bid.id);
    },
    onSettled: () => {
      void utils.bids.list.invalidate();
    },
  });

  const restoreBid = trpc.bids.restore.useMutation({
    onError: error => toast.error(error.message),
    onSuccess: () => toast.success("Back on your bids list."),
    onSettled: () => {
      void utils.bids.list.invalidate();
      void utils.bids.archived.invalidate();
      void utils.bids.dashboard.invalidate();
    },
  });

  const archiveBid = trpc.bids.archive.useMutation({
    onMutate: async vars => {
      await utils.bids.list.cancel();
      const previous = utils.bids.list.getData();
      // Captured before the optimistic removal — afterwards the row is gone
      // from the cache and every bid would be named "Bid" in the toast.
      const name = previous?.find(b => b.id === vars.id)?.name;
      utils.bids.list.setData(
        undefined,
        old => (old ?? []).filter(b => b.id !== vars.id) as typeof old
      );
      return { previous, name };
    },
    onError: (error, _vars, context) => {
      if (context?.previous !== undefined)
        utils.bids.list.setData(undefined, context.previous as never);
      toast.error(error.message);
    },
    onSuccess: (_result, vars, context) => {
      // Undo in the toast as well as the dialog before it: the dialog stops the
      // accident, this fixes the one that got through anyway.
      toast.success(
        `${context?.name ?? "Bid"} archived — ${RETENTION_DAYS} days to change your mind.`,
        {
          action: {
            label: "Undo",
            onClick: () => restoreBid.mutate({ id: vars.id }),
          },
        }
      );
    },
    onSettled: () => {
      void utils.bids.list.invalidate();
      void utils.bids.archived.invalidate();
      void utils.bids.dashboard.invalidate();
    },
  });

  if (openId !== null) {
    return <BidDetail bidId={openId} onBack={() => setOpenId(null)} />;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold">Bids</h1>
            <p className="text-xs text-muted-foreground">
              Assemblies priced into a job. Costs freeze when an assembly is
              added, so a submitted bid never moves on its own.
            </p>
          </div>
          {/* The way back to anything archived from here. Appears once there
              is something in it — the Dashboard carries the same entry. */}
          {archived.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs shrink-0"
              onClick={() => {
                window.location.hash = "/archive";
              }}
            >
              <Archive className="w-3.5 h-3.5" /> Archive
              <span className="text-muted-foreground">{archived.length}</span>
            </Button>
          )}
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs shrink-0"
            onClick={() => setAdding(v => !v)}
          >
            <Plus className="w-3.5 h-3.5" /> New bid
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {adding && (
          <div className="rounded-xl border border-border bg-card px-4 py-3 mb-3 flex flex-wrap items-center gap-2">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Bid name — e.g. Maple Street duplex"
              className="h-8 flex-1 min-w-[14rem] text-sm"
              autoFocus
              onKeyDown={e => {
                if (e.key !== "Enter" || !newName.trim()) return;
                createBid.mutate({ name: newName.trim() });
                setNewName("");
                setAdding(false);
              }}
            />
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                if (!newName.trim()) {
                  toast.error("Give the bid a name.");
                  return;
                }
                createBid.mutate({ name: newName.trim() });
                setNewName("");
                setAdding(false);
              }}
            >
              <Check className="w-3 h-3" /> Create
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                setAdding(false);
                setNewName("");
              }}
            >
              <X className="w-3 h-3" /> Cancel
            </Button>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
            <span className="flex-1">Bid</span>
            <span className="w-24 shrink-0">Status</span>
            <span className="w-28 text-right shrink-0">Created</span>
            <span className="w-8 shrink-0" />
          </div>

          {isLoading ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Loading bids…
            </div>
          ) : bids.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No bids yet. Create one to start pricing a job.
            </div>
          ) : (
            bids.map(bid => (
              <div
                key={bid.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20 transition-colors group"
              >
                <button
                  onClick={() => setOpenId(bid.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <span className="text-sm font-medium truncate">
                    {bid.name}
                  </span>
                  {bid.trades?.length ? (
                    <div className="text-xs text-muted-foreground truncate">
                      {bid.trades.join(", ")}
                    </div>
                  ) : null}
                </button>
                <span className="w-24 shrink-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      STATUS_STYLES[bid.status as Status]
                    )}
                  >
                    {bid.status}
                  </Badge>
                </span>
                <span className="w-28 text-right shrink-0 text-xs text-muted-foreground">
                  {new Date(bid.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                {/* An Archive icon, not a trash can: this does not delete, and
                    dressing a recoverable action as a destructive one teaches
                    people to fear it. Confirmation comes from the shared
                    dialog — this used to archive on a single click. */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setConfirmArchive({ id: bid.id, name: bid.name })
                  }
                  title="Archive — off this list, restorable for 30 days"
                  aria-label={`Archive ${bid.name}`}
                >
                  <Archive className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <ArchiveBidDialog
        pending={confirmArchive}
        onClose={() => setConfirmArchive(null)}
        onArchive={id => archiveBid.mutate({ id })}
      />
    </div>
  );
}
