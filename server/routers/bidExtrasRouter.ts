/**
 * Additional expenses and includes/excludes — the reusable lists, and what is
 * attached to a bid.
 *
 * ── One router, two things, because they are the same thing twice ────────────
 * Both are "a short reusable entry the contractor keeps, snapshotted onto a
 * bid, printable on the proposal". Splitting them would produce two files that
 * differ only in a noun, and the pattern is worth seeing in one place.
 *
 * ── Adding to a bid always snapshots ─────────────────────────────────────────
 * Every `addToBid` copies the name/text and the amount onto the bid and keeps
 * the library id as provenance only. Editing a library entry afterwards moves
 * nothing that has already been quoted, which is the rule the whole bid layer
 * runs on and matters most for an exclusion — its exact wording is what settles
 * a dispute.
 *
 * ── One-offs are first class ─────────────────────────────────────────────────
 * `addToBid` with no `itemId` writes straight onto the bid and saves nothing to
 * the library. That is the case where a permit is $340 on this job and never
 * again, and it must not leave a $340 "Permit fee" behind for someone to pick
 * up by mistake next month.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { SCOPE_NOTE_KINDS } from "../../drizzle/schema";
import * as db from "../db";

const nameSchema = z.string().trim().min(1).max(255);
const textSchema = z.string().trim().min(1).max(512);
/** A flat charge. Bounded well above any real fee and below absurdity. */
const amountSchema = z.number().min(0).max(1_000_000);

const toDecimal4 = (value: number) => value.toFixed(4);

