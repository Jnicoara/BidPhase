/**
 * What an upload failure tells the user, and whether it tells them the truth.
 *
 * ── The bug this suite exists because of ─────────────────────────────────────
 * Plan upload failed with "The connection dropped during upload." for every
 * network-level failure there is: a blocked CORS preflight, a refused
 * connection, an offline machine, and an actual severed transfer. Four
 * different problems, one sentence, and the sentence was wrong for three of
 * them — it reads as a flaky network, so the user retries and the investigation
 * starts at the wrong layer.
 *
 * The tests below are mostly about that distinction rather than about wording.
 * The load-bearing one is "blocked vs dropped": zero bytes sent means the
 * request was refused before its body was read, which is configuration and
 * never fixed by retrying; bytes-then-death is a real drop. If those two ever
 * collapse back into one message, this suite fails.
 *
 * Pure — no XHR, no network, no clock. That is the point of putting the
 * decision in shared/uploadDiagnosis.ts: every branch is assertable here
 * instead of needing real infrastructure to reproduce.
 */
import { describe, it, expect } from "vitest";
import {
  UPLOAD_STALL_SECONDS,
  diagnoseUploadFailure,
} from "../shared/uploadDiagnosis";
import {
  MAX_PDF_BYTES,
  VIEWER_COMFORTABLE_BYTES,
} from "../shared/uploadLimits";

const MB = 1024 * 1024;

const attempt = (over: Partial<Parameters<typeof diagnoseUploadFailure>[0]>) =>
  diagnoseUploadFailure({
    filename: "E-101.pdf",
    byteSize: 200 * MB,
    bytesSent: 0,
    ...over,
  });

describe("telling the failures apart", () => {
  it("calls a request that sent nothing BLOCKED, not dropped", () => {
    const failure = attempt({ bytesSent: 0, reason: "error", online: true });

    expect(failure.kind).toBe("blocked");
    // The exact regression: this must not claim the connection dropped.
    expect(failure.message.toLowerCase()).not.toContain("connection dropped");
    // And it must stop the pointless retry.
    expect(failure.message).toMatch(/retrying will not help/i);
  });

  it("points a blocked upload at configuration, and names the mechanism", () => {
    const failure = attempt({ bytesSent: 0, reason: "error", online: true });
    expect(failure.detail).toMatch(/zero bytes/i);
    // Whoever picks this up should not have to rediscover why a browser upload
    // that never starts is usually CORS.
    expect(failure.detail).toMatch(/CORS/i);
    expect(failure.detail).toMatch(/preflight/i);
  });

  it("calls a transfer that died mid-flight DROPPED", () => {
    const failure = attempt({
      bytesSent: 60 * MB,
      reason: "error",
      online: true,
    });

    expect(failure.kind).toBe("dropped");
    expect(failure.message).toMatch(/30%/);
    expect(failure.message).toMatch(/try again/i);
  });

  it("tells a dropped upload how to recognise a size limit", () => {
    // The user's own hypothesis, and a real one: an intermediary enforcing a
    // body limit closes the connection instead of answering, so it reaches the
    // browser as a drop. Stopping at the SAME point every time is the tell.
    const failure = attempt({ bytesSent: 32 * MB, reason: "error" });
    expect(failure.message).toMatch(/same point/i);
    expect(failure.detail).toMatch(/body-size limit/i);
  });

  it("says offline when the machine has no network", () => {
    const failure = attempt({ bytesSent: 0, reason: "error", online: false });
    expect(failure.kind).toBe("offline");
    expect(failure.message).toMatch(/offline/i);
    // Offline outranks blocked: both send zero bytes, and "reconnect" is the
    // useful instruction when there is genuinely no network.
    expect(failure.message).not.toMatch(/configuration/i);
  });

  it("reports an HTTP status as storage answering, not as a network fault", () => {
    const failure = attempt({
      bytesSent: 200 * MB,
      status: 403,
      reason: "status",
    });

    expect(failure.kind).toBe("rejected");
    expect(failure.message).toMatch(/403/);
    expect(failure.message).toMatch(/not a connection problem/i);
    expect(failure.detail).toMatch(/403/);
  });

  it("keeps a cancel a cancel, whatever else was true", () => {
    const failure = attempt({
      bytesSent: 10 * MB,
      reason: "abort",
      online: false,
    });
    expect(failure.kind).toBe("cancelled");
    expect(failure.message).toBe("Upload cancelled.");
  });

  it("describes a stall as stopped rather than failed", () => {
    const failure = attempt({
      bytesSent: 50 * MB,
      reason: "stall",
      stalledAfterSeconds: UPLOAD_STALL_SECONDS,
    });

    expect(failure.kind).toBe("stalled");
    expect(failure.message).toMatch(
      new RegExp(`${UPLOAD_STALL_SECONDS} seconds`)
    );
    expect(failure.message).toMatch(/25%/);
  });
});

