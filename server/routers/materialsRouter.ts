/**
 * Materials library API (Foundation).
 *
 * Distinct from dataRouter's /matdb supply-house price list — this is the
 * catalog assemblies are built from. See server/db.ts § Materials.
 *
 * The fork model is deliberately hidden from callers. A screen edits a material
 * by id and does not need to know whether it is a shipped baseline row or the
 * user's own: `update` forks on demand and reports back which happened, so the
 * UI can say "you now have your own copy" without orchestrating it.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { MATERIAL_UNITS_OF_SALE } from "../../drizzle/schema";
import * as db from "../db";

/** decimal(10,4) — four decimal places, and it must stay under 10 total digits. */
const MAX_COST = 999999.9999;
const costSchema = z.number().min(0).max(MAX_COST);
const nameSchema = z.string().trim().min(1).max(512);

/** Money crosses the boundary as a number and is stored as an exact decimal string. */
const toDecimal = (value: number) => value.toFixed(4);

export const materialsRouter = router({
  /** Baseline rows plus the user's own, with forked baselines collapsed away. */
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getLibraryMaterials(ctx.user.id);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const material = await db.getMaterialById(input.id, ctx.user.id);
      if (!material) throw new TRPCError({ code: "NOT_FOUND", message: "Material not found." });
      return material;
    }),

  create: protectedProcedure
    .input(z.object({
      name: nameSchema,
      unitOfSale: z.enum(MATERIAL_UNITS_OF_SALE).default("each"),
      costPerUnit: costSchema.default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      // Block exact-name duplicates against everything the user can already see.
      // Customising the existing row is nearly always what was meant.
      const existing = await db.getLibraryMaterials(ctx.user.id);
      const clash = existing.find(m => m.name.toLowerCase() === input.name.toLowerCase());
      if (clash) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A material named "${clash.name}" already exists. Edit that one instead of adding a duplicate.`,
        });
      }

      const id = await db.createMaterial({
        userId: ctx.user.id,
        name: input.name,
        unitOfSale: input.unitOfSale,
        costPerUnit: toDecimal(input.costPerUnit),
      });
      return db.getMaterialById(id, ctx.user.id);
    }),

  /**
   * Edit a material. Editing a baseline row forks it first and applies the edit
   * to the user's copy, leaving the shipped row untouched.
   *
   * Returns the row that actually holds the edit — its id differs from the input
   * id when a fork happened, so callers should use the returned material.
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      name: nameSchema.optional(),
      unitOfSale: z.enum(MATERIAL_UNITS_OF_SALE).optional(),
      costPerUnit: costSchema.optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, costPerUnit, ...rest } = input;

      const target = await db.getMaterialById(id, ctx.user.id);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Material not found." });

      const isBaseline = target.userId === null;
      const editableId = isBaseline ? await db.forkMaterial(id, ctx.user.id) : id;

      await db.updateMaterial(editableId, ctx.user.id, {
        ...rest,
        ...(costPerUnit !== undefined ? { costPerUnit: toDecimal(costPerUnit) } : {}),
      });

      const material = await db.getMaterialById(editableId, ctx.user.id);
      return { material, forked: isBaseline };
    }),

  /**
   * Take a private copy of a baseline material without changing anything yet —
   * the "customise" action, as opposed to editing a field directly.
   */
  fork: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const target = await db.getMaterialById(input.id, ctx.user.id);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Material not found." });
      if (target.userId !== null) return target; // already the user's own

      const forkId = await db.forkMaterial(input.id, ctx.user.id);
      return db.getMaterialById(forkId, ctx.user.id);
    }),

  /** Discard edits to a forked material and restore the shipped version. */
  revert: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const target = await db.getMaterialById(input.id, ctx.user.id);
      if (!target || target.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Material not found." });
      }
      if (target.baselineId == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This material was created from scratch, so there is no original to restore.",
        });
      }

      await db.revertMaterialToBaseline(input.id, ctx.user.id);
      return db.getMaterialById(input.id, ctx.user.id);
    }),

  /**
   * Hide a material. Soft-delete, because assemblies may already reference it.
   * Baseline rows cannot be hidden — the user is expected to ignore what they
   * do not use rather than curate the shipped library.
   */
  deactivate: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const target = await db.getMaterialById(input.id, ctx.user.id);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Material not found." });
      if (target.userId === null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Materials from the starter library cannot be removed.",
        });
      }

      await db.deactivateMaterial(input.id, ctx.user.id);
      return { success: true };
    }),
});
