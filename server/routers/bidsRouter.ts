/**
 * Bids API (Foundation).
 *
 * A bid is a set of line items, each one an assembly frozen at the moment it
 * was added, plus the pricing settings that turn their sum into a price.
 *
 * ── All math is delegated ────────────────────────────────────────────────────
 * The rollup calls calculateLineItem / sumDirectCost / calculateBidPrice from
 * shared/pricing.ts, and the company-vs-bid settings question is answered by
 * resolveBidPricingSettings in the same module. Nothing here re-implements a
 * percentage. That matters most for the snapshot: a line prices from its frozen
 * inputs through the same engine as everything else, so "what this bid says"
 * and "what the engine computes" can never diverge.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { BID_STATUSES, type BidLineItem } from "../../drizzle/schema";
import {
  calculateBidPrice,
  calculateLineItem,
  resolveBidPricingSettings,
  sumDirectCost,
  type CompanyPricingDefaults,
} from "../../shared/pricing";
import {
  daysRemaining,
  purgeDueAt,
  retentionUrgency,
} from "../../shared/retention";
import * as db from "../db";

const nameSchema = z.string().trim().min(1).max(255);
const qtySchema = z.number().min(0).max(999999);
const labelSchema = z.string().trim().min(1).max(128);

const overheadModeSchema = z.enum(["percentage", "flat"]);
const profitMethodSchema = z.enum(["markup", "margin"]);

/**
 * The productivity factor, as a signed fraction. −0.5 = crew beats book hours
 * by half; 1.0 = takes twice as long.
 *
 * Bounded well inside what the column holds, and floored above −1: at exactly
 * −100% every job takes no time and prices at no labor, which is never what
 * anyone means and would be a very quiet way to send a bid out wrong.
 */
const productivitySchema = z.number().min(-0.9).max(2);

const toDecimal4 = (value: number) => value.toFixed(4);

/** Assert the bid belongs to the caller before anything touches its children. */
async function requireBid(id: number, userId: number) {
  const bid = await db.getBidById(id, userId);
  if (!bid)
    throw new TRPCError({ code: "NOT_FOUND", message: "Bid not found." });
  return bid;
}

/**
 * Resolve a user's company defaults into the shape the pricing engine wants.
 * Shared by `get` and `dashboard` so one bid cannot price two ways.
 */
async function companyDefaultsFor(
  userId: number
): Promise<CompanyPricingDefaults> {
  const defaults = await db.getPricingDefaults(userId);
  return {
    overheadEnabled: defaults?.overheadEnabled ?? false,
    overheadMode: defaults?.overheadMode ?? "percentage",
    overheadValue: Number(defaults?.overheadValue ?? 0),
    profitMethod: defaults?.profitMethod ?? "markup",
    profitValue: Number(defaults?.profitValue ?? 0),
    productivityPct: Number(defaults?.productivityPct ?? 0),
  };
}

/** Roll one bid's lines up to a price, at whatever settings apply to it. */
function rollUpBid(
  bid: Awaited<ReturnType<typeof db.getBidById>> & object,
  lines: BidLineItem[],
  company: CompanyPricingDefaults
) {
  const settings = resolveBidPricingSettings(company, {
    overheadEnabled: bid.overheadEnabled,
    overheadMode: bid.overheadMode,
    overheadValue:
      bid.overheadValue === null ? null : Number(bid.overheadValue),
    profitMethod: bid.profitMethod,
    profitValue: bid.profitValue === null ? null : Number(bid.profitValue),
    productivityPct:
      bid.productivityPct === null ? null : Number(bid.productivityPct),
  });

  const breakdowns = lines.map(line =>
    priceLine(line, settings.productivityPct)
  );
  const directCost = sumDirectCost(breakdowns);
  const bidPrice = calculateBidPrice({
    directCost,
    overhead: settings.overhead,
    profit: settings.profit,
  });

  return { settings, breakdowns, directCost, bidPrice };
}

/**
 * Price one snapshot line at its quantity, through the shared engine.
 *
 * ── What is frozen and what is not ───────────────────────────────────────────
 * Everything that describes the WORK is read off the snapshot: material cost,
 * labor hours, the labor rate and the summed modifier percentage, all captured
 * when the line was added. Re-pricing a material or editing an assembly later
 * cannot move an existing bid, which is the whole point of the snapshot.
 *
 * The productivity factor is not one of those. It is a company-level dial
 * passed in at calculation time, so a bid that inherits it does follow a later
 * change — exactly as it follows a later change to overhead or profit, and for
 * the same reason: those three are settings the bid is priced UNDER, not facts
 * about the work it contains. A bid that should stop following gets its own
 * override, and then nothing at company level reaches it.
 */
