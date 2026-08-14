/**
 * The nightly backup cron.
 *
 * ── Two things worth testing, and they are different ────────────────────────
 * A scheduled job fails in a way a manual one cannot: nobody is watching. So
 * this covers both halves separately —
 *
 *   • **the schedule is configured correctly** — the cadence is a valid
 *     six-field expression, it is daily, it runs before the purge that destroys
 *     data, the handler is actually mounted, and the path in the registration
 *     command matches the path Express serves. Any one of those being wrong
 *     produces a cron that never fires, or fires at a URL that returns the SPA
 *     index with a cheerful 200.
 *
 *   • **a failed run still says so** — the whole point of the tool. A partial
 *     backup, a missing credential and an unreachable bucket must each produce
 *     a 500 and a report, never a quiet 200.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import type { Request, Response } from "express";

vi.mock("./_core/sdk", () => ({
  sdk: { authenticateRequest: vi.fn() },
}));

import { sdk } from "./_core/sdk";
import {
  BACKUP_CRON,
  BACKUP_PATH,
  backupToR2Handler,
  runScheduledBackup,
} from "./scheduled/backupToR2";
import { dayKey, runIdsForDay } from "./backup/history";
import type { BackupTarget } from "./backup/target";

const databaseUrl = process.env.DATABASE_URL ?? "";
const hasDb = Boolean(databaseUrl);
const runIf = hasDb ? describe : describe.skip;

/** An in-memory bucket, so nothing here needs a credential or a network. */
function fakeTarget(seed: Record<string, string> = {}) {
  const written = new Map<string, Buffer>();
  for (const [key, value] of Object.entries(seed)) {
    written.set(key, Buffer.from(value, "utf8"));
  }
  const target: BackupTarget & { written: Map<string, Buffer> } = {
    name: "fake://memory",
    written,
    async check() {},
    async put(key, body) {
      written.set(key, body);
    },
    async get(key) {
      const body = written.get(key);
      if (!body) throw new Error(`no such object: ${key}`);
      return body;
    },
    async list(prefix) {
      return Array.from(written.keys()).filter(k => k.startsWith(prefix));
    },
  };
  return target;
}

/** Minimal express doubles — enough to capture status and body. */
function fakeRes() {
  const captured: { status: number; body: unknown } = {
    status: 200,
    body: null,
  };
  const res = {
    status(code: number) {
      captured.status = code;
      return res;
    },
    json(body: unknown) {
      captured.body = body;
      return res;
    },
  } as unknown as Response;
  return { res, captured };
}

const cronRequest = { originalUrl: BACKUP_PATH } as unknown as Request;

beforeEach(() => {
  vi.mocked(sdk.authenticateRequest).mockReset();
});

// ── The schedule itself ──────────────────────────────────────────────────────

