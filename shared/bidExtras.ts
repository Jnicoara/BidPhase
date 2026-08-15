/**
 * Additional expenses, includes/excludes, and the scope-only document mode.
 *
 * Three small things that share one property: they are the parts of a bid that
 * are neither material nor labor, and every one of them ends up in front of a
 * client.
 */

import { fromCents, toCents } from "./pricing";

// ─── Additional expenses ──────────────────────────────────────────────────────

export type ExpenseLine = {
  name: string;
  /** What the charge costs. Never includes overhead or profit. */
  amount: number;
  /** In the sales-tax base. Default false — a pass-through owes no tax. */
  taxable?: boolean;
  /** Gets the company's overhead and profit. Default false — flat. */
  markedUp?: boolean;
};

/** A charge with what the customer is actually billed for it worked out. */
export type PricedExpense = ExpenseLine & {
  /**
   * What appears on the document: `amount` when flat, `amount` plus its share
   * of overhead and profit when marked up.
   */
  charged: number;
};

/**
 * Sum the amounts (costs) of some charges.
 *
 * Integer cents like everything else in the engine, so a list of expenses adds
 * up to exactly the figure shown beside it rather than to something a hundredth
 * away from it.
 */
export function sumExpenses(lines: readonly ExpenseLine[]): number {
  return fromCents(
    lines.reduce((cents, line) => cents + toCents(line.amount || 0), 0)
  );
}

/** The cost of the charges that join the direct cost and get marked up. */
export function sumMarkedUpExpenses(lines: readonly ExpenseLine[]): number {
  return sumExpenses(lines.filter(line => line.markedUp));
}

/** Do any of these charges belong in the tax base? */
export function hasTaxableExpense(lines: readonly ExpenseLine[]): boolean {
  return lines.some(line => line.taxable);
}

/**
 * Work out what each charge is billed at.
 *
 * ── The uplift is the bid's own, not a second markup path ────────────────────
 * `uplift` is finalPrice ÷ directCost for THIS bid — the factor the pricing
 * engine already applied to materials and labor. A marked-up charge is scaled
 * by exactly that, which is what "the same calculation already used for
 * materials and labor" has to mean if the two are never to disagree. Computing
 * overhead and profit a second time here would be a second implementation of
 * the thing shared/pricing.ts exists to own.
 *
 * A flat charge is billed at cost, whatever the uplift is.
 */
export function priceExpenses(
  lines: readonly ExpenseLine[],
  uplift: number
): {
  lines: PricedExpense[];
  /** Billed total of the marked-up charges — the part inside the bid price. */
  markedUpCharged: number;
  /** Cost total of the flat charges — the part added after it. */
  flatTotal: number;
  /** Billed total of everything. */
  total: number;
} {
  const priced: PricedExpense[] = lines.map(line => ({
    ...line,
    charged: line.markedUp
      ? fromCents(Math.round(toCents(line.amount || 0) * uplift))
      : fromCents(toCents(line.amount || 0)),
  }));

  const sumCharged = (rows: PricedExpense[]) =>
    fromCents(rows.reduce((cents, row) => cents + toCents(row.charged), 0));

  return {
    lines: priced,
    markedUpCharged: sumCharged(priced.filter(row => row.markedUp)),
    flatTotal: sumCharged(priced.filter(row => !row.markedUp)),
    total: sumCharged(priced),
  };
}

/**
 * ── Where expenses sit in the price ──────────────────────────────────────────
 *
 * Each charge carries two independent switches, and both ship OFF, so a charge
 * with neither behaves exactly as every charge did before they existed: a flat
 * pass-through, untaxed.
 *
 *     materials + labor
 *     + marked-up charges        →  direct cost      ← `markedUp` puts it here
 *     + overhead
 *     + profit                   →  bid price
 *     + flat charges             →  subtotal         ← `markedUp` off stays here
 *     + sales tax                →  total due        ← `taxable` feeds the base
 *
 * ── Why two booleans and not a rules system ──────────────────────────────────
 * Because the answer varies by state AND by the kind of charge, and no rule
 * anybody could write would predict it. A permit is often passed through at
 * cost and untaxed; a minimum service fee is usually taxed and marked up like
 * any other revenue; an inspection might be one and not the other. Four
 * combinations, chosen per charge by the person who knows, beats a clever
 * scheme that is wrong in a way nobody can see.
 *
 * They are genuinely independent — `taxable` decides whether the amount enters
 * the tax base, `markedUp` decides whether overhead and profit apply, and
 * neither reads the other.
 */
