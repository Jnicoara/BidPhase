/**
 * The business analytics dashboard: how a company is doing, not how one bid is.
 *
 * ── Gated on BOTH axes, and this is the file that shows why they are two ─────
 * `internalProcedure("analytics.dashboard", "analytics.view")` asks two separate
 * questions and needs both answered yes:
 *
 *   analytics.dashboard   does this feature exist for this ACCOUNT? The tier
 *                         axis (shared/permissions.ts § FEATURES). Released to
 *                         everyone today; withdrawing it while the profitability
 *                         basis is reworked is one word there, no roles touched.
 *
 *   analytics.view        may this PERSON, in this company, see it? Owners and
 *                         admins. Not estimators, not viewers.
 *
 * The second is the one worth defending, because it is stricter than anything
 * else that touches bids. An estimator can already open any bid and see its
 * price — so why not the total? Because they are different disclosures. One bid
 * is a job somebody worked on. The whole book is the company's win rate and its
 * real margin: the figures a contractor shows an accountant or a lender, and
 * would not hand to a sub they added as a viewer last week or to a client
 * contact who was given a login to read their own quote. The capability sits
 * beside `pricing.edit` in spirit — it is about the company's money rather than
 * about doing the work.
 *
 * ── Read-only, on purpose ────────────────────────────────────────────────────
 * There are no mutations here and there should not be. Everything this screen
 * shows is derived from bids and close-outs that are edited on their own
 * screens, by people holding the capabilities for those. A dashboard that could
 * write would be a second, unaudited way to change a bid's status.
 *
 * ── Nothing is computed in this file ─────────────────────────────────────────
 * Both routes are a validated input, a scope id and a clock handed to
 * server/analytics.ts. The aggregation is in SQL (server/db.ts) and the meaning
 * is in shared/analytics.ts; keeping the router thin is what lets the arithmetic
 * be tested without a request.
 */
import { z } from "zod";
import { internalProcedure, router } from "../_core/trpc";
import { systemClock } from "../../shared/retention";
import { ANALYTICS_GRANULARITIES } from "../../shared/analytics";
import { outcomesReport, profitabilityReport } from "../analytics";

/** Company performance is owner-and-admin work. See the header. */
const procedure = internalProcedure("analytics.dashboard", "analytics.view");

/**
 * The window and the slicing, shared by both routes.
 *
 * Dates are `YYYY-MM-DD` strings rather than Dates, so what the user picked
 * survives the round trip exactly — a Date would be serialised through the
 * client's timezone and could come back a day out, which on a month boundary
 * moves a bid into the wrong bucket.
 *
 * Both are optional: no range at all means the last twelve months, which is the
 * question somebody opening this screen is usually asking.
 */
const rangeInput = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  granularity: z.enum(ANALYTICS_GRANULARITIES).optional(),
});

export const analyticsRouter = router({
  /**
   * Win rate and quoting volume over time.
   *
   * Counts come from a query that never touches a line item, so this stays
   * cheap and exact however long the history gets — see getOutcomeBuckets.
   */
  outcomes: procedure
    .input(rangeInput.optional())
    .query(({ input, ctx }) =>
      outcomesReport(ctx.scope.dataUserId, input ?? {}, systemClock())
    ),

  /**
   * What the finished work earned, against what it was quoted to earn.
   *
   * Reads only jobs with a close-out. A company that has never closed one out
   * gets an empty report with `jobs: 0` — which the screen turns into an
   * invitation to record one, not into an error or a row of zeroes presented as
   * findings.
   */
  profitability: procedure
    .input(rangeInput.optional())
    .query(({ input, ctx }) =>
      profitabilityReport(ctx.scope.dataUserId, input ?? {}, systemClock())
    ),
});
