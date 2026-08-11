/**
 * Pricing engine — the single source of truth for how a bid price is computed.
 * See ASSEMBLIES_PLAN.md § PRICING FLOW.
 *
 *   1. Direct Cost = Materials + (Labor hours × modifiers, SUMMED not compounded) × Labor Rate
 *   2. + Overhead  — optional, percentage or flat, applied BEFORE profit
 *   3. + Profit    — Markup % or Target Margin %, always an explicit choice
 *   4. = Final Bid Price
 *
 * Deliberately pure: no database, no I/O, no framework. Everything here is
 * directly testable, and every function returns a breakdown rather than a bare
 * number so the UI can always show its work (never a black-box price).
 *
 * ── Money handling ───────────────────────────────────────────────────────────
 * All internal arithmetic runs on integer CENTS, never decimal dollars. Decimal
 * amounts like 8.43 cannot be represented exactly in binary floating point, so
 * summing them accumulates error — across a few hundred takeoff lines that drift
 * becomes real money. Integers cannot drift.
 *
 * Public functions accept and return dollars for ergonomics. Every returned
 * amount is an exact whole-cent value, and the underlying cent values of a
 * breakdown sum exactly to its total.
 *
 * One caveat when consuming this: adding two returned *dollar* figures in JS can
 * still produce a trailing-digit artifact (8.43 + 2.45 === 10.879999999999999).
 * That is a property of JS floats, not a reconciliation error. Compare sums with
 * `roundMoney()`, or format for display, rather than using raw `===`.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** One material line inside an assembly recipe. */
export type MaterialLine = {
  /** Cost for a single unit of sale (each / foot / box). */
  costPerUnit: number;
  /** How many units of sale this recipe uses. */
  qty: number;
};

/**
 * A modifier as applied to a line item. `laborAdjustmentPct` is fractional:
 * 0.15 means +15% labor hours, -0.10 means -10%.
 */
export type AppliedModifier = {
  name?: string;
  laborAdjustmentPct: number;
};

/** Overhead is optional; when on it is either a percentage or a flat amount. */
export type OverheadSetting =
  | { enabled: false }
  | {
      enabled: true;
      mode: "percentage" | "flat";
      /** Fraction when percentage (0.10 = 10%); currency amount when flat. */
      value: number;
    };

/**
 * Profit method is never inferred — the caller must say which one.
 *   markup: price = cost × (1 + value)
 *   margin: price = cost ÷ (1 − value)   ← yields a HIGHER price than markup
 */
export type ProfitSetting = {
  method: "markup" | "margin";
  /** Fraction: 0.20 = 20%. */
  value: number;
};

export type LineItemInput = {
  materials: MaterialLine[];
  baseLaborHours: number;
  /** Only the modifiers actually switched on for this line. */
  modifiers?: AppliedModifier[];
  /** Hourly cost of the labor role assigned to this line. */
  laborRate: number;
  /** How many of this assembly. Defaults to 1. */
  quantity?: number;
};

export type LineItemBreakdown = {
  materialCost: number;
  /** Summed modifier percentage, e.g. 0.25 for +25%. */
  modifierPct: number;
  /** Base hours after modifiers, before quantity. */
  adjustedLaborHours: number;
  /** Total hours including quantity. */
  totalLaborHours: number;
  laborCost: number;
  directCost: number;
  /**
   * True when modifiers summed below −100% and hours were clamped to zero.
   * Surface this — it almost always means the modifier set is misconfigured.
   */
  laborHoursClamped: boolean;
};

export type BidPriceInput = {
  directCost: number;
  overhead?: OverheadSetting;
  profit: ProfitSetting;
};

export type BidPriceBreakdown = {
  directCost: number;
  overheadAmount: number;
  /** directCost + overheadAmount — the basis profit is applied to. */
  costWithOverhead: number;
  profitAmount: number;
  finalPrice: number;
  /** Echoed back so a saved estimate records how profit was calculated. */
  profitMethod: ProfitSetting["method"];
};

// ─── Money primitives ─────────────────────────────────────────────────────────

/** Largest margin we accept. At 1.0 the formula divides by zero. */
const MAX_MARGIN = 0.99;

