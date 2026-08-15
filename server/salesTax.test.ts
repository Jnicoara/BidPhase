/**
 * Sales tax arithmetic and jurisdiction matching.
 *
 * ── Why this suite is unusually blunt about zero ─────────────────────────────
 * The expensive failure in a tax feature is not a wrong rate — a wrong rate is
 * visible, and somebody notices a bid that looks 9% high. The expensive failure
 * is a SILENT ZERO: tax switched on, no rate found, and a bid that quietly
 * charges nothing and looks exactly like a bid for an exempt customer. It gets
 * sent, gets won, and the tax comes out of the contractor's own money.
 *
 * So a large share of what follows is about the difference between "no tax
 * because nobody owes any" and "no tax because the app could not work it out",
 * and about the four statuses that keep those apart.
 *
 * Everything here is pure — no database, no clock.
 */
import { describe, it, expect } from "vitest";
import {
  DEFAULT_TAX_RULES,
  calculateSalesTax,
  combinedRatePct,
  explainTaxStatus,
  matchJurisdiction,
  type TaxJurisdiction,
  type TaxRules,
} from "../shared/salesTax";

const rules = (over: Partial<TaxRules> = {}): TaxRules => ({
  enabled: true,
  taxMaterials: true,
  taxLabor: false,
  applyTo: "price",
  ...over,
});

/** A bid that costs 600 in materials + 400 in labor, sold for 1,200. */
const bid = {
  materialCost: 600,
  laborCost: 400,
  finalPrice: 1200,
};

describe("what ships by default", () => {
  it("is off, and taxing nothing", () => {
    // The single most important assertion in this file. A tax feature that
    // arrives switched on with assumed rules puts a number on a bid that
    // nobody chose.
    expect(DEFAULT_TAX_RULES.enabled).toBe(false);
    expect(DEFAULT_TAX_RULES.taxMaterials).toBe(false);
    expect(DEFAULT_TAX_RULES.taxLabor).toBe(false);
  });

  it("produces no tax and says why", () => {
    const result = calculateSalesTax({
      ...bid,
      rules: DEFAULT_TAX_RULES,
      ratePct: 9,
    });
    expect(result.status).toBe("disabled");
    expect(result.amount).toBe(0);
    expect(result.totalWithTax).toBe(1200);
  });
});

describe("the four ways there is no tax", () => {
  it("distinguishes a missing rate from a genuine zero", () => {
    // THE failure this module exists to prevent. Both produce $0; only one is
    // correct, and they must never be reported the same way.
    const noRate = calculateSalesTax({ ...bid, rules: rules(), ratePct: null });
    const exempt = calculateSalesTax({
      ...bid,
      rules: rules(),
      ratePct: 9,
      exempt: true,
    });

    expect(noRate.status).toBe("no-rate");
    expect(exempt.status).toBe("exempt");
    expect(noRate.amount).toBe(0);
    expect(exempt.amount).toBe(0);
    expect(noRate.status).not.toBe(exempt.status);
  });

  it("reports nothing-taxable when neither materials nor labor is taxed", () => {
    const result = calculateSalesTax({
      ...bid,
      rules: rules({ taxMaterials: false, taxLabor: false }),
      ratePct: 9,
    });
    expect(result.status).toBe("nothing-taxable");
    expect(result.amount).toBe(0);
  });

  it("treats a non-finite rate as no rate, not as zero", () => {
    for (const bad of [NaN, Infinity]) {
      const result = calculateSalesTax({
        ...bid,
        rules: rules(),
        ratePct: bad,
      });
      expect(result.status).toBe("no-rate");
    }
  });

  it("lets exemption outrank a missing rate", () => {
    // An exempt bid owes nothing whether or not an area matched. Reporting
    // "no rate" there would send someone hunting for a rate that is irrelevant.
    const result = calculateSalesTax({
      ...bid,
      rules: rules(),
      ratePct: null,
      exempt: true,
    });
    expect(result.status).toBe("exempt");
  });

  it("gives every no-tax status a sentence a person can act on", () => {
    for (const status of [
      "disabled",
      "exempt",
      "nothing-taxable",
      "no-rate",
    ] as const) {
      const text = explainTaxStatus(status, "88 Water St");
      expect(text).toBeTruthy();
      expect(text!.length).toBeGreaterThan(20);
    }
    // A working tax needs no explanation.
    expect(explainTaxStatus("ok")).toBeNull();
  });

  it("says something different when there is no job address at all", () => {
    const withAddress = explainTaxStatus("no-rate", "88 Water St");
    const without = explainTaxStatus("no-rate", null);
    expect(without).not.toBe(withAddress);
    expect(without).toMatch(/no job address/i);
  });
});

