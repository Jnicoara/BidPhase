/**
 * DashboardPage — every bid, by status, at a glance.
 *
 * Replaces the old Projects page as the app's landing view.
 *
 * ── Why a four-column board ──────────────────────────────────────────────────
 * Status is the thing an estimator scans by ("what's still in draft, what have
 * I won"), so it is the axis with the most information per glance. Columns keep
 * a stable shape whether or not they hold anything, so the eye learns where to
 * look instead of re-reading headings each time.
 *
 * ── Ordering lives elsewhere ─────────────────────────────────────────────────
 * Grouping and sorting come from @/lib/bidDashboard, which is pure and tested —
 * including the rule that undated bids sort BELOW dated ones, so a bid with no
 * deadline never crowds out one that has a real date.
 *
 * ── No new pricing ───────────────────────────────────────────────────────────
 * Card values come from bids.dashboard, which rolls each bid up through the
 * same code path the detail view uses. This screen formats; it never computes.
 */
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Archive,
  CalendarDays,
  LayoutDashboard,
  Plus,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArchiveBidDialog } from "@/components/ArchiveBidDialog";
import { type PendingArchive } from "@/lib/archiveBid";
import { GettingStartedChecklist } from "@/components/GettingStartedChecklist";
import { NavigationHelper } from "@/components/NavigationHelper";
import { RETENTION_DAYS } from "@shared/retention";
import {
  BID_STATUS_ORDER,
  calendarDate,
  dueUrgency,
  groupBidsByStatus,
  type DueUrgency,
} from "@/lib/bidDashboard";

const money = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