function assertFinite(value: number, label: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number, received: ${value}`);
  }
}

/**
 * Round to a whole number, half away from zero.
 *
 * Two corrections over a bare `Math.round`:
 *  • Sign is handled explicitly — `Math.round(-0.5)` is -0, which biases
 *    negative amounts toward zero.
 *  • The nudge is RELATIVE to magnitude. `Number.EPSILON` is the gap between
 *    representable doubles at 1.0; at 100 the gap is ~100× wider, so a flat
 *    epsilon is far too small to correct anything. Scaling it means $1.005 —
 *    actually stored as 1.00499999999999989 — still rounds up to $1.01, which
 *    is what someone who typed that number expects.
 */
function roundToInt(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  return sign * Math.round(abs + abs * Number.EPSILON * 4);
}

/** Dollars → exact integer cents. */
export function toCents(dollars: number): number {
  assertFinite(dollars, "Amount");
  return roundToInt(dollars * 100);
}

/** Integer cents → dollars. */
export function fromCents(cents: number): number {
  return cents / 100;
}

/** Snap a dollar amount to the nearest whole cent. */
export function roundMoney(value: number): number {
  return fromCents(toCents(value));
}

// ─── Step 1 — Direct Cost ─────────────────────────────────────────────────────

/**
 * Sum modifier percentages. They ADD, they do not compound: +15% and +10%
 * together are +25%, NOT 1.15 × 1.10 = +26.5%. This is a deliberate product
 * decision (ASSEMBLIES_PLAN.md § DATA MODEL) — do not "fix" it to compound.
 */
export function sumModifiers(modifiers: AppliedModifier[] = []): number {
  let total = 0;
  for (const modifier of modifiers) {
    assertFinite(modifier.laborAdjustmentPct, "Modifier laborAdjustmentPct");
    total += modifier.laborAdjustmentPct;
  }
  return total;
}

/**
 * Apply summed modifiers to base labor hours.
 * Clamps at zero — no amount of negative modifiers makes a job take less than
 * no time. The caller is told via `clamped` so it can warn.
 */
export function applyModifiersToHours(
  baseLaborHours: number,
  modifiers: AppliedModifier[] = []
): { hours: number; modifierPct: number; clamped: boolean } {
  assertFinite(baseLaborHours, "baseLaborHours");
  if (baseLaborHours < 0) {
    throw new Error(`baseLaborHours cannot be negative, received: ${baseLaborHours}`);
  }

  const modifierPct = sumModifiers(modifiers);
  const raw = baseLaborHours * (1 + modifierPct);
  const clamped = raw < 0;

  return { hours: clamped ? 0 : raw, modifierPct, clamped };
}

/** Material cost in integer cents. Each line rounds so line items reconcile. */
function materialCostCents(materials: MaterialLine[] = []): number {
  let cents = 0;
  for (const line of materials) {
    assertFinite(line.costPerUnit, "Material costPerUnit");
    assertFinite(line.qty, "Material qty");
    cents += toCents(line.costPerUnit * line.qty);
  }
  return cents;
}

export function calculateMaterialCost(materials: MaterialLine[] = []): number {
  return fromCents(materialCostCents(materials));
}

/** Step 1 for a single assembly line item. */
export function calculateLineItem(input: LineItemInput): LineItemBreakdown {
  const quantity = input.quantity ?? 1;
  assertFinite(quantity, "quantity");
  assertFinite(input.laborRate, "laborRate");
  if (quantity < 0) throw new Error(`quantity cannot be negative, received: ${quantity}`);
  if (input.laborRate < 0) throw new Error(`laborRate cannot be negative, received: ${input.laborRate}`);

  // Per-unit material rounds first, so a single unit's price is what the user
  // sees on the recipe, then scales cleanly by quantity.
  const materialCents = materialCostCents(input.materials) * quantity;

  const { hours, modifierPct, clamped } = applyModifiersToHours(
    input.baseLaborHours,
    input.modifiers
  );
  const totalLaborHours = hours * quantity;
  const laborCents = toCents(totalLaborHours * input.laborRate);

  return {
    materialCost: fromCents(materialCents),
    modifierPct,
    adjustedLaborHours: hours,
    totalLaborHours,
    laborCost: fromCents(laborCents),
    directCost: fromCents(materialCents + laborCents),
    laborHoursClamped: clamped,
  };
}

/** Roll several line items into one direct cost. Sums in cents — no drift. */
export function sumDirectCost(lines: LineItemBreakdown[]): number {
  return fromCents(lines.reduce((cents, line) => cents + toCents(line.directCost), 0));
}

// ─── Step 2 — Overhead ────────────────────────────────────────────────────────

function overheadCents(costCents: number, overhead?: OverheadSetting): number {
  if (!overhead || !overhead.enabled) return 0;

  assertFinite(overhead.value, "Overhead value");
  if (overhead.value < 0) {
    throw new Error(`Overhead value cannot be negative, received: ${overhead.value}`);
  }

  return overhead.mode === "flat"
    ? toCents(overhead.value)
    : roundToInt(costCents * overhead.value);
}

/** Overhead amount for a given cost. Returns 0 when disabled. */
export function calculateOverhead(cost: number, overhead?: OverheadSetting): number {
  return fromCents(overheadCents(toCents(cost), overhead));
}

// ─── Step 3 — Profit ──────────────────────────────────────────────────────────

function profitCents(costCents: number, profit: ProfitSetting): number {
  assertFinite(profit.value, "Profit value");

  if (profit.value < 0) {
    throw new Error(`Profit value cannot be negative, received: ${profit.value}`);
  }

  if (profit.method === "markup") {
    return roundToInt(costCents * (1 + profit.value)) - costCents;
  }

  if (profit.method === "margin") {
    if (profit.value > MAX_MARGIN) {
      throw new Error(
        `Target margin must be below ${MAX_MARGIN * 100}% — a margin of 100% or more has no finite price. Received: ${profit.value * 100}%`
      );
    }
    return roundToInt(costCents / (1 - profit.value)) - costCents;
  }

  throw new Error(
    `Unknown profit method: ${(profit as ProfitSetting).method}. Must be "markup" or "margin".`
  );
}

/**
 * Profit amount for a given cost.
 *
 * The two methods are NOT interchangeable and must never be silently swapped:
 * on $100 at 20%, markup yields $120 while target margin yields $125.
 */
export function calculateProfit(cost: number, profit: ProfitSetting): number {
  return fromCents(profitCents(toCents(cost), profit));
}

// ─── Step 4 — Final Bid Price ─────────────────────────────────────────────────

/**
 * Full pipeline: direct cost → overhead → profit → final price.
 * Overhead is always applied before profit, so profit is earned on the
 * overhead-loaded cost, not the bare direct cost.
 */
export function calculateBidPrice(input: BidPriceInput): BidPriceBreakdown {
  assertFinite(input.directCost, "directCost");
  if (input.directCost < 0) {
    throw new Error(`directCost cannot be negative, received: ${input.directCost}`);
  }

  const directCents = toCents(input.directCost);
  const ohCents = overheadCents(directCents, input.overhead);
  const withOverheadCents = directCents + ohCents;
  const pCents = profitCents(withOverheadCents, input.profit);

  return {
    directCost: fromCents(directCents),
    overheadAmount: fromCents(ohCents),
    costWithOverhead: fromCents(withOverheadCents),
    profitAmount: fromCents(pCents),
    // Integer cents throughout, so this total is exact by construction.
    finalPrice: fromCents(withOverheadCents + pCents),
    profitMethod: input.profit.method,
  };
}

/** Convenience: line items straight through to a final price. */
export function priceLineItems(
  lines: LineItemInput[],
  settings: { overhead?: OverheadSetting; profit: ProfitSetting }
): BidPriceBreakdown & { lines: LineItemBreakdown[] } {
  const breakdowns = lines.map(calculateLineItem);
  const bid = calculateBidPrice({
    directCost: sumDirectCost(breakdowns),
    overhead: settings.overhead,
    profit: settings.profit,
  });
  return { ...bid, lines: breakdowns };
}
