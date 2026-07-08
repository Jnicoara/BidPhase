import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const masterAssembliesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getMasterAssemblies(ctx.user.id);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const assembly = await db.getMasterAssemblyWithItems(input.id, ctx.user.id);
      if (!assembly) throw new TRPCError({ code: "NOT_FOUND", message: "Assembly not found." });
      return assembly;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().max(2000).optional(),
      phase: z.string().max(128).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.createMasterAssembly({
        userId: ctx.user.id,
        name: input.name,
        description: input.description ?? null,
        phase: input.phase ?? null,
      });
      const assemblies = await db.getMasterAssemblies(ctx.user.id);
      const created = assemblies.find(a => a.name === input.name);
      return created ?? { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().max(2000).nullable().optional(),
      phase: z.string().max(128).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await db.updateMasterAssembly(id, ctx.user.id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteMasterAssembly(input.id, ctx.user.id);
      return { success: true };
    }),

  addItem: protectedProcedure
    .input(z.object({
      assemblyId: z.number().int().positive(),
      masterItemId: z.number().int().positive(),
      qty: z.number().min(0).default(1),
      sortOrder: z.number().int().default(0),
    }))
    .mutation(async ({ input }) => {
      await db.addItemToMasterAssembly({
        assemblyId: input.assemblyId,
        masterItemId: input.masterItemId,
        qty: String(input.qty),
        sortOrder: input.sortOrder,
      });
      return { success: true };
    }),

  updateItem: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      qty: z.number().min(0).optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, qty, sortOrder } = input;
      const data: Record<string, unknown> = {};
      if (qty !== undefined) data.qty = String(qty);
      if (sortOrder !== undefined) data.sortOrder = sortOrder;
      await db.updateMasterAssemblyItem(id, data as Parameters<typeof db.updateMasterAssemblyItem>[1]);
      return { success: true };
    }),

  removeItem: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.removeItemFromMasterAssembly(input.id);
      return { success: true };
    }),
});
