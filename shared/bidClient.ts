/**
 * Who a bid is for, once the linked client record and the bid's own typed-in
 * text have been reconciled.
 *
 * ── One rule, one place ─────────────────────────────────────────────────────
 * A bid can name its client two ways now: `bids.clientId` pointing at a
 * `clients` row, and the older free-text `bids.clientName` / `bids.siteAddress`
 * that the proposal has always read. Both stay (see the schema comments on
 * `bids.clientName` for why), so something has to decide which one wins — and
 * if that decision gets made independently in the proposal, the bid screen and
 * whatever reads this next, they will disagree, and a contractor will find the
 * document addressed to a different name than the bid shows.
 *
 * So the rule lives here and is tested here:
 *
 *   the bid's own text wins; the client record fills in what the bid left blank.
 *
 * ── Why that direction and not the other ────────────────────────────────────
 * It is the same snapshot-beats-library rule the whole bid layer runs on. A
 * line item's frozen cost outranks the assembly it came from; a bid's typed
 * client name outranks the record it was linked to. Both exist so that editing
 * shared data cannot silently rewrite a document somebody has already sent.
 *
 * The practical case is a bid addressed to one division, or a name corrected
 * for a single proposal. Under the opposite rule the only way to make that
 * correction would be to edit the shared client record — changing every other
 * bid pointing at it, none of which the user was looking at.
 *
 * ── A bid with no client is the normal case, not an edge case ───────────────
 * `clientId` is nullable and always will be. Passing `undefined` or `null` for
 * the client returns the bid's own fields untouched, which is exactly what the
 * proposal did before this module existed — that equivalence is what makes
 * adding the link a no-op for every bid that has not opted into it.
 */

/** The bid fields this reads. Deliberately structural, so tests need no DB row. */
export type BidClientSource = {
  clientId?: number | null;
  clientName?: string | null;
  siteAddress?: string | null;
};

/** The client fields this reads. A subset of the `clients` row. */
export type ClientSource = {
  id: number;
  name: string;
  address?: string | null;
};

export type ResolvedBidClient = {
  /** What to address the document to. Null when neither source supplied one. */
  clientName: string | null;
  /** Where the work is. Null when neither source supplied one. */
  siteAddress: string | null;
  /**
   * Where `clientName` came from — useful for telling a user that a blank field
   * is being filled from the linked record rather than being empty.
   *
   * "bid" means the bid's own text, "client" the linked record, "none" that
   * there is nothing to show and the proposal should prompt.
   */
  nameSource: "bid" | "client" | "none";
  addressSource: "bid" | "client" | "none";
};

/**
 * Trim to null.
 *
 * A field emptied by hand and a field never filled in mean the same thing here
 * — prompt, do not print a blank line — which is the reasoning already written
 * on `bids.clientName` and applied by bidsRouter's `|| null`. Whitespace counts
 * as empty, or a stray space would beat a real linked client's name.
 */
function clean(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed || null;
}

export function resolveBidClient(
  bid: BidClientSource,
  client?: ClientSource | null
): ResolvedBidClient {
  const ownName = clean(bid.clientName);
  const ownAddress = clean(bid.siteAddress);
  const linkedName = clean(client?.name);
  const linkedAddress = clean(client?.address);

  const clientName = ownName ?? linkedName;
  const siteAddress = ownAddress ?? linkedAddress;

  return {
    clientName,
    siteAddress,
    nameSource: ownName ? "bid" : linkedName ? "client" : "none",
    addressSource: ownAddress ? "bid" : linkedAddress ? "client" : "none",
  };
}
