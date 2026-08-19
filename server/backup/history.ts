/**
 * Reading what is already in the bucket.
 *
 * Exists for one reason: the platform retries a failed `/api/scheduled/*` call
 * up to three times, and a full backup is expensive. Without a way to ask "did
 * today already work?", a single timeout turns into three complete backups of
 * the same data. With it, a retry after a successful run costs one LIST and
 * one GET.
 *
 * The pure part is separated from the network part so the interesting logic —
 * which run ids belong to which day — is testable without a bucket.
 */
import type { BackupTarget } from "./target";

/** `2026-08-14` from a Date, in UTC, matching the run id's date half. */
export function dayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Run ids from a listing that fall on one UTC day.
 *
 * Run ids are `2026-08-14T02-00-05Z`, so the day is a literal prefix — no date
 * parsing, and nothing to get wrong across timezones.
 */
export function runIdsForDay(keys: string[], day: string): string[] {
  const runs = new Set<string>();
  for (const key of keys) {
    const match = /^([^/]+)\/manifest\.json$/.exec(key);
    if (match && match[1].startsWith(day)) runs.add(match[1]);
  }
  return Array.from(runs).sort();
}

/**
 * The id of a run on `day` that got the database safely into the bucket, or
 * null.
 *
 * ── Why `partial` counts and `failed` does not ───────────────────────────────
 * A run that failed halfway leaves a manifest recording the failure, and
 * treating that as "today is done" would turn one bad night into a permanently
 * missing backup — the retry exists precisely to recover from it.
 *
 * A PARTIAL run is the opposite case. Its database dump is already uploaded and
 * whole; what it could not do is read some stored files, and those reads fail
 * deterministically (a 403 does not become a 200 ninety seconds later). Making
 * the retry re-run would dump the entire database three times a night to
 * re-collect the same refusals. So partial satisfies the guard.
 *
 * That is a decision about RETRIES, not a claim the backup is complete: the
 * manifest still records the status and every unreadable key, and nothing else
 * in the system reads this function as a health check.
 *
 * Older manifests predate `status` and carry only `ok`; those are read as clean
 * when true, so a bucket written by the previous version still answers this
 * correctly rather than re-running every night.
 */
export async function findSuccessfulRunForDay(
  target: BackupTarget,
  day: string
): Promise<string | null> {
  const candidates = runIdsForDay(await target.list(""), day);

  for (const runId of candidates) {
    try {
      const manifest = JSON.parse(
        (await target.get(`${runId}/manifest.json`)).toString("utf8")
      );
      const status =
        manifest?.status ?? (manifest?.ok === true ? "clean" : null);
      if (status === "clean" || status === "partial") return runId;
    } catch {
      // An unreadable manifest is not proof of anything; keep looking.
    }
  }
  return null;
}
