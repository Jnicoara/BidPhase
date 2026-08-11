/**
 * Tests for the pricing engine (shared/pricing.ts).
 *
 * These guard the product rules that are easy to "helpfully" break later:
 *   • modifiers ADD, they never compound
 *   • markup and target margin are different numbers and never interchangeable
 *   • overhead is applied BEFORE profit
 *   • a displayed breakdown always reconciles to the total, to the cent
 */
import { describe, it, expect } from "vitest";
import {
  applyModifiersToHours,
  DEFAULT_ANNUAL_HOURS,
  effectiveHourlyRate,
  calculateBidPrice,
  calculateLineItem,
  calculateMaterialCost,
  calculateOverhead,
  calculateProfit,
  fromCents,
  priceLineItems,
  roundMoney,
  sumDirectCost,
  sumModifiers,
  toCents,
} from "@shared/pricing";

// ─── Salary → effective hourly rate ───────────────────────────────────────────

describe("effectiveHourlyRate", () => {
  it("converts the starter project manager at the payroll year", () => {
    // $60,000 ÷ 2,080 h = $28.846… → $28.85
    expect(effectiveHourlyRate(60000, DEFAULT_ANNUAL_HOURS)).toBeCloseTo(28.85, 10);
  });

  it("defaults to a 2,080-hour year", () => {
    expect(DEFAULT_ANNUAL_HOURS).toBe(2080);
  });

  it("charges more per hour when fewer hours are actually billable", () => {
    // The whole reason hours are editable: the same salary over a shorter
    // productive year has to be recovered at a higher rate.
    const payrollYear = effectiveHourlyRate(60000, 2080);
    const realYear = effectiveHourlyRate(60000, 1850);
    expect(realYear).toBeGreaterThan(payrollYear);
    expect(realYear).toBeCloseTo(32.43, 10);
  });

  it("rounds to whole cents so the rate is a figure people can read", () => {
    const rate = effectiveHourlyRate(100000, 2080);
    expect(rate).toBeCloseTo(48.08, 10);
    expect(Math.round(rate * 100)).toBe(rate * 100);
  });

  it("treats zero salary as a zero rate rather than an error", () => {
    expect(effectiveHourlyRate(0, 2080)).toBe(0);
  });

  it("refuses zero hours — that is a division by zero, not a free employee", () => {
    expect(() => effectiveHourlyRate(60000, 0)).toThrow(/greater than zero/i);
  });

  it("refuses negative hours", () => {
    expect(() => effectiveHourlyRate(60000, -100)).toThrow(/greater than zero/i);
  });

  it("refuses a negative salary", () => {
    expect(() => effectiveHourlyRate(-1, 2080)).toThrow(/cannot be negative/i);
  });

  it("rejects non-finite inputs", () => {
    expect(() => effectiveHourlyRate(Number.NaN, 2080)).toThrow(/finite/i);
    expect(() => effectiveHourlyRate(60000, Number.POSITIVE_INFINITY)).toThrow(/finite/i);
  });

  it("feeds a line item exactly like an hourly rate does", () => {
    // The point of deriving a rate: downstream pricing cannot tell the
    // difference between a salaried role and an hourly one.
    const rate = effectiveHourlyRate(60000, 2080);
    const line = calculateLineItem({ materials: [], baseLaborHours: 10, laborRate: rate });
    expect(line.laborCost).toBeCloseTo(288.5, 10);
  });
});

// ─── Modifiers: ADD, never compound ───────────────────────────────────────────

