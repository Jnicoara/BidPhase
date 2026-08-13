/**
 * Filtering suggested aliases before a human is asked to approve them.
 *
 * ── The rule that carries the risk ───────────────────────────────────────────
 * An alias pointing at a DIFFERENT material is the failure that made searching
 * "recep" rank "Wall plate" first (fixed in 3ad4db9). It is invisible: nothing
 * errors, results are just quietly wrong, and the user reviewing suggestions
 * cannot be expected to know that ticking "wall plate" on a receptacle will
 * break their searches. So it is enforced in code and pinned hard here.
 *
 * Everything else is about not wasting the reviewer's attention: no terms
 * already in the name, no duplicates, no filler.
 */
import { describe, it, expect } from "vitest";
import {
  aliasPromptFor,
  filterAliasSuggestions,
  mergeAliases,
  parseAliasResponse,
  wordsInName,
} from "../shared/aliasSuggestions";

/** A slice of the real catalog, which is what collisions are judged against. */
const CATALOG = [
  "Duplex receptacle",
  "GFCI receptacle",
  "Wall plate",
  "Single-gang box",
  "Wire nuts",
  "Single-pole switch",
];

describe("never aliasing one material to another", () => {
  it("refuses a suggestion that names a different material", () => {
    // The headline case. "wall plate" on a receptacle is exactly the bug.
    const kept = filterAliasSuggestions(
      ["plug", "outlet", "wall plate", "receptacle cover"],
      { name: "Duplex receptacle", otherMaterialNames: CATALOG }
    );
    expect(kept).toContain("plug");
    expect(kept).toContain("outlet");
    expect(kept).not.toContain("wall plate");
  });

  it("refuses a suggestion containing a distinctive word from another material", () => {
    // "plate" alone does the same damage as the full phrase.
    const kept = filterAliasSuggestions(["plug", "cover plate"], {
      name: "Duplex receptacle",
      otherMaterialNames: CATALOG,
    });
    expect(kept).not.toContain("cover plate");
  });

  it("does not refuse a word the material's own name also uses", () => {
    // "receptacle" appears in other catalog names too, but it is this
    // material's own word — treating that as a collision would strip
    // legitimate aliases from every similarly-named item.
    const kept = filterAliasSuggestions(["receptacle outlet"], {
      name: "Duplex receptacle",
      otherMaterialNames: CATALOG,
    });
    expect(kept).toContain("receptacle outlet");
  });

  it("still filters when no catalog is supplied", () => {
    // A missing catalog must not turn the safety rule into a silent no-op that
    // waves everything through.
    const kept = filterAliasSuggestions(["duplex", "plug"], {
      name: "Duplex receptacle",
    });
    expect(kept).toEqual(["plug"]);
  });
});

