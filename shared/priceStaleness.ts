/**
 * How old a supplier price is, and whether that should worry anyone.
 *
 * ── Why this is its own module ───────────────────────────────────────────────
 * Copper moves. A price checked in January is not a price in June, and the
 * dangerous case is not a missing price — the app already shouts about those
 * (`shared/materialPricing.ts`) — it is a real-looking number nobody has
 * re-checked since. That reads identically to a fresh one on screen, which is
 * the whole reason for colouring it.
 *
 * ── The clock is a parameter, never Date.now() ───────────────────────────────
 * Same rule as `shared/retention.ts`: a 90-day boundary cannot be tested by
 * waiting 90 days. Every function here takes `now`, so the bands can be
 * asserted at the exact hour they flip.
 */

/** Days at which a price stops being fresh, and at which it becomes a problem. */
export const STALE_AFTER_DAYS = 30;
export const VERY_STALE_AFTER_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

export type PriceAge = "unpriced" | "fresh" | "aging" | "stale";

/**
 * Which band a price falls in.
 *
 * Boundaries are inclusive at the top of each band — exactly 30 days old is
 * `aging`, not `fresh`. Picked that way because the alternative reads worse in
 * the one case that matters: a price on its 30th day is the one you want
 * flagged, not the one you want reassured about.
 *
 * `unpriced` is deliberately a separate state rather than "infinitely stale".
 * A material nobody has priced is a different problem from one priced badly,
 * it is already flagged elsewhere, and colouring it red here would drown the
 * prices that actually went off.
 */
export function priceAge(
  priceUpdatedAt: Date | string | null | undefined,
  now: Date
): PriceAge {
  if (!priceUpdatedAt) return "unpriced";
  const stamped = new Date(priceUpdatedAt).getTime();
  if (Number.isNaN(stamped)) return "unpriced";

  const days = (now.getTime() - stamped) / DAY_MS;
  // A clock skew or a future-dated import should read as fresh, not as an
  // error — the price was set more recently than now, which is not a worry.
  if (days < STALE_AFTER_DAYS) return "fresh";
  if (days < VERY_STALE_AFTER_DAYS) return "aging";
  return "stale";
}

/** Whole days since the price was set, or null if it never was. */
export function priceAgeInDays(
  priceUpdatedAt: Date | string | null | undefined,
  now: Date
): number | null {
  if (!priceUpdatedAt) return null;
  const stamped = new Date(priceUpdatedAt).getTime();
  if (Number.isNaN(stamped)) return null;
  return Math.max(0, Math.floor((now.getTime() - stamped) / DAY_MS));
}

export type PriceAgeDisplay = {
  age: PriceAge;
  /** Short label for the cell, e.g. "62d". */
  label: string;
  /** The full sentence, for a tooltip and for screen readers. */
  title: string;
};

/**
 * What the screen shows for one price.
 *
 * The label carries the age in days and the title says what to do about it, so
 * the colour is never the only thing communicating the state — the same rule
 * the linked/forked badges follow.
 */
export function priceAgeDisplay(
  priceUpdatedAt: Date | string | null | undefined,
  now: Date
): PriceAgeDisplay {
  const age = priceAge(priceUpdatedAt, now);
  const days = priceAgeInDays(priceUpdatedAt, now);

  switch (age) {
    case "unpriced":
      return {
        age,
        label: "—",
        title: "No price yet. Set one from your supplier quote.",
      };
    case "fresh":
      return {
        age,
        label: `${days}d`,
        title: `Priced ${days} day${days === 1 ? "" : "s"} ago — current.`,
      };
    case "aging":
      return {
        age,
        label: `${days}d`,
        title:
          `Priced ${days} days ago. Over ${STALE_AFTER_DAYS} days — worth ` +
          `re-checking against a recent quote.`,
      };
    case "stale":
      return {
        age,
        label: `${days}d`,
        title:
          `Priced ${days} days ago. Over ${VERY_STALE_AFTER_DAYS} days — treat ` +
          `this as out of date until you confirm it.`,
      };
  }
}

/**
 * Tailwind classes per band.
 *
 * Green / orange / red as asked, but paired with the day count in the label so
 * the distinction survives being printed, screenshotted, or read by someone who
 * cannot tell the three apart.
 */
export const PRICE_AGE_CLASSES: Record<PriceAge, string> = {
  unpriced: "text-muted-foreground",
  fresh: "text-emerald-400",
  aging: "text-amber-400",
  stale: "text-red-400",
};

/** Counts per band, for the filter chips above the list. */
export function summarisePriceAges(
  rows: Array<{ priceUpdatedAt: Date | string | null }>,
  now: Date
): Record<PriceAge, number> {
  const tally: Record<PriceAge, number> = {
    unpriced: 0,
    fresh: 0,
    aging: 0,
    stale: 0,
  };
  for (const row of rows) tally[priceAge(row.priceUpdatedAt, now)]++;
  return tally;
}