describe("the schedule is configured correctly", () => {
  it("is a six-field expression, seconds first", () => {
    // The platform takes six fields with seconds leading. A five-field crontab
    // expression is silently a different time, which is the kind of mistake
    // nobody notices until they look for a backup that was never taken.
    const fields = BACKUP_CRON.trim().split(/\s+/);
    expect(fields, `BACKUP_CRON="${BACKUP_CRON}"`).toHaveLength(6);
  });

  it("runs once a day, at a fixed time", () => {
    const [second, minute, hour, dayOfMonth, month, dayOfWeek] =
      BACKUP_CRON.split(/\s+/);
    expect(second).toBe("0");
    expect(minute).toBe("0");
    // A specific hour, not a wildcard or a step — hourly would be cost without
    // benefit for one contractor's working day.
    expect(hour).toMatch(/^\d{1,2}$/);
    expect([dayOfMonth, month, dayOfWeek]).toEqual(["*", "*", "*"]);
  });

  it("runs BEFORE the purge that permanently destroys bids", () => {
    /*
     * purgeArchivedBids deletes bids whose 30-day archive has closed, at 03:30
     * UTC. Backing up first means the night's export still contains what the
     * purge is about to remove, so a purge that fires on the wrong row stays
     * recoverable for a day. Reversed, the backup would faithfully record the
     * deletion and the data would be gone from both.
     */
    const purge = readFileSync("server/scheduled/purgeArchivedBids.ts", "utf8");
    const purgeCron = /--cron "([^"]+)"/.exec(purge)?.[1];
    expect(purgeCron, "could not find the purge's cron").toBeTruthy();

    const minutesOf = (cron: string) => {
      const [, minute, hour] = cron.split(/\s+/);
      return Number(hour) * 60 + Number(minute);
    };
    expect(minutesOf(BACKUP_CRON)).toBeLessThan(minutesOf(purgeCron!));
  });

  it("is mounted at the path the registration command names", () => {
    // The failure this catches is specific and quiet: `/api/scheduled/*` is not
    // auto-registered, so an unmounted path falls through to the SPA index and
    // the platform records a successful 200 for a backup that never ran.
    const index = readFileSync("server/_core/index.ts", "utf8");
    expect(index).toContain("app.post(BACKUP_PATH, backupToR2Handler)");
    expect(BACKUP_PATH).toBe("/api/scheduled/backupToR2");
    expect(BACKUP_PATH.startsWith("/api/scheduled/")).toBe(true);
  });

  it("is mounted before the Vite/static fallthrough", () => {
    const index = readFileSync("server/_core/index.ts", "utf8");
    const mount = index.indexOf("app.post(BACKUP_PATH");
    const trpc = index.indexOf('app.use(\n    "/api/trpc"');
    expect(mount).toBeGreaterThan(-1);
    expect(mount).toBeLessThan(trpc === -1 ? Number.MAX_SAFE_INTEGER : trpc);
  });

  it("quotes the same cron in the registration command a human will paste", () => {
    // The comment tells someone what to type. If it drifts from BACKUP_CRON,
    // the schedule the tests assert is not the schedule that gets created.
    const source = readFileSync("server/scheduled/backupToR2.ts", "utf8");
    const documented = /--cron "([^"]+)"/.exec(source)?.[1];
    expect(documented).toBe(BACKUP_CRON);
    const documentedPath = /--path (\S+)/.exec(source)?.[1];
    expect(documentedPath).toBe(BACKUP_PATH);
  });
});

// ── Only the platform may trigger it ─────────────────────────────────────────

describe("access", () => {
  it("refuses anyone who is not the cron", async () => {
    // A backup reads every row belonging to every user.
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({
      id: 1,
      isCron: false,
    } as never);
    const { res, captured } = fakeRes();
    await backupToR2Handler(cronRequest, res);
    expect(captured.status).toBe(403);
  });

  it("refuses an unauthenticated request", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValue(null as never);
    const { res, captured } = fakeRes();
    await backupToR2Handler(cronRequest, res);
    expect(captured.status).toBe(403);
  });
});

// ── A failed scheduled run must be loud ──────────────────────────────────────

describe("a failed scheduled run reports failure", () => {
  const now = new Date("2026-08-14T02:00:05.000Z");

  it("fails loudly when R2 is not configured", async () => {
    // A deployment missing its credentials has no backups at all. That must not
    // look like a night with nothing to do.
    const outcome = await runScheduledBackup({
      now,
      databaseUrl: "mysql://unused",
      target: undefined,
    });
    // No R2 vars are set in the test environment, so this is the real path.
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.reason).toContain("R2 is not configured");
  });

  it("fails loudly when the database is not configured", async () => {
    const outcome = await runScheduledBackup({ now, databaseUrl: "" });
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.reason).toContain("DATABASE_URL");
  });

  it("returns 500 with the report, never a quiet 200", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({
      id: 1,
      isCron: true,
    } as never);
    const { res, captured } = fakeRes();
    await backupToR2Handler(cronRequest, res);

    // Nothing is configured in the test environment, so this run fails.
    expect(captured.status).toBe(500);
    expect((captured.body as { ok: boolean }).ok).toBe(false);
    expect((captured.body as { error: string }).error).toBeTruthy();
  });
});

