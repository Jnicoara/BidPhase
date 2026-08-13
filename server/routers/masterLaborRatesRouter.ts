import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

const RATE_TYPES = ["journeyman", "apprentice", "foreman"] as const;

export const masterLaborRatesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getMasterLaborRates(ctx.user.id);
  }),

  create: protectedProcedure
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
        userId: ctx.user.id,
        name: input.name,
        ratePerHour: String(input.ratePerHour),
        type: input.type,
        isDefault: input.isDefault,
      });
      const rates = await db.getMasterLaborRates(ctx.user.id);
      const created = rates.find(r => r.name === input.name);
      return created ?? { success: true };
    }),

  update: protectedProcedure
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
        ctx.user.id,
        data as Parameters<typeof db.updateMasterLaborRate>[2]
      );
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteMasterLaborRate(input.id, ctx.user.id);
      return { success: true };
    }),
});
