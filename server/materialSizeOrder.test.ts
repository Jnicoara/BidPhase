/**
 * Size ordering — the AWG table above all.
 *
 * These assertions are written as whole sequences rather than pairs, because
 * the failure mode this guards against is not "two rows swapped" but "the
 * scale is inverted", and only a full ordering shows that.
 */
import { describe, it, expect } from "vitest";
import { compareBySize, CONDUCTOR_SIZES, hasSize } from "../shared/materialSizeOrder";
import { BASELINE_MATERIALS } from "./seed/baselineMaterials";

const sorted = (names: string[]) => [...names].sort(compareBySize);

describe("conductor sizes", () => {
  it("runs thinnest to thickest across the AWG inversion and into kcmil", () => {
    // The whole point of the explicit table: a numeric sort gives
    // 1,2,3,4,10,12,14,18 and a text sort puts 4/0 between 4 and 6.
    const scrambled = [
      "#250 kcmil THHN", "#12 THHN", "#4/0 THHN", "#1 THHN", "#18 fixture wire",
      "#2/0 THHN", "#6 THHN", "#1/0 THHN", "#14 THHN", "500 kcmil THHN",
      "#3 THHN", "#8 THHN", "#2 THHN", "#10 THHN", "#3/0 THHN", "#4 THHN",
      "#16 fixture wire",
    ];
    expect(sorted(scrambled)).toEqual([
      "#18 fixture wire",
      "#16 fixture wire",
      "#14 THHN",
      "#12 THHN",
      "#10 THHN",
      "#8 THHN",
      "#6 THHN",
      "#4 THHN",
      "#3 THHN",
      "#2 THHN",
      "#1 THHN",
      "#1/0 THHN",
      "#2/0 THHN",
      "#3/0 THHN",
      "#4/0 THHN",
      "#250 kcmil THHN",
      "500 kcmil THHN",
    ]);
  });

  it("puts 1/0 above 1, not below it — the flip a numeric sort gets backwards", () => {
    expect(compareBySize("#1 THHN", "#1/0 THHN")).toBeLessThan(0);
    expect(compareBySize("#1/0 THHN", "#2/0 THHN")).toBeLessThan(0);
    expect(compareBySize("#2 THHN", "#1 THHN")).toBeLessThan(0);
  });

  it("puts every aught size above every plain gauge", () => {
    for (const aught of ["#1/0 THHN", "#2/0 THHN", "#3/0 THHN", "#4/0 THHN"]) {
      for (const gauge of ["#14 THHN", "#6 THHN", "#2 THHN", "#1 THHN"]) {
        expect(compareBySize(gauge, aught), `${gauge} vs ${aught}`).toBeLessThan(0);
      }
    }
  });

  it("orders cable by gauge first, then by conductor count", () => {
    expect(sorted(["12-3 NM-B", "14-2 NM-B", "12-2 NM-B", "14-3 NM-B", "10-2 NM-B"]))
      .toEqual(["14-2 NM-B", "14-3 NM-B", "12-2 NM-B", "12-3 NM-B", "10-2 NM-B"]);
  });

  it("keeps the declared table thinnest-first", () => {
    // Guards the data itself: a size inserted at the end rather than in
    // position would silently sort as the largest wire in the catalog.
    const awg = CONDUCTOR_SIZES.filter(s => !s.includes("/0") && Number(s) < 100)
      .map(Number);
    expect(awg).toEqual([...awg].sort((a, b) => b - a));

    const kcmil = CONDUCTOR_SIZES.filter(s => Number(s) >= 100).map(Number);
    expect(kcmil).toEqual([...kcmil].sort((a, b) => a - b));
  });
});

