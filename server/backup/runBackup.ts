/**
 * Run a backup: dump the database, copy every stored file, write a manifest.
 *
 * ── It reports; it does not throw ───────────────────────────────────────────
 * Every path returns a BackupReport with `ok` on it. A backup tool that throws
 * on the third of two hundred PDFs has thrown away the other 197 and told you
 * only about the one — and one that swallows the failure is worse still,
 * because it prints "done" over a backup with a hole in it. So a file that
 * cannot be fetched is recorded as a failure, the rest continue, and `ok` is
 * false at the end. The manifest that lands in R2 carries the same failures, so
 * the record of what went wrong sits next to the data itself rather than in a
 * terminal someone has closed.
 *
 * The one exception is the destination being unreachable, which is checked
 * first and stops everything: there is no point reading a database for an hour
 * to write it nowhere.
 *
 * ── Layout in the bucket ────────────────────────────────────────────────────
 *   <prefix>/<timestamp>/manifest.json
 *   <prefix>/<timestamp>/database.sql.gz
 *   <prefix>/<timestamp>/files/<original storage key>
 *
 * Timestamped rather than overwritten, so a backup taken after something has
 * already gone wrong cannot destroy the good one before it.
 */
import { gzipSync } from "node:zlib";
import { APP_VERSION } from "../../shared/version";
import { collectFiles, FILE_SOURCES } from "./collectFiles";
import { dumpDatabase, type TableDump } from "./dumpDatabase";
import type { BackupTarget } from "./target";

export type FileFailure = { key: string; reason: string };

export type BackupReport = {
  ok: boolean;
  /** Folder this run wrote to, under the target's prefix. */
  runId: string;
  target: string;
  startedAt: string;
  finishedAt: string;
  appVersion: string;
  database: {
    tables: TableDump[];
    tableCount: number;
    rowCount: number;
    /** Size of the compressed dump actually uploaded. */
    dumpBytes: number;
  } | null;
  files: {
    found: number;
    copied: number;
    bytes: number;
    failed: FileFailure[];
  };
  /** Non-fatal notes — skipped columns, oversized tables. */
  warnings: string[];
  /** What stopped it, when something did. */
  errors: string[];
};

/**
 * How the bytes of a stored file are fetched.
 *
 * A parameter rather than an import so the tests can run the whole pipeline
 * without Manus, and so the day this project leaves Manus, only this function
 * changes rather than the backup.
 */
export type FileFetcher = (key: string) => Promise<Buffer>;

