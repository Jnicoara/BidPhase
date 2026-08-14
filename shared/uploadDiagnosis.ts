/**
 * What actually went wrong with an upload, said in a sentence a user can act on.
 *
 * ── The failure this module exists to replace ────────────────────────────────
 * The plan uploader had one line for every network-level failure:
 *
 *     xhr.onerror = () => reject(new Error("The connection dropped during upload."))
 *
 * That sentence is wrong more often than it is right. `xhr.onerror` fires for a
 * blocked CORS preflight, a refused connection, a DNS failure, an offline
 * machine and a genuinely severed transfer — and only the last of those is a
 * dropped connection. Told the wrong thing, a user retries on a better
 * connection, which cannot fix any of the other four. It also cost an
 * investigation: "the connection dropped" reads like a flaky network and sends
 * everyone looking at the wrong layer.
 *
 * ── The signal that separates them is HOW FAR IT GOT ─────────────────────────
 * The browser reports upload progress, so the number of bytes it managed to
 * send before the error is evidence about the cause, and it is evidence nobody
 * was reading:
 *
 *   0 bytes sent      The request never left, or was refused before any body
 *                     was accepted. A cross-origin PUT is always preflighted,
 *                     so a storage bucket without a CORS rule for this origin
 *                     fails exactly here — every time, at any file size, with
 *                     the progress bar never moving.
 *
 *   some bytes, then  The transfer was live and died. THIS is a dropped
 *   an error          connection — and it is also what an intermediary
 *                     enforcing its own body-size limit looks like from the
 *                     browser, because such a limit closes the connection
 *                     rather than answering. Suspicious when the bytes sent
 *                     land near a round number.
 *
 *   an HTTP status    Storage answered. Not a network problem at all, and the
 *                     status says what it thought was wrong.
 *
 * Distinguishing the first two is the whole point. They look identical in a
 * toast and have nothing to do with each other.
 *
 * ── Pure, so it is testable ──────────────────────────────────────────────────
 * No XHR, no fetch, no clock. The caller collects the facts and this decides
 * what they mean, which is what lets every branch be asserted in a unit test
 * rather than reproduced against real infrastructure.
 */

import { formatBytes } from "./uploadLimits";

export type UploadFailureKind =
  /** The machine has no network at all. */
  | "offline"
  /** Nothing was sent. Refused before the body — CORS, DNS, refused connection. */
  | "blocked"
  /** Bytes were flowing and the connection died. */
  | "dropped"
  /** Bytes were flowing and then simply stopped, with nothing closing. */
  | "stalled"
  /** Storage answered with an HTTP error status. */
  | "rejected"
  /** The user pressed cancel. */
  | "cancelled";

export type UploadFailure = {
  kind: UploadFailureKind;
  /** One sentence for the user. Says what happened and what to do about it. */
  message: string;
  /**
   * A second line for whoever has to fix it, or null when the first line is the
   * whole story. Kept apart so the user-facing text stays short — this is what
   * goes next to a "details" affordance and into a bug report.
   */
  detail: string | null;
};

export type UploadAttempt = {
  filename: string;
  /** Total size of the file being sent. */
  byteSize: number;
  /** Bytes the browser reported sending before the failure. */
  bytesSent: number;
  /** HTTP status, when one came back at all. 0 means no response. */
  status?: number;
  /** Whether the browser believes it has a network connection. */
  online?: boolean;
  /** Set when the failure was a cancel or a stall rather than an error event. */
  reason?: "abort" | "stall" | "error" | "status";
  /** Seconds of no progress that triggered a stall. */
  stalledAfterSeconds?: number;
};

/** A percentage for prose — whole numbers, never "0%" for a partial transfer. */
function percentSent(bytesSent: number, byteSize: number): number {
  if (byteSize <= 0) return 0;
  const pct = Math.round((bytesSent / byteSize) * 100);
  // A transfer that moved at all should never read as 0%, and one that has not
  // finished should never read as 100% — both invite the wrong conclusion.
  if (bytesSent > 0 && pct === 0) return 1;
  if (bytesSent < byteSize && pct === 100) return 99;
  return pct;
}

