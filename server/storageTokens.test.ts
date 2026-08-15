/**
 * The capability token that now stands between a storage key and the bytes.
 *
 * ── Written as attempts to get in ────────────────────────────────────────────
 * Almost everything below asserts a REFUSAL, in the same spirit as
 * permissions.test.ts. The happy path — a freshly minted token opens its own
 * object — is one line and would pass against an implementation that returned
 * `true` unconditionally. What has to be pinned is everything that must NOT
 * work: another key, a stale token, a tampered signature, a forged expiry.
 *
 * ── The clock is a parameter ─────────────────────────────────────────────────
 * Expiry is decided from a `now` handed in, never read, so the boundary is
 * tested at the instant either side of it rather than by sleeping. Same rule as
 * shared/retention.ts and the invitation expiry.
 */
import { describe, it, expect } from "vitest";
import {
  STORAGE_TOKEN_WINDOW_MS,
  mintStorageToken,
  storageTokenExpiry,
  storageUrl,
  verifyStorageToken,
} from "./storageTokens";

const KEY = "bid-plans/1/42/Electrical Plans_a1b2c3d4.pdf";
const OTHER_KEY = "bid-plans/1/42/Lighting_99887766.pdf";
const NOW = new Date("2026-08-15T12:00:00Z");

// The signing secret comes from vitest.setup.ts, which explains why it has to
// be supplied at all. Nothing here sets it, so a suite that somehow ran without
// that setup would fail loudly rather than quietly signing with "".

describe("a minted token", () => {
  it("opens the key it was minted for", () => {
    const token = mintStorageToken(KEY, NOW);
    expect(verifyStorageToken(token, KEY, NOW)).toBe(true);
  });

  it("will not open any other key", () => {
    // The whole point of binding the signature to the key. Without this, one
    // valid URL is a skeleton key for the entire bucket.
    const token = mintStorageToken(KEY, NOW);
    expect(verifyStorageToken(token, OTHER_KEY, NOW)).toBe(false);
  });

  it("will not open a key that merely starts the same", () => {
    const token = mintStorageToken("bid-plans/1/42/a.pdf", NOW);
    expect(verifyStorageToken(token, "bid-plans/1/42/a.pdf.evil", NOW)).toBe(
      false
    );
  });

  it("cannot be moved to another company's plans", () => {
    const mine = mintStorageToken("bid-plans/7/1/E1.pdf", NOW);
    expect(verifyStorageToken(mine, "bid-plans/9/1/E1.pdf", NOW)).toBe(false);
  });
});

describe("expiry", () => {
  it("is still good inside the window", () => {
    const token = mintStorageToken(KEY, NOW);
    const later = new Date(NOW.getTime() + STORAGE_TOKEN_WINDOW_MS);
    expect(verifyStorageToken(token, KEY, later)).toBe(true);
  });

  it("is dead once the expiry passes", () => {
    const token = mintStorageToken(KEY, NOW);
    const expiry = storageTokenExpiry(NOW);
    expect(verifyStorageToken(token, KEY, new Date(expiry - 1))).toBe(true);
    expect(verifyStorageToken(token, KEY, new Date(expiry))).toBe(false);
    expect(verifyStorageToken(token, KEY, new Date(expiry + 1))).toBe(false);
  });

  it("always grants at least a full window", () => {
    // Bucketing means real validity varies, and this is the half that has to
    // hold: a URL is never good for LESS than the constant advertises.
    for (const offset of [0, 1, 60_000, STORAGE_TOKEN_WINDOW_MS - 1]) {
      const at = new Date(NOW.getTime() + offset);
      expect(storageTokenExpiry(at) - at.getTime()).toBeGreaterThanOrEqual(
        STORAGE_TOKEN_WINDOW_MS
      );
    }
  });

  it("never grants more than two windows", () => {
    for (const offset of [0, 1, 60_000, STORAGE_TOKEN_WINDOW_MS - 1]) {
      const at = new Date(NOW.getTime() + offset);
      expect(storageTokenExpiry(at) - at.getTime()).toBeLessThanOrEqual(
        2 * STORAGE_TOKEN_WINDOW_MS
      );
    }
  });

  it("is byte-identical for every mint inside one window", () => {
    // Not cosmetic. The client caches these URLs and PlanPane reloads the open
    // document whenever `doc.url` changes, so a token that moved on every
    // refetch would reload a plan every time the window regained focus.
    const a = storageUrl(KEY, NOW);
    const b = storageUrl(KEY, new Date(NOW.getTime() + 60_000));
    expect(a).toBe(b);
  });

  it("does change once the window rolls over", () => {
    const a = storageUrl(KEY, NOW);
    const b = storageUrl(
      KEY,
      new Date(NOW.getTime() + STORAGE_TOKEN_WINDOW_MS)
    );
    expect(a).not.toBe(b);
  });
});

