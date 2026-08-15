/**
 * The trade axis, as one shared list.
 *
 * ── Why this file exists ─────────────────────────────────────────────────────
 * `trade` was already stored on materials and assemblies, and a trade id was
 * already written down in client/src/content/trades for the landing page — but
 * nothing connected the two. The marketing type even said so out loud: "Stable
 * id. Matches the `trade` value on assemblies in drizzle/schema.ts." A comment
 * is not a connection. Two lists of the same strings are two lists that drift,
 * and the drift shows up as a plumbing landing page selling a trade no row in
 * the database is tagged with.
 *
 * So the vocabulary lives here, in `shared/`, reachable from the server, the
 * client and the seed scripts alike. This is the same instinct as
 * shared/navigationTargets.ts (CLAUDE.md § AI features): one list, so there is
 * no pair that can disagree.
 *
 * ── It is a vocabulary, NOT a gate ───────────────────────────────────────────
 * Nothing here rejects an unknown trade, and that is deliberate. The columns
 * are `varchar` rather than `mysqlEnum` precisely so a new trade is content
 * rather than a migration (see drizzle/schema.ts on `assemblies.trade` and the
 * MATERIAL_CATEGORIES comment explaining the opposite choice for a curated
 * list). A registry that refused unrecognised ids would put the migration
 * straight back. `labelForTrade` humanises anything it does not know, and
 * `normalizeTradeId` only tidies whitespace and case.
 *
 * Which trades a given account may actually USE is a separate question, decided
 * at the app layer when unlocking ships. This file has no opinion on it.
 */

/**
 * The reserved trade id meaning "every trade".
 *
 * ── What it is for ──────────────────────────────────────────────────────────
 * ASSEMBLIES_PLAN.md § MULTI-TRADE STRUCTURE splits the data model in two. The
 * baseline assembly library is trade-gated per unlock; the labor rate
 * structure, Settings and the proposal generator are explicitly *shared across
 * all trades regardless of unlock*. Both halves need a `trade` column, but they
 * need it to mean different things:
 *
 *   materials / assemblies / kits  →  "this row IS electrical work"
 *   labor rates / settings         →  "this row serves every trade"
 *
 * Stamping the second group `electrical` would read as correct today and fail
 * on the day a second trade unlocks: a contractor's rates, licence number and
 * proposal terms would all belong to a trade they were no longer only working
 * in, and would need a backfill to come back. `all` says the true thing from
 * the start, so the second trade is purely additive.
 *
 * ── Why a sentinel string and not NULL ──────────────────────────────────────
 * "Applies to everything" is a real value, not missing data, and MySQL treats
 * NULLs in a unique index as distinct — so `unique(userId, trade)` with a
 * nullable column would happily store two company-wide branding rows for one
 * user and no constraint would notice. A non-null sentinel makes the index do
 * the job it exists for.
 */
export const TRADE_ALL = "all";

/**
 * The trade a row gets when nobody says otherwise.
 *
 * Electrical is first by sequencing, not by design (CLAUDE.md § Project). This
 * constant is where that sequencing is written down once, rather than as a
 * `"electrical"` literal in every schema default, router input and seed file.
 */
export const DEFAULT_TRADE = "electrical";

export type TradeId = string;

/** A trade the app has a name for. Not a promise that its content exists. */
export type TradeDefinition = {
  /** The stored value. Lower case, hyphenated — matches the column exactly. */
  id: TradeId;
  /** Display name, capitalised. */
  label: string;
  /**
   * Whether this trade's content — catalog, assemblies, marketing copy — has
   * actually shipped.
   *
   * A trade is listed here before it ships so that the id is agreed on in ONE
   * place the moment anyone starts tagging rows with it, rather than being
   * invented twice in two spellings. `hvac` and `plumbing` are named, unshipped
   * and carry no content; nothing surfaces them to a user.
   */
  shipped: boolean;
};

/**
 * Every trade id the app recognises.
 *
 * `low-voltage` is here because it is already in use: the low-voltage material
 * family ships under it (server/seed/materials/lowVoltage.ts) so that an
 * electrical estimator hunting a receptacle does not wade through Cat6 jacks.
 * It is a real, live second value on the trade axis today — which makes it the
 * proof that the axis works, not a hypothetical.
 */
export const TRADES: readonly TradeDefinition[] = [
  { id: "electrical", label: "Electrical", shipped: true },
  { id: "low-voltage", label: "Low Voltage", shipped: true },
  { id: "plumbing", label: "Plumbing", shipped: false },
  { id: "hvac", label: "HVAC", shipped: false },
] as const;

const BY_ID = new Map(TRADES.map(t => [t.id, t]));

/** The trades a user can be shown today. */
export function shippedTrades(): TradeDefinition[] {
  return TRADES.filter(t => t.shipped);
}

/**
 * Tidy a trade id into its stored form.
 *
 * Trims and lower-cases, and nothing else — an unrecognised id survives intact
 * rather than being coerced to the default, because silently rewriting
 * `plumbing` to `electrical` would file a row under a trade nobody chose.
 * Blank and nullish fall back to the default, which is the one case where there
 * is genuinely nothing to preserve.
 */
export function normalizeTradeId(value: string | null | undefined): TradeId {
  const trimmed = (value ?? "").trim().toLowerCase();
  return trimmed || DEFAULT_TRADE;
}

/** Is this an id the registry has a name for? */
export function isKnownTrade(value: string | null | undefined): boolean {
  const id = normalizeTradeId(value);
  return id === TRADE_ALL || BY_ID.has(id);
}

/**
 * A display name for a trade id.
 *
 * Never throws and never renders an empty string: an id with no entry is
 * humanised (`solar-thermal` → `Solar Thermal`) rather than dropped, so a row
 * tagged with a trade added ahead of this list still reads as something.
 */
export function labelForTrade(value: string | null | undefined): string {
  const id = normalizeTradeId(value);
  if (id === TRADE_ALL) return "All trades";
  const known = BY_ID.get(id);
  if (known) return known.label;
  return id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Does a row tagged `rowTrade` apply when the caller is working in `wanted`?
 *
 * The `all` sentinel matches everything, in both directions — asking for the
 * company-wide record by name has to work as well as asking for electrical and
 * getting it. Everything else is an exact match on the normalised id.
 */
export function tradeApplies(
  rowTrade: string | null | undefined,
  wanted: string | null | undefined
): boolean {
  const row = normalizeTradeId(rowTrade);
  const want = normalizeTradeId(wanted);
  return row === TRADE_ALL || want === TRADE_ALL || row === want;
}

/**
 * Pick the row that governs a given trade: the trade's own, else the `all` one.
 *
 * This is the whole resolution rule for the shared-settings tables in one
 * place, so branding, pricing defaults and proposal settings cannot each grow
 * their own slightly different version of it. A user with only the company-wide
 * row gets that row for every trade — which is exactly today's behaviour, and
 * why adding the column changed nothing on screen.
 *
 * Returns `undefined` when neither exists, rather than inventing a row: the
 * callers already distinguish "no settings yet" from "settings still blank",
 * and that distinction is load-bearing for `needsBranding`.
 */
export function resolveForTrade<T extends { trade: string }>(
  rows: readonly T[],
  wanted: string | null | undefined
): T | undefined {
  const want = normalizeTradeId(wanted);
  if (want !== TRADE_ALL) {
    const exact = rows.find(row => normalizeTradeId(row.trade) === want);
    if (exact) return exact;
  }
  return rows.find(row => normalizeTradeId(row.trade) === TRADE_ALL);
}
