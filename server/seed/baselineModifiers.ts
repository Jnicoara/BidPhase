/**
 * Baseline modifiers — the starter job-condition adjustments.
 *
 * Rows in `modifiers` with `userId = NULL`, forked on edit like every other
 * baseline catalog.
 *
 * ── Deliberately five, not fifteen ───────────────────────────────────────────
 * A new user facing a wall of pre-set percentages cannot tell which ones matter,
 * so the starter list covers only conditions almost every contractor hits. The
 * long tail — confined space, hazmat, prevailing wage, winter work — is left for
 * users to add as they meet it. Resist padding this list.
 *
 * ── The percentages are placeholders ─────────────────────────────────────────
 * Plausible round numbers, not researched productivity factors. Editable, and
 * presented as starting points everywhere they appear.
 *
 * `laborAdjustmentPct` is FRACTIONAL: 0.12 = +12% labor hours. Modifiers ADD,
 * they never compound — see sumModifiers in shared/pricing.ts.
 */
export type BaselineModifier = {
  name: string;
  /** Decimal column — string so no float rounding happens on the way in. */
  laborAdjustmentPct: string;
};

export const BASELINE_MODIFIERS: BaselineModifier[] = [
  { name: "Working at height", laborAdjustmentPct: "0.1200" },
  { name: "Occupied building / renovation", laborAdjustmentPct: "0.2000" },
  { name: "Scheduled overtime", laborAdjustmentPct: "0.2000" },
  { name: "Night shift work", laborAdjustmentPct: "0.1500" },
  { name: "Weekend work", laborAdjustmentPct: "0.1000" },
];
