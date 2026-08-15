/**
 * Sales tax through the API: rate from the job address, the overrides, and the
 * tax line on the bid and on the proposal.
 *
 * The arithmetic and the address matching are covered purely in
 * server/salesTax.test.ts. What is tested here is the wiring — that the rate a
 * bid ends up with is the one its address implies, that every override beats
 * the layer beneath it, and above all that the BID and the PROPOSAL report the
 * same number.
 *
 * That last one is why this suite exists at all. A tax figure that differs
 * between the screen a contractor approves and the document their customer
 * receives is not a display bug; it is the wrong amount of money collected.
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
  materials,
  pricingDefaults,
  taxJurisdictions,
  users,
} from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";

const USER = 8901;
const OTHER_USER = 8902;

const hasDb = Boolean(process.env.DATABASE_URL);

const callerFor = (userId: number) =>
  appRouter.createCaller({
    user: { id: userId, openId: `test-salestax-${userId}`, role: "user" },
  } as unknown as TrpcContext);

const caller = () => callerFor(USER);

const unique = (label: string) =>
  `${label} ${Date.now()}${Math.round(Math.random() * 1e6)}`;

/** A bid with one priced line, so there is something real to tax. */
async function pricedBid(siteAddress: string | null = null) {
  const material = await caller().materials.create({
    name: unique("Tax probe material"),
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
    materials: [{ materialId: material!.id, qty: 1 }],
  });

  const bid = await caller().bids.create({
    name: unique("Tax bid"),
    trades: ["electrical"],
  });
  await caller().bids.addAssembly({
    bidId: bid!.id,
    assemblyId: assembly.assembly!.id,
    qty: 1,
  });
  if (siteAddress) {
    await caller().bids.update({ id: bid!.id, siteAddress });
  }
  return bid!;
}

async function newArea(over: Record<string, unknown> = {}) {
  return (await caller().salesTax.create({
    name: unique("Area"),
    state: "IL",
    components: [{ label: "State", ratePct: 10 }],
    ...over,
  }))!;
}

beforeAll(async () => {
  if (!hasDb) return;
  const dbc = await getDb();
  if (!dbc) return;
  for (const id of [USER, OTHER_USER]) {
    const [existing] = await dbc
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!existing) {
      await dbc.insert(users).values({
        id,
        openId: `test-salestax-${id}`,
        name: `Sales tax test user ${id}`,
      });
    }
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
  const ours = [USER, OTHER_USER];
  await dbc.delete(bids).where(inArray(bids.userId, ours));
  await dbc
    .delete(taxJurisdictions)
    .where(inArray(taxJurisdictions.userId, ours));
  await dbc.delete(assemblies).where(inArray(assemblies.userId, ours));
  await dbc.delete(materials).where(inArray(materials.userId, ours));
  await dbc
    .delete(pricingDefaults)
    .where(inArray(pricingDefaults.userId, ours));
});

describe.skipIf(!hasDb)("what a new account gets", () => {
  it("has sales tax off, taxing nothing", async () => {
    // Nobody is charged tax until somebody decides they should be.
    const rules = await caller().salesTax.rules();
    expect(rules.enabled).toBe(false);
    expect(rules.taxMaterials).toBe(false);
    expect(rules.taxLabor).toBe(false);
  });

  it("prices a bid with no tax line at all", async () => {
    const bid = await pricedBid();
    const full = await caller().bids.get({ id: bid.id });
    expect(full.salesTax.status).toBe("disabled");
    expect(full.salesTax.amount).toBe(0);
    expect(full.totals.totalWithTax).toBe(full.totals.finalPrice);
  });

  it("has no tax areas, and does not invent any", async () => {
    // The rate table is the user's. Shipping one would be shipping a number
    // nobody checked.
    expect(await caller().salesTax.list()).toHaveLength(0);
  });
});

