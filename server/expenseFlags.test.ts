/**
 * The two switches on an additional expense: Taxable and Marked up.
 *
 * ── Why all four combinations are asserted explicitly ────────────────────────
 * The switches are independent, which is easy to say and easy to get wrong in
 * exactly one direction: a shared code path that happens to work for three
 * combinations and quietly conflates the fourth. Independence is not a property
 * you can spot-check.
 *
 * The fixture is built so every figure below can be worked out by hand, and the
 * assertions are against that arithmetic rather than against the app's own
 * output — a test that asserts the code agrees with itself proves nothing:
 *
 *   materials 100 + labor 50   = 150 direct cost
 *   overhead 10%, markup 20%   → ×1.32 uplift, so work prices at 198
 *   sales tax 10% on price, materials and labor both taxable
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { appRouter } from "./routers";
import {
  getDb,
  seedBaselineAssemblies,
  seedBaselineLaborRates,
  seedBaselineMaterials,
  seedBaselineModifiers,
} from "./db";
import {
  assemblies,
  bids,
  expenseItems,
  materials,
  pricingDefaults,
  taxJurisdictions,
  users,
} from "../drizzle/schema";
import { priceExpenses, sumMarkedUpExpenses } from "../shared/bidExtras";
import type { TrpcContext } from "./_core/context";

const USER = 9201;
const hasDb = Boolean(process.env.DATABASE_URL);

const caller = () =>
  appRouter.createCaller({
    user: { id: USER, openId: `test-flags-${USER}`, role: "user" },
  } as unknown as TrpcContext);

const unique = (label: string) =>
  `${label} ${Date.now()}${Math.round(Math.random() * 1e6)}`;

// ── Pure ─────────────────────────────────────────────────────────────────────

describe("pricing charges against an uplift", () => {
  const lines = [
    { name: "Flat", amount: 100 },
    { name: "Up", amount: 100, markedUp: true },
  ];

  it("scales only the marked-up ones", () => {
    const priced = priceExpenses(lines, 1.32);
    expect(priced.lines[0].charged).toBe(100);
    expect(priced.lines[1].charged).toBe(132);
  });

  it("splits the totals the two halves of the pipeline need", () => {
    const priced = priceExpenses(lines, 1.32);
    // flatTotal is added after profit; markedUpCharged is already inside it.
    expect(priced.flatTotal).toBe(100);
    expect(priced.markedUpCharged).toBe(132);
    expect(priced.total).toBe(232);
  });

  it("leaves everything alone at an uplift of one", () => {
    const priced = priceExpenses(lines, 1);
    expect(priced.total).toBe(200);
  });

  it("counts only marked-up amounts toward the direct cost", () => {
    expect(sumMarkedUpExpenses(lines)).toBe(100);
    expect(sumMarkedUpExpenses([{ name: "Flat", amount: 100 }])).toBe(0);
  });

  it("treats a missing flag as off", () => {
    // Every row written before the switches existed has neither set.
    const priced = priceExpenses([{ name: "Legacy", amount: 100 }], 1.32);
    expect(priced.lines[0].charged).toBe(100);
    expect(priced.flatTotal).toBe(100);
  });
});

// ── Through the API ──────────────────────────────────────────────────────────

beforeAll(async () => {
  if (!hasDb) return;
  const dbc = await getDb();
  if (!dbc) return;
  const [existing] = await dbc
    .select()
    .from(users)
    .where(eq(users.id, USER))
    .limit(1);
  if (!existing) {
    await dbc.insert(users).values({
      id: USER,
      openId: `test-flags-${USER}`,
      name: "Expense flags test user",
    });
  }
  await seedBaselineMaterials();
  await seedBaselineLaborRates();
  await seedBaselineModifiers();
  await seedBaselineAssemblies();
});

beforeEach(async () => {
  if (!hasDb) return;
  const dbc = await getDb();
  if (!dbc) return;
  const ours = [USER];
  await dbc.delete(bids).where(inArray(bids.userId, ours));
  await dbc.delete(expenseItems).where(inArray(expenseItems.userId, ours));
  await dbc
    .delete(taxJurisdictions)
    .where(inArray(taxJurisdictions.userId, ours));
  await dbc.delete(assemblies).where(inArray(assemblies.userId, ours));
  await dbc.delete(materials).where(inArray(materials.userId, ours));
  await dbc
    .delete(pricingDefaults)
    .where(inArray(pricingDefaults.userId, ours));
});

/** A bid whose work costs exactly 150 and prices at exactly 198. */
async function fixture() {
  await caller().bids.setPricingDefaults({
    overheadEnabled: true,
    overheadMode: "percentage",
    overheadValue: 0.1,
    profitMethod: "markup",
    profitValue: 0.2,
    productivityPct: 0,
  });
  await caller().salesTax.setRules({
    enabled: true,
    taxMaterials: true,
    taxLabor: true,
    applyTo: "price",
  });
  await caller().salesTax.create({
    name: unique("Flat ten"),
    state: "IL",
    components: [{ label: "State", ratePct: 10 }],
  });

  const material = await caller().materials.create({
    name: unique("Combo material"),
    unitOfSale: "each",
    costPerUnit: 100,
    category: "Receptacles",
  });
  const rates = await caller().laborRates.list();
  const priced = await caller().laborRates.update({
    id: rates.find(r => r.name === "Journeyman")!.id,
    hourlyCost: 50,
  });
  const list = await caller().assemblies.list();
  const starter = list.find(a => a.name === "Duplex receptacle standard")!;
  const assembly = await caller().assemblies.update({
    id: starter.id,
    laborRateId: priced.laborRate!.id,
    baseLaborHours: 1,
    overheadLaborHours: 0,
    modifierIds: [],
    materials: [{ materialId: material!.id, qty: 1 }],
  });

  const bid = await caller().bids.create({
    name: unique("Combo bid"),
    trades: ["electrical"],
  });
  await caller().bids.addAssembly({
    bidId: bid!.id,
    assemblyId: assembly.assembly!.id,
    qty: 1,
  });
  await caller().bids.update({ id: bid!.id, siteAddress: "Springfield, IL" });
  return bid!;
}

