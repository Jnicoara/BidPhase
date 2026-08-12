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
import * as db from "../db";

const nameSchema = z.string().trim().min(1).max(255);
const qtySchema = z.number().min(0).max(999999);
const labelSchema = z.string().trim().min(1).max(128);

const overheadModeSchema = z.enum(["percentage", "flat"]);
const profitMethodSchema = z.enum(["markup", "margin"]);

const toDecimal4 = (value: number) => value.toFixed(4);

/** Assert the bid belongs to the caller before anything touches its children. */
async function requireBid(id: number, userId: number) {
  const bid = await db.getBidById(id, userId);
  if (!bid) throw new TRPCError({ code: "NOT_FOUND", message: "Bid not found." });
  return bid;
}

/**
 * Resolve a user's company defaults into the shape the pricing engine wants.
 * Shared by `get` and `dashboard` so one bid cannot price two ways.
 */
async function companyDefaultsFor(userId: number): Promise<CompanyPricingDefaults> {
  const defaults = await db.getPricingDefaults(userId);
  return {
    overheadEnabled: defaults?.overheadEnabled ?? false,
    overheadMode: defaults?.overheadMode ?? "percentage",
    overheadValue: Number(defaults?.overheadValue ?? 0),
    profitMethod: defaults?.profitMethod ?? "markup",
    profitValue: Number(defaults?.profitValue ?? 0),
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
    overheadValue: bid.overheadValue === null ? null : Number(bid.overheadValue),
    profitMethod: bid.profitMethod,
    profitValue: bid.profitValue === null ? null : Number(bid.profitValue),
  });

  const breakdowns = lines.map(priceLine);
  const directCost = sumDirectCost(breakdowns);
  const bidPrice = calculateBidPrice({
    directCost,
    overhead: settings.overhead,
    profit: settings.profit,
  });

  return { settings, breakdowns, directCost, bidPrice };
}