describe.skipIf(!hasDb)("the rate comes from the job address", () => {
  it("applies the area whose keys the address matches", async () => {
    await caller().salesTax.setRules({ enabled: true, taxMaterials: true });
    await newArea({
      name: "Illinois",
      state: "IL",
      components: [{ label: "State", ratePct: 10 }],
    });

    const bid = await pricedBid("200 W Adams St, Springfield, IL 62701");
    const full = await caller().bids.get({ id: bid.id });

    expect(full.salesTax.status).toBe("ok");
    expect(full.taxRate.source).toBe("matched");
    expect(full.taxRate.ratePct).toBe(10);
    expect(full.salesTax.amount).toBeGreaterThan(0);
  });

  it("takes the most specific area when several match", async () => {
    await caller().salesTax.setRules({ enabled: true, taxMaterials: true });
    await newArea({
      name: "Illinois",
      state: "IL",
      components: [{ label: "State", ratePct: 6.25 }],
    });
    await newArea({
      name: "Chicago",
      state: "IL",
      city: "Chicago",
      components: [
        { label: "State", ratePct: 6.25 },
        { label: "City", ratePct: 4 },
      ],
    });

    const bid = await pricedBid("1 N State St, Chicago, IL 60602");
    const full = await caller().bids.get({ id: bid.id });
    expect(full.taxRate.jurisdictionName).toBe("Chicago");
    expect(full.taxRate.ratePct).toBeCloseTo(10.25, 4);
  });

  it("reports no-rate rather than charging zero when nothing matches", async () => {
    // The failure this whole design guards against: tax is on, the customer
    // owes some, and the app cannot work out how much. It must say so.
    await caller().salesTax.setRules({ enabled: true, taxMaterials: true });
    await newArea({ state: "IL" });

    const bid = await pricedBid("88 Water St, Portland, OR 97204");
    const full = await caller().bids.get({ id: bid.id });

    expect(full.salesTax.status).toBe("no-rate");
    expect(full.salesTax.amount).toBe(0);
    expect(full.taxNote).toMatch(/no tax area matches/i);
  });

  it("reports no-rate when the bid has no job address", async () => {
    await caller().salesTax.setRules({ enabled: true, taxMaterials: true });
    await newArea({ state: "IL" });

    const bid = await pricedBid();
    const full = await caller().bids.get({ id: bid.id });
    expect(full.salesTax.status).toBe("no-rate");
    expect(full.taxNote).toMatch(/no job address/i);
  });

  it("never sees another user's tax areas", async () => {
    await caller().salesTax.setRules({ enabled: true, taxMaterials: true });
    await callerFor(OTHER_USER).salesTax.create({
      name: "Theirs",
      state: "IL",
      components: [{ label: "State", ratePct: 10 }],
    });

    const bid = await pricedBid("Springfield, IL");
    const full = await caller().bids.get({ id: bid.id });
    expect(full.salesTax.status).toBe("no-rate");
  });
});

