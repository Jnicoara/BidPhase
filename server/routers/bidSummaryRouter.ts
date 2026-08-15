import { z } from "zod";
import { router, scoped } from "../_core/trpc";
import * as db from "../db";

/**
 * This router's gate: a query needs `bids.view`, a mutation needs `bids.edit`.
 * Chosen by operation type in `scoped` so a route added later is covered
 * without anyone remembering to tag it. See _core/trpc.ts.
 */
const procedure = scoped("bids.view", "bids.edit");

export const bidSummaryRouter = router({
  get: procedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      return (
        (await db.getBidSummary(input.projectId, ctx.scope.dataUserId)) ?? null
      );
    }),

  upsert: procedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        percentageLaborFactor: z.number().min(0).max(99).default(1.0),
        lumpSumHours: z.number().default(0),
        markupPct: z.number().min(0).max(999).default(0),
        defaultLaborRateId: z.number().int().positive().nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.upsertBidSummary(
        {
          projectId: input.projectId,
          percentageLaborFactor: String(input.percentageLaborFactor),
          lumpSumHours: String(input.lumpSumHours),
          markupPct: String(input.markupPct),
          defaultLaborRateId: input.defaultLaborRateId ?? null,
        },
        ctx.scope.dataUserId
      );
      return { success: true };
    }),
});
