/**
 * The trade registry — the one line a new trade adds.
 *
 * Adding plumbing is: write `plumbing.ts` next to `electrical.ts`, import it,
 * put it in the array. Nothing in client/src/pages/landing/ changes, and
 * client/src/lib/tradeContent.test.ts fails loudly if that ever stops being
 * true.
 *
 * ── Only electrical ships today, and that is a content fact ─────────────────
 * The array has one entry because one trade's copy has been written, not
 * because the page can only render one. CLAUDE.md § Project is explicit that
 * electrical is first by sequencing rather than by design; this file is where
 * that shows up in the marketing layer.
 */
import type { TradeContent } from "./types";
import { electrical } from "./electrical";

export type { TradeContent, TradeStep, TradeShot, StepIconKey } from "./types";
export { STEP_ICONS } from "./types";

/** Every trade with published marketing copy. Order is display order. */
export const TRADES: TradeContent[] = [electrical];

/**
 * The trade the bare landing page shows.
 *
 * First in the list rather than a hardcoded `electrical`, so reordering TRADES
 * is enough to change what a visitor lands on — and so this module has no
 * opinion about which trade is special.
 */
export const DEFAULT_TRADE: TradeContent = TRADES[0];

const BY_ID = new Map(TRADES.map(trade => [trade.id, trade]));

/**
 * Resolve a trade id, falling back to the default.
 *
 * Never throws and never renders nothing: a stale link to a trade that has been
 * renamed or pulled should land on the page that does exist, not on an error.
 */
export function resolveTrade(id: string | null | undefined): TradeContent {
  if (!id) return DEFAULT_TRADE;
  return BY_ID.get(id.trim().toLowerCase()) ?? DEFAULT_TRADE;
}