describe("trade sizes", () => {
  it("runs smallest to largest, not alphabetically", () => {
    const scrambled = [
      '2" EMT', '1/2" EMT', '1-1/4" EMT', '3/4" EMT', '4" EMT',
      '1" EMT', '2-1/2" EMT', '1-1/2" EMT', '3" EMT',
    ];
    expect(sorted(scrambled)).toEqual([
      '1/2" EMT', '3/4" EMT', '1" EMT', '1-1/4" EMT', '1-1/2" EMT',
      '2" EMT', '2-1/2" EMT', '3" EMT', '4" EMT',
    ]);
  });

  it("puts the fractional sizes below 1 inch, where a text sort would not", () => {
    expect(compareBySize('1/2" EMT', '1" EMT')).toBeLessThan(0);
    expect(compareBySize('3/4" EMT', '1" EMT')).toBeLessThan(0);
    expect(compareBySize('1" EMT', '1-1/4" EMT')).toBeLessThan(0);
  });
});

describe("amperages and lengths", () => {
  it("orders breakers by amps", () => {
    expect(sorted(["100/2 breaker", "15A breaker", "30A breaker", "20A breaker"]))
      .toEqual(["15A breaker", "20A breaker", "30A breaker", "100/2 breaker"]);
  });

  it("orders panels by amps", () => {
    expect(sorted(["200A main panel", "100A main panel", "400A main panel", "125A main panel"]))
      .toEqual(["100A main panel", "125A main panel", "200A main panel", "400A main panel"]);
  });

  it("compares feet and inches on the same scale", () => {
    expect(sorted(['24" under-cabinet light', "4 ft LED strip fixture", '12" under-cabinet light']))
      .toEqual(['12" under-cabinet light', '24" under-cabinet light', "4 ft LED strip fixture"]);
  });
});

describe("materials with no size", () => {
  it("sorts after everything that has one, rather than interleaving", () => {
    const out = sorted(["Wire nuts", "#12 THHN", "Electrical tape", "#4/0 THHN"]);
    expect(out).toEqual(["#12 THHN", "#4/0 THHN", "Electrical tape", "Wire nuts"]);
  });

  it("is stable and alphabetical among themselves", () => {
    expect(sorted(["Zip ties", "Duct seal", "PVC cement"]))
      .toEqual(["Duct seal", "PVC cement", "Zip ties"]);
  });
});

describe("the real catalog", () => {
  it("reads a size off every row in the size-named families", () => {
    // A regression guard on the parsing rather than the ordering. If a naming
    // convention changes so that sizes stop being recognised, the screen
    // quietly falls back to alphabetical within the category and nobody
    // notices — the list still looks sorted.
    // "EMT strap" is the plain wall strap and is genuinely one-size-fits-most,
    // unlike the strut straps which are sized per trade size. It sorts to the
    // end of its category by name, which is right.
    const GENUINELY_UNSIZED = new Set(["EMT strap"]);

    const sizeNamed = BASELINE_MATERIALS.filter(
      m =>
        (m.category === "Wire & Cable" || m.category === "Conduit" || m.category === "Conduit Fittings") &&
        !GENUINELY_UNSIZED.has(m.name)
    );
    const unread = sizeNamed.filter(m => !hasSize(m.name)).map(m => m.name);
    expect(unread.slice(0, 20), `${unread.length} of ${sizeNamed.length} unreadable`).toEqual([]);
  });

  it("orders the real THHN family thinnest to thickest", () => {
    const thhn = BASELINE_MATERIALS
      .filter(m => /^#?\d.* THHN$/.test(m.name) || /kcmil THHN$/.test(m.name))
      .map(m => m.name)
      .sort(compareBySize);
    expect(thhn[0]).toBe("#14 THHN");
    expect(thhn[thhn.length - 1]).toBe("500 kcmil THHN");
    expect(thhn.indexOf("#1 THHN")).toBeLessThan(thhn.indexOf("#1/0 THHN"));
  });

  it("orders the real EMT family smallest to largest", () => {
    const emt = BASELINE_MATERIALS
      .filter(m => /^\S+ EMT$/.test(m.name))
      .map(m => m.name)
      .sort(compareBySize);
    expect(emt).toEqual([
      '1/2" EMT', '3/4" EMT', '1" EMT', '1-1/4" EMT', '1-1/2" EMT',
      '2" EMT', '2-1/2" EMT', '3" EMT', '4" EMT',
    ]);
  });
});
