import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const projectAssembliesRouter = router({
  /** List all assemblies (with items) for a project */
  list: protectedProcedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return db.getProjectAssembliesWithItems(input.projectId);
    }),

  /** Add a master assembly as a project assembly (snapshot all items) */
  addFromMaster: protectedProcedure
    .input(z.object({
      projectId: z.number().int().positive(),
      masterAssemblyId: z.number().int().positive(),
      phase: z.string().max(128).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify master assembly belongs to user
      const masterAssembly = await db.getMasterAssemblyWithItems(input.masterAssemblyId, ctx.user.id);
      if (!masterAssembly) throw new TRPCError({ code: "NOT_FOUND", message: "Master assembly not found." });

      // Create project assembly
      await db.createProjectAssembly({
        projectId: input.projectId,
        masterAssemblyId: input.masterAssemblyId,
        name: masterAssembly.name,
        phase: input.phase ?? masterAssembly.phase ?? null,
        sortOrder: 0,
      });

      // Get the newly created assembly
      const assemblies = await db.getProjectAssemblies(input.projectId);
      const newAssembly = assemblies[assemblies.length - 1];
      if (!newAssembly) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Snapshot all master items into project assembly items
      for (let i = 0; i < masterAssembly.items.length; i++) {
        const item = masterAssembly.items[i];
        await db.createProjectAssemblyItem({
          projectAssemblyId: newAssembly.id,
          masterItemId: item.masterItemId,
          itemCode: item.itemCode ?? null,
          description: item.description,
          unit: item.unit,
          qty: item.qty,
          masterMaterialCost: item.masterMaterialCost,
          masterLaborHours: item.masterLaborHours,
          overrideMaterialCost: item.masterMaterialCost, // default to master
          overrideLaborHours: item.masterLaborHours,     // default to master
          sortOrder: i,
        });
      }

      return { success: true, assemblyId: newAssembly.id };
    }),

  /** Create a blank project assembly (manual, no master) */
  createBlank: protectedProcedure
    .input(z.object({
      projectId: z.number().int().positive(),
      name: z.string().min(1).max(255),
      phase: z.string().max(128).optional(),
    }))
    .mutation(async ({ input }) => {
      await db.createProjectAssembly({
        projectId: input.projectId,
        masterAssemblyId: null,
        name: input.name,
        phase: input.phase ?? null,
        sortOrder: 0,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).max(255).optional(),
      phase: z.string().max(128).nullable().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateProjectAssembly(id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.deleteProjectAssembly(input.id);
      return { success: true };
    }),

  /** Add a single item to an existing project assembly */
  addItem: protectedProcedure
    .input(z.object({
      projectAssemblyId: z.number().int().positive(),
      masterItemId: z.number().int().positive().optional(),
      itemCode: z.string().max(128).optional(),
      description: z.string().min(1).max(512),
      unit: z.string().max(32).default("EA"),
      qty: z.number().min(0).default(1),
      masterMaterialCost: z.number().min(0).default(0),
      masterLaborHours: z.number().min(0).default(0),
      overrideMaterialCost: z.number().min(0).optional(),
      overrideLaborHours: z.number().min(0).optional(),
    }))
    .mutation(async ({ input }) => {
      const matCost = String(input.masterMaterialCost);
      const labHours = String(input.masterLaborHours);
      await db.createProjectAssemblyItem({
        projectAssemblyId: input.projectAssemblyId,
        masterItemId: input.masterItemId ?? null,
        itemCode: input.itemCode ?? null,
        description: input.description,
        unit: input.unit,
        qty: String(input.qty),
        masterMaterialCost: matCost,
        masterLaborHours: labHours,
        overrideMaterialCost: String(input.overrideMaterialCost ?? input.masterMaterialCost),
        overrideLaborHours: String(input.overrideLaborHours ?? input.masterLaborHours),
        sortOrder: 0,
      });
      return { success: true };
    }),

  /** Update qty or override values for an item in a project assembly */
  updateItem: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      qty: z.number().min(0).optional(),
      overrideMaterialCost: z.number().min(0).optional(),
      overrideLaborHours: z.number().min(0).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, qty, overrideMaterialCost, overrideLaborHours } = input;
      const data: Record<string, unknown> = {};
      if (qty !== undefined) data.qty = String(qty);
      if (overrideMaterialCost !== undefined) data.overrideMaterialCost = String(overrideMaterialCost);
      if (overrideLaborHours !== undefined) data.overrideLaborHours = String(overrideLaborHours);
      await db.updateProjectAssemblyItem(id, data as Parameters<typeof db.updateProjectAssemblyItem>[1]);
      return { success: true };
    }),

  /** Reset a single item's overrides back to master values */
  resetItem: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.resetProjectAssemblyItemToMaster(input.id);
      return { success: true };
    }),

  deleteItem: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.deleteProjectAssemblyItem(input.id);
      return { success: true };
    }),
});
