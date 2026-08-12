/**
 * The sweep that makes the 30-day archive real.
 *
 * ── Why this file exists at all ──────────────────────────────────────────────
 * The app already had a Trash screen that counted down to a permanent deletion
 * which never happened — nothing was scheduled, so the number on screen was
 * decoration. An expiry a user can read but the system does not enforce is
 * worse than no expiry: it teaches people that archived work disappears, and
 * then keeps it forever. This handler is the enforcement.
 *
 * ── Why a platform cron rather than a timer ──────────────────────────────────
 * `setInterval` / `node-cron` are forbidden here (references/periodic-updates.md):
 * the app runs on Cloud Run, which terminates idle instances, so an in-process
 * timer dies with the instance and takes the guarantee with it. The platform
 * POSTs to `/api/scheduled/*` instead, which works whether or not anyone has
 * the app open.
 *
 * ── Registering it (a deploy-time step, not a code step) ─────────────────────
 * The handler below is only half the job. The cron itself is created ON the
 * Manus platform, once, from a sandbox terminal after the site is deployed —
 * a dev machine is unreachable from the platform, so this cannot be done from
 * a local checkout:
 *
 *     manus-heartbeat create \
 *       --name purge-archived-bids \
 *       --cron "0 30 3 * * *" \
 *       --path /api/scheduled/purgeArchivedBids \
 *       --description "Delete bids whose 30-day archive window has closed"
 *
 * Six fields, seconds first, UTC — 03:30 UTC daily. Hourly would be needless
 * load for a 30-day window; daily means a bid is destroyed within a day of its
 * deadline, which is the resolution the countdown promises anyway.
 *
 * UNTIL THAT COMMAND IS RUN, NOTHING IS EVER PURGED. The app stays correct in
 * the meantime — `daysRemaining` still counts down and the archive still lists
 * everything — it simply keeps expired bids instead of destroying them, and one
 * sweep clears the backlog whenever the cron is finally registered. That is the
 * safe direction for the failure to point.
 *
 * ── Idempotence ──────────────────────────────────────────────────────────────
 * The platform retries 5xx and 429 up to three times. A second run finds no
 * expired rows, deletes nothing and returns 200, because the query is driven by
 * stored state rather than by anything in the request body.
 */
import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { RETENTION_DAYS, systemClock } from "../../shared/retention";
import * as db from "../db";

export type PurgeResult = {
  /** How many bids were destroyed. */
  purged: number;
  /** Their ids, for the log — the rows are gone by the time this is read. */
  ids: number[];
};

/**
 * Delete every bid whose retention window has closed.
 *
 * Exported separately from the HTTP handler so tests can drive it with a clock
 * they control. There is no other way to test a 30-day rule.
 *
 * Line items and PDF rows go with the bid via `onDelete: "cascade"`.
 *
 * ── What is NOT cleaned up, and why ──────────────────────────────────────────
 * The S3 objects behind those PDF rows are orphaned rather than deleted: the
 * Forge storage API this app uses exposes presigned PUT and GET only, with no
 * delete. Losing the row loses the key, so the file becomes unreachable through
 * the app — which is what the user is promised — but the bytes still sit in the
 * bucket. Worth fixing if a delete endpoint appears; not worth blocking the
 * feature on, and not something to paper over by pretending it happened.
 */
export async function purgeExpiredBids(
  now: Date = systemClock(),
  retentionDays: number = RETENTION_DAYS
): Promise<PurgeResult> {
  const expired = await db.getExpiredArchivedBids(now, retentionDays);
  const ids: number[] = [];

  for (const bid of expired) {
    // One at a time, by (id, userId), so a single bad row cannot take the whole
    // sweep down with it and leave the rest to pile up until someone notices.
    try {
      await db.deleteBidForever(bid.id, bid.userId);
      ids.push(bid.id);
    } catch (err) {
      console.error(`[PurgeArchivedBids] bid ${bid.id} failed to delete:`, err);
    }
  }

  return { purged: ids.length, ids };
}

/**
 * `POST /api/scheduled/purgeArchivedBids` — mounted in server/_core/index.ts.
 *
 * Cron-only. `sdk.authenticateRequest` sets `isCron` for platform-triggered
 * calls; a logged-in user hitting this URL is refused, because "delete everyone
 * else's expired bids" is not a user-facing operation.
 *
 * Takes no clock: express reserves the third argument for `next`, and the seam
 * worth testing is `purgeExpiredBids` above, which the tests drive directly.
 */
export async function purgeArchivedBidsHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user?.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    const result = await purgeExpiredBids(systemClock());
    if (result.purged > 0) {
      console.log(`[PurgeArchivedBids] deleted ${result.purged}: ${result.ids.join(", ")}`);
    }
    return res.json({ ok: true, ...result });
  } catch (err) {
    // JSON-encoded so the platform's Investigate flow surfaces it verbatim
    // rather than showing an opaque 500.
    console.error("[PurgeArchivedBids] failed:", err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      context: { url: req.originalUrl },
      timestamp: new Date().toISOString(),
    });
  }
}