describe.skipIf(!hasDb)("the overrides, in order of who wins", () => {
  it("lets a pinned area beat the address match", async () => {
    await caller().salesTax.setRules({ enabled: true, taxMaterials: true });
    await newArea({
      name: "Illinois",
      state: "IL",
      components: [{ label: "State", ratePct: 6 }],
    });
    const pinned = await newArea({
      name: "Somewhere else",
      state: "WI",
      components: [{ label: "State", ratePct: 5 }],
    });

    const bid = await pricedBid("Springfield, IL");
    await caller().bids.update({ id: bid.id, taxJurisdictionId: pinned.id });

    const full = await caller().bids.get({ id: bid.id });
    expect(full.taxRate.source).toBe("bid-jurisdiction");
    expect(full.taxRate.ratePct).toBe(5);
  });

  it("lets a typed rate beat a pinned area", async () => {
    await caller().salesTax.setRules({ enabled: true, taxMaterials: true });
    const pinned = await newArea({
      components: [{ label: "State", ratePct: 5 }],
    });

    const bid = await pricedBid("Springfield, IL");
    await caller().bids.update({
      id: bid.id,
      taxJurisdictionId: pinned.id,
      taxRateOverridePct: 3.5,
    });

    const full = await caller().bids.get({ id: bid.id });
    expect(full.taxRate.source).toBe("bid-override");
    expect(full.taxRate.ratePct).toBe(3.5);
  });

  it("treats a typed 0% as a real rate, not as unset", async () => {
    // A deliberate zero-rate has to be applied AS a zero — falling back to the
    // matched area would silently re-tax a bid the user zeroed on purpose.
    await caller().salesTax.setRules({ enabled: true, taxMaterials: true });
    await newArea({
      state: "IL",
      components: [{ label: "State", ratePct: 10 }],
    });

    const bid = await pricedBid("Springfield, IL");
    await caller().bids.update({ id: bid.id, taxRateOverridePct: 0 });

    const full = await caller().bids.get({ id: bid.id });
    expect(full.taxRate.source).toBe("bid-override");
    expect(full.salesTax.status).toBe("ok");
    expect(full.salesTax.amount).toBe(0);
  });

  it("clears a typed rate with null and goes back to matching", async () => {
    await caller().salesTax.setRules({ enabled: true, taxMaterials: true });
    await newArea({
      state: "IL",
      components: [{ label: "State", ratePct: 10 }],
    });

    const bid = await pricedBid("Springfield, IL");
    await caller().bids.update({ id: bid.id, taxRateOverridePct: 4 });
    await caller().bids.update({ id: bid.id, taxRateOverridePct: null });

    const full = await caller().bids.get({ id: bid.id });
    expect(full.taxRate.source).toBe("matched");
    expect(full.taxRate.ratePct).toBe(10);
  });

  it("lets exemption beat every rate there is", async () => {
    await caller().salesTax.setRules({ enabled: true, taxMaterials: true });
    await newArea({
      state: "IL",
      components: [{ label: "State", ratePct: 10 }],
    });

    const bid = await pricedBid("Springfield, IL");
    await caller().bids.update({
      id: bid.id,
      taxRateOverridePct: 8,
      taxExempt: true,
      taxExemptReason: "State agency — exemption E-4471",
    });

    const full = await caller().bids.get({ id: bid.id });
    expect(full.salesTax.status).toBe("exempt");
    expect(full.salesTax.amount).toBe(0);
    expect(full.totals.totalWithTax).toBe(full.totals.finalPrice);
  });

  it("refuses to pin a bid to another user's tax area", async () => {
    const theirs = (await callerFor(OTHER_USER).salesTax.create({
      name: "Theirs",
      state: "IL",
      components: [{ label: "State", ratePct: 10 }],
    }))!;
    const bid = await pricedBid();

    await expect(
      caller().bids.update({ id: bid.id, taxJurisdictionId: theirs.id })
    ).rejects.toThrow();
  });

  it("falls back to matching when a pinned area is archived away", async () => {
    // Archiving must not silently drop a bid to no tax.
    await caller().salesTax.setRules({ enabled: true, taxMaterials: true });
    await newArea({
      name: "Illinois",
      state: "IL",
      components: [{ label: "State", ratePct: 10 }],
    });
    const pinned = await newArea({
      name: "Pinned",
      state: "WI",
      components: [{ label: "State", ratePct: 5 }],
    });

    const bid = await pricedBid("Springfield, IL");
    await caller().bids.update({ id: bid.id, taxJurisdictionId: pinned.id });
    await caller().salesTax.archive({ id: pinned.id });

    const full = await caller().bids.get({ id: bid.id });
    expect(full.taxRate.source).toBe("matched");
    expect(full.salesTax.status).toBe("ok");
  });
});

