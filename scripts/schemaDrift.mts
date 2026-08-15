/**
 * Is the database this DATABASE_URL points at behind the code?
 *
 *   pnpm tsx scripts/schemaDrift.mts
 *
 * ── Run this in a Manus sandbox before and after `pnpm db:push` ──────────────
 * references/deploying.md § 5 says to compare the migrations in the repo
 * against what the database has actually run, and until now there was no way
 * to do it — `ls drizzle/*.sql | wc -l` counts files, which tells you nothing
 * about the other end. This answers the real question: which columns does the
 * code expect that this database does not have.
 *
 * Exits 1 on drift so it can gate a deploy step; 0 when they agree.
 */
import "dotenv/config";
import {
  appliedMigrationCount,
  describeDrift,
  findSchemaDrift,
} from "../server/schemaCheck";

const applied = await appliedMigrationCount();
console.log(
  applied === null
    ? "No __drizzle_migrations table — this database has never been migrated."
    : `Migrations recorded in this database: ${applied}`
);

const drift = await findSchemaDrift();
console.log(describeDrift(drift));
process.exit(drift.length === 0 ? 0 : 1);