describe("modifiers add rather than compound", () => {
  it("sums modifier percentages", () => {
    expect(sumModifiers([{ laborAdjustmentPct: 0.15 }, { laborAdjustmentPct: 0.1 }])).toBeCloseTo(0.25, 10);
  });

  it("applies +15% and +10% as +25%, NOT as 1.15 x 1.10", () => {
    const { hours } = applyModifiersToHours(1, [
      { name: "height", laborAdjustmentPct: 0.15 },
      { name: "outdoor", laborAdjustmentPct: 0.1 },
    ]);

    expect(hours).toBeCloseTo(1.25, 10);
    // The compounding answer would be 1.265 — explicitly wrong for this product.
    expect(hours).not.toBeCloseTo(1.265, 3);
  });

  it("handles three modifiers additively", () => {
    const { hours, modifierPct } = applyModifiersToHours(2, [
      { laborAdjustmentPct: 0.15 },
      { laborAdjustmentPct: 0.1 },
      { laborAdjustmentPct: 0.25 },
    ]);
    expect(modifierPct).toBeCloseTo(0.5, 10);
    expect(hours).toBeCloseTo(3, 10);
  });

  it("supports negative modifiers", () => {
    const { hours } = applyModifiersToHours(1, [{ laborAdjustmentPct: -0.2 }]);
    expect(hours).toBeCloseTo(0.8, 10);
  });

  it("returns base hours untouched when there are no modifiers", () => {
    expect(applyModifiersToHours(1.5).hours).toBeCloseTo(1.5, 10);
    expect(applyModifiersToHours(1.5, []).hours).toBeCloseTo(1.5, 10);
  });

  it("clamps to zero and flags when modifiers drop below -100%", () => {
    const { hours, clamped } = applyModifiersToHours(1, [{ laborAdjustmentPct: -1.5 }]);
    expect(hours).toBe(0);
    expect(clamped).toBe(true);
  });

  it("does not flag a clamp on ordinary modifiers", () => {
    expect(applyModifiersToHours(1, [{ laborAdjustmentPct: 0.15 }]).clamped).toBe(false);
  });

  it("rejects negative base hours", () => {
    expect(() => applyModifiersToHours(-1)).toThrow(/cannot be negative/);
  });
});

// ─── Materials ────────────────────────────────────────────────────────────────

describe("material cost", () => {
  it("multiplies unit cost by quantity across lines", () => {
    expect(
      calculateMaterialCost([
        { costPerUnit: 12.5, qty: 2 },
        { costPerUnit: 8, qty: 1 },
      ])
    ).toBe(33);
  });

  it("returns zero for an empty recipe", () => {
    expect(calculateMaterialCost([])).toBe(0);
    expect(calculateMaterialCost()).toBe(0);
  });

  it("does not leak floating point dust", () => {
    // 0.1 * 3 is 0.30000000000000004 in raw float math.
    expect(calculateMaterialCost([{ costPerUnit: 0.1, qty: 3 }])).toBe(0.3);
  });

  it("handles per-foot pricing", () => {
    expect(calculateMaterialCost([{ costPerUnit: 0.42, qty: 250 }])).toBe(105);
  });
});

// ─── Line items ───────────────────────────────────────────────────────────────