describe("not wasting the reviewer's attention", () => {
  it("drops terms already in the material's name", () => {
    const kept = filterAliasSuggestions(["dimmer", "rheostat"], {
      name: "Dimmer",
    });
    expect(kept).toEqual(["rheostat"]);
  });

  it("keeps a phrase that adds a word the name lacks", () => {
    // "light dimmer" is dropped only if EVERY word is already in the name.
    // "light" is not, and it is a word someone types — so the phrase earns its
    // place even though half of it is redundant.
    const kept = filterAliasSuggestions(["light dimmer"], { name: "Dimmer" });
    expect(kept).toEqual(["light dimmer"]);
  });

  it("drops aliases the material already carries", () => {
    const kept = filterAliasSuggestions(
      ["gem box", "switch box", "handy box"],
      { name: "Single-gang box", existing: "gem box switch box" }
    );
    expect(kept).toEqual(["handy box"]);
  });

  it("drops duplicates and case variants", () => {
    const kept = filterAliasSuggestions(
      ["Spring Nut", "spring nut", "  SPRING   NUT "],
      { name: "Strut channel nut" }
    );
    expect(kept).toEqual(["spring nut"]);
  });

  it("drops generic filler", () => {
    const kept = filterAliasSuggestions(
      ["electrical", "material", "misc", "spring nut"],
      { name: "Strut channel nut" }
    );
    expect(kept).toEqual(["spring nut"]);
  });

  it("drops empty and absurd lengths", () => {
    const kept = filterAliasSuggestions(
      ["", "  ", "x", "a".repeat(60), "spring nut"],
      { name: "Strut channel nut" }
    );
    expect(kept).toEqual(["spring nut"]);
  });

  it("caps how many come back", () => {
    const many = Array.from({ length: 40 }, (_, i) => `term${i}`);
    expect(
      filterAliasSuggestions(many, { name: "Thing", limit: 5 })
    ).toHaveLength(5);
  });

  it("keeps a useful set for a real material", () => {
    const kept = filterAliasSuggestions(
      ["spring nut", "unistrut", "kindorf", "channel nut", "strut", "nut"],
      { name: "Strut channel nut", otherMaterialNames: CATALOG }
    );
    expect(kept).toContain("spring nut");
    expect(kept).toContain("unistrut");
    // "nut" and "strut" are already words in the name.
    expect(kept).not.toContain("nut");
    expect(kept).not.toContain("strut");
  });

  it("returns nothing for nothing, rather than throwing", () => {
    expect(filterAliasSuggestions([], { name: "Anything" })).toEqual([]);
  });
});

describe("reading the words of a name", () => {
  it("splits on punctuation but keeps sizes intact", () => {
    expect(Array.from(wordsInName("12-2 NM-B"))).toContain("12-2");
    expect(Array.from(wordsInName('EMT connector 3/4"'))).toContain("3/4");
  });
});

describe("merging what the user accepted", () => {
  it("appends to existing aliases without duplicating", () => {
    expect(mergeAliases("gem box", ["switch box", "gem box"])).toBe(
      "gem box switch box"
    );
  });

  it("keeps the user's own words first", () => {
    // Someone who typed their own terms should see them stay put.
    expect(mergeAliases("mine own", ["suggested"])).toBe("mine own suggested");
  });

  it("handles a material with no aliases yet", () => {
    expect(mergeAliases(null, ["spring nut"])).toBe("spring nut");
  });

  it("produces nothing from nothing", () => {
    expect(mergeAliases(null, [])).toBe("");
  });
});

describe("reading the model's reply", () => {
  it("parses a plain JSON array", () => {
    expect(parseAliasResponse('["plug", "outlet"]')).toEqual([
      "plug",
      "outlet",
    ]);
  });

  it("parses one wrapped in a code fence", () => {
    expect(parseAliasResponse('```json\n["plug","outlet"]\n```')).toEqual([
      "plug",
      "outlet",
    ]);
  });

  it("parses one with a sentence around it", () => {
    expect(
      parseAliasResponse('Sure! Here you go:\n["plug"]\nHope that helps.')
    ).toEqual(["plug"]);
  });

  it("invents nothing from unparseable output", () => {
    // A failed parse must yield no suggestions, never a guess — the user falls
    // back to typing their own, which is the honest outcome.
    for (const reply of ["", "no idea", "{ not an array }", "[oops"]) {
      expect(parseAliasResponse(reply)).toEqual([]);
    }
  });

  it("drops non-string entries rather than coercing them", () => {
    expect(parseAliasResponse('["plug", 42, null, "outlet"]')).toEqual([
      "plug",
      "outlet",
    ]);
  });
});

describe("the prompt", () => {
  it("states the rule that protects search", () => {
    const prompt = aliasPromptFor("Duplex receptacle", "Receptacles");
    expect(prompt).toMatch(/NEVER list the name of a different material/i);
  });

  it("names the material and its category", () => {
    const prompt = aliasPromptFor("Strut channel nut", "Conduit Fittings");
    expect(prompt).toContain("Strut channel nut");
    expect(prompt).toContain("Conduit Fittings");
  });

  it("copes with no category", () => {
    expect(aliasPromptFor("Thing", null)).toMatch(/not given/);
  });
});