function priceLine(line: BidLineItem, productivityPct: number) {
  return calculateLineItem({
    // The snapshot is already a single rolled-up material figure for one
    // assembly, so it enters as one material line at qty 1 and the bid
    // quantity scales the whole thing.
    materials: [{ costPerUnit: Number(line.snapshotMaterialCost), qty: 1 }],
    baseLaborHours: Number(line.snapshotLaborHours),
    modifiers: [{ laborAdjustmentPct: Number(line.snapshotModifierPct) }],
    laborRate: Number(line.snapshotLaborRate),
    quantity: Number(line.qty),
    productivityPct,
  });
}

export const bidsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getBidsByUser(ctx.user.id);
  }),

  /**
   * Every bid with enough to place it on the dashboard: its own fields plus a
   * rolled-up value.
   *
   * Prices through the same rollUpBid the detail view uses, so a card and the
   * bid it opens can never disagree. Grouping and ordering are deliberately NOT
   * done here — those are presentation rules, they live in
   * client/src/lib/bidDashboard.ts, and they are tested there.
   */
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const [bids, company] = await Promise.all([
      db.getBidsByUser(ctx.user.id),
      companyDefaultsFor(ctx.user.id),
    ]);

    return Promise.all(
      bids.map(async bid => {
        const lines = await db.getBidLineItems(bid.id);
        const { directCost, bidPrice } = rollUpBid(bid, lines, company);
        return {
          ...bid,
          lineCount: lines.length,
          directCost,
          finalPrice: bidPrice.finalPrice,
        };
      })
    );
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: nameSchema,
        status: z.enum(BID_STATUSES).default("Draft"),
        trades: z
          .array(z.string().trim().min(1).max(64))
          .max(20)
          .default(["electrical"]),
        dueDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .default(null),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = await db.createBid({
        userId: ctx.user.id,
        name: input.name,
        status: input.status,
        trades: input.trades,
        dueDate: input.dueDate,
      });
      return db.getBidById(id, ctx.user.id);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: nameSchema.optional(),
        status: z.enum(BID_STATUSES).optional(),
        trades: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
        /** "YYYY-MM-DD", or null to clear the deadline. */
        dueDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
        // Passing null clears an override and returns the group to the company
        // default; omitting the key leaves it as it is.
        overheadEnabled: z.boolean().nullable().optional(),
        overheadMode: overheadModeSchema.nullable().optional(),
        overheadValue: z.number().min(0).nullable().optional(),
        profitMethod: profitMethodSchema.nullable().optional(),
        profitValue: z.number().min(0).max(0.99).nullable().optional(),
        productivityPct: productivitySchema.nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      await requireBid(id, ctx.user.id);

      const patch: Record<string, unknown> = {};
      if (rest.name !== undefined) patch.name = rest.name;
      if (rest.status !== undefined) patch.status = rest.status;
      if (rest.trades !== undefined) patch.trades = rest.trades;
      if (rest.dueDate !== undefined) patch.dueDate = rest.dueDate;
      if (rest.overheadEnabled !== undefined)
        patch.overheadEnabled = rest.overheadEnabled;
      if (rest.overheadMode !== undefined)
        patch.overheadMode = rest.overheadMode;
      if (rest.overheadValue !== undefined) {
        patch.overheadValue =
          rest.overheadValue === null ? null : toDecimal4(rest.overheadValue);
      }
      if (rest.profitMethod !== undefined)
        patch.profitMethod = rest.profitMethod;
      if (rest.profitValue !== undefined) {
        patch.profitValue =
          rest.profitValue === null ? null : toDecimal4(rest.profitValue);
      }
      if (rest.productivityPct !== undefined) {
        patch.productivityPct =
          rest.productivityPct === null
            ? null
            : toDecimal4(rest.productivityPct);
      }

      if (Object.keys(patch).length > 0)
        await db.updateBid(id, ctx.user.id, patch);
      return db.getBidById(id, ctx.user.id);
    }),

  /**
   * Move a bid off the dashboard without destroying it.
   *
   * Independent of `status` on purpose: a Won job and an abandoned Draft both
   * stop being things you want to look at every morning, and forcing the user
   * to mislabel a bid's outcome just to hide it would corrupt the one field
   * their reporting depends on.
   *
   * Reversible for RETENTION_DAYS, then not. `restore` is the way back.
   */
  archive: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const bid = await requireBid(input.id, ctx.user.id);
      if (bid.archivedAt) {
        // Already counting down. Returning the ORIGINAL date rather than
        // re-archiving is the point: a double-click must not buy another 30
        // days and strand the bid in the archive indefinitely.
        return {
          success: true,
          archivedAt: bid.archivedAt,
          alreadyArchived: true,
        };
      }
      const now = new Date();
      await db.archiveBid(input.id, ctx.user.id, now);
      return { success: true, archivedAt: now, alreadyArchived: false };
    }),

  /** Put an archived bid back on the dashboard, stopping the countdown. */
  restore: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const bid = await requireBid(input.id, ctx.user.id);
      if (!bid.archivedAt) return { success: true, alreadyLive: true };
      await db.restoreBid(input.id, ctx.user.id);
      return { success: true, alreadyLive: false };
    }),

  /**
   * The archive, with each bid's countdown resolved server-side.
   *
   * `daysRemaining` is computed here rather than in the browser because a
   * machine with a wrong clock would otherwise show a wrong deadline for a real
   * deletion — and the deletion itself runs on server time. One clock decides.
   */
  archived: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const [rows, company] = await Promise.all([
      db.getArchivedBids(ctx.user.id),
      companyDefaultsFor(ctx.user.id),
    ]);

    return Promise.all(
      rows.map(async bid => {
        // Priced through the same rollUpBid as the dashboard, so a bid's value
        // reads the same whether it is archived or not — someone deciding what to
        // rescue is looking at exactly the number they saw before archiving it.
        const lines = await db.getBidLineItems(bid.id);
        const { bidPrice } = rollUpBid(bid, lines, company);
        // Non-null by construction: getArchivedBids filters on archivedAt.
        const archivedAt = bid.archivedAt as Date;
        return {
          ...bid,
          archivedAt,
          lineCount: lines.length,
          finalPrice: bidPrice.finalPrice,
          purgeDueAt: purgeDueAt(archivedAt),
          daysRemaining: daysRemaining(archivedAt, now),
          urgency: retentionUrgency(archivedAt, now),
        };
      })
    );
  }),

  /**
   * Destroy a bid now, without waiting out the window.
   *
   * Refuses anything not already archived, mirroring the modifiers pattern:
   * there is no path from the working list straight to destruction. The user
   * archives first, then confirms again from the archive.
   */
  deleteForever: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const bid = await requireBid(input.id, ctx.user.id);
      if (!bid.archivedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Only archived bids can be deleted permanently. Archive it first.",
        });
      }
      await db.deleteBidForever(input.id, ctx.user.id);
      return { success: true };
    }),

  /**
   * A bid, its lines, and the full rolled-up price.
   *
   * Everything the detail screen needs in one call — lines priced individually,
   * grouped by repeating unit, summed to a direct cost, then run through
   * overhead and profit at whichever level supplied them.
   */
  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const bid = await requireBid(input.id, ctx.user.id);
      const [lines, company] = await Promise.all([
        db.getBidLineItems(bid.id),
        companyDefaultsFor(ctx.user.id),
      ]);

      const { settings, breakdowns, directCost, bidPrice } = rollUpBid(
        bid,
        lines,
        company
      );
      const priced = lines.map((line, index) => ({
        line,
        breakdown: breakdowns[index],
      }));

      // Unit subtotals, so a hotel bid can answer "what does one room cost?"
      const unitTotals = new Map<
        string,
        { directCost: number; lines: number }
      >();
      for (const { line, breakdown } of priced) {
        if (!line.unitLabel) continue;
        const current = unitTotals.get(line.unitLabel) ?? {
          directCost: 0,
          lines: 0,
        };
        current.directCost += breakdown.directCost;
        current.lines += 1;
        unitTotals.set(line.unitLabel, current);
      }

      return {
        bid,
        lines: priced.map(({ line, breakdown }) => ({ ...line, breakdown })),
        units: Array.from(unitTotals, ([label, totals]) => ({
          label,
          ...totals,
        })),
        totals: {
          // bidPrice carries its own directCost (identical, rounded through the
          // engine) — spread it first so the authoritative one wins.
          ...bidPrice,
          totalLaborHours: priced.reduce(
            (sum, p) => sum + p.breakdown.totalLaborHours,
            0
          ),
          /**
           * The same hours BEFORE the productivity factor, at quantity.
           *
           * Sent so the breakdown can show the adjustment as its own step
           * rather than as a total that silently differs from the hours on the
           * assemblies. hoursAfterModifiers is per-unit, so it scales by qty
           * here exactly as totalLaborHours does — comparing one to the other
           * is the whole point, and they have to be on the same footing.
           */
          laborHoursBeforeProductivity: priced.reduce(
            (sum, p) =>
              sum + p.breakdown.hoursAfterModifiers * Number(p.line.qty),
            0
          ),
          materialCost: priced.reduce(
            (sum, p) => sum + p.breakdown.materialCost,
            0
          ),
          laborCost: priced.reduce((sum, p) => sum + p.breakdown.laborCost, 0),
        },
        settings,
        company,
      };
    }),

  /** Add an assembly to the bid, freezing its costs as they are right now. */
  addAssembly: protectedProcedure
    .input(
      z.object({
        bidId: z.number().int().positive(),
        assemblyId: z.number().int().positive(),
        qty: qtySchema.default(1),
        unitLabel: labelSchema.nullable().default(null),
        /**
         * Quick-bid sets this so repeat counts of one assembly stack onto a
         * single line, keeping that line's original snapshot. Off by default:
         * the Bids screen wants a new line, freshly snapshotted, every time.
         */
        merge: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      const { id, merged } = await db.addAssemblyToBid(
        input.bidId,
        ctx.user.id,
        input.assemblyId,
        input.qty,
        input.unitLabel,
        { merge: input.merge }
      );
      const line = await db.getBidLineItem(id, input.bidId);
      return { line, merged };
    }),

  /**
   * Add a whole kit to the bid, snapshotting every assembly inside it.
   *
   * The kit does not become a row: it expands into ordinary line items, which
   * is exactly what makes each item's quantity editable afterwards. A bedroom
   * needing a fifth receptacle is then just an edit to that line, with no
   * kit-shaped container in the way. `qty` multiplies through, so 2 x a package
   * containing 4 receptacles lands 8.
   */
  addKit: protectedProcedure
    .input(
      z.object({
        bidId: z.number().int().positive(),
        kitId: z.number().int().positive(),
        qty: qtySchema.default(1),
        unitLabel: labelSchema.nullable().default(null),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      try {
        return await db.addKitToBid(
          input.bidId,
          ctx.user.id,
          input.kitId,
          input.qty,
          input.unitLabel
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "Could not add that kit.",
        });
      }
    }),

  updateLine: protectedProcedure
    .input(
      z.object({
        bidId: z.number().int().positive(),
        id: z.number().int().positive(),
        qty: qtySchema.optional(),
        name: nameSchema.optional(),
        unitLabel: labelSchema.nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);

      const patch: Record<string, unknown> = {};
      if (input.qty !== undefined) patch.qty = toDecimal4(input.qty);
      if (input.name !== undefined) patch.name = input.name;
      if (input.unitLabel !== undefined) patch.unitLabel = input.unitLabel;

      // Snapshot fields are deliberately absent from this input. A line's frozen
      // costs are not editable — re-adding the assembly is how you take a fresh
      // snapshot, and that stays an explicit act.
      if (Object.keys(patch).length > 0) {
        await db.updateBidLineItem(input.id, input.bidId, patch);
      }
      return db.getBidLineItem(input.id, input.bidId);
    }),

  removeLine: protectedProcedure
    .input(
      z.object({
        bidId: z.number().int().positive(),
        id: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      await db.deleteBidLineItem(input.id, input.bidId);
      return { success: true };
    }),

  /** Distinct repeating units on a bid — the pick-list for mass duplicate. */
  units: protectedProcedure
    .input(z.object({ bidId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      return db.getBidUnitLabels(input.bidId);
    }),

  /**
   * Every unit with its link role — template, linked copy, forked copy, or a
   * one-off label. Drives the badge on each unit and which actions it offers.
   */
  unitStates: protectedProcedure
    .input(z.object({ bidId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      return db.getBidUnitStates(input.bidId);
    }),

  /**
   * Generate copies from one or more templates in a single action.
   *
   * Numbering is continuous ACROSS the groups, in the order given — 35 standard
   * rooms then 5 ADA rooms produce Room 101–140, because a hotel numbers rooms
   * by position, not by spec. Restarting per group would mint two Room 101s.
   */
  generateUnits: protectedProcedure
    .input(
      z.object({
        bidId: z.number().int().positive(),
        baseName: labelSchema,
        startNumber: z.number().int().min(0).max(100000).default(101),
        groups: z
          .array(
            z.object({
              sourceUnitLabel: labelSchema,
              // 200 of one type is a big hotel; beyond that it is a mistake.
              count: z.number().int().min(1).max(200),
            })
          )
          .min(1)
          .max(20),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      try {
        return await db.generateBidUnits(
          input.bidId,
          input.groups,
          input.baseName,
          input.startNumber
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Could not generate those units.",
        });
      }
    }),

  /**
   * Push a template's current lines onto every copy still following it.
   *
   * Never called automatically. The client confirms first, because this
   * overwrites whole units and the estimator is the only one who knows whether
   * the edit they just made was meant for one room or forty.
   */
  pushToLinkedCopies: protectedProcedure
    .input(
      z.object({
        bidId: z.number().int().positive(),
        templateLabel: labelSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      try {
        return await db.pushTemplateToLinkedCopies(
          input.bidId,
          input.templateLabel
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Could not update the linked copies.",
        });
      }
    }),

  /** Archive every copy still following a template. Forked copies are left. */
  archiveLinkedCopies: protectedProcedure
    .input(
      z.object({
        bidId: z.number().int().positive(),
        templateLabel: labelSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      return db.archiveLinkedCopies(input.bidId, input.templateLabel);
    }),

  /** Undo a bulk archive — the copies come back still linked. */
  restoreUnits: protectedProcedure
    .input(
      z.object({
        bidId: z.number().int().positive(),
        unitLabels: z.array(labelSchema).min(1).max(200),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      return db.restoreArchivedUnits(input.bidId, input.unitLabels);
    }),

  /** Break a copy's link by hand, without editing it first. */
  forkUnit: protectedProcedure
    .input(
      z.object({
        bidId: z.number().int().positive(),
        unitLabel: labelSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      return { forked: await db.forkBidUnit(input.bidId, input.unitLabel) };
    }),

  /**
   * Generate N numbered copies of a repeating unit.
   *
   * Copies carry the SOURCE's snapshot, not a fresh read of the library, so
   * every generated room prices identically no matter when it was made.
   */
  duplicateUnit: protectedProcedure
    .input(
      z.object({
        bidId: z.number().int().positive(),
        sourceUnitLabel: labelSchema,
        baseName: labelSchema,
        startNumber: z.number().int().min(0).max(100000).default(101),
        // 200 rooms is a big hotel; beyond that this is a mistake, not a bid.
        count: z.number().int().min(1).max(200),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      try {
        return await db.duplicateBidUnit(
          input.bidId,
          input.sourceUnitLabel,
          input.baseName,
          input.startNumber,
          input.count
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Could not duplicate that unit.",
        });
      }
    }),

  /** Company-level pricing defaults — the fallback every bid inherits. */
  pricingDefaults: protectedProcedure.query(async ({ ctx }) => {
    return db.getPricingDefaults(ctx.user.id);
  }),

  setPricingDefaults: protectedProcedure
    .input(
      z.object({
        overheadEnabled: z.boolean().optional(),
        overheadMode: overheadModeSchema.optional(),
        overheadValue: z.number().min(0).optional(),
        profitMethod: profitMethodSchema.optional(),
        profitValue: z.number().min(0).max(0.99).optional(),
        productivityPct: productivitySchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const patch: Record<string, unknown> = {};
      if (input.overheadEnabled !== undefined)
        patch.overheadEnabled = input.overheadEnabled;
      if (input.overheadMode !== undefined)
        patch.overheadMode = input.overheadMode;
      if (input.overheadValue !== undefined)
        patch.overheadValue = toDecimal4(input.overheadValue);
      if (input.profitMethod !== undefined)
        patch.profitMethod = input.profitMethod;
      if (input.profitValue !== undefined)
        patch.profitValue = toDecimal4(input.profitValue);
      if (input.productivityPct !== undefined) {
        patch.productivityPct = toDecimal4(input.productivityPct);
      }

      if (Object.keys(patch).length > 0) {
        await db.updatePricingDefaults(ctx.user.id, patch);
      }
      return db.getPricingDefaults(ctx.user.id);
    }),
});
