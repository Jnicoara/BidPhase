/**
 * How the dashboard orders and groups bids.
 *
 * Kept as pure functions because the ordering rules carry real consequences —
 * a missed deadline is a lost job — and they are far easier to pin down here
 * than through a rendered board.
 *
 * The rules differ by stage, because what matters about a bid changes:
 *   • Draft and Active are work in front of you, so they sort by DEADLINE.
 *   • Won and Lost are history, so they sort by most recently touched.
 */

export const BID_STATUS_ORDER = ["Draft", "Active", "Won", "Lost"] as const;
export type BidStatus = (typeof BID_STATUS_ORDER)[number];

/** The minimum a bid needs for the dashboard to place it. */
export type SortableBid = {
  id: number;
  name: string;
  status: string;
  /** ISO date string, a Date, or null when no deadline is set. */
  dueDate: string | Date | null;
  updatedAt: string | Date;
};

/** Milliseconds since epoch, or null when there is no usable date. */
function toTime(value: string | Date | null | undefined): number | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * Soonest deadline first, with undated bids AFTER every dated one.
 *
 * Undated last is the whole point: a bid with no deadline is not urgent, and
 * letting it sort to the top — which is what a null-as-zero comparison does —
 * would bury the deadlines that actually matter. Ties break on name so the
 * order is stable rather than dependent on however the rows arrived.
 */
export function byDueDate(a: SortableBid, b: SortableBid): number {
  const left = toTime(a.dueDate);
  const right = toTime(b.dueDate);

  if (left === null && right === null) return a.name.localeCompare(b.name);
  if (left === null) return 1;   // a has no deadline: push it down
  if (right === null) return -1; // b has no deadline: push it down
  if (left !== right) return left - right;
  return a.name.localeCompare(b.name);
}

/** Most recently touched first. Used for the finished columns. */
export function byRecentlyUpdated(a: SortableBid, b: SortableBid): number {
  const left = toTime(a.updatedAt) ?? 0;
  const right = toTime(b.updatedAt) ?? 0;
  if (left !== right) return right - left;
  return a.name.localeCompare(b.name);
}

/** Which comparator a status uses. Draft/Active look forward, Won/Lost back. */
export function comparatorFor(status: string) {
  return status === "Draft" || status === "Active" ? byDueDate : byRecentlyUpdated;
}

export type BidGroup<T extends SortableBid> = {
  status: BidStatus;
  bids: T[];
};

/**
 * Split bids into the four status columns, each sorted by its own rule.
 *
 * Every status column is returned even when empty, so the board keeps a stable
 * shape rather than reflowing as bids move between stages. Anything carrying an
 * unrecognised status is dropped rather than silently filed under Draft — a bid
 * in the wrong column is worse than one the user notices is missing.
 */
export function groupBidsByStatus<T extends SortableBid>(bids: T[]): BidGroup<T>[] {
  return BID_STATUS_ORDER.map(status => ({
    status,
    bids: bids.filter(bid => bid.status === status).sort(comparatorFor(status)),
  }));
}

/** How a deadline reads relative to today. Drives the colour on the card. */
export type DueUrgency = "none" | "overdue" | "today" | "soon" | "later";

/**
 * Compare a deadline to a reference day, both reduced to local calendar days.
 *
 * Day-level comparison matters: a bid due today at any hour is due TODAY, not
 * "overdue by six hours" because the clock passed midnight-plus-something.
 */
export function dueUrgency(
  dueDate: string | Date | null,
  now: Date = new Date(),
  soonWithinDays = 3
): DueUrgency {
  const dueDay = toCalendarDay(dueDate);
  if (dueDay === null) return "none";

  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((dueDay - today) / 86_400_000);

  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= soonWithinDays) return "soon";
  return "later";
}

/**
 * Reduce a value to the calendar day it names, as a UTC timestamp.
 *
 * A "YYYY-MM-DD" string is parsed FIELD BY FIELD rather than handed to the Date
 * constructor. `new Date("2026-08-11")` is defined as UTC midnight, so reading
 * it back with local getters lands on the 10th anywhere behind UTC — which made
 * a bid due today report as overdue. A stored date is a day, not an instant,
 * and this keeps it that way.
 */
function toCalendarDay(value: string | Date | null | undefined): number | null {
  const date = calendarDate(value);
  return date === null ? null : Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * The stored value as a Date sitting at LOCAL midnight on the day it names.
 *
 * Every consumer must go through this rather than `new Date(value)`. A stored
 * "2026-08-14" is defined as UTC midnight, so formatting it directly prints
 * "Aug 13" anywhere behind UTC — a deadline off by a day, which on this screen
 * is the difference between on time and late.
 */
export function calendarDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;

  if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
  }

  const time = toTime(value);
  if (time === null) return null;
  // A real Date carries an instant, so its LOCAL calendar day is the one meant.
  const date = new Date(time);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
