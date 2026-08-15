import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, scoped } from "../_core/trpc";
import * as db from "../db";

/**
 * This router's gate: a query needs `library.view`, a mutation needs `library.edit`.
 * Chosen by operation type in `scoped` so a route added later is covered
 * without anyone remembering to tag it. See _core/trpc.ts.
 */
const procedure = scoped("library.view", "library.edit");

export const masterItemsRouter = router({
  list: procedure.query(async ({ ctx }) => {
    return db.getMasterItems(ctx.scope.dataUserId);
  }),

  get: procedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const item = await db.getMasterItemById(input.id, ctx.scope.dataUserId);
      if (!item)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Master item not found.",
        });
      return item;
    }),

  create: procedure
    .input(
      z.object({
        itemCode: z.string().max(128).nullable().optional(),
        category: z.string().max(128).nullable().optional(),
        description: z.string().min(1).max(512),
        unit: z.string().max(32).default("EA"),
        masterMaterialCost: z.number().min(0).default(0),
        masterLaborHours: z.number().min(0).default(0),
        notes: z.string().max(2000).nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Upsert: if an item with the same description already exists for this user, return it instead of creating a duplicate
      const items = await db.getMasterItems(ctx.scope.dataUserId);
      const existing = items.find(
        i =>
          i.description.toLowerCase().trim() ===
          input.description.toLowerCase().trim()
      );
      if (existing) return existing;
      await db.createMasterItem({
        userId: ctx.scope.dataUserId,
        itemCode: input.itemCode ?? null,
        category: input.category ?? null,
        description: input.description,
        unit: input.unit,
        masterMaterialCost: String(input.masterMaterialCost),
        masterLaborHours: String(input.masterLaborHours),
        notes: input.notes ?? null,
      });
      // Re-fetch to get the full row with id
      const refreshed = await db.getMasterItems(ctx.scope.dataUserId);
      const created = refreshed.find(
        i =>
          i.description.toLowerCase().trim() ===
          input.description.toLowerCase().trim()
      );
      return created ?? { success: true };
    }),

  update: procedure
    .input(
      z.object({
        id: z.number().int().positive(),
        itemCode: z.string().max(128).nullable().optional(),
        category: z.string().max(128).nullable().optional(),
        description: z.string().min(1).max(512).optional(),
        unit: z.string().max(32).optional(),
        masterMaterialCost: z.number().min(0).optional(),
        masterLaborHours: z.number().min(0).optional(),
        notes: z.string().max(2000).nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, masterMaterialCost, masterLaborHours, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (masterMaterialCost !== undefined)
        data.masterMaterialCost = String(masterMaterialCost);
      if (masterLaborHours !== undefined)
        data.masterLaborHours = String(masterLaborHours);
      await db.updateMasterItem(
        id,
        ctx.scope.dataUserId,
        data as Parameters<typeof db.updateMasterItem>[2]
      );
      return { success: true };
    }),

  delete: procedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteMasterItem(input.id, ctx.scope.dataUserId);
      return { success: true };
    }),

  bulkImport: procedure
    .input(
      z
        .array(
          z.object({
            itemCode: z.string().max(128).optional(),
            category: z.string().max(128).optional(),
            description: z.string().min(1).max(512),
            unit: z.string().max(32).default("EA"),
            masterMaterialCost: z.number().min(0).default(0),
            masterLaborHours: z.number().min(0).default(0),
          })
        )
        .max(500)
    )
    .mutation(async ({ input, ctx }) => {
      await db.bulkInsertMasterItems(
        input.map(row => ({
          userId: ctx.scope.dataUserId,
          itemCode: row.itemCode ?? null,
          category: row.category ?? null,
          description: row.description,
          unit: row.unit,
          masterMaterialCost: String(row.masterMaterialCost),
          masterLaborHours: String(row.masterLaborHours),
        }))
      );
      return { success: true, count: input.length };
    }),
});
