/**
 * The sample bid: real enough to be useful, flagged enough to be safe.
 *
 * ── The two claims being defended ────────────────────────────────────────────
 *
 *   1. It CANNOT be mistaken for a real bid. Not because it is labelled — a
 *      label is a promise kept by remembering — but because `isSample` is a
 *      column and every money aggregate filters on it. The dashboard total is
 *      the sharp case: a row gets inspected, a headline number does not, so a
 *      fictional figure folded into "Out for bid" is the worst version of this
 *      failure.
 *
 *   2. It CANNOT corrupt real data, and real data cannot corrupt it. The
 *      strong form of that claim is not "we are careful" but "there is nothing
 *      to corrupt": seeding writes a bid and a client and touches no material,
 *      assembly, labor rate or company setting. `describe("leaves the library
 *      and the company settings alone")` asserts that by snapshotting the
 *      account before and after.
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
  SAMPLE_BID_NAME,
  SAMPLE_EXPENSES,
  SAMPLE_LINES,
  SAMPLE_MARKUP_PCT,
  SAMPLE_OVERHEAD_PCT,
  countsTowardTotals,
  looksLikeSampleName,
  realBidValue,
} from "../shared/sampleProject";
import type { TrpcContext } from "./_core/context";

const USER = 9801;
const OTHER = 9802;
const ALL = [USER, OTHER];

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

const callerFor = (userId: number) =>
  appRouter.createCaller({
    user: {
      id: userId,
      openId: `test-sample-${userId}`,
      role: "user",
      accessTier: "standard",
    },
  } as unknown as TrpcContext);

const caller = () => callerFor(USER);
const uniq = () => `${Date.now()}${Math.random()}`;

// ── The rule, on its own ─────────────────────────────────────────────────────

describe("what counts as the contractor's own money", () => {
  it("excludes a sample and includes everything else", () => {
    expect(countsTowardTotals({ isSample: true })).toBe(false);
    expect(countsTowardTotals({ isSample: false })).toBe(true);
    // An older row with no flag at all is real — the column defaults to false,
    // and treating undefined as "sample" would hide genuine bids.
    expect(countsTowardTotals({})).toBe(true);
  });

  it("sums only the real bids, and says how many it left out", () => {
    const result = realBidValue(
      [
        { isSample: false, price: 1000 },
        { isSample: true, price: 15000 },
        { isSample: false, price: 500 },
      ],
      bid => bid.price
    );
    expect(result).toEqual({ total: 1500, count: 2, sampleExcluded: 1 });
  });

  it("is not fooled into using the name instead of the flag", () => {
    // A user is free to rename the sample, and free to name a real bid
    // anything. The helper exists for explaining a row to a human, never for
    // deciding what is real.
    expect(looksLikeSampleName(SAMPLE_BID_NAME)).toBe(true);
    expect(looksLikeSampleName("Maple Street duplex")).toBe(false);
    expect(countsTowardTotals({ isSample: false })).toBe(true);
  });
});

describe("the sample content itself", () => {
  it("is a job big enough to demonstrate something", () => {
    // A three-line job would show nothing about how the app handles a real
    // take-off. This is a small retail buildout.
    expect(SAMPLE_LINES.length).toBeGreaterThanOrEqual(6);
    const pieces = SAMPLE_LINES.reduce((sum, line) => sum + line.qty, 0);
    expect(pieces).toBeGreaterThan(50);
  });

  it("carries a labor modifier on at least one line", () => {
    // So the breakdown has something to explain — "see how modifiers work" is
    // one of the things the sample exists for.
    const withModifier = SAMPLE_LINES.filter(
      line => (line.modifierPct ?? 0) > 0
    );
    expect(withModifier.length).toBeGreaterThan(0);
    expect(withModifier[0].modifierNames?.length).toBeGreaterThan(0);
  });

  it("prices every line, since an unpriced sample demonstrates nothing", () => {
    for (const line of SAMPLE_LINES) {
      expect({
        name: line.assemblyName,
        priced: line.materialCost > 0,
      }).toEqual({ name: line.assemblyName, priced: true });
      expect(line.laborHours).toBeGreaterThan(0);
    }
  });

  it("shows both expense switches doing different things", () => {
    const flags = SAMPLE_EXPENSES.map(e => `${e.taxable}/${e.markedUp}`);
    expect(new Set(flags).size).toBeGreaterThan(1);
  });
});

// ── Against the real stack ───────────────────────────────────────────────────

describeDb("a genuinely new account", () => {
  beforeAll(async () => {
    if (!hasDb) return;
    const database = await getDb();
    if (!database) return;
    for (const id of ALL) {
      const [existing] = await database
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      if (!existing) {
        await database.insert(users).values({
          id,
          openId: `test-sample-${id}`,
          name: `Sample user ${id}`,
        });
      }
    }
  });

  beforeEach(async () => {
    if (!hasDb) return;
    const database = await getDb();
    if (!database) return;
    await database.delete(bids).where(inArray(bids.userId, ALL));
    await database.delete(clients).where(inArray(clients.userId, ALL));
  });

  it("is offered the sample, because it has no bids", async () => {
    const state = await caller().sample.state();
    expect(state.isNewAccount).toBe(true);
    expect(state.sampleBidId).toBeNull();
  });

  it("stops being a new account once it has one real bid", async () => {
    await caller().bids.create({
      name: `Real ${uniq()}`,
      trades: ["electrical"],
    });
    expect((await caller().sample.state()).isNewAccount).toBe(false);
  });

  it("still counts as new when the ONLY bid is the sample", async () => {
    // Otherwise creating the sample would immediately make the app think the
    // user had started work.
    await caller().sample.create();
    const state = await caller().sample.state();
    expect(state.isNewAccount).toBe(true);
    expect(state.sampleBidId).not.toBeNull();
  });

  it("creates a priced, flagged bid with everything on it", async () => {
    const { bidId, created } = await caller().sample.create();
    expect(created).toBe(true);

    const detail = await caller().bids.get({ id: bidId });
    expect(detail.bid.isSample).toBe(true);
    expect(detail.bid.name).toBe(SAMPLE_BID_NAME);
    expect(detail.lines).toHaveLength(SAMPLE_LINES.length);

    // Priced end to end — the point of the whole feature.
    expect(detail.totals.materialCost).toBeGreaterThan(0);
    expect(detail.totals.totalLaborHours).toBeGreaterThan(0);
    expect(detail.totals.finalPrice).toBeGreaterThan(detail.totals.directCost);
    expect(detail.totals.expensesTotal).toBeGreaterThan(0);
  });

  it("prices from its own per-bid overrides, not the account's empty defaults", async () => {
    // A new account has overhead and profit unset. An inheriting sample would
    // show a bid priced at cost, which is the opposite of what it is for.
    const { bidId } = await caller().sample.create();
    const detail = await caller().bids.get({ id: bidId });
    expect(Number(detail.bid.overheadValue)).toBeCloseTo(
      SAMPLE_OVERHEAD_PCT,
      4
    );
    expect(Number(detail.bid.profitValue)).toBeCloseTo(SAMPLE_MARKUP_PCT, 4);
    expect(detail.bid.overheadEnabled).toBe(true);
  });

  it("does not create a second one", async () => {
    const first = await caller().sample.create();
    const second = await caller().sample.create();
    expect(second.created).toBe(false);
    expect(second.bidId).toBe(first.bidId);

    const all = await caller().bids.list();
    expect(all.filter(bid => bid.isSample)).toHaveLength(1);
  });

  it("is fully editable, like any other bid", async () => {
    // A sample that behaves differently from a real bid teaches the wrong
    // thing. "Change anything you like" has to be true.
    const { bidId } = await caller().sample.create();
    await expect(
      caller().bids.update({ id: bidId, name: "My renamed sample" })
    ).resolves.toBeDefined();

    const detail = await caller().bids.get({ id: bidId });
    expect(detail.bid.name).toBe("My renamed sample");
    // Renaming does NOT make it real — the flag decides, not the name.
    expect(detail.bid.isSample).toBe(true);
  });
});

// ── Unmistakable, everywhere it appears ──────────────────────────────────────

describeDb("cannot be confused with a real bid", () => {
  beforeEach(async () => {
    if (!hasDb) return;
    const database = await getDb();
    if (!database) return;
    await database.delete(bids).where(inArray(bids.userId, ALL));
    await database.delete(clients).where(inArray(clients.userId, ALL));
  });

  it("is left out of the dashboard money total", async () => {
    await caller().sample.create();
    const dashboard = await caller().bids.dashboard();
    const sample = dashboard.find(bid => bid.isSample)!;
    expect(sample.finalPrice).toBeGreaterThan(0);

    // The card carries a price — but the headline figure does not include it.
    const open = realBidValue(
      dashboard.filter(b => b.status === "Draft" || b.status === "Active"),
      b => b.finalPrice
    );
    expect(open.total).toBe(0);
    expect(open.sampleExcluded).toBe(1);
  });

  it("does not distort the total once real bids exist beside it", async () => {
    await caller().sample.create();
    const real = await caller().bids.create({
      name: `Real work ${uniq()}`,
      trades: ["electrical"],
    });
    const dashboard = await caller().bids.dashboard();
    const realPrice = dashboard.find(b => b.id === real!.id)!.finalPrice;

    const open = realBidValue(
      dashboard.filter(b => b.status === "Draft" || b.status === "Active"),
      b => b.finalPrice
    );
    expect(open.total).toBe(realPrice);
    expect(open.count).toBe(1);
  });

  it("does not tick the getting-started checklist", async () => {
    // The sharpest version of "confusable with real work". CLAUDE.md is
    // explicit that a checklist step must reflect the user's own data — one
    // that ticks because they opened an example tells a brand-new contractor
    // they have completed a bid when they have done nothing at all.
    const before = await caller().onboarding.state();
    expect(before.steps.find(s => s.id === "complete-bid")!.done).toBe(false);

    await caller().sample.create();

    const after = await caller().onboarding.state();
    expect(after.steps.find(s => s.id === "complete-bid")!.done).toBe(false);
    expect(after.steps.filter(s => s.done)).toHaveLength(0);
  });

  it("carries the flag through the bid list", async () => {
    await caller().sample.create();
    const list = await caller().bids.list();
    expect(list.filter(bid => bid.isSample)).toHaveLength(1);
  });

  it("carries the flag through search, so the badge can render", async () => {
    await caller().sample.create();
    const found = await caller().bids.search({});
    const sample = found.items.find(bid => bid.isSample);
    expect(sample).toBeDefined();
    expect(sample!.name).toBe(SAMPLE_BID_NAME);
  });

  it("marks the client it brings with it", async () => {
    await caller().sample.create();
    const list = await caller().clients.list({});
    const sample = list.items.find(client => client.isSample);
    expect(sample).toBeDefined();
    expect(sample!.name).toMatch(/^SAMPLE/);
  });

  it("names itself loudly enough to read as a sample on its own", async () => {
    // The badge is the real mechanism, but a bid title that arrives out of
    // context — in an export filename, in a browser tab — still has to say so.
    const { bidId } = await caller().sample.create();
    const detail = await caller().bids.get({ id: bidId });
    expect(detail.bid.name.toUpperCase()).toContain("SAMPLE");
  });
});

// ── Nothing to corrupt ───────────────────────────────────────────────────────

describeDb("leaves the library and the company settings alone", () => {
  beforeEach(async () => {
    if (!hasDb) return;
    const database = await getDb();
    if (!database) return;
    await database.delete(bids).where(inArray(bids.userId, ALL));
    await database.delete(clients).where(inArray(clients.userId, ALL));
  });

  /** Everything the sample could plausibly have touched, before and after. */
  async function snapshotAccount() {
    const [materials, assemblies, rates, defaults] = await Promise.all([
      caller().materials.list({ status: "active" }),
      caller().assemblies.list(),
      caller().laborRates.list(),
      caller().bids.pricingDefaults(),
    ]);
    return {
      materialCosts: materials.map(m => `${m.id}:${m.costPerUnit}`).sort(),
      assemblyHours: assemblies.map(a => `${a.id}:${a.baseLaborHours}`).sort(),
      rateCosts: rates.map(r => `${r.id}:${r.hourlyCost}`).sort(),
      defaults: JSON.stringify(defaults),
    };
  }

  it("changes nothing about materials, assemblies, rates or defaults", async () => {
    const before = await snapshotAccount();
    await caller().sample.create();
    const after = await snapshotAccount();
    expect(after).toEqual(before);
  });

  it("leaves the account as it found it once the sample is removed", async () => {
    const before = await snapshotAccount();
    const { bidId } = await caller().sample.create();
    await caller().sample.remove({ bidId });

    expect(await snapshotAccount()).toEqual(before);
    expect((await caller().bids.list()).filter(b => b.isSample)).toHaveLength(
      0
    );
    const clientList = await caller().clients.list({});
    expect(clientList.items.filter(c => c.isSample)).toHaveLength(0);
  });

  it("does not price the library, which ships at zero on purpose", async () => {
    await caller().sample.create();
    const materials = await caller().materials.list({ status: "active" });
    // Every shipped material is still $0 — the sample's money lives on its own
    // line snapshots, not in the user's catalog.
    expect(materials.every(m => Number(m.costPerUnit) === 0)).toBe(true);
  });

  it("removes the sample without being told which bid it is", async () => {
    // The no-argument form: "get rid of whichever one is the sample". It was
    // unreachable at first — .optional() on the wrapper object still required
    // bidId inside it, so an empty object failed validation.
    await caller().sample.create();
    await expect(caller().sample.remove({})).resolves.toEqual({
      success: true,
    });
    await caller().sample.create();
    await expect(caller().sample.remove()).resolves.toEqual({ success: true });
    expect((await caller().sample.state()).sampleBidId).toBeNull();
  });

  it("refuses to delete a real bid through the sample route", async () => {
    const real = await caller().bids.create({
      name: `Not a sample ${uniq()}`,
      trades: ["electrical"],
    });
    await expect(caller().sample.remove({ bidId: real!.id })).rejects.toThrow(
      /one of your own bids/i
    );

    // And it is still there.
    expect((await caller().bids.list()).some(b => b.id === real!.id)).toBe(
      true
    );
  });

  it("keeps one company's sample out of another's", async () => {
    await caller().sample.create();
    expect((await callerFor(OTHER).sample.state()).sampleBidId).toBeNull();
    expect(
      (await callerFor(OTHER).bids.list()).filter(b => b.isSample)
    ).toHaveLength(0);
  });

  it("cannot delete another company's sample", async () => {
    const { bidId } = await caller().sample.create();
    await expect(callerFor(OTHER).sample.remove({ bidId })).rejects.toThrow(
      /no sample bid|not found/i
    );
    // Still there for its owner.
    expect((await caller().sample.state()).sampleBidId).toBe(bidId);
  });
});

