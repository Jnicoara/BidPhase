/**
 * The one display order, and the fact that it IS one.
 *
 * Two failures this guards against, both of which had already happened:
 *
 *   • Per-screen order. The category list was a hand-copied array inside the
 *     Materials screen with a comment asking the next person to keep it in step
 *     with the schema. It did not stay in step, and Supplier Pricing did not
 *     sort by size at all — one catalog listed two ways, so the answer to
 *     "where is the 20A breaker" depended on which screen you opened.
 *   • Size-only ordering inside Conduit, which interleaves the five families at
 *     every trade size. Pricing "all the PVC" then means picking it out of four
 *     other products nine times.
 */
import { describe, it, expect } from "vitest";
import {
  MATERIAL_CATEGORY_ORDER,
  categoryRank,
  compareMaterials,
  groupMaterialsByCategory,
  materialTypeKey,
  sortMaterialsForDisplay,
} from "../shared/materialOrder";
import { MATERIAL_CATEGORIES } from "../drizzle/schema";

const m = (name: string, category: string | null) => ({ name, category });
const names = (rows: Array<{ name: string }>) => rows.map(r => r.name);

describe("the category list is the schema's", () => {
  it("holds exactly the categories the column accepts", () => {
    // The client cannot import drizzle at runtime, so the order lives in
    // shared/ as a plain array. This is the check that keeps the copy honest —
    // the comment that used to do this job did not.
    expect([...MATERIAL_CATEGORY_ORDER].sort()).toEqual(
      [...MATERIAL_CATEGORIES].sort()
    );
  });

  it("puts Panels before Breakers", () => {
    // You hang the panel, then you populate it.
    expect(categoryRank("Panels")).toBeLessThan(categoryRank("Breakers"));
  });

  it("has no 'Panels & Breakers' left anywhere", () => {
    expect(MATERIAL_CATEGORY_ORDER).not.toContain("Panels & Breakers");
    expect(MATERIAL_CATEGORIES).not.toContain("Panels & Breakers");
  });

  it("sorts an unknown or missing category to the end", () => {
    expect(categoryRank("Nonsense")).toBeGreaterThanOrEqual(
      MATERIAL_CATEGORY_ORDER.length
    );
    expect(categoryRank(null)).toBeGreaterThan(MATERIAL_CATEGORY_ORDER.length);
  });
});

describe("Conduit groups by family, then size", () => {
  it("keeps every PVC together rather than interleaving with EMT", () => {
    const sorted = sortMaterialsForDisplay([
      m('3/4" PVC Sch 40', "Conduit"),
      m('1/2" EMT', "Conduit"),
      m('1/2" PVC Sch 40', "Conduit"),
      m('3/4" EMT', "Conduit"),
      m('1" PVC Sch 40', "Conduit"),
      m('1" EMT', "Conduit"),
    ]);

    expect(names(sorted)).toEqual([
      '1/2" EMT',
      '3/4" EMT',
      '1" EMT',
      '1/2" PVC Sch 40',
      '3/4" PVC Sch 40',
      '1" PVC Sch 40',
    ]);
  });

  it("orders the families the way a supply house shelves them", () => {
    const sorted = sortMaterialsForDisplay([
      m('1/2" IMC', "Conduit"),
      m('1/2" rigid conduit', "Conduit"),
      m('1/2" PVC Sch 80', "Conduit"),
      m('1/2" EMT', "Conduit"),
      m('1/2" PVC Sch 40', "Conduit"),
    ]);
    expect(names(sorted)).toEqual([
      '1/2" EMT',
      '1/2" PVC Sch 40',
      '1/2" PVC Sch 80',
      '1/2" rigid conduit',
      '1/2" IMC',
    ]);
  });

  it("does not let PVC Sch 80 be swallowed by the PVC Sch 40 bucket", () => {
    // Longest-match ordering. If "PVC Sch 40" matched first on a Sch 80 name,
    // the two schedules would merge into one block and sort by size across
    // both — two different products at two different prices.
    const [rank40] = materialTypeKey('1/2" PVC Sch 40', "Conduit");
    const [rank80] = materialTypeKey('1/2" PVC Sch 80', "Conduit");
    expect(rank40).not.toBe(rank80);
  });

  it("applies the same family grouping to Conduit Fittings", () => {
    const sorted = sortMaterialsForDisplay([
      m('3/4" PVC Sch 40 coupling', "Conduit Fittings"),
      m('1/2" EMT connector', "Conduit Fittings"),
      m('1/2" PVC Sch 40 coupling', "Conduit Fittings"),
      m('3/4" EMT connector', "Conduit Fittings"),
    ]);
    expect(names(sorted)).toEqual([
      '1/2" EMT connector',
      '3/4" EMT connector',
      '1/2" PVC Sch 40 coupling',
      '3/4" PVC Sch 40 coupling',
    ]);
  });
});