async function requireBid(bidId: number, userId: number) {
  const bid = await db.getBidById(bidId, userId);
  if (!bid)
    throw new TRPCError({ code: "NOT_FOUND", message: "Bid not found." });
  return bid;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

const expenses = router({
  /** The reusable list. */
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db.getExpenseItems(ctx.user.id);
    return rows.map(row => ({ ...row, amount: Number(row.amount) }));
  }),

  archived: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db.getArchivedExpenseItems(ctx.user.id);
    return rows.map(row => ({ ...row, amount: Number(row.amount) }));
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: nameSchema,
        amount: amountSchema,
        notes: z.string().trim().max(512).nullable().optional(),
        /**
         * Independent switches, both defaulting off so a charge created
         * without saying anything behaves as every charge did before them.
         */
        taxable: z.boolean().default(false),
        markedUp: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = await db.createExpenseItem({
        userId: ctx.user.id,
        name: input.name,
        amount: toDecimal4(input.amount),
        notes: input.notes || null,
        taxable: input.taxable,
        markedUp: input.markedUp,
      });
      const row = await db.getExpenseItemById(id, ctx.user.id);
      return row ? { ...row, amount: Number(row.amount) } : null;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: nameSchema.optional(),
        amount: amountSchema.optional(),
        notes: z.string().trim().max(512).nullable().optional(),
        taxable: z.boolean().optional(),
        markedUp: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const existing = await db.getExpenseItemById(id, ctx.user.id);
      if (!existing)
        throw new TRPCError({ code: "NOT_FOUND", message: "Not found." });

      const patch: Record<string, unknown> = {};
      if (rest.name !== undefined) patch.name = rest.name;
      if (rest.amount !== undefined) patch.amount = toDecimal4(rest.amount);
      if (rest.notes !== undefined) patch.notes = rest.notes || null;
      if (rest.taxable !== undefined) patch.taxable = rest.taxable;
      if (rest.markedUp !== undefined) patch.markedUp = rest.markedUp;

      if (Object.keys(patch).length > 0)
        await db.updateExpenseItem(id, ctx.user.id, patch);
      const row = await db.getExpenseItemById(id, ctx.user.id);
      return row ? { ...row, amount: Number(row.amount) } : null;
    }),

  /** Archive rather than delete — bids that used it keep their snapshot. */
  setArchived: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        archived: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await db.getExpenseItemById(input.id, ctx.user.id);
      if (!existing)
        throw new TRPCError({ code: "NOT_FOUND", message: "Not found." });
      await db.setExpenseItemArchived(
        input.id,
        ctx.user.id,
        input.archived ? new Date() : null
      );
      return { success: true };
    }),

  /** Everything charged on one bid. */
  onBid: protectedProcedure
    .input(z.object({ bidId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      const rows = await db.getBidExpenses(input.bidId);
      return rows.map(row => ({ ...row, amount: Number(row.amount) }));
    }),

  /**
   * Put a charge on a bid.
   *
   * With `itemId`, the library entry is COPIED — its current name and amount
   * are frozen onto the bid. Without one, the name and amount given are used
   * directly and nothing is saved to the library.
   */
  addToBid: protectedProcedure
    .input(
      z.object({
        bidId: z.number().int().positive(),
        itemId: z.number().int().positive().nullable().default(null),
        name: nameSchema.optional(),
        amount: amountSchema.optional(),
        /**
         * Omitted, these are inherited from the saved entry when adding from
         * the list, and default off for a one-off. Passing them explicitly
         * overrides the saved entry FOR THIS BID ONLY — the snapshot rule
         * applies to the switches exactly as it does to the amount.
         */
        taxable: z.boolean().optional(),
        markedUp: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);

      let name = input.name;
      let amount = input.amount;
      let taxable = input.taxable;
      let markedUp = input.markedUp;

      if (input.itemId !== null) {
        // Checked, not trusted: an item id is a small integer and must belong
        // to this user before its amount lands on their bid.
        const item = await db.getExpenseItemById(input.itemId, ctx.user.id);
        if (!item)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "That saved expense was not found.",
          });
        name = name ?? item.name;
        amount = amount ?? Number(item.amount);
        taxable = taxable ?? item.taxable;
        markedUp = markedUp ?? item.markedUp;
      }

      if (!name || amount === undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Give the charge a name and an amount.",
        });
      }

      const id = await db.createBidExpense({
        bidId: input.bidId,
        expenseItemId: input.itemId,
        name,
        amount: toDecimal4(amount),
        taxable: taxable ?? false,
        markedUp: markedUp ?? false,
        sortOrder: await db.nextBidExpenseSortOrder(input.bidId),
      });
      const rows = await db.getBidExpenses(input.bidId);
      return rows
        .filter(r => r.id === id)
        .map(r => ({ ...r, amount: Number(r.amount) }))[0];
    }),

  updateOnBid: protectedProcedure
    .input(
      z.object({
        bidId: z.number().int().positive(),
        id: z.number().int().positive(),
        name: nameSchema.optional(),
        amount: amountSchema.optional(),
        taxable: z.boolean().optional(),
        markedUp: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.amount !== undefined) patch.amount = toDecimal4(input.amount);
      if (input.taxable !== undefined) patch.taxable = input.taxable;
      if (input.markedUp !== undefined) patch.markedUp = input.markedUp;
      if (Object.keys(patch).length > 0)
        await db.updateBidExpense(input.id, input.bidId, patch);
      return { success: true };
    }),

  removeFromBid: protectedProcedure
    .input(
      z.object({
        bidId: z.number().int().positive(),
        id: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      await db.deleteBidExpense(input.id, input.bidId);
      return { success: true };
    }),

  /**
   * Save a one-off that turned out to be worth keeping.
   *
   * The other direction from `addToBid`: this promotes a charge already on a
   * bid into the library, and links the two so the bid shows where it came
   * from. The bid's snapshot is untouched — promoting is a library operation.
   */
  saveToLibrary: protectedProcedure
    .input(
      z.object({
        bidId: z.number().int().positive(),
        id: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      const onBid = (await db.getBidExpenses(input.bidId)).find(
        row => row.id === input.id
      );
      if (!onBid)
        throw new TRPCError({ code: "NOT_FOUND", message: "Not found." });
      if (onBid.expenseItemId !== null) {
        return { success: true, alreadySaved: true as const };
      }

      const itemId = await db.createExpenseItem({
        userId: ctx.user.id,
        name: onBid.name,
        amount: onBid.amount,
        // The switches travel with it — a charge saved for reuse should behave
        // next time exactly as it did on the bid it was promoted from.
        taxable: onBid.taxable,
        markedUp: onBid.markedUp,
      });
      await db.updateBidExpense(input.id, input.bidId, {
        expenseItemId: itemId,
      });
      return { success: true, alreadySaved: false as const };
    }),
});