describe("line item direct cost", () => {
  const receptacle = {
    materials: [
      { costPerUnit: 12.5, qty: 2 },
      { costPerUnit: 8, qty: 1 },
    ],
    baseLaborHours: 0.5,
    modifiers: [{ name: "height", laborAdjustmentPct: 0.2 }],
    laborRate: 85,
  };

  it("computes materials + modified labor for a single unit", () => {
    const result = calculateLineItem(receptacle);

    expect(result.materialCost).toBe(33);
    expect(result.adjustedLaborHours).toBeCloseTo(0.6, 10);
    expect(result.laborCost).toBe(51);
    expect(result.directCost).toBe(84);
  });

  it("scales by quantity", () => {
    const result = calculateLineItem({ ...receptacle, quantity: 10 });

    expect(result.materialCost).toBe(330);
    expect(result.totalLaborHours).toBeCloseTo(6, 10);
    expect(result.laborCost).toBe(510);
    expect(result.directCost).toBe(840);
  });

  it("defaults quantity to 1", () => {
    expect(calculateLineItem(receptacle).directCost).toBe(
      calculateLineItem({ ...receptacle, quantity: 1 }).directCost
    );
  });

  it("costs materials only when there are no labor hours", () => {
    const result = calculateLineItem({
      materials: [{ costPerUnit: 40, qty: 1 }],
      baseLaborHours: 0,
      laborRate: 85,
    });
    expect(result.laborCost).toBe(0);
    expect(result.directCost).toBe(40);
  });

  it("rejects negative quantity and negative labor rate", () => {
    expect(() => calculateLineItem({ ...receptacle, quantity: -1 })).toThrow(/cannot be negative/);
    expect(() => calculateLineItem({ ...receptacle, laborRate: -85 })).toThrow(/cannot be negative/);
  });

  it("sums several lines into one direct cost", () => {
    const lines = [
      calculateLineItem({ materials: [{ costPerUnit: 10, qty: 1 }], baseLaborHours: 1, laborRate: 50 }),
      calculateLineItem({ materials: [{ costPerUnit: 20, qty: 2 }], baseLaborHours: 0.5, laborRate: 50 }),
    ];
    // (10 + 50) + (40 + 25)
    expect(sumDirectCost(lines)).toBe(125);
  });
});

// ─── Overhead ─────────────────────────────────────────────────────────────────

describe("overhead", () => {
  it("is zero when disabled or absent", () => {
    expect(calculateOverhead(1000, { enabled: false })).toBe(0);
    expect(calculateOverhead(1000)).toBe(0);
  });

  it("applies a percentage of cost", () => {
    expect(calculateOverhead(1000, { enabled: true, mode: "percentage", value: 0.1 })).toBe(100);
  });

  it("applies a flat amount regardless of cost", () => {
    expect(calculateOverhead(1000, { enabled: true, mode: "flat", value: 250 })).toBe(250);
    expect(calculateOverhead(50000, { enabled: true, mode: "flat", value: 250 })).toBe(250);
  });

  it("rejects a negative overhead value", () => {
    expect(() => calculateOverhead(1000, { enabled: true, mode: "flat", value: -5 })).toThrow(
      /cannot be negative/
    );
  });
});

// ─── Profit: markup vs margin ─────────────────────────────────────────────────

describe("profit method is never interchangeable", () => {
  it("markup of 20% on $100 yields $20 profit", () => {
    expect(calculateProfit(100, { method: "markup", value: 0.2 })).toBe(20);
  });

  it("target margin of 20% on $100 yields $25 profit", () => {
    expect(calculateProfit(100, { method: "margin", value: 0.2 })).toBe(25);
  });

  it("the two methods produce different numbers at the same percentage", () => {
    const markup = calculateProfit(100, { method: "markup", value: 0.2 });
    const margin = calculateProfit(100, { method: "margin", value: 0.2 });

    expect(markup).not.toBe(margin);
    expect(margin).toBeGreaterThan(markup);
  });

  it("a 20% target margin really does leave 20% of the final price as profit", () => {
    const cost = 100;
    const profit = calculateProfit(cost, { method: "margin", value: 0.2 });
    const price = cost + profit;

    expect(profit / price).toBeCloseTo(0.2, 10);
  });

  it("zero profit leaves cost untouched under either method", () => {
    expect(calculateProfit(100, { method: "markup", value: 0 })).toBe(0);
    expect(calculateProfit(100, { method: "margin", value: 0 })).toBe(0);
  });

  it("allows a steep but finite margin", () => {
    expect(calculateProfit(100, { method: "margin", value: 0.99 })).toBe(9900);
  });

  it("rejects a margin of 100% or more, which has no finite price", () => {
    expect(() => calculateProfit(100, { method: "margin", value: 1 })).toThrow(/margin must be below/i);
    expect(() => calculateProfit(100, { method: "margin", value: 1.5 })).toThrow(/margin must be below/i);
  });

  it("rejects a negative profit value", () => {
    expect(() => calculateProfit(100, { method: "markup", value: -0.1 })).toThrow(/cannot be negative/);
  });

  it("rejects an unknown profit method", () => {
    expect(() =>
      calculateProfit(100, { method: "guess" as never, value: 0.2 })
    ).toThrow(/Unknown profit method/);
  });
});

