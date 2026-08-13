/**
 * Where a library row came from, and how to show only your own.
 *
 * ── The origin rule, in one place ────────────────────────────────────────────
 * Five screens — Materials, Assemblies, Labor Rates, Modifiers, Kits — all
 * label rows by origin, and each had its own copy of the same three-branch
 * function. They agreed, but only by luck: five copies of a rule is five
 * chances for one to be edited alone, and getting this backwards tells a user
 * their own priced-up copy is a shipped default (or the reverse), which is the
 * difference between trusting a number and rechecking it.
 *
 * The rule itself comes from two columns:
 *
 *   userId === null                    → a shipped starter, shared by everyone
 *   userId set, baselineId set         → the user's fork OF a starter
 *   userId set, baselineId null        → the user made it from scratch
 *
 * Both of the last two are the user's own. They are labelled differently
 * because the difference is actionable — a fork can be reverted to the shipped
 * version, a from-scratch row has nothing to revert to — but both count as
 * "mine" for filtering.
 */

/** The two columns every library table carries for provenance. */
export type LibraryOrigin = {
  userId: number | null;
  baselineId: number | null;
};

export type OriginKind = "starter" | "fork" | "custom";

/** What a row is, from its provenance columns. */
export function originKindOf(row: LibraryOrigin): OriginKind {
  if (row.userId === null) return "starter";
  return row.baselineId != null ? "fork" : "custom";
}

/** What the badge says. Never "Starter" for something the user made. */
export function originLabel(row: LibraryOrigin): string {
  switch (originKindOf(row)) {
    case "starter":
      return "Starter";
    case "fork":
      return "Your copy";
    case "custom":
      return "Yours";
  }
}

/** Whether the row belongs to the user rather than the shipped library. */
export function isOwnedByUser(row: LibraryOrigin): boolean {
  return originKindOf(row) !== "starter";
}

/**
 * Which rows a screen is showing.
 *
 * `all` is the default because browsing the shipped library alongside your own
 * is the normal case — you are looking for a part, not auditing provenance.
 * `mine` exists for the other job: seeing what you have actually customised,
 * which is otherwise buried among the starters.
 */
export type LibraryScope = "all" | "mine";

export function filterByScope<T extends LibraryOrigin>(
  rows: T[],
  scope: LibraryScope
): T[] {
  return scope === "mine" ? rows.filter(isOwnedByUser) : rows;
}

/** Counts for the scope control, so it can say how many "mine" would show. */
export function scopeCounts<T extends LibraryOrigin>(
  rows: T[]
): { all: number; mine: number } {
  return { all: rows.length, mine: rows.filter(isOwnedByUser).length };
}
