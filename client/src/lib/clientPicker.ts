/**
 * What the client control on a bid should say, and which clients a search finds.
 *
 * ── Why the display rule is not written in the component ─────────────────────
 * A bid names its client two ways: a link to a `clients` row, and the older
 * free-text `clientName` / `siteAddress` typed onto the bid itself. The rule
 * for which one wins already exists and is tested — resolveBidClient in
 * @shared/bidClient — and the whole point of it living in one place is that
 * the proposal and the screen cannot disagree about who a bid is for.
 *
 * A UI that decided independently what to show would be a second copy of that
 * rule, and the first thing a second copy does is drift. So `describeClientLink`
 * CALLS resolveBidClient and only translates its answer into something a person
 * can read. It cannot say the record is being used when the document would
 * print something else, because it is asking the same function the document is.
 *
 * ── Deliberately not a filter on the server ──────────────────────────────────
 * `searchClients` runs in the browser over the list already fetched. That is
 * against the standing rule that search belongs server-side (CLAUDE.md §
 * Responsiveness, rule 2) and it is a knowing exception with a limit: a
 * contractor's client list is tens of rows, not thousands, and the picker is a
 * dropdown on one field rather than a screen that grows with the business. If
 * that stops being true — a shop with a thousand customers — this moves to a
 * cursor-paginated query on `clients.list` and the component keeps its shape.
 */
import { resolveBidClient } from "@shared/bidClient";

/** The client fields the picker reads. A subset of the `clients` row. */
export type PickableClient = {
  id: number;
  name: string;
  kind: "company" | "individual";
  contactName?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
};

/** The bid fields the control reads. */
export type LinkableBid = {
  clientId?: number | null;
  clientName?: string | null;
  siteAddress?: string | null;
};

/**
 * What state the control is in.
 *
 *   unset       Nothing names a client. The proposal will prompt.
 *   typed-only  Text on the bid, no record linked. What every bid written
 *               before clients existed looks like, and still perfectly valid.
 *   filling     A record is linked and its name is what will print, because
 *               the bid has no name of its own.
 *   overridden  A record is linked AND the bid has its own name, so the bid's
 *               wins. The one state worth explaining on screen: the record is
 *               attached and yet a different name appears on the document.
 */
export type ClientLinkStatus =
  | "unset"
  | "typed-only"
  | "filling"
  | "overridden";

export type ClientLinkDescription = {
  status: ClientLinkStatus;
  /** The name the proposal will actually print, or null if it will prompt. */
  effectiveName: string | null;
  /** The address the proposal will actually print, or null. */
  effectiveAddress: string | null;
  /**
   * Set only when `status` is "overridden" — the record's name, which is NOT
   * what prints. Shown so the discrepancy is visible rather than mysterious.
   */
  supersededName: string | null;
};

const clean = (value: string | null | undefined): string | null => {
  const trimmed = (value ?? "").trim();
  return trimmed || null;
};

/**
 * Read the resolution rule back out in terms a control can render.
 *
 * Delegates the actual decision to resolveBidClient so this can never claim
 * something the proposal would contradict.
 */
export function describeClientLink(
  bid: LinkableBid,
  client?: PickableClient | null
): ClientLinkDescription {
  const resolved = resolveBidClient(bid, client ?? undefined);
  const ownName = clean(bid.clientName);
  const linkedName = clean(client?.name);

  let status: ClientLinkStatus;
  if (!client) {
    status = ownName ? "typed-only" : "unset";
  } else if (ownName) {
    // A record is linked and the bid still has its own name. Even when the two
    // read the same, the bid's is what prints — so the state is the same one
    // and the note simply has nothing surprising to point out.
    status = "overridden";
  } else {
    status = linkedName ? "filling" : "unset";
  }

  return {
    status,
    effectiveName: resolved.clientName,
    effectiveAddress: resolved.siteAddress,
    supersededName:
      status === "overridden" && linkedName && linkedName !== ownName
        ? linkedName
        : null,
  };
}

/**
 * Find clients matching what the user typed.
 *
 * Matches across every field someone might search by — the trading name, the
 * person they deal with, the address, the phone number, the email — because a
 * contractor looking for a customer is as likely to remember "the one on Water
 * St" or a phone number as the company's registered name.
 *
 * An empty query returns everything, so opening the picker shows the list
 * rather than an empty box demanding input.
 */
export function searchClients<T extends PickableClient>(
  clients: readonly T[],
  query: string
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...clients];

  // Every whitespace-separated word must appear SOMEWHERE in the row, so
  // "harbour water" finds Harbour Construction at 88 Water St. Requiring all
  // of them is what keeps a two-word query from widening the results.
  const words = needle.split(/\s+/);

  return clients.filter(client => {
    const haystack = [
      client.name,
      client.contactName,
      client.address,
      client.phone,
      client.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return words.every(word => haystack.includes(word));
  });
}

/** A one-line summary for a picker row — whatever identifies them best. */
export function clientSubtitle(client: PickableClient): string | null {
  return (
    clean(client.contactName) ??
    clean(client.address)?.split("\n")[0] ??
    clean(client.phone) ??
    clean(client.email)
  );
}

/**
 * Is this draft good enough to create?
 *
 * Only the name is required — a homeowner quoted over the phone should not
 * need an address before a bid can be written, which is the same reasoning
 * that makes every other column on the table nullable.
 */
export function isCreatableClient(draft: { name: string }): boolean {
  return clean(draft.name) !== null;
}
