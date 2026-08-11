/**
 * The behaviour every inline-edited field in this app shares.
 *
 * Kept as pure functions rather than living inside a component, for two
 * reasons: the rules are the part worth testing (a DOM is incidental), and a
 * single source means a new field cannot accidentally implement three of the
 * four behaviours.
 *
 * The four, in the order a user meets them:
 *   1. Focus       — the existing value is selected, so typing replaces it.
 *   2. Enter/blur  — commit.
 *   3. Escape      — abandon the edit and snap back to the last saved value.
 *   4. After save  — a brief confirmation, because this app prices real work
 *                    and "did that number take?" must never be a guess.
 *
 * See CLAUDE.md § Editing fields.
 */

/** What committing a draft should actually do. */
export type CommitOutcome =
  /** The draft is valid and different — persist `value`. */
  | { action: "save"; value: number }
  /** The draft is unusable; the field snaps back and nothing is persisted. */
  | { action: "revert"; reason: string }
  /** Valid but unchanged — no write, and no save confirmation either. */
  | { action: "none" };

export type NumericFieldRules = {
  min?: number;
  max?: number;
  /** Treat blank as a real value (0)? Defaults to false — blank reverts. */
  allowEmpty?: boolean;
  /** Tolerance for "unchanged". Money is compared at 4dp, matching the columns. */
  epsilon?: number;
};

/** How a stored number is rendered into the input when editing starts. */
export function formatForEdit(value: number): string {
  if (!Number.isFinite(value)) return "";
  // String(Number) drops trailing zeros, so 0.6000 edits as "0.6" — which is
  // what someone expects to see, and re-parses identically.
  return String(value);
}

/**
 * Decide what Enter or blur means for a numeric field.
 *
 * Invalid input REVERTS rather than erroring. An inline field has nowhere to
 * put an error message, and silently keeping a bad draft on screen is how a
 * user ends up believing they saved something they did not.
 */
export function commitNumericEdit(
  draft: string,
  savedValue: number,
  rules: NumericFieldRules = {}
): CommitOutcome {
  const { min, max, allowEmpty = false, epsilon = 1e-9 } = rules;
  const trimmed = draft.trim();

  if (trimmed === "") {
    if (!allowEmpty) return { action: "revert", reason: "empty" };
    return nearlyEqual(0, savedValue, epsilon)
      ? { action: "none" }
      : { action: "save", value: 0 };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return { action: "revert", reason: "not a number" };
  if (min !== undefined && parsed < min) return { action: "revert", reason: `below ${min}` };
  if (max !== undefined && parsed > max) return { action: "revert", reason: `above ${max}` };

  // No write when nothing moved: a pointless round trip, and a confirmation
  // flash for a save that did not happen would be a lie.
  if (nearlyEqual(parsed, savedValue, epsilon)) return { action: "none" };

  return { action: "save", value: parsed };
}

/**
 * What Escape does: the text the field should show, discarding the draft.
 *
 * Deliberately derives from the saved VALUE rather than remembering the text
 * the user started from — after a save the saved value has moved, and Escape
 * must return to what is actually stored, not to a stale starting point.
 */
export function revertToSaved(savedValue: number): string {
  return formatForEdit(savedValue);
}

function nearlyEqual(a: number, b: number, epsilon: number): boolean {
  return Math.abs(a - b) < epsilon;
}

/**
 * Percentages are stored as fractions (0.2) and edited as percents (20).
 * Converting at the edges keeps the rest of this module unit-agnostic.
 */
export const asPercent = (fraction: number): number => fraction * 100;
export const fromPercent = (percent: number): number => percent / 100;
