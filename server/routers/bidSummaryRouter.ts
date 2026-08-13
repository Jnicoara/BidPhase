import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const bidSummaryRouter = router({
  get: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      return (await db.getBidSummary(input.projectId, ctx.user.id)) ?? null;
    }),

  upsert: protectedProcedure
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
        ctx.user.id
      );
      return { success: true };
    }),
});