runIf("a failed scheduled run against a real database", () => {
  const now = new Date("2026-08-14T02:00:05.000Z");

  it("reports failure when the destination cannot be reached", async () => {
    const target = fakeTarget();
    target.check = async () => {
      throw new Error("bad credentials");
    };
    const outcome = await runScheduledBackup({ now, databaseUrl, target });

    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.reason).toContain("unreachable");
    expect(outcome.report?.ok).toBe(false);
  });

  it("reports failure when a single file cannot be copied", async () => {
    // A partial backup is a failed backup. The database dump succeeding does
    // not redeem it, and this is the case most likely to be waved through.
    const target = fakeTarget();
    const outcome = await runScheduledBackup({
      now,
      databaseUrl,
      target,
      fetchFile: async () => {
        throw new Error("403 from storage");
      },
    });

    if (outcome.status === "completed") {
      // No files referenced in this database; nothing could have failed.
      expect(outcome.report.files.found).toBe(0);
      return;
    }
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.report?.database).not.toBeNull();
    expect(outcome.report?.files.failed.length).toBeGreaterThan(0);
    // And the failure is recorded in the bucket, beside the data.
    const manifestKey = `${outcome.report!.runId}/manifest.json`;
    const manifest = JSON.parse(target.written.get(manifestKey)!.toString());
    expect(manifest.ok).toBe(false);
  });

  it("succeeds and reports completed when everything works", async () => {
    const target = fakeTarget();
    const outcome = await runScheduledBackup({
      now,
      databaseUrl,
      target,
      fetchFile: async () => Buffer.from("bytes"),
    });
    expect(outcome.status).toBe("completed");
    if (outcome.status !== "completed") return;
    expect(outcome.report.ok).toBe(true);
    expect(outcome.report.database?.tableCount).toBeGreaterThan(20);
  });
});

// ── Retries must not mean three full backups ─────────────────────────────────

describe("picking today's run out of the bucket", () => {
  it("matches run ids by UTC day", () => {
    const keys = [
      "2026-08-13T02-00-05Z/manifest.json",
      "2026-08-14T02-00-05Z/manifest.json",
      "2026-08-14T02-00-05Z/database.sql.gz",
      "2026-08-14T09-13-00Z/manifest.json",
    ];
    expect(runIdsForDay(keys, "2026-08-14")).toEqual([
      "2026-08-14T02-00-05Z",
      "2026-08-14T09-13-00Z",
    ]);
    expect(runIdsForDay(keys, "2026-08-12")).toEqual([]);
  });

  it("derives the day from the clock in UTC", () => {
    expect(dayKey(new Date("2026-08-14T02:00:05.000Z"))).toBe("2026-08-14");
    // Late-evening local time must not roll the day early or late.
    expect(dayKey(new Date("2026-08-14T23:59:59.000Z"))).toBe("2026-08-14");
  });
});

runIf("retry behaviour", () => {
  const now = new Date("2026-08-14T02:00:05.000Z");

  it("skips when today already has a SUCCESSFUL backup", async () => {
    // The platform retries a 5xx up to three times. Without this, one timeout
    // becomes three complete exports of the same data.
    const target = fakeTarget({
      "2026-08-14T02-00-05Z/manifest.json": JSON.stringify({ ok: true }),
    });
    const outcome = await runScheduledBackup({ now, databaseUrl, target });

    expect(outcome.status).toBe("skipped");
    if (outcome.status !== "skipped") return;
    expect(outcome.runId).toBe("2026-08-14T02-00-05Z");
    // Nothing new was written.
    expect(target.written.size).toBe(1);
  });

  it("does NOT skip when today's only backup failed", async () => {
    // The retry exists precisely to recover from that run. Treating a failed
    // manifest as "today is done" turns one bad night into a missing backup.
    const target = fakeTarget({
      "2026-08-14T01-00-00Z/manifest.json": JSON.stringify({ ok: false }),
    });
    const outcome = await runScheduledBackup({
      now,
      databaseUrl,
      target,
      fetchFile: async () => Buffer.from("bytes"),
    });

    expect(outcome.status).toBe("completed");
    expect(target.written.size).toBeGreaterThan(1);
  });

  it("does not skip on yesterday's success", async () => {
    const target = fakeTarget({
      "2026-08-13T02-00-05Z/manifest.json": JSON.stringify({ ok: true }),
    });
    const outcome = await runScheduledBackup({
      now,
      databaseUrl,
      target,
      fetchFile: async () => Buffer.from("bytes"),
    });
    expect(outcome.status).toBe("completed");
  });

  it("backs up rather than skipping when the bucket cannot be read", async () => {
    // Failing the check must not be read as "already done". A duplicate backup
    // is harmless; a skipped one is not.
    const target = fakeTarget();
    target.list = async () => {
      throw new Error("list denied");
    };
    const outcome = await runScheduledBackup({
      now,
      databaseUrl,
      target,
      fetchFile: async () => Buffer.from("bytes"),
    });
    expect(outcome.status).toBe("completed");
  });
});