describe("Breakers order by pole count, then amperage", () => {
  it("runs tandems, then single-pole, then 2-pole", () => {
    const sorted = sortMaterialsForDisplay([
      m("30A 2-Pole breaker", "Breakers"),
      m("20A breaker", "Breakers"),
      m("15/15 tandem breaker", "Breakers"),
      m("20A 2-Pole breaker", "Breakers"),
      m("15A breaker", "Breakers"),
      m("20/20 tandem breaker", "Breakers"),
      m("30A breaker", "Breakers"),
    ]);

    expect(names(sorted)).toEqual([
      "15/15 tandem breaker",
      "20/20 tandem breaker",
      "15A breaker",
      "20A breaker",
      "30A breaker",
      "20A 2-Pole breaker",
      "30A 2-Pole breaker",
    ]);
  });

  it("ascends by amperage inside each pole class", () => {
    const sorted = sortMaterialsForDisplay([
      m("100A 2-Pole breaker", "Breakers"),
      m("20A 2-Pole breaker", "Breakers"),
      m("70A 2-Pole breaker", "Breakers"),
      m("50A 2-Pole breaker", "Breakers"),
    ]);
    expect(names(sorted)).toEqual([
      "20A 2-Pole breaker",
      "50A 2-Pole breaker",
      "70A 2-Pole breaker",
      "100A 2-Pole breaker",
    ]);
  });

  it("keeps a protected breaker with its own pole count", () => {
    // A 20A AFCI is a single-pole breaker. Someone looking for "the 20 amp
    // singles" wants it there, not in a separate AFCI block.
    const sorted = sortMaterialsForDisplay([
      m("20A 2-Pole GFCI breaker", "Breakers"),
      m("15A AFCI breaker", "Breakers"),
      m("20A breaker", "Breakers"),
      m("15/20 tandem breaker", "Breakers"),
    ]);
    expect(names(sorted)).toEqual([
      "15/20 tandem breaker",
      "15A AFCI breaker",
      "20A breaker",
      "20A 2-Pole GFCI breaker",
    ]);
  });

  it("still recognises the old N/2 spelling as two-pole", () => {
    // A user's fork made before the rename still carries "20/2 breaker", and it
    // must not sort into the single-pole block on their screen.
    const sorted = sortMaterialsForDisplay([
      m("20/2 breaker", "Breakers"),
      m("30A breaker", "Breakers"),
    ]);
    expect(names(sorted)).toEqual(["30A breaker", "20/2 breaker"]);
  });
});

describe("grouping", () => {
  it("returns shelves in catalog order with empties dropped", () => {
    const groups = groupMaterialsByCategory([
      m("20A breaker", "Breakers"),
      m("#12 THHN", "Wire & Cable"),
      m("200A main panel", "Panels"),
    ]);
    expect(groups.map(g => g.label)).toEqual([
      "Wire & Cable",
      "Panels",
      "Breakers",
    ]);
  });

  it("collects unknown categories under Uncategorized, last", () => {
    const groups = groupMaterialsByCategory([
      m("Mystery part", null),
      m("#12 THHN", "Wire & Cable"),
    ]);
    expect(groups.map(g => g.label)).toEqual(["Wire & Cable", "Uncategorized"]);
  });

  it("sorts within each shelf, not just between them", () => {
    const groups = groupMaterialsByCategory([
      m('1" EMT', "Conduit"),
      m('1/2" EMT', "Conduit"),
    ]);
    expect(names(groups[0].items)).toEqual(['1/2" EMT', '1" EMT']);
  });
});

describe("compareMaterials is a total order", () => {
  it("is stable and antisymmetric on the same input", () => {
    const rows = [
      m('1/2" EMT', "Conduit"),
      m("20A breaker", "Breakers"),
      m("#12 THHN", "Wire & Cable"),
      m("Mystery", null),
    ];
    const once = names(sortMaterialsForDisplay(rows));
    const twice = names(sortMaterialsForDisplay([...rows].reverse()));
    expect(once).toEqual(twice);
    // Normalised by hand rather than with Math.sign: -Math.sign(0) is -0, and
    // Object.is tells -0 and 0 apart, so the equal case would fail on a quirk
    // rather than on the ordering.
    const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);
    for (const a of rows) {
      for (const b of rows) {
        expect(sign(compareMaterials(a, b))).toBe(
          sign(-compareMaterials(b, a))
        );
      }
    }
  });

  it("does not mutate the array it was given", () => {
    const rows = [m('1" EMT', "Conduit"), m('1/2" EMT', "Conduit")];
    sortMaterialsForDisplay(rows);
    expect(names(rows)).toEqual(['1" EMT', '1/2" EMT']);
  });
});
