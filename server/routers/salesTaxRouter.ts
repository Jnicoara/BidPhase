/**
 * Sales tax areas and the company rules that govern them.
 *
 * ── This router stores what the user tells it, and nothing else ──────────────
 * There is no rate lookup service behind this, no seeded table, and no
 * inference. Every rate here was typed in by a contractor who checked it. See
 * the header of shared/salesTax.ts for why that is a design constraint rather
 * than an unfinished feature.
 *
 * The one thing it does enforce is that a rate is a plausible NUMBER —
 * non-negative and under 100% — because a typo of 725 for 7.25 would otherwise
 * quietly multiply a bid by eight.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TAX_APPLY_TO } from "../../drizzle/schema";
import { combinedRatePct } from "../../shared/salesTax";
import * as db from "../db";

const nameSchema = z.string().trim().min(1).max(255);
const keySchema = (max: number) =>
  z.string().trim().max(max).nullable().optional();

/**
 * One line of a stacked rate.
 *
 * Bounded at 100 because no single component is ever that high, and the bound
 * is what turns "7.25 typed as 725" into a refusal rather than into a bid eight
 * times too expensive. Four decimals because some districts really do quote
 * rates like 0.0025.
 */
const componentSchema = z.object({
  label: z.string().trim().min(1).max(120),
  ratePct: z.number().min(0).max(100),
});

/**
 * The whole stack, bounded again.
 *
 * A combined rate over 25% is not a real US sales tax; it is a data entry
 * mistake, and catching it here is cheaper than finding it on a submitted bid.
 */
const componentsSchema = z
  .array(componentSchema)
  .min(1)
  .max(12)
  .refine(parts => combinedRatePct(parts) <= 25, {
    message:
      "That adds up to over 25%. Check the parts — a rate is usually entered as 7.25, not 725.",
  });

async function requireJurisdiction(id: number, userId: number) {
  const row = await db.getTaxJurisdictionById(id, userId);
  if (!row)
    throw new TRPCError({ code: "NOT_FOUND", message: "Tax area not found." });
  return row;
}

export const salesTaxRouter = router({
  /** Live tax areas, each with its combined rate worked out. */
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db.getTaxJurisdictions(ctx.user.id);
    return rows.map(row => ({
      ...row,
      components: row.components ?? [],
      combinedRatePct: combinedRatePct(row.components ?? []),
    }));
  }),

  archived: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db.getArchivedTaxJurisdictions(ctx.user.id);
    return rows.map(row => ({
      ...row,
      components: row.components ?? [],
      combinedRatePct: combinedRatePct(row.components ?? []),
    }));
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: nameSchema,
        state: keySchema(64),
        county: keySchema(128),
        city: keySchema(128),
        components: componentsSchema,
        sourceNote: z.string().trim().max(512).nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // A row with no matching keys would match nothing (matchJurisdiction
      // refuses it), so it is a row that can only ever be selected by hand.
      // Refusing it here says so at the moment it is created rather than
      // leaving the user wondering why their rate never applies.
      if (!input.state && !input.county && !input.city) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Give the area at least a state, county or city, or a job address will never match it.",
        });
      }

      const id = await db.createTaxJurisdiction({
        userId: ctx.user.id,
        name: input.name,
        state: input.state || null,
        county: input.county || null,
        city: input.city || null,
        components: input.components,
        sourceNote: input.sourceNote || null,
      });
      return db.getTaxJurisdictionById(id, ctx.user.id);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: nameSchema.optional(),
        state: keySchema(64),
        county: keySchema(128),
        city: keySchema(128),
        components: componentsSchema.optional(),
        sourceNote: z.string().trim().max(512).nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const existing = await requireJurisdiction(id, ctx.user.id);

      const patch: Record<string, unknown> = {};
      if (rest.name !== undefined) patch.name = rest.name;
      if (rest.components !== undefined) patch.components = rest.components;
      for (const field of ["state", "county", "city", "sourceNote"] as const) {
        if (rest[field] !== undefined) patch[field] = rest[field] || null;
      }

      const nextState = "state" in patch ? patch.state : existing.state;
      const nextCounty = "county" in patch ? patch.county : existing.county;
      const nextCity = "city" in patch ? patch.city : existing.city;
      if (!nextState && !nextCounty && !nextCity) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Give the area at least a state, county or city, or a job address will never match it.",
        });
      }

      /**
       * Editing the RATE clears the verified date.
       *
       * The date means "somebody checked this number". A changed number has not
       * been checked, and carrying the old tick over would be the staleness
       * problem materials pricing already solved: a figure that looks confirmed
       * because something adjacent to it was confirmed once.
       */
      if (rest.components !== undefined) patch.verifiedAt = null;

      if (Object.keys(patch).length > 0)
        await db.updateTaxJurisdiction(id, ctx.user.id, patch);
      return db.getTaxJurisdictionById(id, ctx.user.id);
    }),

  /** "I have checked this rate is still current, today." */
  markVerified: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await requireJurisdiction(input.id, ctx.user.id);
      await db.updateTaxJurisdiction(input.id, ctx.user.id, {
        verifiedAt: new Date(),
      });
      return db.getTaxJurisdictionById(input.id, ctx.user.id);
    }),

  /**
   * Archive rather than delete, as everywhere else — and here for a sharper
   * reason than usual: a deleted area nulls `taxJurisdictionId` on every bid
   * pinned to it, which changes what those bids charge. Archiving leaves the
   * pin intact and the rate resolvable.
   */
  archive: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const row = await requireJurisdiction(input.id, ctx.user.id);
      if (row.archivedAt)
        return { success: true, alreadyArchived: true as const };
      await db.archiveTaxJurisdiction(input.id, ctx.user.id);
      return { success: true, alreadyArchived: false as const };
    }),

  restore: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const row = await requireJurisdiction(input.id, ctx.user.id);
      if (!row.archivedAt) return { success: true, alreadyLive: true as const };
      await db.restoreTaxJurisdiction(input.id, ctx.user.id);
      return { success: true, alreadyLive: false as const };
    }),

  // ── Company rules ──────────────────────────────────────────────────────────

  /** What is taxable, company-wide. Lives on pricing_defaults. */
  rules: protectedProcedure.query(async ({ ctx }) => {
    const defaults = await db.getPricingDefaults(ctx.user.id);
    return {
      enabled: defaults?.salesTaxEnabled ?? false,
      taxMaterials: defaults?.taxMaterials ?? false,
      taxLabor: defaults?.taxLabor ?? false,
      applyTo: defaults?.taxApplyTo ?? ("price" as const),
    };
  }),

  setRules: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean().optional(),
        taxMaterials: z.boolean().optional(),
        taxLabor: z.boolean().optional(),
        applyTo: z.enum(TAX_APPLY_TO).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const patch: Record<string, unknown> = {};
      if (input.enabled !== undefined) patch.salesTaxEnabled = input.enabled;
      if (input.taxMaterials !== undefined)
        patch.taxMaterials = input.taxMaterials;
      if (input.taxLabor !== undefined) patch.taxLabor = input.taxLabor;
      if (input.applyTo !== undefined) patch.taxApplyTo = input.applyTo;

      if (Object.keys(patch).length > 0) {
        await db.updatePricingDefaults(ctx.user.id, patch);
      }
      const defaults = await db.getPricingDefaults(ctx.user.id);
      return {
        enabled: defaults?.salesTaxEnabled ?? false,
        taxMaterials: defaults?.taxMaterials ?? false,
        taxLabor: defaults?.taxLabor ?? false,
        applyTo: defaults?.taxApplyTo ?? ("price" as const),
      };
    }),
});
