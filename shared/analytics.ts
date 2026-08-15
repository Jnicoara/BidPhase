/**
 * How a contractor is actually doing: what they win, and what the work earns.
 *
 * ── Everything here is arithmetic over data the app already has ──────────────
 * Nothing in this module is a new measurement. Win rate comes from the bid
 * status a person sets on the Dashboard; profitability comes from the hours
 * they typed into a job close-out. That is a deliberate limit — a metric that
 * needs a new field to be filled in is a metric that will be blank forever, and
 * a dashboard of blanks teaches people the screen is broken.
 *
 * ── Pure, so the numbers can be checked by hand ──────────────────────────────
 * No database and no I/O. Every figure this screen shows is a claim about
 * somebody's business, and the only way that claim is defensible is if the
 * arithmetic can be tested against numbers a person worked out themselves. The
 * server does the aggregation in SQL and hands the sums here; this file decides
 * what they mean.
 *
 * ── The two decisions worth arguing about ───────────────────────────────────
 * Both are below with their reasoning, because both are the kind of thing that
 * gets "simplified" into a wrong number that still looks plausible:
 *
 *   1. WIN RATE COUNTS DECIDED BIDS ONLY. See winRate.
 *   2. PROFITABILITY RE-COSTS LABOR ONLY. See jobProfitability.
 */

import { roundMoney } from "./pricing";

// ─── Time buckets ─────────────────────────────────────────────────────────────

/**
 * How the timeline is sliced.
 *
 * Two options rather than a free choice of days/weeks/months/years, because a
 * bid is a slow object: a contractor quotes a handful a month and wins them
 * weeks later. A daily win-rate chart is a row of 0s and 100s — noise rendered
 * confidently — and a yearly one has too few points to be a trend.
 */
export const ANALYTICS_GRANULARITIES = ["month", "quarter"] as const;
export type AnalyticsGranularity = (typeof ANALYTICS_GRANULARITIES)[number];

/** How far back the screen looks when the user has not said. */
export const DEFAULT_RANGE_MONTHS = 12;

/**
 * The key one bucket is named by: `2026-08` or `2026-Q3`.
 *
 * The server produces the same string in SQL (DATE_FORMAT / QUARTER) so the
 * database can group without shipping a row per bid. This function exists to
 * generate the EMPTY buckets that grouping cannot produce, and to be the thing
 * the SQL is tested against — if the two ever disagree, a month silently
 * splits in half and the trend line bends for no reason.
 *
 * Reads the date in UTC, which is the clock every timestamp in this app is
 * stored and read in.
 */
