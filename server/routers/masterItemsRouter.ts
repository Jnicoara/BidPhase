import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const masterItemsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getMasterItems(ctx.user.id);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const item = await db.getMasterItemById(input.id, ctx.user.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Master item not found." });
      return item;
    }),

  create: protectedProcedure
    .input(z.object({
      itemCode: z.string().max(128).optional(),
      category: z.string().max(128).optional(),
      description: z.string().min(1).max(512),
      unit: z.string().max(32).default("EA"),
      masterMaterialCost: z.number().min(0).default(0),
      masterLaborHours: z.number().min(0).default(0),
      notes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.createMasterItem({
        userId: ctx.user.id,
        itemCode: input.itemCode ?? null,
        category: input.category ?? null,
        description: input.description,
        unit: input.unit,
        masterMaterialCost: String(input.masterMaterialCost),
        masterLaborHours: String(input.masterLaborHours),
        notes: input.notes ?? null,
      });
      // Re-fetch to get the full row with id
      const items = await db.getMasterItems(ctx.user.id);
      const created = items.find(i => i.description === input.description && i.itemCode === (input.itemCode ?? null));
      return created ?? { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      itemCode: z.string().max(128).nullable().optional(),
      category: z.string().max(128).nullable().optional(),
      description: z.string().min(1).max(512).optional(),
      unit: z.string().max(32).optional(),
      masterMaterialCost: z.number().min(0).optional(),
      masterLaborHours: z.number().min(0).optional(),
      notes: z.string().max(2000).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, masterMaterialCost, masterLaborHours, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (masterMaterialCost !== undefined) data.masterMaterialCost = String(masterMaterialCost);
      if (masterLaborHours !== undefined) data.masterLaborHours = String(masterLaborHours);
      await db.updateMasterItem(id, ctx.user.id, data as Parameters<typeof db.updateMasterItem>[2]);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteMasterItem(input.id, ctx.user.id);
      return { success: true };
    }),

  bulkImport: protectedProcedure
    .input(z.array(z.object({
      itemCode: z.string().max(128).optional(),
      category: z.string().max(128).optional(),
      description: z.string().min(1).max(512),
      unit: z.string().max(32).default("EA"),
      masterMaterialCost: z.number().min(0).default(0),
      masterLaborHours: z.number().min(0).default(0),
    })).max(500))
    .mutation(async ({ input, ctx }) => {
      await db.bulkInsertMasterItems(input.map(row => ({
        userId: ctx.user.id,
        itemCode: row.itemCode ?? null,
        category: row.category ?? null,
        description: row.description,
        unit: row.unit,
        masterMaterialCost: String(row.masterMaterialCost),
        masterLaborHours: String(row.masterLaborHours),
      })));
      return { success: true, count: input.length };
    }),
});
