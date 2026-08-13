/**
 * How sure the plan co-pilot is about one mark it found — in three tiers, not
 * two.
 *
 * ── Why "unreadable" is its own tier and not a low score ─────────────────────
 * The tempting design is a single number and one threshold: above it, propose;
 * below it, propose with a warning. That design has no way to say "I could not
 * read this", so it says "I am 22% sure this is a duplex receptacle" instead —
 * which is a guess wearing a confidence badge. An estimator skimming a list of
 * fifty proposals will accept it, because it is sitting in the same list as the
 * ones that are right, styled the same way, one click from a quantity.
 *
 * So an illegible mark does not become a low-confidence proposal. It becomes a
 * FLAG: this spot on the drawing needs your eyes, and nothing is proposed for
 * it. There is no allowed action that turns one into a stamp — see
 * shared/copilotActions.ts, where `unreadable` appears on flag_for_review and
 * nowhere else.
 *
 *   high        — a linked legend symbol, matched clearly. Shown normally.
 *   low         — recognised, but with a reason to doubt it. Shown flagged.
 *   unreadable  — could not be determined. Shown as needing manual review, with
 *                 no assembly, no count and no way to accept it.
 *
 * ── The floors are deliberately conservative ────────────────────────────────
 * A wrong high-confidence proposal costs more than a missed one. A miss leaves
 * the estimator counting a symbol by hand, which is what they do today; a false
 * accept puts a quantity on a bid nobody checked. The asymmetry is the whole
 * reason the floors sit where they do, and it is why an unlinked symbol can
 * never reach `high` no matter what the model says about it.
 */

export const CONFIDENCE_TIERS = ["high", "low", "unreadable"] as const;
export type ConfidenceTier = (typeof CONFIDENCE_TIERS)[number];

/** At or above this, a linked symbol is shown as ready to confirm. */
export const HIGH_CONFIDENCE_FLOOR = 0.75;

/**
 * Below this, nothing is proposed at all.
 *
 * Not "propose it quietly" — the floor is where a reading stops being a reading
 * and becomes a guess, and the tier below it is `unreadable`, not `low`.
 */
export const LOW_CONFIDENCE_FLOOR = 0.4;

/** What was observed about one candidate mark, before it becomes a finding. */
export type ConfidenceInput = {
  /**
   * The model's own certainty, 0–1. Anything absent, NaN or out of range is
   * treated as no reading at all rather than coerced — a model that returns
   * "0.9?" has not told us 0.9.
   */
  score: number | null | undefined;
  /**
   * The model said it could actually make out the mark. A false here outranks
   * any score: "I cannot read it but I am 90% sure" is not a thing we honour.
   */
  legible: boolean;
  /** A position on the sheet was produced, and it lands on the page. */
  hasPosition: boolean;
  /**
   * The symbol resolved to a legend entry that points at an assembly.
   *
   * Symbol meaning comes from the user's legend links, never from the model's
   * general knowledge of electrical symbols. An unlinked mark may still be
   * proposed — that is how a user gets asked to link it — but only ever as
   * `low`, because what it means is genuinely unsettled.
   */
  linkedToAssembly: boolean;
};

export type ConfidenceVerdict = {
  tier: ConfidenceTier;
  /** The score as stored: 0 when there was nothing usable to store. */
  score: number;
  /** One short sentence for the panel, in the user's words. */
  reason: string;
};

function usableScore(score: number | null | undefined): number | null {
  if (typeof score !== "number") return null;
  if (!Number.isFinite(score)) return null;
  if (score < 0 || score > 1) return null;
  return score;
}

/**
 * Place one candidate in a tier.
 *
 * Order matters and is the point: every path to `unreadable` is checked before
 * any path to a proposal, so there is no input that falls through into being
 * proposed by accident.
 */
export function classifyConfidence(input: ConfidenceInput): ConfidenceVerdict {
  const score = usableScore(input.score);

  if (!input.legible) {
    return {
      tier: "unreadable",
      score: score ?? 0,
      reason:
        "The mark here could not be made out — check this spot on the drawing yourself.",
    };
  }

  if (score === null) {
    return {
      tier: "unreadable",
      score: 0,
      reason:
        "No usable reading came back for this mark. It needs a manual check.",
    };
  }

  if (!input.hasPosition) {
    return {
      tier: "unreadable",
      score,
      reason:
        "This was mentioned but not located on the sheet, so there is nothing to place or check against.",
    };
  }

  if (score < LOW_CONFIDENCE_FLOOR) {
    return {
      tier: "unreadable",
      score,
      reason:
        "Too unclear to call. Rather than guess, this is left for you to read.",
    };
  }

  if (!input.linkedToAssembly) {
    return {
      tier: "low",
      score,
      reason:
        "This symbol isn't linked to an assembly yet — link it and it will be read confidently from here on.",
    };
  }

  if (score >= HIGH_CONFIDENCE_FLOOR) {
    return {
      tier: "high",
      score,
      reason: "Matches a legend symbol you have already linked.",
    };
  }

  return {
    tier: "low",
    score,
    reason:
      "Close to a symbol you have linked, but not a clean match. Check it.",
  };
}

/**
 * Can this tier produce something the user is offered to accept?
 *
 * The single question the panel and the router both ask. False for
 * `unreadable`, which is the rule that makes the third tier mean anything.
 */
export function canPropose(tier: ConfidenceTier): boolean {
  return tier === "high" || tier === "low";
}

/** Sort order for the panel: settled work first, then doubt, then the flags. */
export const TIER_ORDER: Record<ConfidenceTier, number> = {
  high: 0,
  low: 1,
  unreadable: 2,
};

/** Plain-English label for the tier badge. */
export const TIER_LABEL: Record<ConfidenceTier, string> = {
  high: "Confident",
  low: "Uncertain",
  unreadable: "Needs your eyes",
};
