/**
 * Bids API (Foundation).
 *
 * A bid is a set of line items, each one an assembly frozen at the moment it
 * was added, plus the pricing settings that turn their sum into a price.
 *
 * ── All math is delegated ────────────────────────────────────────────────────
 * The rollup lives in ../bidPricing, which calls calculateLineItem /
 * sumDirectCost / calculateBidPrice from shared/pricing.ts, and answers the
 * company-vs-bid settings question with resolveBidPricingSettings in the same
 * module. Nothing here re-implements a percentage. That matters most for the
 * snapshot: a line prices from its frozen inputs through the same engine as
 * everything else, so "what this bid says" and "what the engine computes" can
 * never diverge — and the client proposal, which prices through that same
 * module, cannot quote a different number from the bid it was built from.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { BID_STATUSES } from "../../drizzle/schema";
import {
  bidRollup,
  companyDefaultsFor,
  rollUpBid,
  taxRulesFor,
  toTaxJurisdiction,
} from "../bidPricing";
import { explainTaxStatus } from "../../shared/salesTax";
import {
  daysRemaining,
  purgeDueAt,
  retentionUrgency,
} from "../../shared/retention";
import { resolveBidClient } from "../../shared/bidClient";
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
        /**
         * Who this bid is for. Null unassigns, leaving the bid's own
         * `clientName` text as the only source — which is the state every bid
         * written before clients existed is already in, and it prints exactly
         * as it did before.
         */
        clientId: z.number().int().positive().nullable().optional(),
        /**
         * Proposal content. Null clears the field back to "not filled in", so
         * the document goes back to prompting for it rather than printing a
         * blank line where a client's name belongs.
         */
        clientName: z.string().trim().max(255).nullable().optional(),
        siteAddress: z.string().trim().max(512).nullable().optional(),
        proposalNote: z.string().trim().max(4000).nullable().optional(),

        /**
         * Sales tax overrides. Every one of these exists so the automatic
         * answer is never the only answer — see the schema comments on `bids`.
         *
         * `taxRateOverridePct` is nullable-optional with a deliberate
         * distinction: null CLEARS the override and goes back to matching,
         * while 0 is a real zero-rate that gets applied as one.
         */
        taxJurisdictionId: z.number().int().positive().nullable().optional(),
        taxRateOverridePct: z.number().min(0).max(25).nullable().optional(),
        taxExempt: z.boolean().optional(),
        taxExemptReason: z.string().trim().max(255).nullable().optional(),
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
      // Checked rather than trusted: a client id is a small integer, so
      // assigning one must prove it belongs to this user or a bid could be
      // pointed at a stranger's contact record.
      if (rest.clientId !== undefined) {
        if (rest.clientId !== null) {
          const client = await db.getClientById(rest.clientId, ctx.user.id);
          if (!client)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Client not found.",
            });
        }
        patch.clientId = rest.clientId;
      }
      // Emptied by hand is the same as never filled in: both mean the proposal
      // should prompt, not print an empty line.
      if (rest.clientName !== undefined)
        patch.clientName = rest.clientName || null;
      if (rest.siteAddress !== undefined)
        patch.siteAddress = rest.siteAddress || null;
      if (rest.proposalNote !== undefined)
        patch.proposalNote = rest.proposalNote || null;

      // Checked, not trusted — the same rule the client link follows. A tax
      // area id is a small integer, and pointing a bid at someone else's rate
      // would charge a customer a number from another contractor's settings.
      if (rest.taxJurisdictionId !== undefined) {
        if (rest.taxJurisdictionId !== null) {
          const area = await db.getTaxJurisdictionById(
            rest.taxJurisdictionId,
            ctx.user.id
          );
          if (!area)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Tax area not found.",
            });
        }
        patch.taxJurisdictionId = rest.taxJurisdictionId;
      }
      if (rest.taxRateOverridePct !== undefined) {
        // null clears the override; 0 is a real zero-rate and is kept.
        patch.taxRateOverridePct =
          rest.taxRateOverridePct === null
            ? null
            : toDecimal4(rest.taxRateOverridePct);
      }
      if (rest.taxExempt !== undefined) patch.taxExempt = rest.taxExempt;
      if (rest.taxExemptReason !== undefined)
        patch.taxExemptReason = rest.taxExemptReason || null;

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
      const [lines, company, client, taxRules, jurisdictionRows, expenseRows] =
        await Promise.all([
          db.getBidLineItems(bid.id),
          companyDefaultsFor(ctx.user.id),
          // Null for the great majority of bids, which have no client assigned.
          bid.clientId
            ? db.getClientById(bid.clientId, ctx.user.id)
            : Promise.resolve(undefined),
          taxRulesFor(ctx.user.id),
          db.getTaxJurisdictions(ctx.user.id),
          db.getBidExpenses(bid.id),
        ]);

      const expenses = expenseRows.map(row => ({
        name: row.name,
        amount: Number(row.amount),
        taxable: row.taxable,
        markedUp: row.markedUp,
      }));

      const { settings, priced, units, totals, salesTax, taxRate } = bidRollup(
        bid,
        lines,
        company,
        {
          rules: taxRules,
          jurisdictions: jurisdictionRows.map(toTaxJurisdiction),
        },
        expenses
      );

      return {
        bid,
        lines: priced.map(({ line, breakdown }) => ({ ...line, breakdown })),
        units,
        totals,
        settings,
        company,
        /** The linked client record, or null. */
        client: client ?? null,
        /**
         * The tax figure, and where its rate came from.
         *
         * `salesTax.status` carries WHY when there is no amount — disabled,
         * exempt, nothing marked taxable, or no rate found. The screen shows
         * that sentence rather than an unexplained $0, because a silent zero
         * and a genuine exemption look identical and cost very differently.
         */
        salesTax,
        taxRate,
        /** Plain-language reason there is no tax, or null when there is. */
        taxNote: explainTaxStatus(salesTax.status, bid.siteAddress),
        /**
         * Name and site address after the bid's own text and the linked record
         * have been reconciled — the same resolution the proposal prints, so
         * the screen and the document cannot show different names.
         */
        resolvedClient: resolveBidClient(bid, client),
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