describe("the percentage in the message", () => {
  it("never reads 0% for a transfer that actually moved", () => {
    // "stopped at 0%" and "sent nothing" are different diagnoses, and rounding
    // must not turn the first into the second.
    const failure = attempt({ byteSize: 500 * MB, bytesSent: 1024 });
    expect(failure.kind).toBe("dropped");
    expect(failure.message).toMatch(/1%/);
  });

  it("never reads 100% for a transfer that did not finish", () => {
    const failure = attempt({
      byteSize: 500 * MB,
      bytesSent: 500 * MB - 1024,
      reason: "error",
    });
    expect(failure.message).toMatch(/99%/);
  });
});

describe("every failure is actionable", () => {
  const cases = [
    { label: "blocked", over: { bytesSent: 0, reason: "error" as const } },
    {
      label: "dropped",
      over: { bytesSent: 5 * MB, reason: "error" as const },
    },
    {
      label: "offline",
      over: { bytesSent: 0, reason: "error" as const, online: false },
    },
    {
      label: "rejected",
      over: { bytesSent: 5 * MB, status: 500, reason: "status" as const },
    },
    {
      label: "stalled",
      over: {
        bytesSent: 5 * MB,
        reason: "stall" as const,
        stalledAfterSeconds: UPLOAD_STALL_SECONDS,
      },
    },
  ];

  for (const { label, over } of cases) {
    it(`names the file and says something specific for ${label}`, () => {
      const failure = attempt(over);
      expect(failure.message).toContain("E-101.pdf");
      // Long enough to be a sentence rather than a code, short enough to read.
      expect(failure.message.length).toBeGreaterThan(40);
      expect(failure.message.length).toBeLessThan(400);
    });
  }

  it("gives distinct messages to every kind", () => {
    // The whole failure was four causes sharing one sentence. Nothing here may
    // repeat, or the collapse has happened again.
    const messages = cases.map(c => attempt(c.over).message);
    expect(new Set(messages).size).toBe(messages.length);
  });
});

describe("the stall watchdog", () => {
  it("measures silence, not total duration", () => {
    // A 500MB set on a site connection is a legitimately long upload. If this
    // ever becomes a total-time limit it will cancel exactly the transfers the
    // raised limit exists to support.
    expect(UPLOAD_STALL_SECONDS).toBeGreaterThanOrEqual(60);
    expect(UPLOAD_STALL_SECONDS).toBeLessThanOrEqual(300);
  });
});

describe("the viewer warning threshold", () => {
  it("sits below the hard limit, so it can warn rather than refuse", () => {
    expect(VIEWER_COMFORTABLE_BYTES).toBeLessThan(MAX_PDF_BYTES);
  });

  it("still clears an ordinary vector plan set without nagging", () => {
    // A 100-sheet vector set runs 20–80MB. Warning on those would train people
    // to ignore the warning.
    expect(VIEWER_COMFORTABLE_BYTES).toBeGreaterThan(80 * MB);
  });
});
