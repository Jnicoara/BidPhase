/**
 * Recovering when a plan's URL has aged out.
 *
 * ── Why a plan URL can stop working mid-session ──────────────────────────────
 * Storage URLs carry a signed token that expires (server/storageTokens.ts).
 * pdf.js re-requests the same URL for every byte range while a document is
 * open, so a plan left open long enough will eventually ask for a range with a
 * token that is no longer good and be refused. Nothing is wrong: the link
 * simply got old.
 *
 * The user must not see that. "Could not fetch the plan (403)" for a plan they
 * are looking at is alarming and actionable-sounding, and the action it implies
 * — re-upload the file — is wrong. So the viewer asks the server for a fresh
 * URL and carries on.
 *
 * ── The two rules worth stating apart from the component ─────────────────────
 * Both are one line and both are easy to get subtly wrong in a `catch` block
 * that is already handling two other failure shapes, which is why they are
 * here and tested rather than inline.
 */

/**
 * Is this the failure that a fresh URL would fix?
 *
 * ONLY 403. The distinction matters:
 *
 *   403  the signed token was rejected — expired, or never valid. A new URL
 *        is worth asking for.
 *   404  the object is not there. A new URL points at the same missing object
 *        and changes nothing; retrying would spin and hide a real problem.
 *   5xx  storage is unwell. Same reasoning — the URL is not the fault.
 *
 * A 403 can also mean the object is missing (this storage answers 403 rather
 * than 404 for a key it cannot see), so a refresh is not guaranteed to help.
 * That is handled by `canRetryWithFreshUrl` refusing to retry when the fresh
 * URL is the same as the one that just failed, which is exactly what happens
 * when the token was fine and the object was not.
 */
export function isExpiredPlanUrl(status: number): boolean {
  return status === 403;
}

/**
 * Is the URL we were just handed actually worth another attempt?
 *
 * Only when it is a genuinely different URL. Tokens are minted in fixed time
 * windows, so a refetch inside the same window returns a byte-identical URL —
 * which means the 403 was NOT an expiry, and retrying with the same string
 * would loop forever behind a spinner while the user waits for a plan that is
 * never going to open.
 *
 * Returning false is what turns that case back into an honest error message.
 */
export function canRetryWithFreshUrl(
  currentUrl: string,
  freshUrl: string | null | undefined
): boolean {
  return Boolean(freshUrl) && freshUrl !== currentUrl;
}
