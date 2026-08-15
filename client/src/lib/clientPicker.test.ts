/**
 * Does the client control tell the truth about who a bid is for?
 *
 * ── The thing that must not drift ────────────────────────────────────────────
 * A bid names its client two ways — a linked record and free text typed on the
 * bid — and the bid's own text wins. That rule lives in resolveBidClient
 * (@shared/bidClient) and is tested there against the database and the
 * proposal. What is tested HERE is that the screen agrees with it.
 *
 * The failure this guards against is specific and quiet: a control that says
 * "Harbour Construction Group" because that record is attached, while the
 * document prints "Harbour — North Division" because someone typed that on the
 * Proposal screen. Nothing errors, nothing looks broken, and a contractor sends
 * a proposal to a name they did not see on screen.
 *
 * describeClientLink therefore CALLS resolveBidClient rather than reimplementing
 * it, and the assertions below check the two never disagree — including on
 * `effectiveName`, which is asserted against resolveBidClient's own output
 * rather than against a hardcoded string.
 */
import { describe, it, expect } from "vitest";
import {
  clientSubtitle,
  describeClientLink,
  isCreatableClient,
  searchClients,
  type PickableClient,
} from "./clientPicker";
import { resolveBidClient } from "@shared/bidClient";

const harbour: PickableClient = {
  id: 1,
  name: "Harbour Construction Group",
  kind: "company",
  contactName: "Dana Reyes",
  address: "88 Water St, Unit 4",
  phone: "555-0142",
  email: "dana@harbour.example",
};

const sam: PickableClient = {
  id: 2,
  name: "Sam Whitfield",
  kind: "individual",
  address: "14 Elm Row",
};

describe("what the control says about the link", () => {
  it("is unset when nothing names a client at all", () => {
    const described = describeClientLink({});
    expect(described.status).toBe("unset");
    expect(described.effectiveName).toBeNull();
    expect(described.supersededName).toBeNull();
  });

  it("is typed-only for a bid with text and no record", () => {
    // Every bid written before clients existed is in this state, and it is a
    // perfectly finished one — not a warning.
    const described = describeClientLink({ clientName: "Typed By Hand Ltd" });
    expect(described.status).toBe("typed-only");
    expect(described.effectiveName).toBe("Typed By Hand Ltd");
  });

  it("is filling when a record supplies what the bid left blank", () => {
    const described = describeClientLink(
      { clientId: 1, clientName: null, siteAddress: null },
      harbour
    );
    expect(described.status).toBe("filling");
    expect(described.effectiveName).toBe("Harbour Construction Group");
    expect(described.effectiveAddress).toBe("88 Water St, Unit 4");
    expect(described.supersededName).toBeNull();
  });

  it("is overridden when the bid has its own name as well", () => {
    // The state worth explaining: a record IS attached and something else
    // prints.
    const described = describeClientLink(
      { clientId: 1, clientName: "Harbour — North Division" },
      harbour
    );
    expect(described.status).toBe("overridden");
    expect(described.effectiveName).toBe("Harbour — North Division");
    // And it names what is being superseded, so the discrepancy is visible
    // rather than mysterious.
    expect(described.supersededName).toBe("Harbour Construction Group");
  });

  it("does not cry override when the two names are the same", () => {
    // Still technically overridden — the bid's text is what prints — but there
    // is nothing surprising to point out, so no name is offered as superseded.
    const described = describeClientLink(
      { clientId: 1, clientName: "Harbour Construction Group" },
      harbour
    );
    expect(described.status).toBe("overridden");
    expect(described.supersededName).toBeNull();
  });

  it("treats whitespace on the bid as nothing typed", () => {
    const described = describeClientLink(
      { clientId: 1, clientName: "   " },
      harbour
    );
    expect(described.status).toBe("filling");
    expect(described.effectiveName).toBe("Harbour Construction Group");
  });

  it("resolves each field independently", () => {
    // The job is not always at the client's own address — the case sales tax
    // will care about later.
    const described = describeClientLink(
      { clientId: 1, clientName: null, siteAddress: "Lot 14, Phase 2" },
      harbour
    );
    expect(described.effectiveName).toBe("Harbour Construction Group");
    expect(described.effectiveAddress).toBe("Lot 14, Phase 2");
  });
});