// ─── Full pipeline ────────────────────────────────────────────────────────────

describe("full bid price pipeline", () => {
  it("applies overhead BEFORE profit", () => {
    // Flat overhead makes the ordering observable — with a percentage both
    // orderings coincidentally agree, so this test would not catch a swap.
    const result = calculateBidPrice({
      directCost: 1000,
      overhead: { enabled: true, mode: "flat", value: 200 },
      profit: { method: "markup", value: 0.2 },
    });

    // Correct:      (1000 + 200) x 1.20 = 1440
    // Wrong order:   1000 x 1.20 + 200  = 1400
    expect(result.costWithOverhead).toBe(1200);
    expect(result.finalPrice).toBe(1440);
    expect(result.finalPrice).not.toBe(1400);
  });

  it("works with overhead switched off", () => {
    const result = calculateBidPrice({
      directCost: 1000,
      overhead: { enabled: false },
      profit: { method: "markup", value: 0.2 },
    });

    expect(result.overheadAmount).toBe(0);
    expect(result.costWithOverhead).toBe(1000);
    expect(result.finalPrice).toBe(1200);
  });

  it("records which profit method produced the price", () => {
    expect(calculateBidPrice({ directCost: 100, profit: { method: "margin", value: 0.2 } }).profitMethod).toBe("margin");
    expect(calculateBidPrice({ directCost: 100, profit: { method: "markup", value: 0.2 } }).profitMethod).toBe("markup");
  });

  it("rejects a negative direct cost", () => {
    expect(() =>
      calculateBidPrice({ directCost: -1, profit: { method: "markup", value: 0.2 } })
    ).toThrow(/cannot be negative/);
  });

  it("handles a zero-cost bid without dividing by anything", () => {
    const result = calculateBidPrice({ directCost: 0, profit: { method: "margin", value: 0.2 } });
    expect(result.finalPrice).toBe(0);
    expect(result.profitAmount).toBe(0);
  });
});

// ─── Reconciliation ───────────────────────────────────────────────────────────

