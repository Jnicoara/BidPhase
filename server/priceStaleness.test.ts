/**
 * Price age bands — the 30/90-day boundaries, asserted at the exact hour.
 *
 * These exist because the dangerous price is not the missing one (already
 * shouted about by shared/materialPricing.ts) but the real-looking one nobody
 * has re-checked since copper moved. The bands are the only thing that tells
 * those two apart on screen.
 *
 * Every function takes the clock as a parameter, which is the whole reason a
 * 90-day rule can be tested at all — see shared/retention.ts for the same rule
 * on the archive purge.
 */
import { describe, it, expect } from "vitest";
import {
  PRICE_AGE_CLASSES,
  priceAge,
  priceAgeDisplay,
  priceAgeInDays,
  summarisePriceAges,
  STALE_AFTER_DAYS,
  VERY_STALE_AFTER_DAYS,
} from "../shared/priceStaleness";

const NOW = new Date("2026-06-01T12:00:00Z");
const daysAgo = (n: number) =>
  new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

describe("priceAge", () => {
  it("treats a never-priced material as its own state, not as stale", () => {
    // Colouring it red would drown the prices that actually went off, and it
    // is already flagged by the Needs-pricing filter.
    expect(priceAge(null, NOW)).toBe("unpriced");
    expect(priceAge(undefined, NOW)).toBe("unpriced");
  });

  it("is fresh right up to the 30-day mark", () => {
    expect(priceAge(daysAgo(0), NOW)).toBe("fresh");
    expect(priceAge(daysAgo(29), NOW)).toBe("fresh");
    // One hour short of 30 days is still fresh.
    expect(priceAge(new Date(daysAgo(30).getTime() + 3600_000), NOW)).toBe(
      "fresh"
    );
  });

  it("flips to aging exactly at 30 days", () => {
    // The boundary is inclusive at the top: day 30 is the one you want
    // flagged, not the one you want reassured about.
    expect(priceAge(daysAgo(STALE_AFTER_DAYS), NOW)).toBe("aging");
    expect(priceAge(daysAgo(89), NOW)).toBe("aging");
  });

  it("flips to stale exactly at 90 days", () => {
    expect(priceAge(daysAgo(VERY_STALE_AFTER_DAYS), NOW)).toBe("stale");
    expect(priceAge(daysAgo(400), NOW)).toBe("stale");
  });

  it("reads a future-dated price as fresh rather than erroring", () => {
    // Clock skew or an import stamped ahead. Nothing is wrong with a price set
    // more recently than now.
    expect(priceAge(new Date(NOW.getTime() + 86_400_000), NOW)).toBe("fresh");
  });

  it("accepts an ISO string, which is what the API returns", () => {
    expect(priceAge(daysAgo(100).toISOString(), NOW)).toBe("stale");
  });

  it("treats an unparseable date as unpriced rather than throwing", () => {
    expect(priceAge("not a date", NOW)).toBe("unpriced");
  });
});

describe("priceAgeInDays", () => {
  it("counts whole days", () => {
    expect(priceAgeInDays(daysAgo(45), NOW)).toBe(45);
    expect(priceAgeInDays(daysAgo(0), NOW)).toBe(0);
  });

  it("is null when there is no price", () => {
    expect(priceAgeInDays(null, NOW)).toBeNull();
  });

  it("never reports a negative age", () => {
    expect(priceAgeInDays(new Date(NOW.getTime() + 86_400_000), NOW)).toBe(0);
  });
});

describe("priceAgeDisplay", () => {
  it("says what to do, not just how old", () => {
    const stale = priceAgeDisplay(daysAgo(120), NOW);
    expect(stale.label).toBe("120d");
    expect(stale.title).toMatch(/out of date/i);

    const aging = priceAgeDisplay(daysAgo(45), NOW);
    expect(aging.title).toMatch(/re-check/i);

    const fresh = priceAgeDisplay(daysAgo(3), NOW);
    expect(fresh.title).toMatch(/current/i);
  });

  it("carries the day count in the label, so colour is never the only signal", () => {
    // The same rule the linked/forked badges follow: a screenshot, a printout
    // or a colour-blind reader must still get the state.
    for (const days of [1, 45, 200]) {
      expect(priceAgeDisplay(daysAgo(days), NOW).label).toBe(`${days}d`);
    }
  });

  it("shows a dash rather than an age for an unpriced material", () => {
    const none = priceAgeDisplay(null, NOW);
    expect(none.label).toBe("—");
    expect(none.title).toMatch(/no price yet/i);
  });

  it("uses singular wording at one day", () => {
    expect(priceAgeDisplay(daysAgo(1), NOW).title).toBe(
      "Priced 1 day ago — current."
    );
  });

  it("has a distinct class per band", () => {
    const classes = Object.values(PRICE_AGE_CLASSES);
    expect(new Set(classes).size).toBe(classes.length);
  });
});

describe("summarisePriceAges", () => {
  it("tallies every band, including the empty ones", () => {
    const tally = summarisePriceAges(
      [
        { priceUpdatedAt: daysAgo(1) },
        { priceUpdatedAt: daysAgo(2) },
        { priceUpdatedAt: daysAgo(60) },
        { priceUpdatedAt: daysAgo(365) },
        { priceUpdatedAt: null },
      ],
      NOW
    );
    expect(tally).toEqual({ fresh: 2, aging: 1, stale: 1, unpriced: 1 });
  });

  it("returns zeros for an empty catalog rather than an empty object", () => {
    expect(summarisePriceAges([], NOW)).toEqual({
      fresh: 0,
      aging: 0,
      stale: 0,
      unpriced: 0,
    });
  });
});
