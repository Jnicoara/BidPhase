/**
 * The getting-started checklist, and what counts as done.
 *
 * ── Tracked, never asserted ──────────────────────────────────────────────────
 * Every step here is decided by looking at the user's actual data, not by a
 * flag set when they visited a screen. That distinction is the whole value of
 * the thing: a checklist that ticks itself off when you *open* the labor rates
 * page is a checklist that lies, and a new user who follows it to the end and
 * still has a $0 rate has been actively misled rather than merely unhelped.
 *
 * So this module takes facts and returns steps. It holds no state, does no I/O,
 * and is the single place the rules live — the server computes the counts, the
 * first-run flow asks it the same question about labor, and neither can drift
 * from the other.
 */

/** The four things a new account does before the app is genuinely usable. */
export const ONBOARDING_STEP_IDS = [
  "labor-rates",
  "price-material",
  "build-assembly",
  "complete-bid",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_IDS)[number];

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  /** One line on why it matters — motivation, not instruction. */
  detail: string;
  /** Where the step is done. Must be a real route; see navigationTargets. */
  href: string;
  done: boolean;
};

/**
 * What the app knows about this user's progress, gathered by the server.
 *
 * Deliberately counts and booleans rather than rows: the checklist asks
 * "has anything happened yet", and handing it the data would invite it to
 * start making judgements it has no business making.
 */
export type OnboardingFacts = {
  /** At least one labor role carries a real, non-zero rate. */
  hasRealLaborRate: boolean;
  /** At least one material carries a price the user set. */
  hasPricedMaterial: boolean;
  /** At least one assembly of the user's own. */
  hasOwnAssembly: boolean;
  /**
   * At least one bid with at least one line on it.
   *
   * "Complete" means the bid contains work, not that it was marked Won or sent
   * — a new user finishing their first real takeoff has done the thing this
   * step is about, and gating it on a status they may never set would leave
   * the checklist permanently unfinished for people using the app correctly.
   */
  hasBidWithLines: boolean;
};

/**
 * The checklist for a given set of facts.
 *
 * Order is fixed and meaningful: it runs in dependency order, so a user working
 * top to bottom never hits a step that needs something they have not done. It
 * opens with labor rates for the reason set out in laborRatePricing — the rate
 * multiplies every line in the bid, so it is the one number that has to be real
 * before anything else is worth doing.
 */
export function buildChecklist(facts: OnboardingFacts): OnboardingStep[] {
  return [
    {
      id: "labor-rates",
      title: "Set your labor rates",
      detail:
        "Every hour on every bid is priced from these, so nothing else is right until they are.",
      href: "#/library/labor-rates",
      done: facts.hasRealLaborRate,
    },
    {
      id: "price-material",
      title: "Price your first material",
      detail:
        "Start with what you buy most. The rest can wait until a job needs them.",
      href: "#/library/materials",
      done: facts.hasPricedMaterial,
    },
    {
      id: "build-assembly",
      title: "Build your first assembly",
      detail:
        "A receptacle, a switch — the things you install over and over, priced once.",
      href: "#/library/assemblies",
      done: facts.hasOwnAssembly,
    },
    {
      id: "complete-bid",
      title: "Complete your first bid",
      detail:
        "Put the pieces together on a real job and see the number come out.",
      // The Dashboard, because starting a bid needs a bid to exist first and
      // this is the only step whose screen cannot be linked to directly. Both
      // ways in — upload a plan, or count it out — are the first thing on it.
      href: "#/dashboard",
      done: facts.hasBidWithLines,
    },
  ];
}

/** How many steps are done. */
export function completedCount(steps: OnboardingStep[]): number {
  return steps.filter(step => step.done).length;
}

/** True once every step is done — the point the checklist stops being useful. */
export function isChecklistComplete(steps: OnboardingStep[]): boolean {
  return steps.every(step => step.done);
}

/**
 * The next thing to do, or null when there is nothing left.
 *
 * First incomplete step in order, which is what makes the list feel like a path
 * rather than a scoreboard.
 */
export function nextStep(steps: OnboardingStep[]): OnboardingStep | null {
  return steps.find(step => !step.done) ?? null;
}
