/**
 * Plan PDFs attached to a bid. Takeoff redesign, phase 1.
 *
 * ── Many sheets per bid, not one ─────────────────────────────────────────────
 * The legacy `projects` row carried a single PDF inline. A real job arrives as
 * a set — power sheets, lighting sheets, a spec book, an addendum that lands a
 * week later — so this is its own table and a bid holds as many as it needs.
 *
 * ── Bytes go to S3, never through the database ───────────────────────────────
 * Upload is the same shape as the legacy projects.uploadPdf: the client posts a
 * data URL, the server decodes it and hands the bytes to storagePut(), and only
 * the resulting key is stored. The 50MB express body limit in _core/index.ts is
 * the real ceiling; MAX_PDF_BYTES below refuses anything larger with a sentence
 * a person can act on rather than letting the body parser cut the connection.
 *
 * ── Ownership on every path ──────────────────────────────────────────────────
 * Every procedure resolves the bid through requireBid first. A storage key is
 * guessable enough that "you knew the id" must never be the only thing between
 * one contractor and another contractor's plans.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import * as db from "../db";

/**
 * Refused above this size. Set below the 50MB express body limit because a data
 * URL is base64 — about 4/3 the size of the file — so a 30MB PDF arrives as
 * roughly 40MB of JSON, and anything larger dies in the body parser where the
 * user gets a dead connection instead of an explanation.
 */
const MAX_PDF_BYTES = 30 * 1024 * 1024;

/** Filenames are shown, never used as a path. Kept sane rather than sanitised. */
const filenameSchema = z.string().trim().min(1).max(512);

async function requireBid(bidId: number, userId: number) {
  const bid = await db.getBidById(bidId, userId);
  if (!bid) throw new TRPCError({ code: "NOT_FOUND", message: "Bid not found." });
  return bid;
}

/** What the client gets back for one sheet, including where to fetch it. */
function toView(row: Awaited<ReturnType<typeof db.getBidPdf>> & object) {
  return {
    id: row.id,
    bidId: row.bidId,
    filename: row.filename,
    byteSize: row.byteSize,
    pageCount: row.pageCount,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    /** Served through the storage proxy, which 307s to a signed S3 URL. */
    url: `/manus-storage/${row.storageKey}`,
  };
}

export const bidPdfsRouter = router({
  /** Every sheet on a bid, in the order they were attached. */
  list: protectedProcedure
    .input(z.object({ bidId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);
      const rows = await db.getBidPdfs(input.bidId, ctx.user.id);
      return rows.map(toView);
    }),

  /**
   * Attach one PDF to a bid.
   *
   * Rejects a non-PDF by checking the actual bytes rather than trusting the
   * filename: `%PDF-` is the file's magic number, and a renamed .docx would
   * otherwise attach cleanly and then fail to open with nothing explaining why.
   */
  attach: protectedProcedure
    .input(z.object({
      bidId: z.number().int().positive(),
      dataUrl: z.string().min(1),
      filename: filenameSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      await requireBid(input.bidId, ctx.user.id);

      const base64 = input.dataUrl.split(",")[1];
      if (!base64) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That file could not be read." });
      }
      const buffer = Buffer.from(base64, "base64");

      if (buffer.byteLength === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That file is empty." });
      }
      if (buffer.byteLength > MAX_PDF_BYTES) {
        const mb = (buffer.byteLength / (1024 * 1024)).toFixed(1);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `That PDF is ${mb}MB. The limit is ${MAX_PDF_BYTES / (1024 * 1024)}MB — split the sheet set and attach it in parts.`,
        });
      }
      if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That file is not a PDF. Plans must be PDFs — export from your viewer and try again.",
        });
      }

      const { key } = await storagePut(
        `bid-plans/${ctx.user.id}/${input.bidId}/${input.filename}`,
        buffer,
        "application/pdf"
      );

      const sortOrder = await db.nextBidPdfSortOrder(input.bidId, ctx.user.id);
      const id = await db.createBidPdf({
        bidId: input.bidId,
        userId: ctx.user.id,
        filename: input.filename,
        storageKey: key,
        byteSize: buffer.byteLength,
        sortOrder,
      });

      const row = await db.getBidPdf(id, ctx.user.id);
      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Attach failed." });
      return toView(row);
    }),

  /**
   * Record the page count once the viewer has parsed the document.
   *
   * Server-side page counting would mean a PDF parser on the server for a
   * number the client already has the moment it opens the file.
   */
  setPageCount: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      pageCount: z.number().int().min(1).max(10000),
    }))
    .mutation(async ({ input, ctx }) => {
      const row = await db.getBidPdf(input.id, ctx.user.id);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Sheet not found." });
      await db.setBidPdfPageCount(input.id, ctx.user.id, input.pageCount);
      return { success: true };
    }),

  /**
   * Detach a sheet from a bid.
   *
   * Immediate and unconditional, unlike archiving a bid: a PDF attached to the
   * wrong job is a mistake to undo now, not something to hold for 30 days. The
   * bid it belonged to is untouched.
   */
  remove: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const row = await db.getBidPdf(input.id, ctx.user.id);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Sheet not found." });
      await db.deleteBidPdf(input.id, ctx.user.id);
      return { success: true };
    }),
});
