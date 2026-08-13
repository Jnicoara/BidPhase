/**
 * Pricing one bid, end to end — the rollup both the bid screen and the client
 * proposal are built from.
 *
 * ── Why this is not inside bidsRouter ────────────────────────────────────────
 * It used to be. Then the proposal generator needed the same numbers, and there
 * are exactly two ways to do that: call the bid router's `get` from another
 * router, or lift the arithmetic out where both can reach it. The first shape
 * is the one that eventually diverges — a fix applied in one place, a rounding
 * step added in the other, and a contractor sends a client a total that does
 * not match the bid they approved it from.
 *
 * So there is one rollup, here, and every caller is a formatter over it. What a
 * proposal does differently is decide what to SHOW (shared/proposal.ts); it
 * does not decide what anything costs.
 *
 * All the actual math is still delegated to shared/pricing.ts. Nothing in this
 * file computes a percentage.
 */
import type { Bid, BidLineItem } from "../drizzle/schema";
import {
  calculateBidPrice,
  calculateLineItem,
  resolveBidPricingSettings,
  sumDirectCost,
  type CompanyPricingDefaults,
} from "../shared/pricing";
import * as db from "./db";

/**
 * Resolve a user's company defaults into the shape the pricing engine wants.
 * Shared by every caller so one bid cannot price two ways.
 */
export async function companyDefaultsFor(
  userId: number
): Promise<CompanyPricingDefaults> {
  const defaults = await db.getPricingDefaults(userId);
  return {
    overheadEnabled: defaults?.overheadEnabled ?? false,
    overheadMode: defaults?.overheadMode ?? "percentage",
    overheadValue: Number(defaults?.overheadValue ?? 0),
    profitMethod: defaults?.profitMethod ?? "markup",
    profitValue: Number(defaults?.profitValue ?? 0),
    productivityPct: Number(defaults?.productivityPct ?? 0),
  };
}

/**
 * Price one snapshot line at its quantity, through the shared engine.
 *
 * ── What is frozen and what is not ───────────────────────────────────────────
 * Everything that describes the WORK is read off the snapshot: material cost,
 * labor hours, the labor rate and the summed modifier percentage, all captured
 * when the line was added. Re-pricing a material or editing an assembly later
 * cannot move an existing bid, which is the whole point of the snapshot — and
 * it is why a proposal generated months afterwards still shows the price the
 * client was quoted.
 *
 * The productivity factor is not one of those. It is a company-level dial
 * passed in at calculation time, so a bid that inherits it does follow a later
 * change — exactly as it follows a later change to overhead or profit, and for
 * the same reason: those three are settings the bid is priced UNDER, not facts
 * about the work it contains. A bid that should stop following gets its own
 * override, and then nothing at company level reaches it.
 */
export function priceLine(line: BidLineItem, productivityPct: number) {
  return calculateLineItem({
    // The snapshot is already a single rolled-up material figure for one
    // assembly, so it enters as one material line at qty 1 and the bid
    // quantity scales the whole thing.
    materials: [{ costPerUnit: Number(line.snapshotMaterialCost), qty: 1 }],
    baseLaborHours: Number(line.snapshotLaborHours),
    modifiers: [{ laborAdjustmentPct: Number(line.snapshotModifierPct) }],
    laborRate: Number(line.snapshotLaborRate),
    quantity: Number(line.qty),
    productivityPct,
  });
}

/** Roll one bid's lines up to a price, at whatever settings apply to it. */
export function rollUpBid(
  bid: Bid,
  lines: BidLineItem[],
  company: CompanyPricingDefaults
) {
  const settings = resolveBidPricingSettings(company, {
    overheadEnabled: bid.overheadEnabled,
    overheadMode: bid.overheadMode,
    overheadValue:
      bid.overheadValue === null ? null : Number(bid.overheadValue),
    profitMethod: bid.profitMethod,
    profitValue: bid.profitValue === null ? null : Number(bid.profitValue),
    productivityPct:
      bid.productivityPct === null ? null : Number(bid.productivityPct),
  });

  const breakdowns = lines.map(line =>
    priceLine(line, settings.productivityPct)
  );
  const directCost = sumDirectCost(breakdowns);
  const bidPrice = calculateBidPrice({
    directCost,
    overhead: settings.overhead,
    profit: settings.profit,
  });

  return { settings, breakdowns, directCost, bidPrice };
}

/**
 * The whole detail view of a bid: every line priced, unit subtotals, and the
 * totals the screen and the proposal both read.
 *
 * Returned as one object rather than assembled per caller, because the unit
 * subtotals and the totals have to be derived from the SAME per-line
 * breakdowns — two callers each summing their own way is how a bid's parts stop
 * adding up to its whole.
 */
export function bidRollup(
  bid: Bid,
  lines: BidLineItem[],
  company: CompanyPricingDefaults
) {
  const { settings, breakdowns, bidPrice } = rollUpBid(bid, lines, company);
  const priced = lines.map((line, index) => ({
    line,
    breakdown: breakdowns[index],
  }));

  // Unit subtotals, so a hotel bid can answer "what does one room cost?"
  const unitTotals = new Map<string, { directCost: number; lines: number }>();
  for (const { line, breakdown } of priced) {
    if (!line.unitLabel) continue;
    const current = unitTotals.get(line.unitLabel) ?? {
      directCost: 0,
      lines: 0,
    };
    current.directCost += breakdown.directCost;
    current.lines += 1;
    unitTotals.set(line.unitLabel, current);
  }

  return {
    settings,
    priced,
    units: Array.from(unitTotals, ([label, totals]) => ({
      label,
      ...totals,
    })),
    totals: {
      // bidPrice carries its own directCost (identical, rounded through the
      // engine) — spread it first so the authoritative one wins.
      ...bidPrice,
      totalLaborHours: priced.reduce(
        (sum, p) => sum + p.breakdown.totalLaborHours,
        0
      ),
      /**
       * The same hours BEFORE the productivity factor, at quantity.
       *
       * Sent so the breakdown can show the adjustment as its own step rather
       * than as a total that silently differs from the hours on the assemblies.
       * hoursAfterModifiers is per-unit, so it scales by qty here exactly as
       * totalLaborHours does — comparing one to the other is the whole point,
       * and they have to be on the same footing.
       */
      laborHoursBeforeProductivity: priced.reduce(
        (sum, p) => sum + p.breakdown.hoursAfterModifiers * Number(p.line.qty),
        0
      ),
      materialCost: priced.reduce(
        (sum, p) => sum + p.breakdown.materialCost,
        0
      ),
      laborCost: priced.reduce((sum, p) => sum + p.breakdown.laborCost, 0),
    },
  };
}
