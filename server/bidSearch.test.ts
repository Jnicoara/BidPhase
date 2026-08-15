/**
 * Historical bid search: correct, scoped, and still fast with real volume.
 *
 * ── Three things being proved ────────────────────────────────────────────────
 *   1. Every filter finds what it should and nothing it should not, alone and
 *      combined. A search that is right on one filter and wrong on a pair is
 *      the normal way this goes wrong, so the combinations are tested as
 *      first-class cases rather than assumed from the parts.
 *
 *   2. It works at volume. `describeDb("with a few thousand bids")` seeds 3,000
 *      and pages the whole way through — a handful of test records would prove
 *      the SQL parses, not that the design holds. That block also asserts the
 *      properties that only volume can break: no row repeated across a page
 *      boundary, no row skipped, and deep pages costing what shallow ones cost.
 *
 *   3. It cannot cross a company. The search takes a scope, not a user id from
 *      the caller, and a second contractor's bids must be invisible however the
 *      filters are arranged.
 *
 * Fixture ids are distinct from every other suite — vitest runs files in
 * parallel and shared ids delete each other's rows mid-run.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { bids, clients, users } from "../drizzle/schema";
import {
  clampPageSize,
  containsPattern,
  dateRangeBounds,
  decodeCursor,
  decodeNameCursor,
  describeFilters,
  encodeCursor,
  encodeNameCursor,
  escapeLike,
  hasAnyFilter,
  rangeIsBackwards,
  toPage,
  usableTerm,
  PAGE_SIZE_MAX,
} from "../shared/bidSearch";
import type { TrpcContext } from "./_core/context";

const USER = 9601;
const OTHER = 9602;
const BULK = 9603;

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

const callerFor = (userId: number) =>
  appRouter.createCaller({
    user: {
      id: userId,
      openId: `test-bidsearch-${userId}`,
      role: "user",
      accessTier: "standard",
    },
  } as unknown as TrpcContext);

const caller = () => callerFor(USER);

// ── The pure pieces ──────────────────────────────────────────────────────────

describe("LIKE safety", () => {
  it("neutralises the wildcards a user might type", () => {
    // "50% deposit" would otherwise match every bid in the company.
    expect(escapeLike("50%")).toBe("50\\%");
    expect(escapeLike("A_1")).toBe("A\\_1");
    expect(escapeLike("back\\slash")).toBe("back\\\\slash");
  });

  it("escapes the backslash before the wildcards, not after", () => {
    // The other order double-escapes and turns one character into three.
    expect(escapeLike("\\%")).toBe("\\\\\\%");
  });

  it("wraps a term for a contains match", () => {
    expect(containsPattern("  maple  ")).toBe("%maple%");
    expect(containsPattern("50%")).toBe("%50\\%%");
  });

  it("treats an empty box as no filter at all", () => {
    expect(usableTerm("")).toBeNull();
    expect(usableTerm("   ")).toBeNull();
    expect(usableTerm(undefined)).toBeNull();
    expect(usableTerm(" maple ")).toBe("maple");
  });
});

describe("page sizes are bounded", () => {
  it("defaults, floors and caps", () => {
    expect(clampPageSize(undefined)).toBe(25);
    expect(clampPageSize(0)).toBe(1);
    expect(clampPageSize(10)).toBe(10);
    expect(clampPageSize(99999)).toBe(PAGE_SIZE_MAX);
    expect(clampPageSize(Number.NaN)).toBe(25);
  });
});

describe("cursors", () => {
  it("round-trips", () => {
    const cursor = { at: 1786742248195, id: 4242 };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("is opaque rather than a readable position", () => {
    expect(encodeCursor({ at: 1, id: 2 })).not.toContain("1.2");
  });

  it("treats a malformed cursor as the beginning, not an error", () => {
    // A stale bookmark should show page one, not an error page.
    expect(decodeCursor("not-a-cursor")).toBeNull();
    expect(decodeCursor("")).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor(Buffer.from("x.y").toString("base64url"))).toBeNull();
  });

  it("round-trips a name cursor, which the client list uses", () => {
    expect(decodeNameCursor(encodeNameCursor("O'Brien, Sam", 7))).toEqual({
      name: "O'Brien, Sam",
      id: 7,
    });
    expect(decodeNameCursor("garbage")).toBeNull();
  });

  it("signals another page by taking one row more than the page", () => {
    const rows = [1, 2, 3, 4].map(id => ({ id, at: new Date(id * 1000) }));
    const full = toPage(rows, 3, r => r.at);
    expect(full.items).toHaveLength(3);
    expect(full.nextCursor).not.toBeNull();

    const last = toPage(rows.slice(0, 2), 3, r => r.at);
    expect(last.items).toHaveLength(2);
    expect(last.nextCursor).toBeNull();
  });
});

describe("date ranges", () => {
  it("makes the end date inclusive", () => {
    // The classic off-by-one: `<= 2026-03-31` means midnight, which silently
    // drops everything that happened on the last day of the range.
    const { start, end } = dateRangeBounds("2026-03-01", "2026-03-31");
    expect(start!.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(end!.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });

  it("accepts an open-ended range at either end", () => {
    expect(dateRangeBounds("2026-01-01", undefined).end).toBeNull();
    expect(dateRangeBounds(undefined, "2026-01-01").start).toBeNull();
  });

  it("ignores text that is not a date", () => {
    expect(dateRangeBounds("last tuesday", "soon")).toEqual({
      start: null,
      end: null,
    });
  });

  it("notices a range that is the wrong way round", () => {
    expect(rangeIsBackwards("2026-06-01", "2026-01-01")).toBe(true);
    expect(rangeIsBackwards("2026-01-01", "2026-06-01")).toBe(false);
    expect(rangeIsBackwards("2026-01-01", undefined)).toBe(false);
  });
});

describe("describing a search", () => {
  it("knows when nothing is filtered", () => {
    expect(hasAnyFilter({})).toBe(false);
    expect(hasAnyFilter({ text: "  " })).toBe(false);
    expect(hasAnyFilter({ text: "maple" })).toBe(true);
    expect(hasAnyFilter({ archive: "all" })).toBe(true);
    expect(hasAnyFilter({ archive: "live" })).toBe(false);
  });

  it("says what is being shown, in words", () => {
    expect(
      describeFilters({ client: "Northwood", trade: "electrical" })
    ).toContain('for "Northwood"');
    expect(
      describeFilters({
        from: "2026-01-01",
        to: "2026-06-01",
        dateField: "due",
      })
    ).toContain("due 2026-01-01 to 2026-06-01");
  });
});

// ── Against real rows ────────────────────────────────────────────────────────

describeDb("searching a company's history", () => {
  const uniq = () => `${Date.now()}${Math.random()}`;

  async function seedBid(over: {
    name: string;
    clientName?: string | null;
    siteAddress?: string | null;
    trades?: string[];
    status?: "Draft" | "Active" | "Won" | "Lost";
    createdAt?: Date;
    dueDate?: string | null;
    archivedAt?: Date | null;
    clientId?: number | null;
    userId?: number;
  }) {
    const database = await getDb();
    const [row] = await database!.insert(bids).values({
      userId: over.userId ?? USER,
      name: over.name,
      clientName: over.clientName ?? null,
      siteAddress: over.siteAddress ?? null,
      trades: over.trades ?? ["electrical"],
      status: over.status ?? "Draft",
      dueDate: over.dueDate ?? null,
      archivedAt: over.archivedAt ?? null,
      clientId: over.clientId ?? null,
      ...(over.createdAt
        ? { createdAt: over.createdAt, updatedAt: over.createdAt }
        : {}),
    });
    return row.insertId;
  }

  const names = async (
    input: Parameters<ReturnType<typeof caller>["bids"]["search"]>[0]
  ) => (await caller().bids.search(input)).items.map(b => b.name).sort();

  beforeAll(async () => {
    if (!hasDb) return;
    const database = await getDb();
    if (!database) return;
    for (const id of [USER, OTHER, BULK]) {
      const [existing] = await database
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      if (!existing) {
        await database.insert(users).values({
          id,
          openId: `test-bidsearch-${id}`,
          name: `Search user ${id}`,
        });
      }
    }
  });

  beforeEach(async () => {
    if (!hasDb) return;
    const database = await getDb();
    if (!database) return;
    await database.delete(bids).where(inArray(bids.userId, [USER, OTHER]));
    await database
      .delete(clients)
      .where(inArray(clients.userId, [USER, OTHER]));
  });

  // ── Each filter on its own ────────────────────────────────────────────────

  it("finds by the client typed on the bid", async () => {
    await seedBid({ name: "Alpha", clientName: "Northwood Builders" });
    await seedBid({ name: "Beta", clientName: "Southgate Homes" });
    expect(await names({ client: "northwood" })).toEqual(["Alpha"]);
  });

  it("finds by the LINKED client's name, not just the typed one", async () => {
    // The case a naive implementation misses entirely: a bid created through
    // the client picker carries only the link, and its clientName is null.
    const database = await getDb();
    const [client] = await database!.insert(clients).values({
      userId: USER,
      name: "Harborview Development",
      address: "9 Dock Road",
    });
    await seedBid({ name: "Linked", clientId: client.insertId });
    await seedBid({ name: "Unlinked", clientName: "Someone Else" });

    expect(await names({ client: "harborview" })).toEqual(["Linked"]);
    // …and by the linked client's ADDRESS too.
    expect(await names({ address: "dock road" })).toEqual(["Linked"]);
  });

  it("finds by the site address on the bid", async () => {
    await seedBid({ name: "Maple", siteAddress: "12 Maple St, Portland" });
    await seedBid({ name: "Oak", siteAddress: "40 Oak Ave, Salem" });
    expect(await names({ address: "maple" })).toEqual(["Maple"]);
    expect(await names({ address: "salem" })).toEqual(["Oak"]);
  });

  it("finds by trade", async () => {
    await seedBid({ name: "Sparks", trades: ["electrical"] });
    await seedBid({ name: "Pipes", trades: ["plumbing"] });
    await seedBid({ name: "Both", trades: ["electrical", "plumbing"] });
    expect(await names({ trade: "plumbing" })).toEqual(["Both", "Pipes"]);
    expect(await names({ trade: "electrical" })).toEqual(["Both", "Sparks"]);
  });

  it("finds by status", async () => {
    await seedBid({ name: "WonJob", status: "Won" });
    await seedBid({ name: "LostJob", status: "Lost" });
    expect(await names({ status: "Won" })).toEqual(["WonJob"]);
  });

  it("finds by a created date range, with both ends inclusive", async () => {
    await seedBid({
      name: "Before",
      createdAt: new Date("2026-02-28T12:00:00Z"),
    });
    await seedBid({
      name: "First",
      createdAt: new Date("2026-03-01T00:30:00Z"),
    });
    await seedBid({
      name: "Last",
      createdAt: new Date("2026-03-31T23:30:00Z"),
    });
    await seedBid({
      name: "After",
      createdAt: new Date("2026-04-01T01:00:00Z"),
    });

    expect(
      await names({
        dateField: "created",
        from: "2026-03-01",
        to: "2026-03-31",
      })
    ).toEqual(["First", "Last"]);
  });

  it("finds by a due date range", async () => {
    await seedBid({ name: "DueEarly", dueDate: "2026-05-01" });
    await seedBid({ name: "DueLate", dueDate: "2026-09-01" });
    await seedBid({ name: "NoDueDate", dueDate: null });
    expect(
      await names({ dateField: "due", from: "2026-04-01", to: "2026-06-30" })
    ).toEqual(["DueEarly"]);
  });

  it("searches everything at once from the single box", async () => {
    await seedBid({ name: "Riverside rewire" });
    await seedBid({ name: "Job B", clientName: "Riverside Properties" });
    await seedBid({ name: "Job C", siteAddress: "3 Riverside Way" });
    await seedBid({ name: "Unrelated", clientName: "Nothing" });
    expect(await names({ text: "riverside" })).toEqual([
      "Job B",
      "Job C",
      "Riverside rewire",
    ]);
  });

  // ── Combinations ──────────────────────────────────────────────────────────

  it("ANDs filters rather than ORing them", async () => {
    await seedBid({
      name: "Match",
      clientName: "Northwood",
      trades: ["electrical"],
      status: "Won",
    });
    await seedBid({
      name: "WrongTrade",
      clientName: "Northwood",
      trades: ["plumbing"],
      status: "Won",
    });
    await seedBid({
      name: "WrongStatus",
      clientName: "Northwood",
      trades: ["electrical"],
      status: "Lost",
    });
    await seedBid({
      name: "WrongClient",
      clientName: "Someone",
      trades: ["electrical"],
      status: "Won",
    });

    expect(
      await names({ client: "northwood", trade: "electrical", status: "Won" })
    ).toEqual(["Match"]);
  });

  it("combines a date range with a text search", async () => {
    await seedBid({
      name: "Maple in range",
      siteAddress: "1 Maple",
      createdAt: new Date("2026-03-15T00:00:00Z"),
    });
    await seedBid({
      name: "Maple out of range",
      siteAddress: "2 Maple",
      createdAt: new Date("2025-03-15T00:00:00Z"),
    });
    expect(
      await names({
        text: "maple",
        dateField: "created",
        from: "2026-01-01",
        to: "2026-12-31",
      })
    ).toEqual(["Maple in range"]);
  });

  it("returns nothing, rather than everything, when nothing matches", async () => {
    await seedBid({ name: "Alpha", clientName: "Northwood" });
    expect(await names({ client: "nobody-by-that-name" })).toEqual([]);
  });

  // ── The escaping, end to end ──────────────────────────────────────────────

  it("treats a percent sign in the search as a character", async () => {
    await seedBid({ name: "50% deposit job" });
    await seedBid({ name: "Ordinary job" });
    // Unescaped, `%` is a wildcard and this would match both.
    expect(await names({ text: "50%" })).toEqual(["50% deposit job"]);
  });

  it("treats an underscore as a character", async () => {
    await seedBid({ name: "A_1 panel" });
    await seedBid({ name: "AB1 panel" });
    expect(await names({ text: "A_1" })).toEqual(["A_1 panel"]);
  });

  // ── Archived ──────────────────────────────────────────────────────────────

  it("leaves archived bids out by default and finds them on request", async () => {
    await seedBid({ name: "Live one" });
    await seedBid({ name: "Archived one", archivedAt: new Date() });

    expect(await names({})).toEqual(["Live one"]);
    expect(await names({ archive: "archived" })).toEqual(["Archived one"]);
    expect(await names({ archive: "all" })).toEqual([
      "Archived one",
      "Live one",
    ]);
  });

  // ── Scope ─────────────────────────────────────────────────────────────────

  it("never returns another company's bids, however the filters are set", async () => {
    await seedBid({
      name: "Theirs",
      userId: OTHER,
      clientName: "Northwood",
      trades: ["electrical"],
    });
    await seedBid({ name: "Mine", clientName: "Northwood" });

    // Every filter shape, and none of them may reach across.
    for (const input of [
      {},
      { text: "northwood" },
      { client: "northwood" },
      { trade: "electrical" },
      { archive: "all" as const },
      { text: "" },
    ]) {
      const found = await names(input);
      expect({ input, found }).toEqual({ input, found: ["Mine"] });
    }
  });

  it("shows the other company their own bid, so the test above means something", async () => {
    await seedBid({ name: "Theirs", userId: OTHER });
    const theirs = await callerFor(OTHER).bids.search({});
    expect(theirs.items.map(b => b.name)).toEqual(["Theirs"]);
  });

  it("refuses a backwards date range instead of silently finding nothing", async () => {
    await expect(
      caller().bids.search({ from: "2026-12-01", to: "2026-01-01" })
    ).rejects.toThrow(/after its end/i);
  });

  it("lists only the trades this company has actually bid", async () => {
    await seedBid({ name: "A", trades: ["electrical"] });
    await seedBid({ name: "B", trades: ["plumbing", "electrical"] });
    await seedBid({ name: "Theirs", userId: OTHER, trades: ["hvac"] });

    const trades = await caller().bids.usedTrades();
    expect(trades).toEqual(["electrical", "plumbing"]);
    expect(trades).not.toContain("hvac");
  });
});

// ── Volume ───────────────────────────────────────────────────────────────────

describeDb("with a few thousand bids", () => {
  const TOTAL = 3000;
  const MATCHING = 300;

  beforeAll(async () => {
    if (!hasDb) return;
    const database = await getDb();
    if (!database) return;

    const [existing] = await database
      .select()
      .from(users)
      .where(eq(users.id, BULK))
      .limit(1);
    if (!existing) {
      await database.insert(users).values({
        id: BULK,
        openId: `test-bidsearch-${BULK}`,
        name: "Bulk search user",
      });
    }

    await database.delete(bids).where(eq(bids.userId, BULK));

    // Spread across two years so a date range genuinely narrows, and give
    // every tenth bid a distinctive client so a term matches a known count.
    const base = new Date("2025-01-01T00:00:00Z").getTime();
    const rows = Array.from({ length: TOTAL }, (_, i) => ({
      userId: BULK,
      name: `Bulk bid ${i}`,
      clientName: i % 10 === 0 ? "Ridgeline Construction" : `Client ${i}`,
      siteAddress: `${i} Example Road`,
      trades: i % 3 === 0 ? ["plumbing"] : ["electrical"],
      status: (["Draft", "Active", "Won", "Lost"] as const)[i % 4],
      createdAt: new Date(base + i * 6 * 60 * 60 * 1000),
      updatedAt: new Date(base + i * 6 * 60 * 60 * 1000),
    }));
    for (let i = 0; i < rows.length; i += 500) {
      await database.insert(bids).values(rows.slice(i, i + 500));
    }
  }, 120_000);

  /** Page all the way through a search, collecting every id it returns. */
  async function pageThrough(
    input: Parameters<ReturnType<typeof callerFor>["bids"]["search"]>[0],
    pageSize = 100
  ) {
    const ids: number[] = [];
    let cursor: string | null | undefined = undefined;
    let pages = 0;
    do {
      const page = await callerFor(BULK).bids.search({
        ...input,
        pageSize,
        cursor,
      });
      ids.push(...page.items.map(b => b.id));
      cursor = page.nextCursor;
      pages++;
      // A runaway cursor would loop forever; fail loudly instead.
      expect(pages).toBeLessThan(200);
    } while (cursor);
    return { ids, pages };
  }

  it("seeded the volume it claims to have", async () => {
    const { ids } = await pageThrough({});
    expect(ids).toHaveLength(TOTAL);
  }, 120_000);

  it("pages without repeating or skipping a single bid", async () => {
    // The property keyset pagination exists for. With OFFSET, or with a cursor
    // that had no tiebreaker, rows sharing a timestamp land on both sides of a
    // page boundary or on neither.
    const { ids } = await pageThrough({}, 37); // deliberately not a round number
    expect(new Set(ids).size).toBe(TOTAL);
    expect(ids).toHaveLength(TOTAL);
  }, 120_000);

  it("returns the same set whichever page size it is read at", async () => {
    const small = await pageThrough({}, 25);
    const large = await pageThrough({}, 100);
    expect(new Set(small.ids)).toEqual(new Set(large.ids));
    expect(small.pages).toBeGreaterThan(large.pages);
  }, 120_000);

  it("filters in SQL — a term returns only its matches, not a filtered page", async () => {
    // The tell for client-side filtering: pages that come back short because
    // the filter was applied after the page was cut.
    const { ids } = await pageThrough({ client: "Ridgeline" });
    expect(ids).toHaveLength(MATCHING);
  }, 120_000);

  it("keeps a deep page as cheap as a shallow one", async () => {
    const first = await callerFor(BULK).bids.search({ pageSize: 25 });

    // Walk to roughly the hundredth page.
    let cursor = first.nextCursor;
    for (let i = 0; i < 100 && cursor; i++) {
      const page = await callerFor(BULK).bids.search({ pageSize: 25, cursor });
      cursor = page.nextCursor;
    }
    expect(cursor).toBeTruthy();

    const started = Date.now();
    const deep = await callerFor(BULK).bids.search({ pageSize: 25, cursor });
    const elapsed = Date.now() - started;

    expect(deep.items).toHaveLength(25);
    // Generous — this is a smoke alarm for an O(offset) regression, not a
    // benchmark. A page-2500 OFFSET scan would blow well past this.
    expect(elapsed).toBeLessThan(2000);
  }, 180_000);

  it("bounds the response even when asked for everything", async () => {
    const page = await callerFor(BULK).bids.search({ pageSize: 100 });
    expect(page.items.length).toBeLessThanOrEqual(PAGE_SIZE_MAX);
    expect(page.nextCursor).toBeTruthy();
  }, 60_000);

  it("narrows by date across the whole range", async () => {
    const { ids } = await pageThrough({
      dateField: "created",
      from: "2025-01-01",
      to: "2025-01-31",
    });
    // 31 days at four bids a day, inclusive of both ends.
    expect(ids.length).toBeGreaterThan(100);
    expect(ids.length).toBeLessThan(TOTAL);
  }, 120_000);

  it("combines a term, a trade and a status at volume", async () => {
    const { ids } = await pageThrough({
      client: "Ridgeline",
      trade: "plumbing",
      status: "Draft",
    });
    // Every tenth bid is Ridgeline; of those, the ones divisible by 3 are
    // plumbing and by 4 are Draft — so multiples of 60 within 3000.
    expect(ids).toHaveLength(50);
  }, 120_000);

  it("still cannot see another company's bids at volume", async () => {
    const mine = await callerFor(USER).bids.search({ pageSize: 100 });
    expect(mine.items.every(b => b.userId === USER)).toBe(true);
  }, 60_000);
});
