/**
 * Does the database this process is talking to actually have the columns the
 * code expects?
 *
 * ── The failure this exists to catch ─────────────────────────────────────────
 * Almost every read in this app is a bare `db.select().from(table)`, which
 * drizzle expands to EVERY column declared in drizzle/schema.ts. So a database
 * that is one migration behind does not lose one field — the whole statement
 * fails with `Unknown column`, and the screen behind it dies.
 *
 * That is exactly what happened to the bid archive: `getArchivedBids` names
 * `isSample` (migration 0043) and the four tax columns (0036) whether or not
 * any bid uses them, so on an environment that had not run those, opening the
 * archive threw. Nothing was wrong with the query.
 *
 * ── Why this is a separate check and not a guard on each query ───────────────
 * The tempting fix is to make the failing query defensive — select fewer
 * columns, or catch and degrade. Both are worse: they turn a loud, accurate
 * error into a screen that quietly shows incomplete data, which is precisely
 * the failure mode CLAUDE.md's deploy section warns about ("it starts, serves
 * pages and shows wrong data, which is the expensive way to find out"). The
 * error is correct. What was missing was a way to ask the question directly.
 *
 * ── Read-only, and it says nothing about types ───────────────────────────────
 * Presence only. It will not notice a column that exists at the wrong width or
 * nullability, because information_schema comparison across drizzle's type
 * mapping is a much bigger job with a much worse false-positive rate — and the
 * failure being chased here is a column that is simply not there. Round-tripping
 * real values is what covers the rest, and that belongs in the feature's own
 * test (see server/bidArchive.test.ts).
 */
import { sql } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/mysql-core";
import * as schema from "../drizzle/schema";
import { getDb } from "./db";

export type TableDrift = {
  table: string;
  /** True when the table itself is absent, not merely some of its columns. */
  missingTable: boolean;
  missingColumns: string[];
};

/** Every table drizzle declares, with the column names it expects. */
function declaredTables(): Array<{ name: string; columns: string[] }> {
  const tables: Array<{ name: string; columns: string[] }> = [];
  for (const value of Object.values(schema)) {
    if (typeof value !== "object" || value === null) continue;
    let config;
    try {
      config = getTableConfig(value as never);
    } catch {
      // Not a table — the module also exports enums, types and constants.
      continue;
    }
    tables.push({
      name: config.name,
      columns: config.columns.map(column => column.name),
    });
  }
  return tables;
}

/**
 * What the code expects and the database does not have.
 *
 * Returns an empty array when they agree. One query per table against
 * `information_schema`, which is cheap and read-only — this is a diagnostic,
 * not something on a request path.
 */
export async function findSchemaDrift(): Promise<TableDrift[]> {
  const db = await getDb();
  if (!db) throw new Error("No database connection — is DATABASE_URL set?");

  const drift: TableDrift[] = [];
  for (const table of declaredTables()) {
    const [rows] = (await db.execute(
      sql`SELECT COLUMN_NAME FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ${table.name}`
    )) as unknown as [Array<{ COLUMN_NAME: string }>];

    if (rows.length === 0) {
      drift.push({
        table: table.name,
        missingTable: true,
        missingColumns: table.columns,
      });
      continue;
    }

    const live = new Set(rows.map(row => row.COLUMN_NAME));
    const missingColumns = table.columns.filter(column => !live.has(column));
    if (missingColumns.length > 0) {
      drift.push({ table: table.name, missingTable: false, missingColumns });
    }
  }
  return drift;
}

/** How many migrations this database believes it has run. */
export async function appliedMigrationCount(): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const [rows] = (await db.execute(
      sql`SELECT COUNT(*) AS n FROM __drizzle_migrations`
    )) as unknown as [Array<{ n: number | string }>];
    return Number(rows[0]?.n ?? 0);
  } catch {
    // The table is absent on a database that has never been migrated at all,
    // which is a legitimate answer rather than an error.
    return null;
  }
}

/** The drift as something a person reads and can act on. */
export function describeDrift(drift: readonly TableDrift[]): string {
  if (drift.length === 0) return "Database matches the schema.";
  const lines = drift.map(entry =>
    entry.missingTable
      ? `  ${entry.table} — table missing entirely`
      : `  ${entry.table} — missing ${entry.missingColumns.join(", ")}`
  );
  return [
    `This database is behind the code in ${drift.length} table(s):`,
    ...lines,
    "",
    "Run `pnpm db:push` against it. Until then, any screen whose query",
    "touches a missing column fails outright — see server/schemaCheck.ts.",
  ].join("\n");
}
