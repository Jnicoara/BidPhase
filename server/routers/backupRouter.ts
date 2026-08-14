/**
 * Trigger a backup from inside the app, and check whether it is configured.
 *
 * ── Admin only, and that is the whole access control ────────────────────────
 * `adminProcedure` — the same gate the feature flags and the early-access list
 * sit behind. There is no public or contractor-facing path to any of this: a
 * backup reads every row belonging to every user, so the ability to start one
 * is the ability to read the whole database.
 *
 * ── The CLI is the better trigger ───────────────────────────────────────────
 * scripts/backup.mts does the same work without a session, a deployed app, or a
 * request timeout hanging over a job that can legitimately run for minutes.
 * This route exists so a backup can be taken from a phone in a hurry, and
 * because "is it even configured?" is a question worth answering without SSH.
 * If a large backup ever times out here, that is expected — reach for the CLI.
 *
 * ── Secrets never leave the server ──────────────────────────────────────────
 * `status` returns whether R2 is configured, which variables are missing by
 * NAME, and the bucket. Never a credential. See describeConfig.
 */
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import { describeConfig, readR2Config } from "../backup/config";
import { createR2Target } from "../backup/target";
import { runBackup, summarise, type BackupReport } from "../backup/runBackup";

export const backupRouter = router({
  /**
   * Is the backup ready to run?
   *
   * Worth its own call: discovering a missing credential when you need a backup
   * is discovering it too late, and this answers in a millisecond without
   * touching the database.
   */
  status: adminProcedure.query(() => {
    const described = describeConfig(readR2Config());
    return {
      ...described,
      databaseConfigured: Boolean(process.env.DATABASE_URL?.trim()),
    };
  }),

  /** Take a backup now. Returns the full report, failures included. */
  run: adminProcedure.mutation(async (): Promise<BackupReport> => {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "DATABASE_URL is not set on this server.",
      });
    }

    const configResult = readR2Config();
    if (!configResult.ok) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `Cloudflare R2 is not configured. Missing: ${configResult.missing.join(", ")}`,
      });
    }

    const report = await runBackup({
      databaseUrl,
      target: createR2Target(configResult.config),
    });

    // Logged whichever way it went. A backup nobody watched is the normal case,
    // and the server log is where the evidence has to be.
    console.log(`[backup]\n${summarise(report)}`);

    // Returned rather than thrown even on failure: the report carries which
    // files failed and why, and a TRPCError would reduce all of that to a
    // string. The caller checks `ok`.
    return report;
  }),
});