describe("the control cannot contradict the document", () => {
  const cases: Array<{
    label: string;
    bid: Parameters<typeof describeClientLink>[0];
    client?: PickableClient | null;
  }> = [
    { label: "nothing at all", bid: {} },
    { label: "typed only", bid: { clientName: "Typed Ltd" } },
    { label: "record only", bid: { clientId: 1 }, client: harbour },
    {
      label: "both, differing",
      bid: { clientId: 1, clientName: "Other Name" },
      client: harbour,
    },
    {
      label: "both, matching",
      bid: { clientId: 1, clientName: harbour.name },
      client: harbour,
    },
    {
      label: "address typed, name from record",
      bid: { clientId: 1, siteAddress: "Lot 14" },
      client: harbour,
    },
  ];

  for (const { label, bid, client } of cases) {
    it(`shows exactly what the proposal prints — ${label}`, () => {
      // Asserted against the resolver itself rather than a literal, so this
      // stays true if the rule is ever deliberately changed, and fails loudly
      // if the screen starts computing its own answer.
      const resolved = resolveBidClient(bid, client ?? undefined);
      const described = describeClientLink(bid, client);

      expect(described.effectiveName).toBe(resolved.clientName);
      expect(described.effectiveAddress).toBe(resolved.siteAddress);
    });
  }
});

describe("searching the client list", () => {
  const all = [harbour, sam];

  it("returns everything for an empty query", () => {
    // Opening the picker should show the list, not an empty box demanding input.
    expect(searchClients(all, "")).toHaveLength(2);
    expect(searchClients(all, "   ")).toHaveLength(2);
  });

  it("matches on the name, case-insensitively", () => {
    expect(searchClients(all, "harbour").map(c => c.id)).toEqual([1]);
    expect(searchClients(all, "HARBOUR").map(c => c.id)).toEqual([1]);
  });

  it("matches on the things people actually remember", () => {
    // "the one on Water St", the contact's name, a phone number.
    expect(searchClients(all, "water").map(c => c.id)).toEqual([1]);
    expect(searchClients(all, "dana").map(c => c.id)).toEqual([1]);
    expect(searchClients(all, "555-0142").map(c => c.id)).toEqual([1]);
    expect(searchClients(all, "elm").map(c => c.id)).toEqual([2]);
  });

  it("requires every word, so a second word narrows", () => {
    expect(searchClients(all, "harbour water").map(c => c.id)).toEqual([1]);
    // "harbour elm" spans two different clients and must match neither.
    expect(searchClients(all, "harbour elm")).toHaveLength(0);
  });

  it("returns nothing rather than everything for no match", () => {
    expect(searchClients(all, "zzz")).toHaveLength(0);
  });

  it("copes with rows that have almost nothing filled in", () => {
    const bare: PickableClient = { id: 3, name: "Bare Co", kind: "company" };
    expect(searchClients([bare], "bare").map(c => c.id)).toEqual([3]);
    expect(searchClients([bare], "anything")).toHaveLength(0);
  });

  it("does not mutate or alias the list it was given", () => {
    const source = [harbour, sam];
    const result = searchClients(source, "");
    result.pop();
    expect(source).toHaveLength(2);
  });
});

describe("the picker row subtitle", () => {
  it("prefers the person you deal with", () => {
    expect(clientSubtitle(harbour)).toBe("Dana Reyes");
  });

  it("falls back through address, phone, then email", () => {
    expect(clientSubtitle({ ...harbour, contactName: null })).toBe(
      "88 Water St, Unit 4"
    );
    expect(
      clientSubtitle({ ...harbour, contactName: null, address: null })
    ).toBe("555-0142");
    expect(
      clientSubtitle({
        ...harbour,
        contactName: null,
        address: null,
        phone: null,
      })
    ).toBe("dana@harbour.example");
  });

  it("shows only the first line of a multi-line address", () => {
    expect(
      clientSubtitle({
        id: 9,
        name: "Multi",
        kind: "company",
        address: "88 Water St\nUnit 4\nHarbourside",
      })
    ).toBe("88 Water St");
  });

  it("is null when there is nothing to add to the name", () => {
    expect(
      clientSubtitle({ id: 9, name: "Bare Co", kind: "company" })
    ).toBeNull();
  });
});

describe("what can be created", () => {
  it("needs a name and nothing else", () => {
    // A homeowner quoted over the phone should not need an address first.
    expect(isCreatableClient({ name: "Sam Whitfield" })).toBe(true);
  });

  it("refuses a blank or whitespace-only name", () => {
    expect(isCreatableClient({ name: "" })).toBe(false);
    expect(isCreatableClient({ name: "   " })).toBe(false);
  });
});