// ── The one export that must not accept it ───────────────────────────────────

describeDb("warns before a sample can reach real books", () => {
  beforeEach(async () => {
    if (!hasDb) return;
    const database = await getDb();
    if (!database) return;
    await database.delete(bids).where(inArray(bids.userId, ALL));
    await database.delete(clients).where(inArray(clients.userId, ALL));
  });

  it("puts the sample warning first, above every other one", async () => {
    const { bidId } = await caller().sample.create();
    const internal = appRouter.createCaller({
      user: {
        id: USER,
        openId: `test-sample-${USER}`,
        role: "user",
        accessTier: "internal",
      },
    } as unknown as TrpcContext);

    const doc = await internal.accounting.quickbooks({ bidId });
    expect(doc.warnings[0]).toMatch(/SAMPLE bid/);
    expect(doc.warnings[0]).toMatch(/Do not import/i);
  });

  it("still keeps the warning out of the exported file", async () => {
    // A warning is for the person, not the accounting system.
    const { bidId } = await caller().sample.create();
    const internal = appRouter.createCaller({
      user: {
        id: USER,
        openId: `test-sample-${USER}`,
        role: "user",
        accessTier: "internal",
      },
    } as unknown as TrpcContext);
    const doc = await internal.accounting.quickbooks({ bidId });
    const { toQuickBooksCsv } = await import("../shared/accountingExport");
    const csv = toQuickBooksCsv({
      ...doc,
      invoiceDate: new Date(doc.invoiceDate),
      dueDate: new Date(doc.dueDate),
    });
    for (const warning of doc.warnings) {
      expect(csv).not.toContain(warning);
    }
  });
});