describe("breakdowns always reconcile to the cent", () => {
  it("direct + overhead + profit equals the final price on awkward numbers", () => {
    const result = calculateBidPrice({
      directCost: 33.33,
      overhead: { enabled: true, mode: "percentage", value: 0.1 },
      profit: { method: "margin", value: 0.33 },
    });

    expect(roundMoney(result.directCost + result.overheadAmount)).toBe(result.costWithOverhead);
    expect(roundMoney(result.costWithOverhead + result.profitAmount)).toBe(result.finalPrice);
  });

  it("reconciles across a spread of messy inputs", () => {
    const costs = [0.01, 7.77, 33.33, 101.11, 1234.56, 99999.99];
    const profits = [
      { method: "markup" as const, value: 0.175 },
      { method: "margin" as const, value: 0.225 },
    ];

    for (const directCost of costs) {
      for (const profit of profits) {
        const result = calculateBidPrice({
          directCost,
          overhead: { enabled: true, mode: "percentage", value: 0.085 },
          profit,
        });

        expect(roundMoney(result.directCost + result.overheadAmount)).toBe(result.costWithOverhead);
        expect(roundMoney(result.costWithOverhead + result.profitAmount)).toBe(result.finalPrice);
      }
    }
  });

  it("reconciles exactly in integer cents, with no rounding needed", () => {
    // The stronger guarantee behind the roundMoney() calls above: the underlying
    // cent values add up on the nose. $7.77 at 8.5% overhead and a 22.5% margin
    // is the case that exposed decimal-dollar drift during development.
    const result = calculateBidPrice({
      directCost: 7.77,
      overhead: { enabled: true, mode: "percentage", value: 0.085 },
      profit: { method: "margin", value: 0.225 },
    });

    expect(toCents(result.directCost) + toCents(result.overheadAmount)).toBe(
      toCents(result.costWithOverhead)
    );
    expect(toCents(result.costWithOverhead) + toCents(result.profitAmount)).toBe(
      toCents(result.finalPrice)
    );
    expect(result.finalPrice).toBe(10.88);
  });

  it("does not drift when summing hundreds of line items", () => {
    // Decimal-dollar accumulation is where float error turns into real money.
    // 300 lines at $0.07 material + 0.01h at $85/h is chosen so both components
    // land on values that are inexact in binary.
    const line = {
      materials: [{ costPerUnit: 0.07, qty: 1 }],
      baseLaborHours: 0.01,
      laborRate: 85,
    };
    const lines = Array.from({ length: 300 }, () => calculateLineItem(line));

    // Each line: $0.07 material + $0.85 labor = $0.92
    expect(lines[0].directCost).toBe(0.92);
    expect(sumDirectCost(lines)).toBe(276);
    expect(toCents(sumDirectCost(lines))).toBe(300 * 92);
  });

  it("rounds half a cent away from zero", () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(2.675)).toBe(2.68);
  });

  it("converts dollars and cents losslessly", () => {
    expect(toCents(8.43)).toBe(843);
    expect(toCents(0.1)).toBe(10);
    expect(fromCents(1088)).toBe(10.88);
  });
});

// ─── End to end ───────────────────────────────────────────────────────────────

describe("priceLineItems end to end", () => {
  it("prices a small job from recipes through to a final number", () => {
    const result = priceLineItems(
      [
        {
          // 10 receptacles: $33 material, 0.5h base +20% height, $85/h
          materials: [
            { costPerUnit: 12.5, qty: 2 },
            { costPerUnit: 8, qty: 1 },
          ],
          baseLaborHours: 0.5,
          modifiers: [{ name: "height", laborAdjustmentPct: 0.2 }],
          laborRate: 85,
          quantity: 10,
        },
        {
          // 250 ft of pipe: no labor modifiers
          materials: [{ costPerUnit: 0.42, qty: 250 }],
          baseLaborHours: 2,
          laborRate: 85,
          quantity: 1,
        },
      ],
      {
        overhead: { enabled: true, mode: "percentage", value: 0.1 },
        profit: { method: "margin", value: 0.2 },
      }
    );

    // Line 1: 330 material + 510 labor = 840
    // Line 2: 105 material + 170 labor = 275
    expect(result.lines[0].directCost).toBe(840);
    expect(result.lines[1].directCost).toBe(275);
    expect(result.directCost).toBe(1115);

    // Overhead 10% -> 111.50, basis 1226.50
    expect(result.overheadAmount).toBe(111.5);
    expect(result.costWithOverhead).toBe(1226.5);

    // 20% target margin -> 1226.50 / 0.8 = 1533.125 -> 1533.13
    expect(result.finalPrice).toBe(1533.13);
    expect(result.costWithOverhead + result.profitAmount).toBe(result.finalPrice);
  });

  it("surfaces a clamped line so the UI can warn about bad modifiers", () => {
    const result = priceLineItems(
      [
        {
          materials: [{ costPerUnit: 10, qty: 1 }],
          baseLaborHours: 1,
          modifiers: [{ name: "broken", laborAdjustmentPct: -2 }],
          laborRate: 85,
        },
      ],
      { profit: { method: "markup", value: 0.2 } }
    );

    expect(result.lines[0].laborHoursClamped).toBe(true);
    expect(result.lines[0].laborCost).toBe(0);
    expect(result.lines[0].directCost).toBe(10);
  });
});
