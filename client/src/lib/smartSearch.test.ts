/**
 * Ranking rules for smartSearch.
 *
 * The rule under test is provenance: a word the user typed outranks a term the
 * alias map merely associated with it. Alias expansion is lossy — an entry
 * matches if any of its values matches, then all of its values join the set —
 * so without the split, unrelated names win on the exact-match tier.
 *
 * Pure module, no DOM, so it runs in the default node environment.
 */
import { describe, it, expect } from "vitest";
import { smartSearch } from "./smartSearch";

/** The starter material names, which is where the original bug was seen. */
const MATERIALS = [
  "#14 THHN", "#12 THHN", "#10 THHN", "#8 THHN", "14-2 NM-B", "12-2 NM-B",
  '1/2" EMT', '3/4" EMT', '1" EMT', '1/2" PVC',
  'EMT connector 1/2"', 'EMT connector 3/4"', "EMT strap",
  "Single-gang box", '4" square box', "Fan-rated ceiling box",
  "Duplex receptacle", "GFCI receptacle",
  "Single-pole switch", "3-way switch", "Dimmer",
  "Wall plate", "Wire nuts",
  "20A breaker", "20/2 breaker", "200A main panel",
  "6ft MC whip", "Fixture mounting bracket",
];

const search = (query: string, names = MATERIALS) =>
  smartSearch(names.map((description, i) => ({ id: String(i + 1), description })), query, 50)
    .map(r => r.description);

/** Position in the result list, or Infinity when absent. */
const rankOf = (results: string[], name: string) => {
  const at = results.indexOf(name);
  return at === -1 ? Infinity : at;
};

describe("typed words outrank aliases", () => {
  it('ranks "Duplex receptacle" above "Wall plate" for "recep"', () => {
    // The original bug: "outlet cover" lists both "receptacle plate" and
    // "wall plate", so typing "recep" dragged in "wall plate" and it won the
    // exact-match tier over the item that genuinely matched.
    const results = search("recep");
    expect(rankOf(results, "Duplex receptacle")).toBeLessThan(rankOf(results, "Wall plate"));
  });

  it("puts both receptacles above every alias-only match for \"recep\"", () => {
    const results = search("recep");
    const worstReceptacle = Math.max(
      rankOf(results, "Duplex receptacle"),
      rankOf(results, "GFCI receptacle")
    );
    for (const aliasOnly of ["Wall plate", "Single-pole switch", "3-way switch"]) {
      if (rankOf(results, aliasOnly) === Infinity) continue;
      expect(rankOf(results, aliasOnly), aliasOnly).toBeGreaterThan(worstReceptacle);
    }
  });

  it("ranks the exact typed name first even when an alias also matches exactly", () => {
    expect(search("wall plate")[0]).toBe("Wall plate");
    expect(search("dimmer")[0]).toBe("Dimmer");
  });

  it("still ranks a real name match first for a full word", () => {
    expect(search("receptacle")[0]).toMatch(/receptacle/i);
  });
});

describe("alias matches still work when nothing else does", () => {
  it('finds NM-B cable from the trade name "romex", which appears in no name', () => {
    const results = search("romex");
    expect(results).toContain("14-2 NM-B");
    expect(results).toContain("12-2 NM-B");
  });

  it('finds wall plates from "outlet cover", the case the alias map exists for', () => {
    expect(search("outlet cover")).toContain("Wall plate");
  });

  it('finds EMT from the slang "thinwall", which appears in no name', () => {
    expect(search("thinwall")).toContain('1/2" EMT');
  });

  // KNOWN GAP, pre-dating the provenance fix and deliberately not asserted:
  // multi-word ALIAS_MAP keys like "load center" are unreachable from a
  // multi-word query. The query is split on whitespace and each token is
  // expanded alone, so "load" reaches the key by prefix but "center" matches
  // nothing — and the all-tokens-must-match rule then drops every item.
  // Verified identical before and after this fix; searching "load center"
  // returns nothing either way.
});

describe("prefix typing stays responsive", () => {
  it("matches on a partial word as it is typed", () => {
    for (const partial of ["recept", "brea", "dimm"]) {
      expect(search(partial).length, partial).toBeGreaterThan(0);
    }
  });

  it("narrows rather than widens as more is typed", () => {
    expect(search("break").length).toBeLessThanOrEqual(search("brea").length);
  });
});

describe("basics", () => {
  it("returns everything (capped) for an empty query", () => {
    expect(search("")).toHaveLength(MATERIALS.length);
  });

  it("drops items where a typed token matches nothing at all", () => {
    expect(search("plumbing")).toHaveLength(0);
  });

  it("requires every token to match something", () => {
    // "EMT" hits, "zzzz" cannot, so the whole query yields nothing.
    expect(search("emt zzzz")).toHaveLength(0);
  });
});