describe.skipIf(!hasDb)("the four combinations", () => {
  it("prices the fixture as expected before any charge", async () => {
    // The baseline every case below is measured against.
    const bid = await fixture();
    const full = await caller().bids.get({ id: bid.id });
    expect(full.totals.materialCost).toBeCloseTo(100, 2);
    expect(full.totals.laborCost).toBeCloseTo(50, 2);
    expect(full.totals.finalPrice).toBeCloseTo(198, 2);
    expect(full.salesTax.amount).toBeCloseTo(19.8, 2);
  });

  it("NEITHER — flat, untaxed pass-through", async () => {
    const bid = await fixture();
    await caller().bidExtras.expenses.addToBid({
      bidId: bid.id,
      name: "Permit",
      amount: 100,
    });
    const full = await caller().bids.get({ id: bid.id });

    expect(full.totals.workPrice).toBeCloseTo(198, 2);
    expect(full.totals.expensesTotal).toBeCloseTo(100, 2);
    expect(full.salesTax.amount).toBeCloseTo(19.8, 2);
    expect(full.totals.totalDue).toBeCloseTo(198 + 100 + 19.8, 2);
  });

  it("MARKED UP only — overhead and profit, no tax", async () => {
    const bid = await fixture();
    await caller().bidExtras.expenses.addToBid({
      bidId: bid.id,
      name: "Permit",
      amount: 100,
      markedUp: true,
    });
    const full = await caller().bids.get({ id: bid.id });

    // The charge joined the direct cost: 250 × 1.1 × 1.2 = 330.
    expect(full.totals.finalPrice).toBeCloseTo(330, 2);
    // Billed at 100 × 1.32 = 132, with the work back at 198.
    expect(full.totals.expensesTotal).toBeCloseTo(132, 2);
    expect(full.totals.workPrice).toBeCloseTo(198, 2);
    // Untaxed: the base is still only the work.
    expect(full.salesTax.amount).toBeCloseTo(19.8, 2);
    expect(full.totals.totalDue).toBeCloseTo(198 + 132 + 19.8, 2);
  });

  it("TAXABLE only — taxed at cost, not marked up", async () => {
    const bid = await fixture();
    await caller().bidExtras.expenses.addToBid({
      bidId: bid.id,
      name: "Permit",
      amount: 100,
      taxable: true,
    });
    const full = await caller().bids.get({ id: bid.id });

    expect(full.totals.workPrice).toBeCloseTo(198, 2);
    expect(full.totals.expensesTotal).toBeCloseTo(100, 2);
    // Base = 198 of work + 100 of charge, at 10%.
    expect(full.salesTax.taxableExpenses).toBeCloseTo(100, 2);
    expect(full.salesTax.taxableAmount).toBeCloseTo(298, 2);
    expect(full.salesTax.amount).toBeCloseTo(29.8, 2);
    expect(full.totals.totalDue).toBeCloseTo(198 + 100 + 29.8, 2);
  });

  it("BOTH — marked up, and taxed on the marked-up amount", async () => {
    const bid = await fixture();
    await caller().bidExtras.expenses.addToBid({
      bidId: bid.id,
      name: "Permit",
      amount: 100,
      taxable: true,
      markedUp: true,
    });
    const full = await caller().bids.get({ id: bid.id });

    expect(full.totals.expensesTotal).toBeCloseTo(132, 2);
    // Taxed on what is BILLED under applyTo "price" — 132, not 100.
    expect(full.salesTax.taxableExpenses).toBeCloseTo(132, 2);
    expect(full.salesTax.taxableAmount).toBeCloseTo(330, 2);
    expect(full.salesTax.amount).toBeCloseTo(33, 2);
    expect(full.totals.totalDue).toBeCloseTo(198 + 132 + 33, 2);
  });

  it("gives all four combinations different bottom lines", async () => {
    // If any two of these ever match, one switch has stopped doing anything.
    const totals: number[] = [];
    for (const flags of [
      {},
      { markedUp: true },
      { taxable: true },
      { taxable: true, markedUp: true },
    ]) {
      const bid = await fixture();
      await caller().bidExtras.expenses.addToBid({
        bidId: bid.id,
        name: "Permit",
        amount: 100,
        ...flags,
      });
      totals.push((await caller().bids.get({ id: bid.id })).totals.totalDue);
    }
    expect(new Set(totals.map(t => t.toFixed(2))).size).toBe(4);
  });
});