// ─── Includes / excludes ──────────────────────────────────────────────────────

const scope = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getScopeNotes(ctx.user.id);
  }),

  archived: protectedProcedure.query(async ({ ctx }) => {
    return db.getArchivedScopeNotes(ctx.user.id);
  }),

  create: protectedProcedure
    .input(
      z.object({
        kind: z.enum(SCOPE_NOTE_KINDS),
        text: textSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = await db.createScopeNote({
        userId: ctx.user.id,
        kind: input.kind,
        text: input.text,
      });
      return db.getScopeNoteById(id, ctx.user.id);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        kind: z.enum(SCOPE_NOTE_KINDS).optional(),
        text: textSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      const existing = await db.getScopeNoteById(id, ctx.user.id);
      if (!existing)
        throw new TRPCError({ code: "NOT_FOUND", message: "Not found." });
      const patch: Record<string, unknown> = {};
      if (rest.kind !== undefined) patch.kind = rest.kind;
      if (rest.text !== undefined) patch.text = rest.text;
      if (Object.keys(patch).length > 0)
        await db.updateScopeNote(id, ctx.user.id, patch);
      return db.getScopeNoteById(id, ctx.user.id);
    }),

  setArchived: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        archived: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await db.getScopeNoteById(input.id, ctx.user.id);
      if (!existing)
        throw new TRPCError({ code: "NOT_FOUND", message: "Not found." });
      await db.setScopeNoteArchived(
        input.id,
        ctx.user.id,
        input.archived ? new Date() : null
      );
      return { success: true };
    }),

  onBid: protectedProcedure
    .input(z.object({ bidId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      return db.getBidScopeNotes(input.bidId);
    }),

  addToBid: protectedProcedure
    .input(
      z.object({
        bidId: z.number().int().positive(),
        noteId: z.number().int().positive().nullable().default(null),
        kind: z.enum(SCOPE_NOTE_KINDS).optional(),
        text: textSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);

      let kind = input.kind;
      let text = input.text;

      if (input.noteId !== null) {
        const note = await db.getScopeNoteById(input.noteId, ctx.user.id);
        if (!note)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "That saved line was not found.",
          });
        kind = kind ?? note.kind;
        text = text ?? note.text;
      }

      if (!kind || !text) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Say whether it is included or excluded, and what it is.",
        });
      }

      const id = await db.createBidScopeNote({
        bidId: input.bidId,
        scopeNoteId: input.noteId,
        kind,
        text,
        sortOrder: await db.nextBidScopeNoteSortOrder(input.bidId),
      });
      return (await db.getBidScopeNotes(input.bidId)).find(r => r.id === id);
    }),

  updateOnBid: protectedProcedure
    .input(
      z.object({
        bidId: z.number().int().positive(),
        id: z.number().int().positive(),
        kind: z.enum(SCOPE_NOTE_KINDS).optional(),
        text: textSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      const patch: Record<string, unknown> = {};
      if (input.kind !== undefined) patch.kind = input.kind;
      if (input.text !== undefined) patch.text = input.text;
      if (Object.keys(patch).length > 0)
        await db.updateBidScopeNote(input.id, input.bidId, patch);
      return { success: true };
    }),

  removeFromBid: protectedProcedure
    .input(
      z.object({
        bidId: z.number().int().positive(),
        id: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      await db.deleteBidScopeNote(input.id, input.bidId);
      return { success: true };
    }),

  saveToLibrary: protectedProcedure
    .input(
      z.object({
        bidId: z.number().int().positive(),
        id: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      const onBid = (await db.getBidScopeNotes(input.bidId)).find(
        row => row.id === input.id
      );
      if (!onBid)
        throw new TRPCError({ code: "NOT_FOUND", message: "Not found." });
      if (onBid.scopeNoteId !== null) {
        return { success: true, alreadySaved: true as const };
      }
      const noteId = await db.createScopeNote({
        userId: ctx.user.id,
        kind: onBid.kind,
        text: onBid.text,
      });
      await db.updateBidScopeNote(input.id, input.bidId, {
        scopeNoteId: noteId,
      });
      return { success: true, alreadySaved: false as const };
    }),
});

export const bidExtrasRouter = router({ expenses, scope });
