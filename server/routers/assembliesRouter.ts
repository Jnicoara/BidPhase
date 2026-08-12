/**
 * Assemblies API (Foundation).
 *
 * An assembly is a reusable recipe: material lines + base labor hours + a labor
 * role + which modifiers apply. Same fork-on-edit model as the rest of the
 * library, with the wrinkle that forking has to deep-copy the recipe.
 *
 * ── No pricing math lives here ───────────────────────────────────────────────
 * `price` assembles inputs and hands them to shared/pricing.ts. Modifiers add
 * rather than compound, overhead lands before profit, and the profit method is
 * never inferred — all of that is enforced in one place, and duplicating any of
 * it here is how two screens end up quoting different numbers.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { ASSEMBLY_CATEGORIES, PROJECT_TYPES } from "../../drizzle/schema";
import { calculateLineItem, calculateBidPrice } from "../../shared/pricing";
import { hourlyCostOf, resolveLaborRate } from "../../shared/laborRateLookup";
import * as db from "../db";

const nameSchema = z.string().trim().min(1).max(255);
const tradeSchema = z.string().trim().min(1).max(64);
/** decimal(10,4). A single assembly above 10k hours is a data-entry accident. */
const hoursSchema = z.number().min(0).max(10000);
const qtySchema = z.number().min(0).max(999999);

const materialLineSchema = z.object({
  materialId: z.number().int().positive(),
  qty: qtySchema,
});

const materialsSchema = z.array(materialLineSchema).max(200);
const modifierIdsSchema = z.array(z.number().int().positive()).max(50);

/**
 * Create and update deliberately do NOT share one schema with `.partial()`.
 *
 * Zod's `.partial()` marks a field optional but does not remove a `.default()`
 * underneath it — an absent key still parses to the default. Sharing one schema
 * therefore turned every partial update into a silent reset: omitting
 * `laborRateId` nulled the role, omitting `trade` forced it back to
 * "electrical", and omitting `materials` erased the entire recipe. Defaults
 * live on the create schema only, and update fields are plainly optional.
 */
const createSchema = z.object({
  name: nameSchema,
  category: z.enum(ASSEMBLY_CATEGORIES),
  trade: tradeSchema.default("electrical"),
  projectType: z.enum(PROJECT_TYPES).nullable().default(null),
  baseLaborHours: hoursSchema,
  laborRateId: z.number().int().positive().nullable().default(null),
  materials: materialsSchema.default([]),
  modifierIds: modifierIdsSchema.default([]),
});

const updateSchema = z.object({
  id: z.number().int().positive(),
  name: nameSchema.optional(),
  category: z.enum(ASSEMBLY_CATEGORIES).optional(),
  trade: tradeSchema.optional(),
  projectType: z.enum(PROJECT_TYPES).nullable().optional(),
  baseLaborHours: hoursSchema.optional(),
  laborRateId: z.number().int().positive().nullable().optional(),
  materials: materialsSchema.optional(),
  modifierIds: modifierIdsSchema.optional(),
});

const toDecimal = (value: number) => value.toFixed(4);