/** Deadlines read as a weekday and date — "Fri 14 Aug" scans faster than a slashed number. */
const formatDue = (value: string | Date | null) => {
  // calendarDate, not `new Date(value)` — a stored "2026-08-14" parses as UTC
  // midnight and would print as the 13th anywhere behind UTC.
  const date = calendarDate(value);
  if (!date) return null;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const STATUS_ACCENT: Record<string, string> = {
  Draft: "text-muted-foreground",
  Active: "text-[#F5C518]",
  Won: "text-emerald-400",
  Lost: "text-destructive",
};

/** Only a deadline that needs attention gets colour. Everything else stays quiet. */
const URGENCY_STYLE: Record<DueUrgency, string> = {
  none: "text-muted-foreground/60",
  overdue: "text-destructive",
  today: "text-[#F5C518]",
  soon: "text-[#F5C518]/80",
  later: "text-muted-foreground",
};

const URGENCY_LABEL: Partial<Record<DueUrgency, string>> = {
  overdue: "overdue",
  today: "due today",
};

export default function DashboardPage({
  onOpenBid,
  onOpenArchive,
}: {
  onOpenBid: (id: number) => void;
  onOpenArchive: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [confirmArchive, setConfirmArchive] = useState<PendingArchive | null>(
    null
  );

  const utils = trpc.useUtils();
  const { data: bids = [], isLoading } = trpc.bids.dashboard.useQuery();
  const { data: archived = [] } = trpc.bids.archived.useQuery();

  const createBid = trpc.bids.create.useMutation({
    onError: error => toast.error(error.message),
    onSuccess: bid => {
      if (bid) onOpenBid(bid.id);
    },
    onSettled: () => {
      void utils.bids.dashboard.invalidate();
      void utils.bids.list.invalidate();
    },
  });

  /**
   * Optimistic: the card leaves the board the moment it is archived, per the
   * responsiveness rules. The undo in the toast is the safety net — archiving
   * the wrong bid is a slip, and the fix should not require finding the
   * Archive screen.
   */
  const archiveBid = trpc.bids.archive.useMutation({
    onMutate: async ({ id }) => {
      await utils.bids.dashboard.cancel();
      const snapshot = utils.bids.dashboard.getData();
      // Captured BEFORE the optimistic removal — by the time onSuccess runs the
      // row is out of the cache, and looking it up there names every bid "Bid".
      const name = snapshot?.find(b => b.id === id)?.name;
      utils.bids.dashboard.setData(undefined, old =>
        old?.filter(b => b.id !== id)
      );
      return { snapshot, name };
    },
    onError: (error, _vars, context) => {
      if (context?.snapshot)
        utils.bids.dashboard.setData(undefined, context.snapshot);
      toast.error(error.message);
    },
    onSuccess: (_result, { id }, context) => {
      toast.success(
        `${context?.name ?? "Bid"} archived — ${RETENTION_DAYS} days to change your mind.`,
        { action: { label: "Undo", onClick: () => restoreBid.mutate({ id }) } }
      );
    },
    onSettled: () => {
      void utils.bids.dashboard.invalidate();
      void utils.bids.archived.invalidate();
      void utils.bids.list.invalidate();
    },
  });

  const restoreBid = trpc.bids.restore.useMutation({
    onError: error => toast.error(error.message),
    onSuccess: () => toast.success("Back on your dashboard."),
    onSettled: () => {
      void utils.bids.dashboard.invalidate();
      void utils.bids.archived.invalidate();
      void utils.bids.list.invalidate();
    },
  });

  const groups = useMemo(() => groupBidsByStatus(bids), [bids]);

  /** One number per column, plus the headline: what is still in play. */
  const summary = useMemo(() => {
    const perStatus = Object.fromEntries(
      groups.map(g => [
        g.status,
        {
          count: g.bids.length,
          value: g.bids.reduce((sum, b) => sum + b.finalPrice, 0),
        },
      ])
    ) as Record<string, { count: number; value: number }>;

    const openValue =
      (perStatus.Draft?.value ?? 0) + (perStatus.Active?.value ?? 0);
    const openCount =
      (perStatus.Draft?.count ?? 0) + (perStatus.Active?.count ?? 0);
    return { perStatus, openValue, openCount };
  }, [groups]);

  const start = () => {
    if (!name.trim()) {
      toast.error("Give the bid a name.");
      return;
    }
    createBid.mutate({ name: name.trim() });
    setName("");
    setAdding(false);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-5 h-5 text-primary" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              Every bid by stage. Draft and Active sort by deadline; Won and
              Lost by what you touched last.
            </p>
          </div>
          <div className="text-right shrink-0 mr-2">
            <div className="text-xs text-muted-foreground">
              Out for bid ({summary.openCount})
            </div>
            <div className="font-mono text-base text-[#F5C518]">
              {money(summary.openValue)}
            </div>
          </div>
          {/* Only offered once there is something in it — an always-visible
              empty Archive is a door to a blank room. */}
          {archived.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs shrink-0"
              onClick={onOpenArchive}
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

        {adding && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") start();
                if (e.key === "Escape") {
                  setAdding(false);
                  setName("");
                }
              }}
              placeholder="Bid name — e.g. Maple Street duplex"
              className="h-8 flex-1 min-w-[14rem] text-sm"
              autoFocus
            />
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={start}>
              <Check className="w-3 h-3" /> Create
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                setAdding(false);
                setName("");
              }}
            >
              <X className="w-3 h-3" /> Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Above the bids, because a new account has no bids and this is the
            only thing on the screen worth reading. Both disappear once they
            have served their purpose — the checklist when every step is done,
            and neither ever blocks what is underneath. */}
        <div className="mb-5 space-y-3">
          <GettingStartedChecklist />
          <NavigationHelper className="max-w-xl" />
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Loading bids…
          </div>
        ) : bids.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No bids yet. Create one to start pricing a job.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {groups.map(group => {
              const stats = summary.perStatus[group.status] ?? {
                count: 0,
                value: 0,
              };
              return (
                <div key={group.status} className="min-w-0">
                  <div className="flex items-baseline gap-2 mb-2 px-1">
                    <span
                      className={cn(
                        "text-xs font-semibold uppercase tracking-wide",
                        STATUS_ACCENT[group.status]
                      )}
                    >
                      {group.status}
                    </span>
                    <span className="text-xs text-muted-foreground/70">
                      {stats.count}
                    </span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {money(stats.value)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {group.bids.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground/70">
                        Nothing here
                      </div>
                    ) : (
                      group.bids.map(bid => {
                        const urgency = dueUrgency(bid.dueDate);
                        const due = formatDue(bid.dueDate);
                        return (
                          // A div rather than a button: the card carries its
                          // own Archive control, and a button inside a button
                          // is invalid and swallows the inner click.
                          <div
                            key={bid.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => onOpenBid(bid.id)}
                            onKeyDown={e => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onOpenBid(bid.id);
                              }
                            }}
                            className="group w-full text-left rounded-xl border border-border bg-card px-3 py-3 cursor-pointer hover:bg-muted/20 hover:border-border/80 transition-colors focus-visible:outline-none focus-visible:border-[#F5C518]"
                          >
                            <div className="flex items-start gap-2">
                              <span className="flex-1 min-w-0 text-sm font-medium truncate">
                                {bid.name}
                              </span>
                              <span className="font-mono text-sm shrink-0">
                                {money(bid.finalPrice)}
                              </span>
                              {/* Quiet until the card is hovered or focused —
                                  the dashboard is for reading, and a delete-ish
                                  control on every card competes with that. */}
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setConfirmArchive({
                                    id: bid.id,
                                    name: bid.name,
                                  });
                                }}
                                className="shrink-0 -mr-1 -mt-0.5 p-1 rounded text-muted-foreground/60 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-foreground hover:bg-muted transition-all"
                                aria-label={`Archive ${bid.name}`}
                                title="Archive — hides it here, recoverable for 30 days"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2 mt-1.5">
                              <span
                                className={cn(
                                  "flex items-center gap-1 text-xs",
                                  URGENCY_STYLE[urgency]
                                )}
                              >
                                <CalendarDays className="w-3 h-3" />
                                {due ?? "No due date"}
                                {URGENCY_LABEL[urgency] && (
                                  <span className="font-medium">
                                    · {URGENCY_LABEL[urgency]}
                                  </span>
                                )}
                              </span>
                              <span className="ml-auto text-xs text-muted-foreground/70">
                                {bid.lineCount} line
                                {bid.lineCount === 1 ? "" : "s"}
                              </span>
                            </div>

                            {bid.trades?.length ? (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {bid.trades.slice(0, 3).map(trade => (
                                  <Badge
                                    key={trade}
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {trade}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          Bids without a deadline sort to the bottom of Draft and Active, so
          real dates stay on top. Set one from the bid itself.
        </p>
      </div>

      {/* Shared with the Bids list so the two prompts cannot drift — an audit
          found one page asking and the other archiving on a single click. */}
      <ArchiveBidDialog
        pending={confirmArchive}
        onClose={() => setConfirmArchive(null)}
        onArchive={id => archiveBid.mutate({ id })}
      />
    </div>
  );
}