describe("taxing materials only, on the marked-up price", () => {
  it("allocates the price by cost share", () => {
    // Materials are 600 of 1000 cost = 60%. 60% of the 1200 price = 720.
    const result = calculateSalesTax({ ...bid, rules: rules(), ratePct: 10 });
    expect(result.status).toBe("ok");
    expect(result.taxableAmount).toBe(720);
    expect(result.amount).toBe(72);
    expect(result.totalWithTax).toBe(1272);
  });

  it("shows the material and labor split of the base", () => {
    // Returned separately so somebody checking the number can see what was
    // allocated where, rather than only the total.
    const result = calculateSalesTax({ ...bid, rules: rules(), ratePct: 10 });
    expect(result.taxableMaterial).toBe(720);
    expect(result.taxableLabor).toBe(0);
  });
});

describe("taxing on cost rather than on price", () => {
  it("uses the raw material cost, ignoring markup", () => {
    const result = calculateSalesTax({
      ...bid,
      rules: rules({ applyTo: "cost" }),
      ratePct: 10,
    });
    expect(result.taxableAmount).toBe(600);
    expect(result.amount).toBe(60);
  });

  it("gives a materially different answer from the price basis", () => {
    // The reason it is a setting and not an assumption: same bid, same rate,
    // 12 dollars apart on a 1,200 job.
    const onPrice = calculateSalesTax({ ...bid, rules: rules(), ratePct: 10 });
    const onCost = calculateSalesTax({
      ...bid,
      rules: rules({ applyTo: "cost" }),
      ratePct: 10,
    });
    expect(onPrice.amount).not.toBe(onCost.amount);
  });
});

describe("taxing both materials and labor", () => {
  it("taxes the whole price when both are taxable", () => {
    const result = calculateSalesTax({
      ...bid,
      rules: rules({ taxMaterials: true, taxLabor: true }),
      ratePct: 10,
    });
    expect(result.taxableAmount).toBe(1200);
    expect(result.amount).toBe(120);
  });

  it("splits the price with no cent lost between the two", () => {
    // Labor takes the remainder rather than its own rounded share, so the two
    // always sum to exactly the price — an odd total is where a stray cent
    // would otherwise appear.
    const result = calculateSalesTax({
      materialCost: 333.33,
      laborCost: 666.67,
      finalPrice: 1000.01,
      rules: rules({ taxMaterials: true, taxLabor: true }),
      ratePct: 8.25,
    });
    expect(result.taxableMaterial + result.taxableLabor).toBeCloseTo(
      1000.01,
      2
    );
  });

  it("taxes labor alone when only labor is taxable", () => {
    const result = calculateSalesTax({
      ...bid,
      rules: rules({ taxMaterials: false, taxLabor: true }),
      ratePct: 10,
    });
    // Labor is 400 of 1000 = 40% of the 1200 price = 480.
    expect(result.taxableAmount).toBe(480);
    expect(result.amount).toBe(48);
  });
});

describe("awkward numbers", () => {
  it("handles a bid with no cost without dividing by zero", () => {
    const result = calculateSalesTax({
      materialCost: 0,
      laborCost: 0,
      finalPrice: 0,
      rules: rules(),
      ratePct: 9,
    });
    expect(result.status).toBe("ok");
    expect(Number.isNaN(result.amount)).toBe(false);
    expect(result.amount).toBe(0);
  });

  it("applies a deliberate zero rate as a zero, not as a missing rate", () => {
    // 0 is a real rate in a no-tax jurisdiction. It must not be mistaken for
    // "unset" — the bid IS correctly taxed, at nothing.
    const result = calculateSalesTax({ ...bid, rules: rules(), ratePct: 0 });
    expect(result.status).toBe("ok");
    expect(result.amount).toBe(0);
  });

  it("rounds to whole cents", () => {
    const result = calculateSalesTax({
      materialCost: 100,
      laborCost: 0,
      finalPrice: 100,
      rules: rules(),
      ratePct: 8.125,
    });
    // 100 × 8.125% = 8.125 → 8.13
    expect(result.amount).toBe(8.13);
    expect(result.totalWithTax).toBe(108.13);
  });

  it("keeps subtotal + tax equal to the total, exactly", () => {
    for (const rate of [4.5, 6.25, 7.375, 8.25, 9.875]) {
      const result = calculateSalesTax({
        ...bid,
        rules: rules(),
        ratePct: rate,
      });
      expect(result.totalWithTax).toBeCloseTo(1200 + result.amount, 10);
    }
  });
});