export const EXPENSE_FLAGS_DEFAULT_OFF = true;

// ─── Includes / excludes ──────────────────────────────────────────────────────

export type ScopeNoteLine = {
  kind: "include" | "exclude";
  text: string;
};

export type GroupedScopeNotes = {
  includes: string[];
  excludes: string[];
};

/**
 * Split scope notes into the two lists a document prints.
 *
 * Blank text is dropped rather than rendered as an empty bullet — an exclusion
 * that says nothing is worse than no exclusion, because it looks like a line
 * somebody meant to finish.
 */
export function groupScopeNotes(
  notes: readonly ScopeNoteLine[]
): GroupedScopeNotes {
  const includes: string[] = [];
  const excludes: string[] = [];
  for (const note of notes) {
    const text = (note.text ?? "").trim();
    if (!text) continue;
    (note.kind === "exclude" ? excludes : includes).push(text);
  }
  return { includes, excludes };
}

// ─── Scope-only output ────────────────────────────────────────────────────────

/**
 * Which version of the document to build.
 *
 *   full        Everything, priced. The normal proposal.
 *   scope-only  The work described, with every money figure removed. Sent to a
 *               GC or a client to agree WHAT is being done before bid day, so
 *               scope disputes happen early and cheaply.
 */
export const PROPOSAL_MODES = ["full", "scope-only"] as const;
export type ProposalMode = (typeof PROPOSAL_MODES)[number];

/**
 * The sections that carry money, and therefore cannot appear on a scope-only
 * document.
 *
 * ── Why this is a list and not a per-section flag ────────────────────────────
 * The existing hidden-sections control very nearly does this job already — a
 * user can switch off the labor summary, the unit pricing and the terms. What
 * it cannot do is switch off `investment`, because that section is REQUIRED:
 * a proposal that does not state a price is not a proposal, and the app is
 * right to refuse to make one by accident.
 *
 * A scope-only document is exactly the case where that refusal is wrong. So
 * this is a mode that suspends the requirement, rather than a new document
 * type with its own renderer — the same builder, the same sections, one rule
 * relaxed and one rule added.
 *
 * `unitPricing` is here too and is easy to forget: it is a per-room PRICE, and
 * a "no pricing" document that quietly lists $420 a room forty times would be
 * the most embarrassing possible version of this feature.
 */
export const MONEY_SECTION_IDS = ["investment", "unitPricing"] as const;

/** Is this section allowed on a document built in this mode? */
export function sectionAllowedInMode(
  sectionId: string,
  mode: ProposalMode
): boolean {
  if (mode === "full") return true;
  return !(MONEY_SECTION_IDS as readonly string[]).includes(sectionId);
}

/**
 * Does this text contain something that reads as an amount of money?
 *
 * ── Used as a TEST, not as a filter ──────────────────────────────────────────
 * Nothing in the app runs the finished document through this to strip figures
 * out. Redacting by pattern-matching the output would be the wrong shape: it
 * would hide the symptom of a section that should not have been built, and the
 * first figure it failed to catch would go to a client.
 *
 * Instead the document is BUILT without money in scope-only mode, and this
 * exists so the test suite can assert that independently — a second opinion
 * from outside the builder, which is the only kind worth having about a
 * guarantee like "no dollar amounts anywhere".
 */
export function containsMoney(text: string): boolean {
  // A currency symbol, or grouped thousands.
  //
  // Deliberately NOT a bare "N.NN". Labor hours legitimately print as "1.42",
  // and a detector that cried money at those is one nobody would trust — the
  // first false positive is the point where somebody starts ignoring it. Every
  // figure the document renders as money goes through `money()`, which always
  // emits a currency symbol, so requiring one costs no real coverage.
  return /[$£€]\s*\d|(?:^|\s)\d{1,3}(?:,\d{3})+(?:\.\d+)?(?:\s|$)/.test(text);
}