describe.skipIf(!hasDb)("the tax line shows separately, and adds up", () => {
  it("keeps tax out of the bid price and beside it", async () => {
    await caller().salesTax.setRules({
      enabled: true,
      taxMaterials: true,
      taxLabor: true,
    });
    await newArea({
      state: "IL",
      components: [{ label: "State", ratePct: 10 }],
    });

    const bid = await pricedBid("Springfield, IL");
    const full = await caller().bids.get({ id: bid.id });

    // finalPrice is still the pre-tax figure — tax is never folded in.
    expect(full.totals.salesTaxAmount).toBeGreaterThan(0);
    expect(full.totals.totalWithTax).toBeCloseTo(
      full.totals.finalPrice + full.totals.salesTaxAmount,
      2
    );
    expect(full.totals.finalPrice).toBeLessThan(full.totals.totalWithTax);
  });

  it("charges 10% of the whole price when everything is taxable", async () => {
    await caller().salesTax.setRules({
      enabled: true,
      taxMaterials: true,
      taxLabor: true,
    });
    await newArea({
      state: "IL",
      components: [{ label: "State", ratePct: 10 }],
    });

    const bid = await pricedBid("Springfield, IL");
    const full = await caller().bids.get({ id: bid.id });
    expect(full.salesTax.amount).toBeCloseTo(full.totals.finalPrice * 0.1, 2);
  });

  it("shows the SAME tax on the bid and on the proposal", async () => {
    // The assertion this suite exists for.
    await caller().salesTax.setRules({
      enabled: true,
      taxMaterials: true,
      taxLabor: true,
    });
    await newArea({
      name: "Chicago",
      state: "IL",
      city: "Chicago",
      components: [
        { label: "State", ratePct: 6.25 },
        { label: "City", ratePct: 3 },
      ],
    });

    const bid = await pricedBid("1 N State St, Chicago, IL");
    const full = await caller().bids.get({ id: bid.id });
    const { document } = await caller().proposals.document({ bidId: bid.id });

    expect(document.investment.salesTax).not.toBeNull();
    expect(document.investment.salesTax!.amount).toBeCloseTo(
      full.salesTax.amount,
      2
    );
    expect(document.investment.subtotal).toBeCloseTo(full.totals.finalPrice, 2);
    expect(document.investment.total).toBeCloseTo(full.totals.totalWithTax, 2);
  });

  it("itemises the rate stack on the document", async () => {
    await caller().salesTax.setRules({ enabled: true, taxMaterials: true });
    await newArea({
      name: "Chicago",
      state: "IL",
      city: "Chicago",
      components: [
        { label: "State", ratePct: 6.25 },
        { label: "City", ratePct: 3 },
      ],
    });

    const bid = await pricedBid("Chicago, IL");
    const { document } = await caller().proposals.document({ bidId: bid.id });
    const labels = document.investment.salesTax!.components.map(c => c.label);
    expect(labels).toEqual(["State", "City"]);
    expect(document.investment.salesTax!.ratePct).toBeCloseTo(9.25, 4);
  });

  it("prints an explicit $0 line for an exempt customer", async () => {
    // Absence would look like an oversight to exactly the customer who checks.
    await caller().salesTax.setRules({ enabled: true, taxMaterials: true });
    await newArea({
      state: "IL",
      components: [{ label: "State", ratePct: 10 }],
    });

    const bid = await pricedBid("Springfield, IL");
    await caller().bids.update({
      id: bid.id,
      taxExempt: true,
      taxExemptReason: "Resale certificate 99-1234",
    });

    const { document } = await caller().proposals.document({ bidId: bid.id });
    expect(document.investment.salesTax).not.toBeNull();
    expect(document.investment.salesTax!.exempt).toBe(true);
    expect(document.investment.salesTax!.amount).toBe(0);
    expect(document.investment.salesTax!.exemptReason).toMatch(/99-1234/);
    expect(document.investment.total).toBe(document.investment.subtotal);
  });

  it("leaves the document exactly as it was when tax is off", async () => {
    // Every existing proposal must be untouched by this feature.
    const bid = await pricedBid("Springfield, IL");
    const { document } = await caller().proposals.document({ bidId: bid.id });
    expect(document.investment.salesTax).toBeNull();
    expect(document.investment.total).toBe(document.investment.subtotal);
  });

  it("prints no tax line when a rate could not be found", async () => {
    // The document cannot invent a tax. The warning belongs in the composer,
    // where the person who can fix it is looking.
    await caller().salesTax.setRules({ enabled: true, taxMaterials: true });
    const bid = await pricedBid("Portland, OR");
    const { document } = await caller().proposals.document({ bidId: bid.id });
    expect(document.investment.salesTax).toBeNull();
  });
});

describe.skipIf(!hasDb)("guarding the rate itself", () => {
  it("refuses a rate typed as 725 instead of 7.25", async () => {
    await expect(
      caller().salesTax.create({
        name: "Fat finger",
        state: "IL",
        components: [{ label: "State", ratePct: 725 }],
      })
    ).rejects.toThrow();
  });

  it("refuses a stack that adds up past any real sales tax", async () => {
    await expect(
      caller().salesTax.create({
        name: "Too much",
        state: "IL",
        components: [
          { label: "State", ratePct: 20 },
          { label: "City", ratePct: 12 },
        ],
      })
    ).rejects.toThrow(/25%/);
  });

  it("refuses an area with no matching keys", async () => {
    // It could never match an address, so it would silently never apply.
    await expect(
      caller().salesTax.create({
        name: "Nowhere",
        components: [{ label: "State", ratePct: 5 }],
      })
    ).rejects.toThrow(/state, county or city/i);
  });

  it("clears the verified date when the rate changes", async () => {
    const area = await newArea();
    await caller().salesTax.markVerified({ id: area.id });
    expect((await caller().salesTax.list())[0].verifiedAt).not.toBeNull();

    await caller().salesTax.update({
      id: area.id,
      components: [{ label: "State", ratePct: 7 }],
    });
    // A changed number has not been checked, whatever was true of the old one.
    expect((await caller().salesTax.list())[0].verifiedAt).toBeNull();
  });

  it("does not clear the verified date for a rename", async () => {
    const area = await newArea();
    await caller().salesTax.markVerified({ id: area.id });
    await caller().salesTax.update({ id: area.id, name: "Renamed" });
    expect((await caller().salesTax.list())[0].verifiedAt).not.toBeNull();
  });
});