describe.skipIf(!hasDb)("independence and interaction", () => {
  it("taxes a marked-up charge at COST when the rule says cost", async () => {
    const bid = await fixture();
    await caller().salesTax.setRules({ applyTo: "cost" });
    await caller().bidExtras.expenses.addToBid({
      bidId: bid.id,
      name: "Permit",
      amount: 100,
      taxable: true,
      markedUp: true,
    });
    const full = await caller().bids.get({ id: bid.id });
    // Work at cost = 150, charge at cost = 100.
    expect(full.salesTax.taxableExpenses).toBeCloseTo(100, 2);
    expect(full.salesTax.taxableAmount).toBeCloseTo(250, 2);
  });

  it("keeps the switches independent across a mixed bid", async () => {
    const bid = await fixture();
    await caller().bidExtras.expenses.addToBid({
      bidId: bid.id,
      name: "Taxed only",
      amount: 100,
      taxable: true,
    });
    await caller().bidExtras.expenses.addToBid({
      bidId: bid.id,
      name: "Marked up only",
      amount: 100,
      markedUp: true,
    });
    const full = await caller().bids.get({ id: bid.id });

    // Only the marked-up one gained the uplift: 100 + 132.
    expect(full.totals.expensesTotal).toBeCloseTo(232, 2);
    // Only the taxable one entered the base.
    expect(full.salesTax.taxableExpenses).toBeCloseTo(100, 2);
  });

  it("taxes a charge even when materials and labor are not taxable", async () => {
    // Per-expense, not global. A fee can be the only taxable thing on a bid,
    // and reporting "nothing taxable" there would charge nothing at all.
    const bid = await fixture();
    await caller().salesTax.setRules({
      taxMaterials: false,
      taxLabor: false,
    });
    await caller().bidExtras.expenses.addToBid({
      bidId: bid.id,
      name: "Service fee",
      amount: 100,
      taxable: true,
    });
    const full = await caller().bids.get({ id: bid.id });

    expect(full.salesTax.status).toBe("ok");
    expect(full.salesTax.taxableAmount).toBeCloseTo(100, 2);
    expect(full.salesTax.amount).toBeCloseTo(10, 2);
  });

  it("still reports nothing-taxable when no charge is taxable either", async () => {
    const bid = await fixture();
    await caller().salesTax.setRules({
      taxMaterials: false,
      taxLabor: false,
    });
    await caller().bidExtras.expenses.addToBid({
      bidId: bid.id,
      name: "Permit",
      amount: 100,
    });
    expect((await caller().bids.get({ id: bid.id })).salesTax.status).toBe(
      "nothing-taxable"
    );
  });

  it("shows a marked-up charge on the proposal at its billed amount", async () => {
    const bid = await fixture();
    await caller().bidExtras.expenses.addToBid({
      bidId: bid.id,
      name: "Permit",
      amount: 100,
      markedUp: true,
    });
    const { document } = await caller().proposals.document({ bidId: bid.id });

    // The customer sees 132, and the work line is the work alone — the charge
    // must not be counted inside both.
    expect(document.investment.expenses!.lines[0].amount).toBeCloseTo(132, 2);
    expect(document.investment.workTotal).toBeCloseTo(198, 2);
    expect(document.investment.subtotal).toBeCloseTo(330, 2);
  });
});

