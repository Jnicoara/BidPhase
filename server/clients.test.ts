/**
 * Client records, and the link from a bid to one.
 *
 * ── What matters most here ───────────────────────────────────────────────────
 * 1. A bid with NO client must behave exactly as it did before clients existed.
 *    Every bid written up to now is in that state, `bids.clientId` is nullable
 *    and stays that way, and the proposal has to keep printing the bid's own
 *    typed-in name. Most of this file is that assertion in various shapes,
 *    because it is the regression nobody would notice until a contractor's
 *    proposal came out blank.
 *
 * 2. The link is provenance, not ownership. Archiving or unassigning a client
 *    must never destroy a bid, and the FK is `set null` for that reason.
 *
 * 3. The bid's own text beats the linked record. That is the same
 *    snapshot-beats-library rule the rest of the bid layer runs on — see
 *    shared/bidClient.ts — and it is what stops editing one shared contact
 *    silently rewriting a document that has already gone out.
 *
 * The resolution itself is pure, so it is tested without a database first.
 *
 * Fixture ids are distinct from every other suite.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import { getDb } from "./db";
import * as db from "./db";
import { bids, clients, users } from "../drizzle/schema";
import { resolveBidClient } from "../shared/bidClient";
import type { TrpcContext } from "./_core/context";

const USER = 8803;
const OTHER_USER = 8804;

const hasDb = Boolean(process.env.DATABASE_URL);

const callerFor = (userId: number) =>
  appRouter.createCaller({
    user: { id: userId, openId: `test-clients-${userId}`, role: "user" },
  } as unknown as TrpcContext);

const caller = () => callerFor(USER);
const otherCaller = () => callerFor(OTHER_USER);

const unique = (label: string) =>
  `${label} ${Date.now()}${Math.round(Math.random() * 1e6)}`;

// ══════════════════════════════════════════════════════════════════════════════
// Resolution — pure, no database
// ══════════════════════════════════════════════════════════════════════════════

describe("resolveBidClient", () => {
  it("returns the bid's own fields untouched when there is no client", () => {
    // The equivalence that makes adding the link a no-op for every existing bid.
    const resolved = resolveBidClient({
      clientName: "Harbour Construction",
      siteAddress: "88 Water St",
    });
    expect(resolved.clientName).toBe("Harbour Construction");
    expect(resolved.siteAddress).toBe("88 Water St");
    expect(resolved.nameSource).toBe("bid");
  });

  it("reports nothing to show when neither source has anything", () => {
    const resolved = resolveBidClient({});
    expect(resolved.clientName).toBeNull();
    expect(resolved.siteAddress).toBeNull();
    expect(resolved.nameSource).toBe("none");
    expect(resolved.addressSource).toBe("none");
  });

  it("fills in from the client when the bid left the field blank", () => {
    const resolved = resolveBidClient(
      { clientId: 1, clientName: null, siteAddress: null },
      { id: 1, name: "Harbour Construction", address: "88 Water St" }
    );
    expect(resolved.clientName).toBe("Harbour Construction");
    expect(resolved.siteAddress).toBe("88 Water St");
    expect(resolved.nameSource).toBe("client");
    expect(resolved.addressSource).toBe("client");
  });

  it("lets the bid's own text win over the linked record", () => {
    // A name corrected for one document must not require editing the shared
    // client record, which would move every other bid pointing at it.
    const resolved = resolveBidClient(
      { clientId: 1, clientName: "Harbour — North Division" },
      { id: 1, name: "Harbour Construction", address: "88 Water St" }
    );
    expect(resolved.clientName).toBe("Harbour — North Division");
    expect(resolved.nameSource).toBe("bid");
    // The address was blank on the bid, so it still comes from the client.
    expect(resolved.siteAddress).toBe("88 Water St");
    expect(resolved.addressSource).toBe("client");
  });

  it("treats whitespace as blank, so a stray space cannot win", () => {
    const resolved = resolveBidClient(
      { clientId: 1, clientName: "   " },
      { id: 1, name: "Harbour Construction" }
    );
    expect(resolved.clientName).toBe("Harbour Construction");
    expect(resolved.nameSource).toBe("client");
  });

  it("resolves each field independently", () => {
    const resolved = resolveBidClient(
      { clientId: 1, clientName: null, siteAddress: "Lot 14, Phase 2" },
      { id: 1, name: "Harbour Construction", address: "88 Water St" }
    );
    // The job is not at the client's own address — the case sales tax will care
    // about, and why the two addresses stay separate columns.
    expect(resolved.clientName).toBe("Harbour Construction");
    expect(resolved.siteAddress).toBe("Lot 14, Phase 2");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// The records — against the real database
// ══════════════════════════════════════════════════════════════════════════════

beforeAll(async () => {
  if (!hasDb) return;
  const dbc = await getDb();
  if (!dbc) return;
  for (const id of [USER, OTHER_USER]) {
    const [existing] = await dbc
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!existing) {
      await dbc.insert(users).values({
        id,
        openId: `test-clients-${id}`,
        name: `Client test user ${id}`,
      });
    }
  }
});

beforeEach(async () => {
  if (!hasDb) return;
  const dbc = await getDb();
  if (!dbc) return;
  const ours = [USER, OTHER_USER];
  await dbc.delete(bids).where(inArray(bids.userId, ours));
  await dbc.delete(clients).where(inArray(clients.userId, ours));
});

async function newClient(name = unique("Harbour Construction")) {
  return (await caller().clients.create({ name }))!;
}

async function newBid(name = unique("Bid")) {
  return (await caller().bids.create({ name, trades: ["electrical"] }))!;
}

describe.skipIf(!hasDb)("client records", () => {
  it("creates a company client with the details it was given", async () => {
    const client = await caller().clients.create({
      name: "Harbour Construction Group",
      kind: "company",
      contactName: "Dana Reyes",
      address: "88 Water St, Unit 4",
      phone: "555-0142",
      email: "dana@harbour.example",
    });

    expect(client!.name).toBe("Harbour Construction Group");
    expect(client!.kind).toBe("company");
    expect(client!.contactName).toBe("Dana Reyes");
    expect(client!.address).toBe("88 Water St, Unit 4");
    expect(client!.phone).toBe("555-0142");
    expect(client!.email).toBe("dana@harbour.example");
    expect(client!.archivedAt).toBeNull();
  });

  it("creates an individual with only a name", async () => {
    // Everything but the name is optional — a homeowner quoted over the phone
    // should not need an address before a bid can be written.
    const client = await caller().clients.create({
      name: "Sam Whitfield",
      kind: "individual",
    });
    expect(client!.kind).toBe("individual");
    expect(client!.address).toBeNull();
    expect(client!.phone).toBeNull();
    expect(client!.email).toBeNull();
  });

  it("stores a blank optional field as null, not as an empty string", async () => {
    // "" and NULL both mean "nothing entered", and collapsing them at the edge
    // is what stops a blank beating a real value in resolveBidClient.
    const client = await caller().clients.create({
      name: "Blank Fields Co",
      address: "   ",
      phone: "",
    });
    expect(client!.address).toBeNull();
    expect(client!.phone).toBeNull();
  });

  it("edits a client without disturbing the fields left out", async () => {
    const client = await caller().clients.create({
      name: "Original Name",
      phone: "555-0100",
    });
    const updated = await caller().clients.update({
      id: client!.id,
      name: "Corrected Name",
    });
    expect(updated!.name).toBe("Corrected Name");
    expect(updated!.phone).toBe("555-0100");
  });

  it("lists live clients A–Z and hides archived ones", async () => {
    await caller().clients.create({ name: "Zeta Builders" });
    const alpha = await caller().clients.create({ name: "Alpha Builders" });
    const gone = await caller().clients.create({ name: "Mid Builders" });
    await caller().clients.archive({ id: gone!.id });

    const list = await caller().clients.list();
    expect(list.map(c => c.name)).toEqual(["Alpha Builders", "Zeta Builders"]);
    expect(list[0].id).toBe(alpha!.id);

    const archived = await caller().clients.archived();
    expect(archived.map(c => c.name)).toEqual(["Mid Builders"]);
  });

  it("restores an archived client", async () => {
    const client = await newClient();
    await caller().clients.archive({ id: client.id });
    await caller().clients.restore({ id: client.id });
    const list = await caller().clients.list();
    expect(list.map(c => c.id)).toContain(client.id);
  });

  it("does not restart the clock when archived twice", async () => {
    const client = await newClient();
    await caller().clients.archive({ id: client.id });
    // Read the STORED date both times rather than comparing against the
    // in-memory one the first call returned — MySQL TIMESTAMP carries no
    // fractional seconds, so the two are never bit-identical and a comparison
    // across that boundary tests the rounding, not the guarantee.
    const stored = (await db.getClientById(client.id, USER))!.archivedAt;

    const second = await caller().clients.archive({ id: client.id });
    expect(second.alreadyArchived).toBe(true);

    const after = (await db.getClientById(client.id, USER))!.archivedAt;
    expect(after).toEqual(stored);
  });

  it("refuses to read another user's client", async () => {
    const mine = await newClient();
    await expect(otherCaller().clients.get({ id: mine.id })).rejects.toThrow(
      TRPCError
    );
  });

  it("refuses to edit another user's client", async () => {
    const mine = await newClient();
    await expect(
      otherCaller().clients.update({ id: mine.id, name: "Hijacked" })
    ).rejects.toThrow(TRPCError);

    const unchanged = await caller().clients.get({ id: mine.id });
    expect(unchanged.name).toBe(mine.name);
  });
});

describe.skipIf(!hasDb)("linking a bid to a client", () => {
  it("attaches a client to a bid", async () => {
    const client = await newClient();
    const bid = await newBid();

    const updated = await caller().bids.update({
      id: bid.id,
      clientId: client.id,
    });
    expect(updated!.clientId).toBe(client.id);

    const full = await caller().bids.get({ id: bid.id });
    expect(full.client?.id).toBe(client.id);
  });

  it("unassigns a client without touching the bid", async () => {
    const client = await newClient();
    const bid = await newBid();
    await caller().bids.update({ id: bid.id, clientId: client.id });

    const cleared = await caller().bids.update({ id: bid.id, clientId: null });
    expect(cleared!.clientId).toBeNull();
    expect(cleared!.name).toBe(bid.name);

    const full = await caller().bids.get({ id: bid.id });
    expect(full.client).toBeNull();
  });

  it("refuses to point a bid at another user's client", async () => {
    // A client id is a small integer. "You knew the number" must never be the
    // only thing standing in the way of a stranger's contact record.
    const theirs = (await otherCaller().clients.create({
      name: "Their Client",
    }))!;
    const bid = await newBid();

    await expect(
      caller().bids.update({ id: bid.id, clientId: theirs.id })
    ).rejects.toThrow(TRPCError);

    const full = await caller().bids.get({ id: bid.id });
    expect(full.bid.clientId).toBeNull();
  });

  it("lists every bid for a client, archived ones included", async () => {
    const client = await newClient();
    const live = await newBid("Live job");
    const shelved = await newBid("Shelved job");
    await caller().bids.update({ id: live.id, clientId: client.id });
    await caller().bids.update({ id: shelved.id, clientId: client.id });
    await caller().bids.archive({ id: shelved.id });

    const forClient = await caller().clients.bids({ id: client.id });
    const ids = forClient.map(b => b.id);
    // "What did I quote them last time" is a question about history, and a bid
    // being off the dashboard does not make it stop having happened.
    expect(ids).toContain(live.id);
    expect(ids).toContain(shelved.id);
  });

  it("counts the bids pointing at each client", async () => {
    const client = await newClient();
    const a = await newBid();
    const b = await newBid();
    await caller().bids.update({ id: a.id, clientId: client.id });
    await caller().bids.update({ id: b.id, clientId: client.id });

    const list = await caller().clients.list();
    expect(list.find(c => c.id === client.id)?.bidCount).toBe(2);
  });

  it("keeps the bid when its client is archived", async () => {
    const client = await newClient();
    const bid = await newBid();
    await caller().bids.update({ id: bid.id, clientId: client.id });
    await caller().clients.archive({ id: client.id });

    const full = await caller().bids.get({ id: bid.id });
    // Still linked, and the name still resolves — archiving is tidying a
    // contact list, not blanking old proposals.
    expect(full.bid.clientId).toBe(client.id);
    expect(full.client?.name).toBe(client.name);
  });

  it("nulls the link rather than deleting the bid when a client is destroyed", async () => {
    // The FK is `set null`. Nothing in the router offers this, but the database
    // must still behave if a row is removed by hand or by a future feature.
    const client = await newClient();
    const bid = await newBid();
    await caller().bids.update({ id: bid.id, clientId: client.id });

    const dbc = await getDb();
    await dbc!.delete(clients).where(eq(clients.id, client.id));

    const survivor = await db.getBidById(bid.id, USER);
    expect(survivor).toBeDefined();
    expect(survivor!.clientId).toBeNull();
    expect(survivor!.name).toBe(bid.name);
  });
});

describe.skipIf(!hasDb)("a bid with no client keeps working", () => {
  it("creates and prices a bid without ever mentioning a client", async () => {
    const bid = await newBid();
    expect(bid.clientId).toBeNull();

    const full = await caller().bids.get({ id: bid.id });
    expect(full.client).toBeNull();
    expect(full.totals).toBeDefined();
    expect(full.resolvedClient.clientName).toBeNull();
    expect(full.resolvedClient.nameSource).toBe("none");
  });

  it("still uses the bid's own typed-in name on the proposal", async () => {
    // The pre-clients behaviour, unchanged. This is the assertion that would
    // fail if resolveBidClient were ever wired the other way round.
    const bid = await newBid();
    await caller().bids.update({
      id: bid.id,
      clientName: "Typed By Hand Ltd",
      siteAddress: "12 Dock Road",
    });

    const { document } = await caller().proposals.document({ bidId: bid.id });
    expect(document.preparedFor.clientName).toBe("Typed By Hand Ltd");
    expect(document.preparedFor.siteAddress).toContain("12 Dock Road");
    expect(document.preparedFor.needsSetup).toBe(false);
  });

  it("still prompts on the proposal when nothing names the client", async () => {
    const bid = await newBid();
    const { document } = await caller().proposals.document({ bidId: bid.id });
    expect(document.preparedFor.needsSetup).toBe(true);
  });

  it("shows the client's name on the proposal once one is linked", async () => {
    const client = await caller().clients.create({
      name: "Harbour Construction Group",
      address: "88 Water St, Unit 4",
    });
    const bid = await newBid();
    await caller().bids.update({ id: bid.id, clientId: client!.id });

    const { document } = await caller().proposals.document({ bidId: bid.id });
    expect(document.preparedFor.clientName).toBe("Harbour Construction Group");
    // The document renders an address line by line, so it arrives split.
    expect(document.preparedFor.siteAddress.join(", ")).toBe(
      "88 Water St, Unit 4"
    );
    expect(document.preparedFor.needsSetup).toBe(false);
  });

  it("lets the bid's own name override the linked client on the document", async () => {
    const client = await caller().clients.create({
      name: "Harbour Construction Group",
      address: "88 Water St, Unit 4",
    });
    const bid = await newBid();
    await caller().bids.update({
      id: bid.id,
      clientId: client!.id,
      clientName: "Harbour — North Division",
      siteAddress: "Lot 14, Phase 2",
    });

    const { document } = await caller().proposals.document({ bidId: bid.id });
    expect(document.preparedFor.clientName).toBe("Harbour — North Division");
    expect(document.preparedFor.siteAddress.join(", ")).toBe("Lot 14, Phase 2");

    // And the shared client record was not edited on the way past.
    const untouched = await caller().clients.get({ id: client!.id });
    expect(untouched.name).toBe("Harbour Construction Group");
    expect(untouched.address).toBe("88 Water St, Unit 4");
  });

  it("archives and restores a bid that has no client", async () => {
    const bid = await newBid();
    await caller().bids.archive({ id: bid.id });
    const archived = await caller().bids.archived();
    expect(archived.map(b => b.id)).toContain(bid.id);

    await caller().bids.restore({ id: bid.id });
    const live = await caller().bids.list();
    expect(live.map(b => b.id)).toContain(bid.id);
  });

  it("puts clientless bids on the dashboard as before", async () => {
    await newBid();
    await newBid();
    const dashboard = await caller().bids.dashboard();
    expect(dashboard.length).toBeGreaterThanOrEqual(2);
    for (const card of dashboard) {
      expect(card.clientId).toBeNull();
      expect(card.finalPrice).toBeDefined();
    }
  });
});
