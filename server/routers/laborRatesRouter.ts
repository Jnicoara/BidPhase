/**
 * Labor rates API (Foundation).
 *
 * Same fork-on-edit model as materialsRouter: callers edit by id and the server
 * decides whether that means editing the user's own row or forking a starter.
 *
 * The one thing specific to this router is the salary shape. A salaried role
 * stores its raw inputs — annual salary and the working hours those cover — and
 * the effective hourly rate is COMPUTED on the way out by shared/pricing.ts.
 * It is never persisted, so it can never disagree with the inputs it came from.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { LABOR_RATE_TYPES, type LaborRate } from "../../drizzle/schema";
import {
  DEFAULT_ANNUAL_HOURS,
  effectiveHourlyRate,
} from "../../shared/pricing";
import { TRADE_ALL } from "../../shared/trades";
import * as db from "../db";

/** decimal(10,4) on hourlyCost — must stay under 10 total digits. */
const MAX_HOURLY = 999999.9999;
/** decimal(12,2) on annualSalary. */
const MAX_SALARY = 9999999999.99;
/** A year has 8,766 hours; anything at or beyond that is a typo, not a schedule. */
const MAX_ANNUAL_HOURS = 8760;

const nameSchema = z.string().trim().min(1).max(255);
const hourlySchema = z.number().min(0).max(MAX_HOURLY);
const salarySchema = z.number().min(0).max(MAX_SALARY);
const annualHoursSchema = z.number().gt(0).max(MAX_ANNUAL_HOURS);

const toDecimal4 = (value: number) => value.toFixed(4);
const toDecimal2 = (value: number) => value.toFixed(2);

/**
 * The shape every procedure returns: the stored row plus the derived rate the
 * UI actually prices with. Computing it here means no caller can forget to.
 */
export type LaborRateView = LaborRate & {
  /** What this role costs per hour, whichever way it is paid. */
  effectiveHourlyRate: number;
  /**
   * Set when a salary row cannot produce a rate — hours missing or zero.
   * The row is still returned so the user can see and fix it, rather than
   * having it silently vanish from the list.
   */
  rateError?: string;
};

function toView(row: LaborRate): LaborRateView {
  if (row.rateType === "hourly") {
    return { ...row, effectiveHourlyRate: Number(row.hourlyCost) };
  }

  const salary = Number(row.annualSalary ?? 0);
  const hours = Number(row.annualHours ?? 0);
  try {
    return { ...row, effectiveHourlyRate: effectiveHourlyRate(salary, hours) };
  } catch (error) {
    return {
      ...row,
      effectiveHourlyRate: 0,
      rateError:
        error instanceof Error
          ? error.message
          : "Cannot compute an hourly rate.",
    };
  }
}

/**
 * Force the fields that do not belong to the chosen rate type into a known
 * state, so switching hourly↔salary never leaves a stale number behind that
 * would reappear if the user switched back and forth.
 */
function normalizeForRateType(input: {
  rateType: (typeof LABOR_RATE_TYPES)[number];
  hourlyCost?: number;
  annualSalary?: number;
  annualHours?: number;
}) {
  if (input.rateType === "hourly") {
    return {
      rateType: "hourly" as const,
      hourlyCost: toDecimal4(input.hourlyCost ?? 0),
      annualSalary: null,
      annualHours: null,
    };
  }
  return {
    rateType: "salary" as const,
    hourlyCost: "0.0000",
    annualSalary: toDecimal2(input.annualSalary ?? 0),
    annualHours: toDecimal2(input.annualHours ?? DEFAULT_ANNUAL_HOURS),
  };
}

/**
 * Which trade a role belongs to, or `all` for one that serves every trade.
 *
 * Defaults to `all` rather than `electrical`, matching the column — see the
 * schema comment on `labor_rates.trade`. A shop's foreman does not stop being
 * the foreman when a second trade unlocks.
 */
const tradeSchema = z.string().trim().toLowerCase().min(1).max(64);

const rateBodySchema = z.object({
  rateType: z.enum(LABOR_RATE_TYPES),
  hourlyCost: hourlySchema.optional(),
  annualSalary: salarySchema.optional(),
  annualHours: annualHoursSchema.optional(),
  trade: tradeSchema.optional(),
});