export const assembliesRouter = router({
  /** Starter assemblies plus the user's own, with forked starters collapsed. */
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getLibraryAssemblies(ctx.user.id);
  }),

  /** One assembly with its full recipe. */
  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const detail = await db.getAssemblyDetail(input.id, ctx.user.id);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Assembly not found." });
      return detail;
    }),

  create: protectedProcedure
    .input(createSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await db.getLibraryAssemblies(ctx.user.id);
      const clash = existing.find(a => a.name.toLowerCase() === input.name.toLowerCase());
      if (clash) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `An assembly named "${clash.name}" already exists. Edit that one instead of adding a duplicate.`,
        });
      }

      const id = await db.createAssembly({
        userId: ctx.user.id,
        name: input.name,
        category: input.category,
        trade: input.trade,
        projectType: input.projectType,
        baseLaborHours: toDecimal(input.baseLaborHours),
        laborRateId: input.laborRateId,
      });

      await db.setAssemblyMaterials(
        id,
        input.materials.map(line => ({ materialId: line.materialId, qty: toDecimal(line.qty) }))
      );
      await db.setAssemblyModifiers(id, input.modifierIds);

      return db.getAssemblyDetail(id, ctx.user.id);
    }),

  /**
   * Save an assembly. Editing a starter forks it first and applies the edit to
   * the copy — so the returned id differs from the input id when that happened,
   * and callers must use what comes back.
   */
  update: protectedProcedure
    .input(updateSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, materials, modifierIds, ...rest } = input;

      const target = await db.getAssemblyById(id, ctx.user.id);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Assembly not found." });

      const isBaseline = target.userId === null;
      const editableId = isBaseline ? await db.forkAssembly(id, ctx.user.id) : id;

      const patch: Record<string, unknown> = {};
      if (rest.name !== undefined) patch.name = rest.name;
      if (rest.category !== undefined) patch.category = rest.category;
      if (rest.trade !== undefined) patch.trade = rest.trade;
      if (rest.projectType !== undefined) patch.projectType = rest.projectType;
      if (rest.laborRateId !== undefined) patch.laborRateId = rest.laborRateId;
      if (rest.baseLaborHours !== undefined) patch.baseLaborHours = toDecimal(rest.baseLaborHours);

      if (Object.keys(patch).length > 0) {
        await db.updateAssembly(editableId, ctx.user.id, patch);
      }

      // Children are replaced only when the caller sent them. Omitting the key
      // means "leave the recipe alone"; sending [] means "empty the recipe".
      if (materials !== undefined) {
        await db.setAssemblyMaterials(
          editableId,
          materials.map(line => ({ materialId: line.materialId, qty: toDecimal(line.qty) }))
        );
      }
      if (modifierIds !== undefined) {
        await db.setAssemblyModifiers(editableId, modifierIds);
      }

      const detail = await db.getAssemblyDetail(editableId, ctx.user.id);
      return { assembly: detail, forked: isBaseline };
    }),

  /** Take a private copy of a starter assembly without changing anything yet. */
  fork: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const target = await db.getAssemblyById(input.id, ctx.user.id);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Assembly not found." });
      if (target.userId !== null) return db.getAssemblyDetail(input.id, ctx.user.id);

      const forkId = await db.forkAssembly(input.id, ctx.user.id);
      return db.getAssemblyDetail(forkId, ctx.user.id);
    }),

  /**
   * Copy an assembly into a new, fully independent one.
   *
   * Distinct from `fork`, and the difference is the whole point: a fork
   * REPLACES its starter in the library and remembers where it came from, so it
   * can be reverted. A duplicate stands alongside the original with no link
   * back — editing it can never reach the thing it was copied from.
   */
  duplicate: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), name: nameSchema }))
    .mutation(async ({ input, ctx }) => {
      const existing = await db.getLibraryAssemblies(ctx.user.id);
      const clash = existing.find(a => a.name.toLowerCase() === input.name.toLowerCase());
      if (clash) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `An assembly named "${clash.name}" already exists. Pick a different name.`,
        });
      }

      const id = await db.duplicateAssembly(input.id, ctx.user.id, input.name);
      return db.getAssemblyDetail(id, ctx.user.id);
    }),

  /** Discard edits and restore the starter recipe — header and lines together. */
  revert: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const target = await db.getAssemblyById(input.id, ctx.user.id);
      if (!target || target.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assembly not found." });
      }
      if (target.baselineId == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This assembly was built from scratch, so there is no original to restore.",
        });
      }

      await db.revertAssemblyToBaseline(input.id, ctx.user.id);
      return db.getAssemblyDetail(input.id, ctx.user.id);
    }),

  /** Hide an assembly. Soft-delete — projects may already reference it. */
  remove: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const target = await db.getAssemblyById(input.id, ctx.user.id);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Assembly not found." });
      if (target.userId === null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Starter assemblies cannot be removed.",
        });
      }

      await db.deactivateAssembly(input.id, ctx.user.id);
      return { success: true };
    }),

  /**
   * Price a saved assembly from stored data — the figure a project snapshots.
   *
   * The builder screen computes its own live preview client-side from the same
   * shared functions, so typing stays instant. This endpoint is the
   * authoritative version: it reads what is actually saved, so a snapshot can
   * never capture an unsaved draft.
   */
  price: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      quantity: z.number().min(0).max(100000).default(1),
      overhead: z.object({
        enabled: z.boolean(),
        mode: z.enum(["percentage", "flat"]).default("percentage"),
        value: z.number().min(0).default(0),
      }).optional(),
      profit: z.object({
        method: z.enum(["markup", "margin"]),
        value: z.number().min(0).max(0.99),
      }).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const detail = await db.getAssemblyDetail(input.id, ctx.user.id);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Assembly not found." });

      const [allModifiers, laborRates] = await Promise.all([
        db.getLibraryModifiers(ctx.user.id, "active"),
        db.getLibraryLaborRates(ctx.user.id),
      ]);

      const applied = allModifiers
        .filter(m => detail.modifierIds.includes(m.id))
        .map(m => ({ name: m.name, laborAdjustmentPct: Number(m.laborAdjustmentPct) }));

      // Follows a fork: editing a starter role gives it a new id, and the
      // assembly is still pointing at the old one. See shared/laborRateLookup.
      const role = resolveLaborRate(laborRates, detail.laborRateId);
      const laborRate = hourlyCostOf(role);

      const line = calculateLineItem({
        materials: detail.materials.map(m => ({
          costPerUnit: Number(m.costPerUnit),
          qty: Number(m.qty),
        })),
        baseLaborHours: Number(detail.baseLaborHours),
        modifiers: applied,
        laborRate,
        quantity: input.quantity,
      });

      // Profit is never assumed. With no setting supplied this returns direct
      // cost only, rather than silently inventing a markup.
      const bid = input.profit
        ? calculateBidPrice({
            directCost: line.directCost,
            overhead: input.overhead?.enabled
              ? { enabled: true, mode: input.overhead.mode, value: input.overhead.value }
              : { enabled: false },
            profit: input.profit,
          })
        : null;

      return {
        line,
        bid,
        laborRate,
        laborRateMissing: detail.laborRateId == null || !role,
        appliedModifiers: applied,
      };
    }),
});
