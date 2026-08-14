/**
 * Take a backup, from a terminal.
 *
 *   pnpm tsx scripts/backup.mts
 *
 * ── The primary trigger, not the fallback ───────────────────────────────────
 * There is an admin route too (server/routers/backupRouter.ts), but this is the
 * one to reach for. It needs nothing but DATABASE_URL and the four R2 values —
 * no login, no session, no deployed app, and no request timeout sitting over a
 * job that legitimately takes minutes. On the day this matters, the app being
 * up is not a safe assumption.
 *
 * Exits 0 only on a completely clean run. Any failed file, any error, exits 1,
 * so this can be trusted by anything that checks an exit code later.
 *
 * Secrets come from the environment. `.env` is loaded, and is gitignored.
 */
import "dotenv/config";
import { readR2Config, REQUIRED_VARS } from "../server/backup/config";
import { createR2Target } from "../server/backup/target";
import { runBackup, summarise } from "../server/backup/runBackup";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Nothing to back up.");
  process.exit(1);
}

const configResult = readR2Config();
if (!configResult.ok) {
  console.error(
    [
      "Cloudflare R2 is not configured. Missing:",
      ...configResult.missing.map(name => `  ${name}`),
      "",
      `Set all of: ${REQUIRED_VARS.join(", ")}`,
      "Optional:   R2_ENDPOINT (defaults to <account>.r2.cloudflarestorage.com), R2_BACKUP_PREFIX (defaults to 'helixbid')",
    ].join("\n")
  );
  process.exit(1);
}

const report = await runBackup({
  databaseUrl,
  target: createR2Target(configResult.config),
  onProgress: message => console.log(message),
});

console.log(`\n${summarise(report)}`);
process.exit(report.ok ? 0 : 1);
