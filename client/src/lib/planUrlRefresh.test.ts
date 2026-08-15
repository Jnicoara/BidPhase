import { describe, expect, it } from "vitest";
import { canRetryWithFreshUrl, isExpiredPlanUrl } from "./planUrlRefresh";

describe("deciding a plan URL has expired", () => {
  it("treats 403 as worth a fresh URL", () => {
    expect(isExpiredPlanUrl(403)).toBe(true);
  });

  it("does not retry a missing object", () => {
    // A new URL points at the same absent file. Retrying would spin and hide
    // the real problem, which is that nothing is stored at that key.
    expect(isExpiredPlanUrl(404)).toBe(false);
  });

  it("does not retry storage being unwell", () => {
    for (const status of [500, 502, 503]) {
      expect(isExpiredPlanUrl(status)).toBe(false);
    }
  });

  it("does not treat a success as an expiry", () => {
    expect(isExpiredPlanUrl(200)).toBe(false);
    expect(isExpiredPlanUrl(206)).toBe(false); // a range response
  });
});

describe("deciding whether the fresh URL is worth trying", () => {
  const CURRENT = "/manus-storage/1786825800000.abc/bid-plans/1/42/E1.pdf";

  it("retries when the server issued a genuinely new URL", () => {
    const fresh = "/manus-storage/1786827600000.xyz/bid-plans/1/42/E1.pdf";
    expect(canRetryWithFreshUrl(CURRENT, fresh)).toBe(true);
  });

  it("refuses to retry the identical URL", () => {
    /**
     * The loop guard, and the case that actually happens.
     *
     * Tokens are minted in fixed windows, so a refetch inside the same window
     * returns the same string. If that comes back after a 403, the token was
     * never the problem — the object is missing — and retrying would leave the
     * user watching a spinner forever instead of reading an error.
     */
    expect(canRetryWithFreshUrl(CURRENT, CURRENT)).toBe(false);
  });

  it("refuses when the refetch produced nothing", () => {
    // The sheet was detached, or the list call failed. Either way there is
    // nothing to retry with.
    expect(canRetryWithFreshUrl(CURRENT, null)).toBe(false);
    expect(canRetryWithFreshUrl(CURRENT, undefined)).toBe(false);
    expect(canRetryWithFreshUrl(CURRENT, "")).toBe(false);
  });
});
