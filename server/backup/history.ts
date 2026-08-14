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
 * The id of a run on `day` whose manifest says it succeeded, or null.
 *
 * Only a SUCCESSFUL run counts. A run that failed halfway leaves a manifest
 * recording the failure, and treating that as "today is done" would turn one
 * bad night into a permanently missing backup — the retry exists precisely to
 * recover from it.
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
      if (manifest?.ok === true) return runId;
    } catch {
      // An unreadable manifest is not proof of anything; keep looking.
    }
  }
  return null;
}
