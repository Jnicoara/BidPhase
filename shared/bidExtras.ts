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
  amount: number;
};

/**
 * Sum the flat charges on a bid.
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

/**
 * ── Where expenses sit in the price, and why ─────────────────────────────────
 *
 * A permit fee is a PASS-THROUGH. It is added after overhead and profit, and it
 * is not marked up:
 *
 *     materials + labor          →  direct cost
 *     + overhead                 →  cost with overhead
 *     + profit                   →  bid price
 *     + expenses                 →  subtotal          ← here
 *     + sales tax                →  total due
 *
 * Two consequences worth being explicit about, because both are decisions
 * rather than facts:
 *
 *  • Expenses are NOT marked up. A $180 permit appears as $180. Marking up a
 *    government fee is a choice some contractors make and many customers
 *    query, so the app does the unsurprising thing and leaves the other
 *    available by simply typing a larger number.
 *
 *  • Expenses are NOT in the sales-tax base. The taxable amount is still the
 *    material and/or labor share of the bid price, exactly as before — permits
 *    and inspection fees are generally not taxable receipts, and folding them
 *    in would change every tax figure the previous release established.
 *
 * If a jurisdiction or a business needs either of those the other way round,
 * that is a real change here and not a setting somebody can guess at.
 */
export const EXPENSES_ARE_MARKED_UP = false;

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