/**
 * Turn the facts of a failed upload into something worth showing.
 *
 * Order matters: the most specific explanation wins. A cancelled upload is
 * cancelled whatever else is true, and an HTTP status outranks any guess about
 * the network because it is not a guess.
 */
export function diagnoseUploadFailure(attempt: UploadAttempt): UploadFailure {
  const { filename, byteSize, bytesSent } = attempt;

  if (attempt.reason === "abort") {
    return { kind: "cancelled", message: "Upload cancelled.", detail: null };
  }

  // Storage replied. Whatever happened, it is not a connection problem, and
  // saying so stops the retry-on-better-wifi reflex.
  if (attempt.status && attempt.status > 0) {
    return {
      kind: "rejected",
      message:
        `Storage refused ${filename} with an HTTP ${attempt.status}. ` +
        `The upload reached storage, so this is not a connection problem — ` +
        `it is worth reporting rather than retrying.`,
      detail: `PUT returned ${attempt.status} after ${formatBytes(bytesSent)} of ${formatBytes(byteSize)}.`,
    };
  }

  if (attempt.online === false) {
    return {
      kind: "offline",
      message: `${filename} did not upload — this device is offline. Reconnect and try again.`,
      detail: null,
    };
  }

  if (attempt.reason === "stall") {
    const seconds = attempt.stalledAfterSeconds ?? 0;
    return {
      kind: "stalled",
      message:
        `${filename} stopped uploading at ${percentSent(bytesSent, byteSize)}% and sent nothing for ${seconds} seconds, so it was given up on. ` +
        `On a slow site connection this can just be congestion — try again.`,
      detail: `Stalled after ${formatBytes(bytesSent)} of ${formatBytes(byteSize)} with no progress for ${seconds}s.`,
    };
  }

  // Nothing was sent. The request never got permission to leave, which is a
  // different failure from a transfer that died, and the one most likely to be
  // configuration rather than luck.
  if (bytesSent <= 0) {
    return {
      kind: "blocked",
      message:
        `${filename} could not be sent to storage — the upload was refused before any of the file left this browser. ` +
        `Retrying will not help; this is a storage configuration problem, not a bad connection.`,
      detail:
        "Zero bytes were transferred, so the request was rejected before its body was read. " +
        "A browser upload to storage is always preflighted, and a bucket with no CORS rule for this site fails exactly this way — " +
        "at any file size, with the progress bar never moving.",
    };
  }

  // It was live and it died.
  return {
    kind: "dropped",
    message:
      `${filename} stopped uploading at ${percentSent(bytesSent, byteSize)}% — the connection to storage was lost partway through. ` +
      `Try again; if it stops at the same point each time, the file is being rejected for its size rather than dropped.`,
    detail:
      `Sent ${formatBytes(bytesSent)} of ${formatBytes(byteSize)} before the connection closed. ` +
      `A transfer that dies at a repeatable point is an intermediary enforcing a body-size limit, which closes the connection instead of answering.`,
  };
}

/**
 * How long to let an upload sit with no progress before giving up on it.
 *
 * Deliberately NOT a total time limit. A 500MB set over a site connection is a
 * legitimately long transfer, and `xhr.timeout` — which measures the whole
 * request — would cancel exactly the uploads this app raised its limit to
 * support. What is never legitimate is a transfer that stops moving, so the
 * watchdog measures SILENCE rather than duration.
 *
 * 90 seconds because a stalled TCP connection can recover from a bad handover
 * on a phone hotspot, which is what an estimator in a truck is often on, and
 * anything shorter cancels work that was about to resume.
 */
export const UPLOAD_STALL_SECONDS = 90;
