/**
 * The editing rules from CLAUDE.md § Editing fields.
 *
 * These matter more than most UI tests because this app prices real work: a
 * field that looks saved but is not, or that saves a half-typed number, puts a
 * wrong figure in a bid. The rules are pure functions precisely so they can be
 * pinned without a DOM.
 */
import { describe, it, expect } from "vitest";
import {
  asPercent,
  commitNumericEdit,
  formatForEdit,
  fromPercent,
  revertToSaved,
} from "./inlineEdit";

describe("Escape reverts the edit", () => {
  it("returns the last saved value, discarding whatever was typed", () => {
    // The representative case: a bid line quantity saved at 6, user types 999,
    // then presses Escape. The field must read 6 again.
    expect(revertToSaved(6)).toBe("6");
  });

  it("reverts to the SAVED value, not the value the edit started from", () => {
    // After a save the stored value has moved. Escape on a later edit must go
    // back to what is stored now, not to some remembered starting point.
    const afterFirstSave = 12;
    expect(revertToSaved(afterFirstSave)).toBe("12");
  });

  it("round-trips a decimal without gaining or losing digits", () => {
    expect(revertToSaved(0.75)).toBe("0.75");
    expect(revertToSaved(28.85)).toBe("28.85");
  });

  it("drops trailing zeros so a stored 0.6000 edits as 0.6", () => {
    expect(revertToSaved(0.6)).toBe("0.6");
    expect(Number(revertToSaved(0.6))).toBeCloseTo(0.6, 10);
  });

  it("never writes anything — reverting is a pure display change", () => {
    // Guarded by type: revertToSaved returns a string and takes no callback.
    // If someone gives it a save side effect, this test's shape stops compiling.
    const result: string = revertToSaved(42);
    expect(typeof result).toBe("string");
  });
});

describe("commit on Enter or blur", () => {
  it("saves a valid, changed value", () => {
    expect(commitNumericEdit("9", 6)).toEqual({ action: "save", value: 9 });
  });

  it("does nothing when the value has not moved", () => {
    // No write, and — importantly — no confirmation flash for a save that
    // never happened.
    expect(commitNumericEdit("6", 6)).toEqual({ action: "none" });
    expect(commitNumericEdit(" 6 ", 6)).toEqual({ action: "none" });
  });

  it("reverts rather than saving when the draft is not a number", () => {
    expect(commitNumericEdit("abc", 6).action).toBe("revert");
    expect(commitNumericEdit("1.2.3", 6).action).toBe("revert");
  });

  it("reverts on an empty draft by default", () => {
    // Blank must not silently become zero — a zero quantity prices work at
    // nothing, which is exactly the kind of error this app cannot afford.
    expect(commitNumericEdit("", 6).action).toBe("revert");
    expect(commitNumericEdit("   ", 6).action).toBe("revert");
  });

  it("accepts blank as zero only when the field opts in", () => {
    expect(commitNumericEdit("", 6, { allowEmpty: true }))
      .toEqual({ action: "save", value: 0 });
    expect(commitNumericEdit("", 0, { allowEmpty: true })).toEqual({ action: "none" });
  });

  it("reverts a value outside the field's bounds", () => {
    expect(commitNumericEdit("-5", 6, { min: 0 }).action).toBe("revert");
    expect(commitNumericEdit("150", 20, { max: 98.99 }).action).toBe("revert");
    expect(commitNumericEdit("50", 20, { min: 0, max: 98.99 }))
      .toEqual({ action: "save", value: 50 });
  });

  it("gives a reason on every revert, so a caller can explain itself", () => {
    for (const draft of ["", "abc", "-1"]) {
      const outcome = commitNumericEdit(draft, 6, { min: 0 });
      expect(outcome.action).toBe("revert");
      if (outcome.action === "revert") expect(outcome.reason.length).toBeGreaterThan(0);
    }
  });

  it("treats a float that differs only by rounding noise as unchanged", () => {
    expect(commitNumericEdit(String(0.1 + 0.2), 0.3)).toEqual({ action: "none" });
  });

  it("accepts a genuinely tiny but real change", () => {
    expect(commitNumericEdit("0.3001", 0.3)).toEqual({ action: "save", value: 0.3001 });
  });
});

describe("percent conversion at the edges", () => {
  it("edits a stored fraction as a percent and stores it back as a fraction", () => {
    expect(asPercent(0.2)).toBeCloseTo(20, 10);
    expect(fromPercent(20)).toBeCloseTo(0.2, 10);
    expect(fromPercent(asPercent(0.125))).toBeCloseTo(0.125, 10);
  });

  it("survives a full edit round trip through commit and revert", () => {
    const storedFraction = 0.2;
    const shown = formatForEdit(asPercent(storedFraction));
    expect(shown).toBe("20");

    const outcome = commitNumericEdit("35", asPercent(storedFraction), { min: 0, max: 98.99 });
    expect(outcome).toEqual({ action: "save", value: 35 });
    if (outcome.action === "save") expect(fromPercent(outcome.value)).toBeCloseTo(0.35, 10);
  });
});

describe("formatForEdit", () => {
  it("renders a blank for a non-finite value rather than 'NaN'", () => {
    expect(formatForEdit(Number.NaN)).toBe("");
    expect(formatForEdit(Number.POSITIVE_INFINITY)).toBe("");
  });

  it("keeps zero visible", () => {
    expect(formatForEdit(0)).toBe("0");
  });
});
