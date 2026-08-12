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
import { LIBRARY_STATUSES, MATERIAL_CATEGORIES, MATERIAL_UNITS_OF_SALE } from "../../drizzle/schema";
import * as db from "../db";

/** decimal(10,4) — four decimal places, and it must stay under 10 total digits. */
const MAX_COST = 999999.9999;
const costSchema = z.number().min(0).max(MAX_COST);
const nameSchema = z.string().trim().min(1).max(512);

/**
 * Optional everywhere. `null` is a real value meaning "unshelve this" — distinct
 * from omitting the key, which leaves the existing category alone.
 */
const categorySchema = z.enum(MATERIAL_CATEGORIES).nullable();

/** Space-separated trade slang. Loose text by design — no vocabulary to enforce. */
const aliasSchema = z.string().trim().max(1024).nullable();

/** Money crosses the boundary as a number and is stored as an exact decimal string. */
const toDecimal = (value: number) => value.toFixed(4);

export const materialsRouter = router({
  /** The working list, or the archive. Never returns `deleted` tombstones. */
  list: protectedProcedure
    .input(z.object({
      status: z.enum(LIBRARY_STATUSES).exclude(["deleted"]).default("active"),
    }).optional())
    .query(async ({ input, ctx }) => {
      return db.getLibraryMaterials(ctx.user.id, input?.status ?? "active");
    }),

  /**
   * The materials this user reached for most recently, newest first.
   *
   * The Assembly Builder shows these before anything is typed — the same dozen
   * parts go into most recipes, and making them a click away beats making them
   * a search away.
   */
  recent: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(24).default(8) }).optional())
    .query(async ({ input, ctx }) => {
      return db.getRecentMaterialsForUser(ctx.user.id, input?.limit ?? 8);
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
      category: categorySchema.default(null),
      searchAliases: aliasSchema.default(null),
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
        category: input.category,
        searchAliases: input.searchAliases,
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
      category: categorySchema.optional(),
      searchAliases: aliasSchema.optional(),
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
   * "Delete" from the working list — actually an archive, always recoverable.
   *
   * The same lifecycle Modifiers has used since Foundation. It used to set
   * `isActive = false`, which hid the row with no way back: a delete wearing a
   * softer name. Assemblies may already reference the material, so it keeps its
   * id either way.
   *
   * Baseline rows cannot be archived — the user is expected to ignore what they
   * do not use rather than curate the shipped library.
   */
  archive: protectedProcedure
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
      if (target.status === "archived") return { id: input.id, alreadyArchived: true };

      const archivedId = await db.archiveMaterial(input.id, ctx.user.id);
      return { id: archivedId, alreadyArchived: false };
    }),

  /** Put an archived material back on the working list. */
  restore: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const target = await db.getMaterialById(input.id, ctx.user.id);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Material not found." });
      if (target.status !== "archived") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That material is not archived." });
      }
      await db.restoreMaterial(input.id, ctx.user.id);
      return { success: true };
    }),

  /**
   * Permanent removal. Refuses anything not already archived, so there is no
   * path from the working list straight to destruction — the user archives
   * first, then confirms again in the Archived view.
   */
  deleteForever: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const target = await db.getMaterialById(input.id, ctx.user.id);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Material not found." });
      if (target.status !== "archived") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only archived materials can be deleted permanently. Archive it first.",
        });
      }
      await db.deleteMaterialForever(input.id, ctx.user.id);
      return { success: true };
    }),
});
