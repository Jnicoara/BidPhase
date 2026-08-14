import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, scoped } from "../_core/trpc";
import * as db from "../db";

/**
 * This router's gate: a query needs `bids.view`, a mutation needs `bids.edit`.
 * Chosen by operation type in `scoped` so a route added later is covered
 * without anyone remembering to tag it. See _core/trpc.ts.
 */
const procedure = scoped("bids.view", "bids.edit");

export const projectItemsRouter = router({
  list: procedure
    .input(z.object({ projectId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      return db.getProjectItems(input.projectId, ctx.scope.dataUserId);
    }),

  add: procedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        masterItemId: z.number().int().positive().optional(),
        itemCode: z.string().max(128).optional(),
        description: z.string().min(1).max(512),
        unit: z.string().max(32).default("EA"),
        qty: z.number().min(0).default(1),
        phase: z.string().max(128).optional(),
        masterMaterialCost: z.number().min(0).default(0),
        masterLaborHours: z.number().min(0).default(0),
        overrideMaterialCost: z.number().min(0).optional(),
        overrideLaborHours: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const project = await db.getProjectById(
        input.projectId,
        ctx.scope.dataUserId
      );
      if (!project)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found.",
        });
      const matCost = String(input.masterMaterialCost);
      const labHours = String(input.masterLaborHours);
      await db.createProjectItem({
        projectId: input.projectId,
        masterItemId: input.masterItemId ?? null,
        itemCode: input.itemCode ?? null,
        description: input.description,
        unit: input.unit,
        qty: String(input.qty),
        phase: input.phase ?? null,
        masterMaterialCost: matCost,
        masterLaborHours: labHours,
        overrideMaterialCost: String(
          input.overrideMaterialCost ?? input.masterMaterialCost
        ),
        overrideLaborHours: String(
          input.overrideLaborHours ?? input.masterLaborHours
        ),
        sortOrder: 0,
      });
      return { success: true };
    }),

  update: procedure
    .input(
      z.object({
        id: z.number().int().positive(),
        qty: z.number().min(0).optional(),
        phase: z.string().max(128).nullable().optional(),
        overrideMaterialCost: z.number().min(0).optional(),
        overrideLaborHours: z.number().min(0).optional(),
        description: z.string().min(1).max(512).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, qty, overrideMaterialCost, overrideLaborHours, ...rest } =
        input;
      const data: Record<string, unknown> = { ...rest };
      if (qty !== undefined) data.qty = String(qty);
      if (overrideMaterialCost !== undefined)
        data.overrideMaterialCost = String(overrideMaterialCost);
      if (overrideLaborHours !== undefined)
        data.overrideLaborHours = String(overrideLaborHours);
      await db.updateProjectItem(
        id,
        ctx.scope.dataUserId,
        data as Parameters<typeof db.updateProjectItem>[2]
      );
      return { success: true };
    }),

  resetToMaster: procedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await db.resetProjectItemToMaster(input.id, ctx.scope.dataUserId);
      return { success: true };
    }),

  delete: procedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteProjectItem(input.id, ctx.scope.dataUserId);
      return { success: true };
    }),
});
