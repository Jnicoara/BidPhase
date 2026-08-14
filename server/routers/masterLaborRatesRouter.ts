import { z } from "zod";
import { router, scoped } from "../_core/trpc";
import * as db from "../db";

/**
 * This router's gate: a query needs `library.view`, a mutation needs `library.edit`.
 * Chosen by operation type in `scoped` so a route added later is covered
 * without anyone remembering to tag it. See _core/trpc.ts.
 */
const procedure = scoped("library.view", "library.edit");

const RATE_TYPES = ["journeyman", "apprentice", "foreman"] as const;

export const masterLaborRatesRouter = router({
  list: procedure.query(async ({ ctx }) => {
    return db.getMasterLaborRates(ctx.scope.dataUserId);
  }),

  create: procedure
    .input(
      z.object({
        name: z.string().min(1).max(128),
        ratePerHour: z.number().min(0),
        type: z.enum(RATE_TYPES).default("journeyman"),
        isDefault: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.createMasterLaborRate({
        userId: ctx.scope.dataUserId,
        name: input.name,
        ratePerHour: String(input.ratePerHour),
        type: input.type,
        isDefault: input.isDefault,
      });
      const rates = await db.getMasterLaborRates(ctx.scope.dataUserId);
      const created = rates.find(r => r.name === input.name);
      return created ?? { success: true };
    }),

  update: procedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(128).optional(),
        ratePerHour: z.number().min(0).optional(),
        type: z.enum(RATE_TYPES).optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ratePerHour, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (ratePerHour !== undefined) data.ratePerHour = String(ratePerHour);
      await db.updateMasterLaborRate(
        id,
        ctx.scope.dataUserId,
        data as Parameters<typeof db.updateMasterLaborRate>[2]
      );
      return { success: true };
    }),

  delete: procedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteMasterLaborRate(input.id, ctx.scope.dataUserId);
      return { success: true };
    }),
});
