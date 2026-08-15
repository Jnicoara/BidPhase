/**
 * Capability tokens for reading a stored object.
 *
 * ── What this replaces ───────────────────────────────────────────────────────
 * `/manus-storage/<key>` used to presign and redirect for ANY key from ANY
 * caller, signed in or not. The only thing between one contractor and another
 * contractor's plans was knowing the key — which `bidPdfsRouter`'s own header
 * says must never be the case: "A storage key is guessable enough that 'you
 * knew the id' must never be the only thing between one contractor and another
 * contractor's plans." The tRPC routers enforced ownership; the endpoint that
 * actually served the bytes did not.
 *
 * ── Why a token in the path rather than authenticating the request ───────────
 * The obvious fix is to check the session on the proxy. It cannot be done: the
 * app authenticates with an `Authorization` header taken from sessionStorage,
 * and the two things that fetch these URLs — pdf.js loading a document by URL,
 * and `<img src>` for a company logo — cannot attach headers to their own
 * requests. Cookie auth would work for the browser but this app does not use a
 * cookie the client controls, and adding one to serve files would put a second
 * authentication mechanism in the app for one endpoint.
 *
 * So the URL itself carries the authority, exactly as the S3 presigned URL it
 * fronts already does. The check moves to MINT time: only code that has already
 * resolved the company scope and checked ownership can produce a URL, and the
 * URL it produces opens one object for a bounded time.
 *
 * ── What this does and does not defend ───────────────────────────────────────
 * It converts "any key, anyone, forever" into "this one object, for this long".
 * It is a bearer capability: whoever holds the URL can fetch that object until
 * it expires, the same as any presigned URL. It does not defend against a URL
 * being pasted into a chat within the window, and pretending otherwise would be
 * worse than saying so.
 *
 * The signature binds the KEY, which is stronger than binding the bid: a token
 * minted for one sheet cannot be edited to fetch another sheet on the same bid,
 * let alone another company's.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * How long a minted URL stays good, and the reason it is not five minutes.
 *
 * pdf.js re-requests the SAME url for every byte range while a document is
 * open, so the token has to outlive a working session or the viewer starts
 * throwing 403s halfway through a takeoff. Thirty minutes is the compromise:
 * long enough to open a plan set and work in it, short enough that a URL which
 * escapes into a screenshot or a proxy log is worthless by the time anyone
 * finds it.
 *
 * One constant, so shortening it is one edit here.
 */
export const STORAGE_TOKEN_WINDOW_MS = 30 * 60 * 1000;

/**
 * When a token minted now should expire.
 *
 * ── Bucketed, and that is the subtle part ────────────────────────────────────
 * Expiry is pinned to a fixed boundary rather than `now + window`, so every
 * mint inside the same window produces a BYTE-IDENTICAL url. That matters more
 * than it looks: the client holds these urls in a React Query cache, and
 * `PlanPane` reloads the document whenever `doc.url` changes. With a moving
 * expiry, every refetch — including the automatic one on window focus — would
 * hand back a new url and silently reload the open plan. Bucketing means a
 * refetch changes nothing until the window actually rolls over.
 *
 * The cost is that real validity varies between one and two windows. That is
 * the right direction: it is never SHORTER than the window, so a url is always
 * good for at least as long as the constant promises.
 */
export function storageTokenExpiry(now: Date): number {
  const window = STORAGE_TOKEN_WINDOW_MS;
  return Math.floor(now.getTime() / window) * window + 2 * window;
}

/**
 * The signing key — the same JWT_SECRET the session cookie is signed with.
 *
 * Read at CALL time rather than through `ENV`, which snapshots `process.env`
 * when it is first imported. Import order then decides whether this module has
 * a secret, which is a trap: a process that configures its environment after
 * loading a module would mint unsignable URLs with no obvious cause. Reading it
 * here means the answer is always current.
 */
function secret(): string {
  return process.env.JWT_SECRET ?? "";
}

function sign(key: string, expiresAt: number): string {
  // `\n` as the separator: it cannot occur in a storage key, so no pair of
  // (key, expiry) values can produce the same signed string as another pair.
  return createHmac("sha256", secret())
    .update(`${key}\n${expiresAt}`)
    .digest("base64url");
}

/**
 * A token granting read access to one key until the current window ends.
 *
 * Throws when there is no secret to sign with. That is deliberate: a build
 * without JWT_SECRET cannot serve files, which is noisy and fixable, whereas
 * signing with an empty key would mint tokens anybody could forge.
 */
export function mintStorageToken(key: string, now: Date): string {
  if (!secret()) {
    throw new Error(
      "Cannot sign a storage URL: JWT_SECRET is not set. Files cannot be served without it."
    );
  }
  const expiresAt = storageTokenExpiry(now);
  return `${expiresAt}.${sign(key, expiresAt)}`;
}

/**
 * The URL a client should fetch for this key.
 *
 * Each path segment is encoded, because keys carry the user's own filename and
 * plenty of those have spaces in them. The proxy reads the segments back
 * decoded, so the signature is always over the raw key and never over one
 * side's idea of how to escape it.
 */
export function storageUrl(key: string, now: Date): string {
  const encoded = key
    .split("/")
    .map(segment => encodeURIComponent(segment))
    .join("/");
  return `/manus-storage/${mintStorageToken(key, now)}/${encoded}`;
}

/**
 * Is this token good for this key, right now?
 *
 * Returns false rather than throwing for every failure — a malformed token, an
 * expired one and a forged one are all just "no" to the caller, and telling
 * them apart in the response would help somebody probe it.
 */
export function verifyStorageToken(
  token: string,
  key: string,
  now: Date
): boolean {
  if (!secret()) return false;

  const split = token.indexOf(".");
  if (split <= 0) return false;

  const expiresAt = Number(token.slice(0, split));
  const provided = token.slice(split + 1);
  if (!Number.isSafeInteger(expiresAt) || !provided) return false;
  if (expiresAt <= now.getTime()) return false;

  const expected = sign(key, expiresAt);
  const a = Buffer.from(provided, "base64url");
  const b = Buffer.from(expected, "base64url");
  // Length check first: timingSafeEqual throws on a mismatch, and a forged
  // token is free to be any length at all.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
