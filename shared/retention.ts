/**
 * How long archived things survive, and how that is counted.
 *
 * Archiving a bid is reversible for a while and then it is not. That "and then
 * it is not" is the part worth being careful about: this module decides when
 * real user work gets destroyed, so every rule lives here as a pure function
 * over an explicit `now`, and nothing anywhere calls `Date.now()` to decide
 * whether something may be deleted.
 *
 * ── Why an injected clock, everywhere ────────────────────────────────────────
 * A deletion that fires at 30 days cannot be tested by waiting 30 days, and a
 * bug in it is unrecoverable by definition — there is no undo for a permanent
 * delete. So the clock is a parameter all the way down, from `daysRemaining`
 * here to `purgeExpiredBids(now)` in server/db.ts. Tests hand it a date; the
 * cron handler hands it `new Date()`; nothing else invents one.
 *
 * ── Counting whole days, and why it rounds up ────────────────────────────────
 * The countdown is user-facing ("14 days left"), so it rounds UP: with any time
 * at all remaining the answer is at least 1. Showing "0 days left" on something
 * still restorable would read as already gone, and someone would stop trying.
 * 0 is reserved for genuinely expired.
 *
 * The purge itself does NOT use the day count — it compares instants. Rounding
 * decides what a person reads; it must never decide what gets destroyed.
 */

/** How long an archived bid stays recoverable. */
export const RETENTION_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * A source of "now". Injected rather than read, so the deletion path is
 * testable — see the module header.
 */
export type Clock = () => Date;

/** The real clock. The only place production code should get the time. */
export const systemClock: Clock = () => new Date();

/** The instant an item archived at `archivedAt` becomes eligible for deletion. */
export function purgeDueAt(
  archivedAt: Date,
  retentionDays: number = RETENTION_DAYS
): Date {
  return new Date(archivedAt.getTime() + retentionDays * MS_PER_DAY);
}

/**
 * Whole days left before permanent deletion, rounded up, floored at 0.
 *
 * Returns 0 exactly when the item is expired, which is what `isExpired` tests
 * directly — callers should not infer expiry from a 0 here, because the two
 * answers round differently on purpose.
 *
 * ── Sub-second noise is discarded before rounding ────────────────────────────
 * `archivedAt` comes from a MySQL TIMESTAMP, which carries no fractional
 * seconds and ROUNDS what it is given — .500 and above lands on the NEXT
 * second. So a bid archived at this instant can come back stored a fraction of
 * a second in the future, and a bare `ceil` then reports 31 days left on a
 * 30-day window, or 11 on a bid archived 20 days ago. Both are visibly wrong
 * and both are pure rounding noise.
 *
 * Truncating the remainder to whole seconds first removes it: a difference the
 * stored data cannot represent must not be able to move the number a user
 * reads. The friendly rounding survives — six hours left still reads as 1 day.
 */
export function daysRemaining(
  archivedAt: Date,
  now: Date,
  retentionDays: number = RETENTION_DAYS
): number {
  const remainingMs =
    purgeDueAt(archivedAt, retentionDays).getTime() - now.getTime();
  if (remainingMs <= 0) return 0;
  const remainingSeconds = Math.floor(remainingMs / 1000);
  const days = Math.ceil(remainingSeconds / (MS_PER_DAY / 1000));
  // Can never exceed the window itself — an answer above it would mean the
  // clock, not the data, and the honest report is "the whole window".
  return Math.min(days, retentionDays);
}

/**
 * Whether the retention window has closed.
 *
 * Compares instants rather than the rounded day count, so an item is destroyed
 * at its actual deadline and not up to a day either side of it. The boundary is
 * inclusive: exactly at the due instant, it is expired.
 */
export function isExpired(
  archivedAt: Date,
  now: Date,
  retentionDays: number = RETENTION_DAYS
): boolean {
  return now.getTime() >= purgeDueAt(archivedAt, retentionDays).getTime();
}

/**
 * How the countdown should read. Separate from the number so the wording lives
 * with the rule rather than being re-invented per screen.
 */
export function retentionLabel(
  archivedAt: Date,
  now: Date,
  retentionDays: number = RETENTION_DAYS
): string {
  const days = daysRemaining(archivedAt, now, retentionDays);
  if (days === 0) return "Deleting shortly";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

/**
 * Urgency band for the countdown, so colour is decided once rather than by each
 * screen picking its own threshold.
 */
export type RetentionUrgency = "expiring" | "soon" | "normal";

export function retentionUrgency(
  archivedAt: Date,
  now: Date,
  retentionDays: number = RETENTION_DAYS
): RetentionUrgency {
  const days = daysRemaining(archivedAt, now, retentionDays);
  if (days <= 1) return "expiring";
  if (days <= 7) return "soon";
  return "normal";
}
