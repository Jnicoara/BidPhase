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
