/**
 * The rule that no ordinary test catches: the database has the columns the code
 * declares.
 *
 * ── Why this is a test rather than only a script ─────────────────────────────
 * Every read in this app is a bare `select()`, which drizzle expands to every
 * column in drizzle/schema.ts. So adding a column to the schema and forgetting
 * to generate or apply its migration does not break the feature being built —
 * it breaks every UNRELATED screen that reads the same table, at runtime, on
 * whichever environment is behind. The bid archive is the case that prompted
 * this: `getArchivedBids` names `isSample` and the four tax columns whether or
 * not a bid uses them, so a database without migration 0043 failed the whole
 * archive query while everything the author was working on looked fine.
 *
 * A test cannot fix a deployed database. What it can do is make the mistake
 * visible at the moment it is made, on the machine of the person who made it,
 * instead of days later in somebody else's console.
 *
 * Same genre as server/scopeDiscipline.test.ts — a mechanical rule that happens
 * to live in the suite because there is nowhere better to put it.
 *
 * ── A failure here is not flaky ──────────────────────────────────────────────
 * It is deterministic and it names the fix. If it fails, this machine's
 * database is behind: run `pnpm db:push`. That is the good kind of red — it
 * tells you something true that you needed to know.
 */
import { describe, it, expect } from "vitest";
import { describeDrift, findSchemaDrift } from "./schemaCheck";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("the database matches the schema", () => {
  it("has every column the code declares", async () => {
    const drift = await findSchemaDrift();
    // The message carries the whole diagnosis, so a failure reads as
    // instructions rather than as a bare length mismatch.
    expect(describeDrift(drift)).toBe("Database matches the schema.");
    expect(drift).toEqual([]);
  });

  it("names the missing columns when something is adrift", () => {
    // The reporting itself, without needing a broken database to see it.
    const message = describeDrift([
      { table: "bids", missingTable: false, missingColumns: ["isSample"] },
    ]);
    expect(message).toContain("bids — missing isSample");
    expect(message).toContain("pnpm db:push");
  });
});
