/**
 * Which labor rates are still waiting for the contractor's real number.
 *
 * The material equivalent is `needsPricing` in ./materialPricing, and the rule
 * is deliberately identical — zero means "nobody has set this", because a
 * separate "has it been set" flag is a second fact that can drift out of step
 * with the first, and the direction it drifts is the dangerous one.
 *
 * ── Why this matters more than an unpriced material ──────────────────────────
 * An unpriced material understates one line of a bid. The labor rate multiplies
 * EVERY line at once: hours × rate is most of the number on most jobs, so a bid
 * built on a $0 rate is not slightly low, it is missing its entire labor cost
 * and still looks like a finished bid. That asymmetry is why the first-run flow
 * asks for a rate before it lets a new user near their first bid, and why this
 * check exists separately rather than being folded into the material one.
 */
import { needsPricing } from "./materialPricing";

/** The fields that decide whether a role has a real rate behind it. */
export type RateLike = {
  rateType: "hourly" | "salary";
  hourlyCost: string | number | null;
  annualSalary: string | number | null;
  annualHours: string | number | null;
};

/**
 * True when this role still carries the shipped $0 and needs a real rate.
 *
 * Reads whichever field actually drives the rate: an hourly role is priced
 * straight off `hourlyCost`, while a salaried one derives from salary and
 * hours and ignores `hourlyCost` entirely. Checking the wrong one would call
 * every salaried role unrated forever, since their hourlyCost is always zero.
 *
 * Hours are checked too — not because they are a price, but because a salary
 * with no hours has no rate at all: `effectiveHourlyRate` treats zero hours as
 * a division by zero and refuses it rather than returning "free".
 */
export function needsRate(rate: RateLike): boolean {
  if (rate.rateType === "salary") {
    if (needsPricing(rate.annualSalary)) return true;
    const hours = Number(rate.annualHours ?? 0);
    return !Number.isFinite(hours) || hours <= 0;
  }
  return needsPricing(rate.hourlyCost);
}

/** How many of these still need a rate. Drives the count on the filter. */
export function countNeedingRate(rates: RateLike[]): number {
  return rates.reduce((n, r) => (needsRate(r) ? n + 1 : n), 0);
}

// ─── The same $0, one layer down: a bid line ──────────────────────────────────

/**
 * A bid line, as far as unpriced labor is concerned.
 *
 * The two frozen fields that decide whether its hours cost anything. See
 * drizzle/schema.ts on `bid_line_items` for why they are snapshots.
 */
export type PricedLineLike = {
  snapshotLaborHours: string | number | null;
  snapshotLaborRate: string | number | null;
};

/**
 * True when this line carries real hours that are being priced at nothing.
 *
 * ── Why a line can end up like this ──────────────────────────────────────────
 * An assembly's `laborRateId` is nullable, and `set null` on delete, so an
 * assembly can carry hours with no role attached — six of the fourteen starter
 * assemblies do. Adding one to a bid freezes `snapshotLaborRate` at 0, and the
 * line then contributes its hours to the total and nothing at all to the price.
 *
 * ── Why it needs saying out loud ─────────────────────────────────────────────
 * This is the exact failure the whole $0 convention exists to prevent, arriving
 * by a route the convention did not cover. An unpriced MATERIAL is flagged on
 * the Materials screen and an unpriced RATE is flagged on Labor Rates, but a
 * bid built from a correctly-priced catalog and an unlinked assembly shows a
 * confident total with a chunk of labor silently missing — and unlike a $0
 * material, nothing on the bid looks unfinished.
 *
 * Hours are required, not just a zero rate: a line with no hours and no rate is
 * a materials-only line, which is ordinary and not worth a warning.
 */
export function lineHasUnpricedLabor(line: PricedLineLike): boolean {
  const hours = Number(line.snapshotLaborHours ?? 0);
  if (!Number.isFinite(hours) || hours <= 0) return false;
  return needsPricing(line.snapshotLaborRate);
}

/** How many lines on a bid are giving their labor away. */
export function countUnpricedLaborLines(lines: PricedLineLike[]): number {
  return lines.reduce((n, l) => (lineHasUnpricedLabor(l) ? n + 1 : n), 0);
}

/**
 * Has this user set up labor at all?
 *
 * The first-run flow and the getting-started checklist both turn on this one
 * question, and they must agree: "set your labor rates" is complete as soon as
 * ONE role carries a real rate. Requiring all of them would block a sole
 * operator who only ever bills one rate, which is most new accounts.
 */
export function hasAnyRealRate(rates: RateLike[]): boolean {
  return rates.some(rate => !needsRate(rate));
}