export const laborRatesRouter = router({
  /** Starter roles plus the user's own, with forked starters collapsed away. */
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db.getLibraryLaborRates(ctx.user.id);
    return rows.map(toView);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const row = await db.getLaborRateById(input.id, ctx.user.id);
      if (!row)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Labor rate not found.",
        });
      return toView(row);
    }),

  create: protectedProcedure
    .input(rateBodySchema.extend({ name: nameSchema }))
    .mutation(async ({ input, ctx }) => {
      const existing = await db.getLibraryLaborRates(ctx.user.id);
      const clash = existing.find(
        r => r.name.toLowerCase() === input.name.toLowerCase()
      );
      if (clash) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A role named "${clash.name}" already exists. Edit that one instead of adding a duplicate.`,
        });
      }

      const id = await db.createLaborRate({
        userId: ctx.user.id,
        name: input.name,
        // Omitted means `all` — the column default. Nothing sends this today.
        trade: input.trade ?? TRADE_ALL,
        ...normalizeForRateType(input),
      });
      const created = await db.getLaborRateById(id, ctx.user.id);
      return created ? toView(created) : null;
    }),

  /**
   * Edit a role. Editing a starter forks it and applies the edit to the copy,
   * leaving the shipped row untouched. The returned row's id differs from the
   * input id when that happened, so callers should use what comes back.
   */
  update: protectedProcedure
    .input(
      rateBodySchema.partial().extend({
        id: z.number().int().positive(),
        name: nameSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;

      const target = await db.getLaborRateById(id, ctx.user.id);
      if (!target)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Labor rate not found.",
        });

      const isBaseline = target.userId === null;
      const editableId = isBaseline
        ? await db.forkLaborRate(id, ctx.user.id)
        : id;

      // Rate fields are normalised as a set, against the type the row will END
      // UP with — a partial edit that only moves the salary must not be scored
      // against a stale rateType.
      const nextType = rest.rateType ?? target.rateType;
      const patch: Record<string, unknown> = {};
      if (rest.name !== undefined) patch.name = rest.name;
      if (rest.trade !== undefined) patch.trade = rest.trade;

      const touchesRate =
        rest.rateType !== undefined ||
        rest.hourlyCost !== undefined ||
        rest.annualSalary !== undefined ||
        rest.annualHours !== undefined;

      if (touchesRate) {
        Object.assign(
          patch,
          normalizeForRateType({
            rateType: nextType,
            hourlyCost: rest.hourlyCost ?? Number(target.hourlyCost),
            annualSalary:
              rest.annualSalary ??
              (target.annualSalary != null
                ? Number(target.annualSalary)
                : undefined),
            annualHours:
              rest.annualHours ??
              (target.annualHours != null
                ? Number(target.annualHours)
                : undefined),
          })
        );
      }

      await db.updateLaborRate(editableId, ctx.user.id, patch);

      const saved = await db.getLaborRateById(editableId, ctx.user.id);
      return { laborRate: saved ? toView(saved) : null, forked: isBaseline };
    }),

  /** Take a private copy of a starter without changing anything yet. */
  fork: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const target = await db.getLaborRateById(input.id, ctx.user.id);
      if (!target)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Labor rate not found.",
        });
      if (target.userId !== null) return toView(target);

      const forkId = await db.forkLaborRate(input.id, ctx.user.id);
      const forked = await db.getLaborRateById(forkId, ctx.user.id);
      return forked ? toView(forked) : null;
    }),

  /** Discard edits to a forked role and restore the shipped values. */
  revert: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const target = await db.getLaborRateById(input.id, ctx.user.id);
      if (!target || target.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Labor rate not found.",
        });
      }
      if (target.baselineId == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This role was created from scratch, so there is no original to restore.",
        });
      }

      await db.revertLaborRateToBaseline(input.id, ctx.user.id);
      const reverted = await db.getLaborRateById(input.id, ctx.user.id);
      return reverted ? toView(reverted) : null;
    }),

  /** Hide a role. Soft-delete — assemblies may already price against it. */
  remove: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const target = await db.getLaborRateById(input.id, ctx.user.id);
      if (!target)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Labor rate not found.",
        });
      if (target.userId === null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Starter roles cannot be removed.",
        });
      }

      await db.deactivateLaborRate(input.id, ctx.user.id);
      return { success: true };
    }),
});