describe.skipIf(!hasDb)("the switches on saved entries and one-offs", () => {
  async function plainBid() {
    const bid = await caller().bids.create({
      name: unique("Flags bid"),
      trades: ["electrical"],
    });
    return bid!;
  }

  it("saves and reloads both flags on a library entry", async () => {
    const item = await caller().bidExtras.expenses.create({
      name: "Minimum service call",
      amount: 150,
      taxable: true,
      markedUp: true,
    });
    expect(item!.taxable).toBe(true);
    expect(item!.markedUp).toBe(true);

    const reloaded = (await caller().bidExtras.expenses.list()).find(
      e => e.id === item!.id
    )!;
    expect(reloaded.taxable).toBe(true);
    expect(reloaded.markedUp).toBe(true);
  });

  it("defaults both off when nothing is said", async () => {
    const item = await caller().bidExtras.expenses.create({
      name: "Plain",
      amount: 10,
    });
    expect(item!.taxable).toBe(false);
    expect(item!.markedUp).toBe(false);
  });

  it("carries the flags onto a bid when added from the list", async () => {
    const item = await caller().bidExtras.expenses.create({
      name: "Service fee",
      amount: 150,
      taxable: true,
      markedUp: true,
    });
    const bid = await plainBid();
    await caller().bidExtras.expenses.addToBid({
      bidId: bid.id,
      itemId: item!.id,
    });

    const onBid = await caller().bidExtras.expenses.onBid({ bidId: bid.id });
    expect(onBid[0].taxable).toBe(true);
    expect(onBid[0].markedUp).toBe(true);
  });

  it("sets both flags on a one-off", async () => {
    const bid = await plainBid();
    await caller().bidExtras.expenses.addToBid({
      bidId: bid.id,
      name: "One-off fee",
      amount: 90,
      taxable: true,
      markedUp: true,
    });
    const onBid = await caller().bidExtras.expenses.onBid({ bidId: bid.id });
    expect(onBid[0].taxable).toBe(true);
    expect(onBid[0].markedUp).toBe(true);
    // And it is still a one-off.
    expect(onBid[0].expenseItemId).toBeNull();
    expect(await caller().bidExtras.expenses.list()).toHaveLength(0);
  });

  it("lets a bid override the saved flags without changing the library", async () => {
    // The snapshot rule applies to the switches too: this job's permit is
    // taxable, the saved one is not, and neither learns from the other.
    const item = await caller().bidExtras.expenses.create({
      name: "Permit",
      amount: 180,
    });
    const bid = await plainBid();
    await caller().bidExtras.expenses.addToBid({
      bidId: bid.id,
      itemId: item!.id,
      taxable: true,
    });

    expect(
      (await caller().bidExtras.expenses.onBid({ bidId: bid.id }))[0].taxable
    ).toBe(true);
    expect(
      (await caller().bidExtras.expenses.list()).find(e => e.id === item!.id)!
        .taxable
    ).toBe(false);
  });

  it("does not re-read the library when a saved entry's flags change later", async () => {
    const item = await caller().bidExtras.expenses.create({
      name: "Permit",
      amount: 180,
    });
    const bid = await plainBid();
    await caller().bidExtras.expenses.addToBid({
      bidId: bid.id,
      itemId: item!.id,
    });

    await caller().bidExtras.expenses.update({
      id: item!.id,
      taxable: true,
      markedUp: true,
    });

    const onBid = await caller().bidExtras.expenses.onBid({ bidId: bid.id });
    expect(onBid[0].taxable).toBe(false);
    expect(onBid[0].markedUp).toBe(false);
  });

  it("toggles a flag on a charge already on a bid", async () => {
    const bid = await plainBid();
    const added = await caller().bidExtras.expenses.addToBid({
      bidId: bid.id,
      name: "Permit",
      amount: 100,
    });
    await caller().bidExtras.expenses.updateOnBid({
      bidId: bid.id,
      id: added.id,
      taxable: true,
      markedUp: true,
    });

    const onBid = await caller().bidExtras.expenses.onBid({ bidId: bid.id });
    expect(onBid[0].taxable).toBe(true);
    expect(onBid[0].markedUp).toBe(true);
  });

  it("carries the flags when a one-off is promoted to the library", async () => {
    const bid = await plainBid();
    const added = await caller().bidExtras.expenses.addToBid({
      bidId: bid.id,
      name: "Service fee",
      amount: 150,
      taxable: true,
      markedUp: true,
    });
    await caller().bidExtras.expenses.saveToLibrary({
      bidId: bid.id,
      id: added.id,
    });

    const saved = (await caller().bidExtras.expenses.list())[0];
    expect(saved.taxable).toBe(true);
    expect(saved.markedUp).toBe(true);
  });
});
