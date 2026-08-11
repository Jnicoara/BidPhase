/**
 * Placeholder labor hours — matching rules, not the numbers themselves.
 *
 * The values are deliberately unverified guesses, so pinning them all would be
 * pinning noise. What must not regress is the behaviour around them: never
 * zero, specific beats generic, and the "this is a guess" flag turns off the
 * moment the user edits the figure.
 */
import { describe, it, expect } from "vitest";
import {
  FALLBACK_LABOR_HOURS,
  LABOR_HOUR_DEFAULTS,
  defaultLaborHoursFor,
  isPlaceholderHours,
} from "@shared/laborHourDefaults";

describe("defaultLaborHoursFor", () => {
  it("never returns zero or a blank, for any input", () => {
    for (const name of ["", "   ", "wat", "Duplex receptacle", "!!!", "12345"]) {
      expect(defaultLaborHoursFor(name).hours, name).toBeGreaterThan(0);
    }
  });

  it("falls back to a visible placeholder when nothing matches", () => {
    expect(defaultLaborHoursFor("quantum flux capacitor").hours).toBe(FALLBACK_LABOR_HOURS);
  });

  it("matches the examples the product asked for", () => {
    expect(defaultLaborHoursFor("Duplex receptacle standard").hours).toBeCloseTo(0.75, 10);
    expect(defaultLaborHoursFor("Single-pole switch").hours).toBeCloseTo(0.6, 10);
    expect(defaultLaborHoursFor("200A main panel furnish and install").hours).toBeCloseTo(8, 10);
    expect(defaultLaborHoursFor('1/2" EMT conduit run').hours).toBeCloseTo(0.06, 10);
  });

  it("lets a specific entry beat a generic one", () => {
    // "duplex receptacle retrofit" must not be answered by the bare
    // "receptacle" rule, which would under-price a cut-in by 25%.
    expect(defaultLaborHoursFor("Duplex receptacle retrofit").hours)
      .not.toBeCloseTo(defaultLaborHoursFor("Duplex receptacle standard").hours, 5);
    expect(defaultLaborHoursFor("Duplex receptacle retrofit").hours).toBeCloseTo(1.0, 10);

    expect(defaultLaborHoursFor("3-way switch").hours)
      .toBeGreaterThan(defaultLaborHoursFor("Single-pole switch").hours);
  });

  it("is case-insensitive and tolerant of surrounding words", () => {
    expect(defaultLaborHoursFor("  INSTALL GFCI RECEPTACLE in kitchen ").hours)
      .toBeCloseTo(defaultLaborHoursFor("GFCI receptacle").hours, 10);
  });

  it("marks linear runs as per-foot rather than per-task", () => {
    const emt = defaultLaborHoursFor('3/4" EMT');
    expect(emt.perUnit).toBe("ft");
    // A per-foot figure shown as a whole-task figure would be wildly wrong,
    // so the flag is what the UI keys its caption off.
    expect(emt.hours).toBeLessThan(0.5);
  });

  it("gives every entry a basis string for the UI to show", () => {
    for (const entry of LABOR_HOUR_DEFAULTS) {
      expect(entry.basis.length, entry.match).toBeGreaterThan(0);
      expect(entry.hours, entry.match).toBeGreaterThan(0);
    }
  });

  it("has no duplicate match keys", () => {
    const keys = LABOR_HOUR_DEFAULTS.map(e => e.match);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("isPlaceholderHours", () => {
  it("is true while the value is still the suggestion", () => {
    expect(isPlaceholderHours("Single-pole switch", 0.6)).toBe(true);
    expect(isPlaceholderHours("anything unmatched", FALLBACK_LABOR_HOURS)).toBe(true);
  });

  it("goes false once the user changes the number", () => {
    // At that point it is the user's own figure, and calling it a guess is wrong.
    expect(isPlaceholderHours("Single-pole switch", 0.85)).toBe(false);
    expect(isPlaceholderHours("Single-pole switch", 0)).toBe(false);
  });
});