/** Price one snapshot line at its quantity, through the shared engine. */
function priceLine(line: BidLineItem) {
  return calculateLineItem({
    // The snapshot is already a single rolled-up material figure for one
    // assembly, so it enters as one material line at qty 1 and the bid
    // quantity scales the whole thing.
    materials: [{ costPerUnit: Number(line.snapshotMaterialCost), qty: 1 }],
    baseLaborHours: Number(line.snapshotLaborHours),
    modifiers: [{ laborAdjustmentPct: Number(line.snapshotModifierPct) }],
    laborRate: Number(line.snapshotLaborRate),
    quantity: Number(line.qty),
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

    return Promise.all(bids.map(async bid => {
      const lines = await db.getBidLineItems(bid.id);
      const { directCost, bidPrice } = rollUpBid(bid, lines, company);
      return {
        ...bid,
        lineCount: lines.length,
        directCost,
        finalPrice: bidPrice.finalPrice,
      };
    }));
  }),

  create: protectedProcedure
    .input(z.object({
      name: nameSchema,
      status: z.enum(BID_STATUSES).default("Draft"),
      trades: z.array(z.string().trim().min(1).max(64)).max(20).default(["electrical"]),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
    }))
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
    .input(z.object({
      id: z.number().int().positive(),
      name: nameSchema.optional(),
      status: z.enum(BID_STATUSES).optional(),
      trades: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
      /** "YYYY-MM-DD", or null to clear the deadline. */
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      // Passing null clears an override and returns the group to the company
      // default; omitting the key leaves it as it is.
      overheadEnabled: z.boolean().nullable().optional(),
      overheadMode: overheadModeSchema.nullable().optional(),
      overheadValue: z.number().min(0).nullable().optional(),
      profitMethod: profitMethodSchema.nullable().optional(),
      profitValue: z.number().min(0).max(0.99).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      await requireBid(id, ctx.user.id);

      const patch: Record<string, unknown> = {};
      if (rest.name !== undefined) patch.name = rest.name;
      if (rest.status !== undefined) patch.status = rest.status;
      if (rest.trades !== undefined) patch.trades = rest.trades;
      if (rest.dueDate !== undefined) patch.dueDate = rest.dueDate;
      if (rest.overheadEnabled !== undefined) patch.overheadEnabled = rest.overheadEnabled;
      if (rest.overheadMode !== undefined) patch.overheadMode = rest.overheadMode;
      if (rest.overheadValue !== undefined) {
        patch.overheadValue = rest.overheadValue === null ? null : toDecimal4(rest.overheadValue);
      }
      if (rest.profitMethod !== undefined) patch.profitMethod = rest.profitMethod;
      if (rest.profitValue !== undefined) {
        patch.profitValue = rest.profitValue === null ? null : toDecimal4(rest.profitValue);
      }

      if (Object.keys(patch).length > 0) await db.updateBid(id, ctx.user.id, patch);
      return db.getBidById(id, ctx.user.id);
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.id, ctx.user.id);
      await db.archiveBid(input.id, ctx.user.id);
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

      const { settings, breakdowns, directCost, bidPrice } = rollUpBid(bid, lines, company);
      const priced = lines.map((line, index) => ({ line, breakdown: breakdowns[index] }));

      // Unit subtotals, so a hotel bid can answer "what does one room cost?"
      const unitTotals = new Map<string, { directCost: number; lines: number }>();
      for (const { line, breakdown } of priced) {
        if (!line.unitLabel) continue;
        const current = unitTotals.get(line.unitLabel) ?? { directCost: 0, lines: 0 };
        current.directCost += breakdown.directCost;
        current.lines += 1;
        unitTotals.set(line.unitLabel, current);
      }

      return {
        bid,
        lines: priced.map(({ line, breakdown }) => ({ ...line, breakdown })),
        units: Array.from(unitTotals, ([label, totals]) => ({ label, ...totals })),
        totals: {
          // bidPrice carries its own directCost (identical, rounded through the
          // engine) — spread it first so the authoritative one wins.
          ...bidPrice,
          totalLaborHours: priced.reduce((sum, p) => sum + p.breakdown.totalLaborHours, 0),
          materialCost: priced.reduce((sum, p) => sum + p.breakdown.materialCost, 0),
          laborCost: priced.reduce((sum, p) => sum + p.breakdown.laborCost, 0),
        },
        settings,
        company,
      };
    }),

  /** Add an assembly to the bid, freezing its costs as they are right now. */
  addAssembly: protectedProcedure
    .input(z.object({
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
    }))
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      const { id, merged } = await db.addAssemblyToBid(
        input.bidId, ctx.user.id, input.assemblyId, input.qty, input.unitLabel,
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
    .input(z.object({
      bidId: z.number().int().positive(),
      kitId: z.number().int().positive(),
      qty: qtySchema.default(1),
      unitLabel: labelSchema.nullable().default(null),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      try {
        return await db.addKitToBid(
          input.bidId, ctx.user.id, input.kitId, input.qty, input.unitLabel
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Could not add that kit.",
        });
      }
    }),

  updateLine: protectedProcedure
    .input(z.object({
      bidId: z.number().int().positive(),
      id: z.number().int().positive(),
      qty: qtySchema.optional(),
      name: nameSchema.optional(),
      unitLabel: labelSchema.nullable().optional(),
    }))
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
    .input(z.object({ bidId: z.number().int().positive(), id: z.number().int().positive() }))
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
   * Generate N numbered copies of a repeating unit.
   *
   * Copies carry the SOURCE's snapshot, not a fresh read of the library, so
   * every generated room prices identically no matter when it was made.
   */
  duplicateUnit: protectedProcedure
    .input(z.object({
      bidId: z.number().int().positive(),
      sourceUnitLabel: labelSchema,
      baseName: labelSchema,
      startNumber: z.number().int().min(0).max(100000).default(101),
      // 200 rooms is a big hotel; beyond that this is a mistake, not a bid.
      count: z.number().int().min(1).max(200),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      try {
        return await db.duplicateBidUnit(
          input.bidId, input.sourceUnitLabel, input.baseName, input.startNumber, input.count
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Could not duplicate that unit.",
        });
      }
    }),

  /** Company-level pricing defaults — the fallback every bid inherits. */
  pricingDefaults: protectedProcedure.query(async ({ ctx }) => {
    return db.getPricingDefaults(ctx.user.id);
  }),

  setPricingDefaults: protectedProcedure
    .input(z.object({
      overheadEnabled: z.boolean().optional(),
      overheadMode: overheadModeSchema.optional(),
      overheadValue: z.number().min(0).optional(),
      profitMethod: profitMethodSchema.optional(),
      profitValue: z.number().min(0).max(0.99).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const patch: Record<string, unknown> = {};
      if (input.overheadEnabled !== undefined) patch.overheadEnabled = input.overheadEnabled;
      if (input.overheadMode !== undefined) patch.overheadMode = input.overheadMode;
      if (input.overheadValue !== undefined) patch.overheadValue = toDecimal4(input.overheadValue);
      if (input.profitMethod !== undefined) patch.profitMethod = input.profitMethod;
      if (input.profitValue !== undefined) patch.profitValue = toDecimal4(input.profitValue);

      if (Object.keys(patch).length > 0) {
        await db.updatePricingDefaults(ctx.user.id, patch);
      }
      return db.getPricingDefaults(ctx.user.id);
    }),
});