describe("forgery", () => {
  it("rejects a tampered signature", () => {
    const token = mintStorageToken(KEY, NOW);
    const [exp, sig] = token.split(".");
    const flipped = sig[0] === "A" ? `B${sig.slice(1)}` : `A${sig.slice(1)}`;
    expect(verifyStorageToken(`${exp}.${flipped}`, KEY, NOW)).toBe(false);
  });

  it("rejects an expiry pushed into the future without re-signing", () => {
    // The obvious attack on a token that carries its own expiry in the clear.
    const token = mintStorageToken(KEY, NOW);
    const sig = token.slice(token.indexOf(".") + 1);
    const far = NOW.getTime() + 365 * 24 * 60 * 60 * 1000;
    expect(verifyStorageToken(`${far}.${sig}`, KEY, NOW)).toBe(false);
  });

  it("rejects rubbish rather than throwing on it", () => {
    // A malformed token arrives from a truncated link as often as from an
    // attacker, and either way the answer is a clean no.
    for (const token of [
      "",
      ".",
      "abc",
      "abc.def",
      "..",
      "9999999999999.",
      ".onlyasignature",
      "NaN.aaaa",
    ]) {
      expect(() => verifyStorageToken(token, KEY, NOW)).not.toThrow();
      expect(verifyStorageToken(token, KEY, NOW)).toBe(false);
    }
  });

  it("rejects a signature of the wrong length without throwing", () => {
    // timingSafeEqual throws on a length mismatch, so the length is checked
    // first. A forged token is free to be any length at all.
    const token = mintStorageToken(KEY, NOW);
    const exp = token.slice(0, token.indexOf("."));
    expect(verifyStorageToken(`${exp}.AA`, KEY, NOW)).toBe(false);
  });
});

describe("the URL it produces", () => {
  it("puts the token in the path, ahead of the key", () => {
    const url = storageUrl("bid-plans/1/42/E1.pdf", NOW);
    expect(url.startsWith("/manus-storage/")).toBe(true);
    expect(url.endsWith("/bid-plans/1/42/E1.pdf")).toBe(true);
  });

  it("escapes a filename with a space in it", () => {
    // Plan sets are named by people, and "Electrical Plans.pdf" is what a
    // person names one. A raw space is not a valid URL.
    const url = storageUrl(KEY, NOW);
    expect(url).not.toContain(" ");
    expect(url).toContain("Electrical%20Plans_a1b2c3d4.pdf");
  });

  it("keeps the key's own slashes as path separators", () => {
    // The key's structure IS the path — only the segments are escaped, so the
    // proxy reads back exactly the key that was signed.
    const url = storageUrl("a/b/c.pdf", NOW);
    expect(url.endsWith("/a/b/c.pdf")).toBe(true);
    expect(url).not.toContain("%2F");
  });

  it("survives a round trip through URL decoding, as the proxy does it", () => {
    // What Express hands the handler is the decoded segment. If escaping and
    // decoding disagreed, every plan with a space in its name would 403.
    const url = storageUrl(KEY, NOW);
    const parts = url.replace("/manus-storage/", "").split("/");
    const token = parts.shift()!;
    const decodedKey = parts.map(decodeURIComponent).join("/");
    expect(decodedKey).toBe(KEY);
    expect(verifyStorageToken(token, decodedKey, NOW)).toBe(true);
  });
});
