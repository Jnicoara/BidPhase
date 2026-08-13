/**
 * Origin labelling and the "mine only" filter.
 *
 * ── Why the labels get their own tests ───────────────────────────────────────
 * An audit of the five library screens found the rule duplicated five times.
 * They happened to agree, but five copies is five chances for one to be edited
 * alone — and getting it backwards tells a contractor that the price they typed
 * in themselves is a shipped default, or that a shipped guess is their own
 * verified figure. That is the difference between trusting a number and
 * rechecking it, so the direction is pinned here in one place.
 */
import { describe, it, expect } from "vitest";
import {
  filterByScope,
  isOwnedByUser,
  originKindOf,
  originLabel,
  scopeCounts,
} from "./libraryScope";

const STARTER = { userId: null, baselineId: null };
const FORK = { userId: 7, baselineId: 42 };
const SCRATCH = { userId: 7, baselineId: null };

describe("what a row's provenance means", () => {
  it("calls an unmodified shipped row a starter", () => {
    expect(originKindOf(STARTER)).toBe("starter");
    expect(originLabel(STARTER)).toBe("Starter");
  });

  it("calls the user's fork of a starter their copy — NOT a starter", () => {
    // The failure that matters: once a user edits a shipped material, the row
    // holding their price must never still read "Starter".
    expect(originKindOf(FORK)).toBe("fork");
    expect(originLabel(FORK)).toBe("Your copy");
    expect(originLabel(FORK)).not.toBe("Starter");
  });

  it("calls something built from scratch theirs — NOT a starter", () => {
    expect(originKindOf(SCRATCH)).toBe("custom");
    expect(originLabel(SCRATCH)).toBe("Yours");
    expect(originLabel(SCRATCH)).not.toBe("Starter");
  });

  it("never labels a user-owned row as a starter, whatever the baselineId", () => {
    // The direction is decided by userId alone. Sweeping baselineId proves no
    // combination flips the label the wrong way.
    for (const baselineId of [null, 0, 1, 999]) {
      expect(originLabel({ userId: 7, baselineId })).not.toBe("Starter");
      expect(originLabel({ userId: null, baselineId })).toBe("Starter");
    }
  });

  it("treats a reverted fork as still the user's own", () => {
    // Reverting restores starter CONTENT into a row the user still owns.
    // Labelling by edited-ness would call it a starter again and lose the fact
    // that it is theirs to change; labelling by ownership stays true.
    expect(originLabel(FORK)).toBe("Your copy");
  });
});

describe("what counts as mine", () => {
  it("includes both a fork and a from-scratch row", () => {
    expect(isOwnedByUser(FORK)).toBe(true);
    expect(isOwnedByUser(SCRATCH)).toBe(true);
  });

  it("excludes a starter", () => {
    expect(isOwnedByUser(STARTER)).toBe(false);
  });
});

describe("filtering a library by scope", () => {
  const rows = [
    { id: 1, ...STARTER, name: "Shipped" },
    { id: 2, ...FORK, name: "Edited copy" },
    { id: 3, ...SCRATCH, name: "My own" },
    { id: 4, ...STARTER, name: "Another shipped" },
  ];

  it("shows everything by default", () => {
    expect(filterByScope(rows, "all")).toHaveLength(4);
  });

  it("shows only the user's own rows on Mine", () => {
    const mine = filterByScope(rows, "mine");
    expect(mine.map(r => r.name)).toEqual(["Edited copy", "My own"]);
  });

  it("keeps the original order", () => {
    // Filtering must not reshuffle a name-sorted list.
    const mine = filterByScope(rows, "mine");
    expect(mine.map(r => r.id)).toEqual([2, 3]);
  });

  it("does not mutate what it was given", () => {
    const before = rows.map(r => r.id);
    filterByScope(rows, "mine");
    expect(rows.map(r => r.id)).toEqual(before);
  });

  it("counts both scopes for the control", () => {
    expect(scopeCounts(rows)).toEqual({ all: 4, mine: 2 });
  });

  it("copes with an empty library", () => {
    expect(filterByScope([], "mine")).toEqual([]);
    expect(scopeCounts([])).toEqual({ all: 0, mine: 0 });
  });

  it("returns nothing on Mine when the user has customised nothing", () => {
    const onlyStarters = [
      { id: 1, ...STARTER },
      { id: 2, ...STARTER },
    ];
    expect(filterByScope(onlyStarters, "mine")).toEqual([]);
    expect(scopeCounts(onlyStarters)).toEqual({ all: 2, mine: 0 });
  });
});