export function bucketKeyFor(
  date: Date,
  granularity: AnalyticsGranularity
): string {
  const year = date.getUTCFullYear();
  if (granularity === "quarter") {
    return `${year}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
  }
  return `${year}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Every bucket between two instants, in order, including the empty ones.
 *
 * The empty ones are the point. Grouping in SQL returns only buckets that had a
 * bid, so a quiet March would simply be missing — and a line chart that skips a
 * gap does not draw a dip, it draws a straight line through it. A month with no
 * work is a fact about the business and has to appear as a zero.
 *
 * `end` is inclusive of the bucket it falls in.
 */
export function enumerateBuckets(
  start: Date,
  end: Date,
  granularity: AnalyticsGranularity
): string[] {
  if (end.getTime() < start.getTime()) return [];
  const keys: string[] = [];
  const step = granularity === "quarter" ? 3 : 1;
  // Walk from the first day of the start bucket so a range beginning on the
  // 20th still emits that whole month.
  const cursor = new Date(
    Date.UTC(
      start.getUTCFullYear(),
      granularity === "quarter"
        ? Math.floor(start.getUTCMonth() / 3) * 3
        : start.getUTCMonth(),
      1
    )
  );
  const lastKey = bucketKeyFor(end, granularity);
  // Bounded rather than `while (true)`: a bad range must not spin. 40 years of
  // months is far more than any chart, and far less than forever.
  for (let guard = 0; guard < 480; guard++) {
    const key = bucketKeyFor(cursor, granularity);
    keys.push(key);
    if (key === lastKey) break;
    cursor.setUTCMonth(cursor.getUTCMonth() + step);
    if (cursor.getTime() > end.getTime()) break;
  }
  return keys;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** `2026-08` → `Aug 2026`. `2026-Q3` → `Q3 2026`. */
export function bucketLabel(key: string): string {
  const quarter = /^(\d{4})-Q([1-4])$/.exec(key);
  if (quarter) return `Q${quarter[2]} ${quarter[1]}`;
  const month = /^(\d{4})-(\d{2})$/.exec(key);
  if (month) {
    const index = Number(month[2]) - 1;
    return `${MONTH_NAMES[index] ?? month[2]} ${month[1]}`;
  }
  return key;
}

// ─── Win rate ─────────────────────────────────────────────────────────────────

/** One period's bids, by the status the contractor set. */
export type OutcomeCounts = {
  won: number;
  lost: number;
  draft: number;
  active: number;
};

export const EMPTY_OUTCOMES: OutcomeCounts = {
  won: 0,
  lost: 0,
  draft: 0,
  active: 0,
};

/** Bids that got an answer. The denominator of a win rate. */
export function decidedBids(counts: OutcomeCounts): number {
  return counts.won + counts.lost;
}

/** Bids still out — drafted or active. Not yet evidence of anything. */
export function pendingBids(counts: OutcomeCounts): number {
  return counts.draft + counts.active;
}

export function totalBids(counts: OutcomeCounts): number {
  return decidedBids(counts) + pendingBids(counts);
}

/**
 * Won as a fraction of the bids that were DECIDED. Null when none were.
 *
 * ── The denominator is the whole argument ────────────────────────────────────
 * The obvious formula is won ÷ everything quoted, and it is wrong in a way that
 * is invisible on screen: a bid that has not been answered yet is not a loss,
 * but counting it as one drags the rate down, and it drags it down HARDER the
 * busier the contractor is. A shop that doubles the number of quotes it has in
 * the air would watch its win rate fall while nothing about its business got
 * worse. That is not a metric, it is a discouragement.
 *
 * So pending bids leave the calculation entirely, and are reported alongside as
 * their own count so the figure can be read honestly: "62% of 34 decided, with
 * 11 still out" says something; "45% of 45" says something false.
 *
 * Null rather than 0 when nothing has been decided. Zero percent is a real and
 * bleak reading — it means everything came back a loss — and a new account that
 * has quoted three jobs and heard nothing must not be shown it.
 */
export function winRate(counts: OutcomeCounts): number | null {
  const decided = decidedBids(counts);
  if (decided <= 0) return null;
  return round4(counts.won / decided);
}

/** Add one period's counts to another. Used to total a timeline. */
export function addOutcomes(a: OutcomeCounts, b: OutcomeCounts): OutcomeCounts {
  return {
    won: a.won + b.won,
    lost: a.lost + b.lost,
    draft: a.draft + b.draft,
    active: a.active + b.active,
  };
}

/** One row of the win-rate / volume timeline. */
export type OutcomePeriod = {
  /** `2026-08` — see bucketKeyFor. */
  bucket: string;
  /** `Aug 2026`. */
  label: string;
  counts: OutcomeCounts;
  decided: number;
  pending: number;
  total: number;
  /** Null when nothing in this period has been decided yet. */
  winRate: number | null;
  /** What was quoted, by outcome. Sample bids never contribute. */
  wonValue: number;
  lostValue: number;
  /** Everything quoted in the period, whatever became of it. */
  totalValue: number;
};

/** The per-bucket sums the database produces, before any interpretation. */
export type BucketTotals = {
  bucket: string;
  counts: OutcomeCounts;
  wonValue: number;
  lostValue: number;
  totalValue: number;
};

/**
 * Turn what SQL grouped into the timeline the screen draws.
 *
 * Takes the full list of buckets separately from the rows that have data, so a
 * period with no bids becomes a zero rather than a hole — see enumerateBuckets.
 */
export function buildTimeline(
  buckets: readonly string[],
  rows: readonly BucketTotals[]
): OutcomePeriod[] {
  const byBucket = new Map(rows.map(row => [row.bucket, row]));
  return buckets.map(bucket => {
    const row = byBucket.get(bucket);
    const counts = row?.counts ?? EMPTY_OUTCOMES;
    return {
      bucket,
      label: bucketLabel(bucket),
      counts,
      decided: decidedBids(counts),
      pending: pendingBids(counts),
      total: totalBids(counts),
      winRate: winRate(counts),
      wonValue: roundMoney(row?.wonValue ?? 0),
      lostValue: roundMoney(row?.lostValue ?? 0),
      totalValue: roundMoney(row?.totalValue ?? 0),
    };
  });
}

// ─── Profitability ────────────────────────────────────────────────────────────

/**
 * One finished job, as the database can describe it.
 *
 * `revenue` and the estimated figures come from pricing the bid through the
 * ordinary engine. `actualHours` comes from the close-out the contractor typed
 * in. Nothing here is inferred.
 */
export type ClosedJob = {
  bidId: number;
  name: string;
  /** Every trade the bid carries. A bid may legitimately carry more than one. */
  trades: string[];
  closedAt: Date;
  /** The bid price: marked-up materials and labor. Excludes tax and charges. */
  revenue: number;
  /** What the work was costed at — materials plus estimated labor. */
  estimatedMaterialCost: number;
  estimatedLaborCost: number;
  estimatedHours: number;
  /** What it took, from the close-out. */
  actualHours: number;
};

/**
 * What one finished job actually earned, against what it was quoted to earn.
 *
 * ── Labor is re-costed; materials are not, and that is stated ────────────────
 * The close-out records HOURS and nothing else, because hours are what a
 * contractor can honestly report at the end of a job without doing their books
 * twice. There is no actual material cost anywhere in this app, so this does
 * not pretend to one: materials are carried at their estimate, and the entire
 * difference between estimated and actual profit is labor.
 *
 * That makes this a real but PARTIAL measure, and the screen says so. The
 * alternative — quietly inflating materials by the same ratio as labor, or
 * treating the estimate as the actual and reporting no variance — would both
 * produce a number that looks complete and is not. A partial measure someone
 * understands beats a total one they cannot check.
 *
 * ── The rate that converts hours to money ───────────────────────────────────
 * Actual labor cost is `actualHours × the bid's own blended rate`, where the
 * blend is that bid's estimated labor cost divided by its estimated hours. That
 * is the weighted average of exactly the roles the job was priced with, frozen
 * on its line snapshots — not today's rate, which would re-cost a job finished
 * last year at a rate nobody charged then.
 *
 * A job with no estimated hours has no rate to blend, so its labor cannot be
 * re-costed at all. It reports `hasLaborBasis: false` and is counted apart,
 * rather than being folded in at a rate of zero — which would show a
 * materials-only job as wildly profitable.
 */
export type JobProfit = {
  bidId: number;
  name: string;
  trades: string[];
  closedAt: Date;
  revenue: number;
  estimatedCost: number;
  actualCost: number;
  estimatedProfit: number;
  actualProfit: number;
  /** Fractions of revenue. Null when the job was quoted at nothing. */
  estimatedMargin: number | null;
  actualMargin: number | null;
  estimatedHours: number;
  actualHours: number;
  /** The rate the actual hours were costed at. Null when there is no basis. */
  blendedRate: number | null;
  hasLaborBasis: boolean;
};

/**
 * The weighted hourly rate a bid was actually priced at.
 *
 * Null when there are no hours to divide by — see jobProfitability. Not zero:
 * zero is a rate, and a job costed at it would report every dollar as profit.
 */
export function blendedLaborRate(
  estimatedLaborCost: number,
  estimatedHours: number
): number | null {
  if (!(estimatedHours > 0)) return null;
  if (!Number.isFinite(estimatedLaborCost)) return null;
  return estimatedLaborCost / estimatedHours;
}

/**
 * Profit as a fraction of revenue — margin, not markup.
 *
 * Margin because that is what the figure is being compared against: a
 * contractor who set a 20% target margin in their pricing defaults should be
 * able to read this against it. Reporting markup here and margin there is how
 * two numbers that mean different things end up compared as if they did not.
 *
 * Null on zero revenue. There is no percentage of nothing, and returning 0
 * would read as "broke even" on a job that was quoted at nothing at all.
 */
export function marginPct(revenue: number, cost: number): number | null {
  if (!(revenue > 0)) return null;
  return round4((revenue - cost) / revenue);
}

export function jobProfitability(job: ClosedJob): JobProfit {
  const rate = blendedLaborRate(job.estimatedLaborCost, job.estimatedHours);
  const estimatedCost = roundMoney(
    job.estimatedMaterialCost + job.estimatedLaborCost
  );
  // No rate means the labor cannot be re-costed, so the job stands at its
  // estimate rather than being silently re-priced at nothing.
  const actualLaborCost =
    rate === null ? job.estimatedLaborCost : job.actualHours * rate;
  const actualCost = roundMoney(job.estimatedMaterialCost + actualLaborCost);
  const revenue = roundMoney(job.revenue);

  return {
    bidId: job.bidId,
    name: job.name,
    trades: job.trades,
    closedAt: job.closedAt,
    revenue,
    estimatedCost,
    actualCost,
    estimatedProfit: roundMoney(revenue - estimatedCost),
    actualProfit: roundMoney(revenue - actualCost),
    estimatedMargin: marginPct(revenue, estimatedCost),
    actualMargin: marginPct(revenue, actualCost),
    estimatedHours: round2(job.estimatedHours),
    actualHours: round2(job.actualHours),
    blendedRate: rate === null ? null : roundMoney(rate),
    hasLaborBasis: rate !== null,
  };
}

/** Finished jobs rolled up along one axis — a trade, or the whole company. */
export type ProfitGroup = {
  /** The trade, or "all" for the company total. */
  key: string;
  jobs: number;
  revenue: number;
  estimatedCost: number;
  actualCost: number;
  estimatedProfit: number;
  actualProfit: number;
  estimatedMargin: number | null;
  actualMargin: number | null;
  /**
   * Actual margin minus estimated. Negative means the work earned less than it
   * was quoted to — the number this whole panel exists to surface.
   */
  marginDelta: number | null;
  estimatedHours: number;
  actualHours: number;
  /** Actual hours over estimated, as a fraction. Null with no estimate. */
  hoursVariance: number | null;
  /** Jobs whose labor could not be re-costed. See jobProfitability. */
  jobsWithoutLaborBasis: number;
};

function emptyGroup(key: string): ProfitGroup {
  return {
    key,
    jobs: 0,
    revenue: 0,
    estimatedCost: 0,
    actualCost: 0,
    estimatedProfit: 0,
    actualProfit: 0,
    estimatedMargin: null,
    actualMargin: null,
    marginDelta: null,
    estimatedHours: 0,
    actualHours: 0,
    // Null, not 0. No jobs is not "came in exactly on estimate".
    hoursVariance: null,
    jobsWithoutLaborBasis: 0,
  };
}

/**
 * Roll a set of finished jobs into one line.
 *
 * ── Margins are computed from the sums, never averaged ──────────────────────
 * A group's margin is its total profit over its total revenue. Averaging the
 * per-job margins instead would give a $900 service call the same weight as a
 * $400,000 fit-out, and a contractor reading "our margin is 31%" would be
 * reading the average of jobs rather than the state of their business. The two
 * differ by a lot and only one of them can be reconciled against a bank
 * balance.
 */
export function summariseJobs(
  key: string,
  jobs: readonly JobProfit[]
): ProfitGroup {
  const group = emptyGroup(key);
  if (jobs.length === 0) return group;

  let revenue = 0;
  let estimatedCost = 0;
  let actualCost = 0;
  let estimatedHours = 0;
  let actualHours = 0;

  for (const job of jobs) {
    revenue += job.revenue;
    estimatedCost += job.estimatedCost;
    actualCost += job.actualCost;
    estimatedHours += job.estimatedHours;
    actualHours += job.actualHours;
    if (!job.hasLaborBasis) group.jobsWithoutLaborBasis += 1;
  }

  group.jobs = jobs.length;
  group.revenue = roundMoney(revenue);
  group.estimatedCost = roundMoney(estimatedCost);
  group.actualCost = roundMoney(actualCost);
  group.estimatedProfit = roundMoney(group.revenue - group.estimatedCost);
  group.actualProfit = roundMoney(group.revenue - group.actualCost);
  group.estimatedMargin = marginPct(group.revenue, group.estimatedCost);
  group.actualMargin = marginPct(group.revenue, group.actualCost);
  group.marginDelta =
    group.estimatedMargin === null || group.actualMargin === null
      ? null
      : round4(group.actualMargin - group.estimatedMargin);
  group.estimatedHours = round2(estimatedHours);
  group.actualHours = round2(actualHours);
  group.hoursVariance =
    estimatedHours > 0
      ? round4((actualHours - estimatedHours) / estimatedHours)
      : null;

  return group;
}

/**
 * Every trade that appears in these jobs, each with its own rollup.
 *
 * ── A multi-trade bid is counted under BOTH of its trades ───────────────────
 * `bids.trades` is a list, and CLAUDE.md is explicit that one bid may mix line
 * items from several unlocked trades. There is no field saying which trade a
 * bid "really" is, and inventing one — first in the list, biggest by value —
 * would be a guess printed as a fact.
 *
 * So a bid carrying electrical and plumbing appears in both rows, and the rows
 * therefore do NOT sum to the company total. That is reported rather than
 * hidden: `multiTradeJobs` says how many jobs are counted more than once, so
 * the screen can label the axis "jobs including this trade" and nobody tries to
 * reconcile the column against the total. A silently double-counted total is
 * the worse failure — it is wrong and looks right.
 *
 * A bid with no trades recorded at all is filed under `untradedKey` rather than
 * dropped, because a job that finished is a job that finished.
 */
export const UNTRADED_KEY = "unspecified";

export function groupByTrade(jobs: readonly JobProfit[]): {
  groups: ProfitGroup[];
  multiTradeJobs: number;
} {
  const byTrade = new Map<string, JobProfit[]>();
  let multiTradeJobs = 0;

  for (const job of jobs) {
    const trades = job.trades.length > 0 ? job.trades : [UNTRADED_KEY];
    if (trades.length > 1) multiTradeJobs += 1;
    for (const trade of trades) {
      const list = byTrade.get(trade);
      if (list) list.push(job);
      else byTrade.set(trade, [job]);
    }
  }

  const groups = Array.from(byTrade, ([trade, list]) =>
    summariseJobs(trade, list)
  );
  // Biggest book of work first — that is the trade a contractor wants to read
  // about, and it keeps a one-job trade from heading the table with a margin
  // computed from a single number.
  groups.sort((a, b) => b.revenue - a.revenue || a.key.localeCompare(b.key));

  return { groups, multiTradeJobs };
}

// ─── Rounding ─────────────────────────────────────────────────────────────────

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10000) / 10000;
}