/** Fetch through the Manus presign proxy — the only way to read these today. */
export async function manusFileFetcher(key: string): Promise<Buffer> {
  const { storageGetSignedUrl } = await import("../storage");
  const url = await storageGetSignedUrl(key);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`storage returned ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/** `2026-08-13T22-41-07Z` — sorts chronologically, legal in an object key. */
export function runIdFor(now: Date): string {
  return now
    .toISOString()
    .replace(/\.\d+Z$/, "Z")
    .replace(/:/g, "-");
}

export async function runBackup(options: {
  databaseUrl: string;
  target: BackupTarget;
  fetchFile?: FileFetcher;
  /** Injected so the run id is testable; defaults to now. */
  now?: Date;
  /** Called after each step, for the CLI's progress output. */
  onProgress?: (message: string) => void;
}): Promise<BackupReport> {
  const now = options.now ?? new Date();
  const fetchFile = options.fetchFile ?? manusFileFetcher;
  const say = options.onProgress ?? (() => {});
  const runId = runIdFor(now);
  const startedAt = now.toISOString();

  const report: BackupReport = {
    ok: false,
    runId,
    target: options.target.name,
    startedAt,
    finishedAt: startedAt,
    appVersion: APP_VERSION,
    database: null,
    files: { found: 0, copied: 0, bytes: 0, failed: [] },
    warnings: [],
    errors: [],
  };

  const finish = (): BackupReport => {
    report.finishedAt = new Date().toISOString();
    report.ok = report.errors.length === 0 && report.files.failed.length === 0;
    return report;
  };

  // 1. Prove we can write before spending anything reading.
  try {
    say(`Checking ${options.target.name}…`);
    await options.target.check();
  } catch (error) {
    report.errors.push(
      `Backup destination unreachable: ${message(error)}. Nothing was read.`
    );
    return finish();
  }

  // 2. The database.
  try {
    say("Dumping database…");
    const dump = await dumpDatabase(options.databaseUrl);
    report.warnings.push(...dump.warnings);

    const compressed = gzipSync(Buffer.from(dump.sql, "utf8"));
    await options.target.put(
      `${runId}/database.sql.gz`,
      compressed,
      "application/gzip"
    );

    report.database = {
      tables: dump.tables,
      tableCount: dump.tables.length,
      rowCount: dump.tables.reduce((sum, t) => sum + t.rows, 0),
      dumpBytes: compressed.byteLength,
    };
    say(
      `Database: ${dump.tables.length} tables, ${report.database.rowCount} rows, ${compressed.byteLength} bytes compressed.`
    );
  } catch (error) {
    // Fatal: a backup without the database is not a backup. Say so and stop,
    // rather than continuing to copy files and reporting a cheerful total.
    report.errors.push(`Database dump failed: ${message(error)}`);
    await writeManifest(options.target, runId, report).catch(() => {});
    return finish();
  }

  // 3. The files. One failure here does not stop the rest.
  try {
    const { files, warnings } = await collectFiles(options.databaseUrl);
    report.warnings.push(...warnings);
    report.files.found = files.length;
    say(`Copying ${files.length} stored files…`);

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      try {
        const body = await fetchFile(file.key);
        await options.target.put(
          `${runId}/files/${file.key}`,
          body,
          "application/octet-stream"
        );
        report.files.copied += 1;
        report.files.bytes += body.byteLength;
      } catch (error) {
        report.files.failed.push({ key: file.key, reason: message(error) });
      }
      if ((index + 1) % 25 === 0) say(`  …${index + 1}/${files.length}`);
    }
    say(`Files: ${report.files.copied}/${files.length} copied.`);
  } catch (error) {
    report.errors.push(`File collection failed: ${message(error)}`);
  }

  // 4. The manifest, last, so it describes what actually happened.
  const finished = finish();
  try {
    await writeManifest(options.target, runId, finished);
  } catch (error) {
    finished.errors.push(`Manifest upload failed: ${message(error)}`);
    finished.ok = false;
  }

  return finished;
}

async function writeManifest(
  target: BackupTarget,
  runId: string,
  report: BackupReport
): Promise<void> {
  const manifest = {
    ...report,
    fileSources: FILE_SOURCES,
  };
  await target.put(
    `${runId}/manifest.json`,
    Buffer.from(JSON.stringify(manifest, null, 2), "utf8"),
    "application/json"
  );
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** One-screen summary for a terminal or a toast. */
export function summarise(report: BackupReport): string {
  const lines = [
    report.ok
      ? `Backup OK — ${report.runId}`
      : `Backup FAILED — ${report.runId}`,
    `  destination: ${report.target}`,
  ];
  if (report.database) {
    lines.push(
      `  database:    ${report.database.tableCount} tables, ${report.database.rowCount} rows, ${kb(report.database.dumpBytes)} gzipped`
    );
  } else {
    lines.push(`  database:    NOT BACKED UP`);
  }
  lines.push(
    `  files:       ${report.files.copied}/${report.files.found} copied, ${kb(report.files.bytes)}`
  );
  for (const warning of report.warnings)
    lines.push(`  warning:     ${warning}`);
  for (const failure of report.files.failed) {
    lines.push(`  FAILED FILE: ${failure.key} — ${failure.reason}`);
  }
  for (const error of report.errors) lines.push(`  ERROR:       ${error}`);
  return lines.join("\n");
}

function kb(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
