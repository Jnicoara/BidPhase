import { z } from "zod";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "../_core/trpc";
import * as db from "../db";

export const featureFlagsRouter = router({
  /**
   * Admin only — returns all flags with full metadata.
   */
  getAll: adminProcedure.query(async () => {
    return db.getAllFeatureFlags();
  }),

  /**
   * Admin only — create or update a flag.
   */
  upsert: adminProcedure
    .input(
      z.object({
        flagKey: z.string().min(1).max(128),
        label: z.string().min(1).max(255),
        description: z.string().optional(),
        enabledForContractors: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await db.upsertFeatureFlag({
        flagKey: input.flagKey,
        label: input.label,
        description: input.description ?? null,
        enabledForContractors: input.enabledForContractors,
      });
      return { success: true };
    }),

  /**
   * Authenticated — returns a map of { flagKey: boolean } for the current user.
   * Admins always get true for every flag.
   * Contractors get the DB-stored enabledForContractors value.
   * "user" role (legacy) is treated the same as "contractor".
   */
  getForUser: protectedProcedure.query(async ({ ctx }) => {
    const role = ctx.user.role;
    if (role === "admin") {
      // Admins see everything as enabled
      const flags = await db.getAllFeatureFlags();
      const result: Record<string, boolean> = {};
      for (const f of flags) {
        result[f.flagKey] = true;
      }
      return result;
    }

    // Contractor / user role — return actual enabledForContractors values
    const flags = await db.getAllFeatureFlags();
    const result: Record<string, boolean> = {};
    for (const f of flags) {
      result[f.flagKey] = f.enabledForContractors;
    }
    return result;
  }),
});