describe("adding a rate up", () => {
  it("sums the stack", () => {
    expect(
      combinedRatePct([
        { label: "State", ratePct: 6.25 },
        { label: "County", ratePct: 1.75 },
        { label: "City", ratePct: 1.25 },
      ])
    ).toBeCloseTo(9.25, 10);
  });

  it("is zero for an empty stack", () => {
    expect(combinedRatePct([])).toBe(0);
  });
});

// ─── Matching a job address ───────────────────────────────────────────────────

const areas: TaxJurisdiction[] = [
  {
    id: 1,
    name: "Illinois",
    state: "IL",
    county: null,
    city: null,
    components: [{ label: "State", ratePct: 6.25 }],
  },
  {
    id: 2,
    name: "Cook County IL",
    state: "IL",
    county: "Cook",
    city: null,
    components: [
      { label: "State", ratePct: 6.25 },
      { label: "County", ratePct: 1.75 },
    ],
  },
  {
    id: 3,
    name: "Chicago",
    state: "IL",
    county: "Cook",
    city: "Chicago",
    components: [
      { label: "State", ratePct: 6.25 },
      { label: "County", ratePct: 1.75 },
      { label: "City", ratePct: 1.25 },
    ],
  },
];

describe("matching a job address to a tax area", () => {
  it("takes the most specific match", () => {
    const match = matchJurisdiction(
      areas,
      "200 W Adams St, Chicago, Cook County, IL 60606"
    );
    expect(match.jurisdiction?.name).toBe("Chicago");
    expect(match.precision).toBe("city");
  });

  it("falls back to the county when no city rule matches", () => {
    const match = matchJurisdiction(areas, "Evanston, Cook County, IL");
    expect(match.jurisdiction?.name).toBe("Cook County IL");
    expect(match.precision).toBe("county");
  });

  it("falls back to the state when nothing narrower matches", () => {
    const match = matchJurisdiction(areas, "Springfield, IL 62701");
    expect(match.jurisdiction?.name).toBe("Illinois");
    expect(match.precision).toBe("state");
  });

  it("requires EVERY key a rule declares", () => {
    // The Chicago rule names a state, a county and a city. An address in
    // Chicago, Iowa must not pick up Illinois rates.
    const match = matchJurisdiction(areas, "Chicago, IA");
    expect(match.jurisdiction).toBeNull();
  });

  it("finds nothing rather than guessing", () => {
    const match = matchJurisdiction(areas, "88 Water St, Portland, OR");
    expect(match.jurisdiction).toBeNull();
    expect(match.precision).toBe("none");
  });

  it("finds nothing for a missing or blank address", () => {
    expect(matchJurisdiction(areas, null).jurisdiction).toBeNull();
    expect(matchJurisdiction(areas, "   ").jurisdiction).toBeNull();
  });

  it("says what it matched on", () => {
    // Shown to the user. A rate nobody can trace is a rate nobody can defend.
    const match = matchJurisdiction(areas, "Chicago, Cook County, IL");
    expect(match.matchedOn).toContain("Chicago");
    expect(match.matchedOn).toContain("IL");
  });

  it("does not match a state code inside another word", () => {
    // "OR" for Oregon must not match inside "NORTH" — the classic two-letter
    // false positive, and one that would apply a whole state's rate wrongly.
    const oregon: TaxJurisdiction[] = [
      {
        id: 9,
        name: "Oregon",
        state: "OR",
        county: null,
        city: null,
        components: [{ label: "State", ratePct: 0 }],
      },
    ];
    expect(
      matchJurisdiction(oregon, "12 NORTHWOOD DRIVE, Dallas, TX").jurisdiction
    ).toBeNull();
    expect(
      matchJurisdiction(oregon, "12 Main St, Bend, OR").jurisdiction?.name
    ).toBe("Oregon");
  });

  it("ignores a rule with no keys at all", () => {
    // It would otherwise match every address on earth.
    const keyless: TaxJurisdiction[] = [
      {
        id: 9,
        name: "Keyless",
        state: null,
        county: null,
        city: null,
        components: [{ label: "Whatever", ratePct: 5 }],
      },
    ];
    expect(
      matchJurisdiction(keyless, "anywhere at all").jurisdiction
    ).toBeNull();
  });

  it("matches case-insensitively", () => {
    expect(
      matchJurisdiction(areas, "chicago, cook county, il").jurisdiction?.name
    ).toBe("Chicago");
  });
});
