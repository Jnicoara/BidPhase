/**
 * Can a failed upload be dealt with without reloading the page?
 *
 * ── The complaint this answers ───────────────────────────────────────────────
 * "If an upload fails there's no clean way to just try it again without
 * reloading the page." Two things were missing and one was actively wrong:
 *
 *   • no retry at all — the File was used once and dropped, so the only way
 *     back was to find the file again in the picker;
 *   • picking another file REPLACED the list, wiping the failed row and the
 *     message explaining it;
 *   • rows were patched by array index while dismissal removed rows from that
 *     same array, so dismissing one row misdirected another's progress.
 *
 * Every test here is about state moving between rows without anything being
 * torn down and rebuilt, which is what "without a full page reload" means when
 * the page is a React component: the queue survives, the File survives, and one
 * row changes while the others do not.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  __resetJobIds,
  appendJobs,
  clearFinished,
  dismissJob,
  failJob,
  isBusy,
  makeJob,
  patchJob,
  resetForRetry,
  retryableJobs,
  type UploadJob,
} from "./uploadQueue";

const pdf = (name: string, size = 1024) =>
  new File([new Uint8Array(size)], name, { type: "application/pdf" });

/** appendJobs takes jobs, not files; this keeps the tests reading in files. */
const enqueue = (existing: UploadJob[], files: File[]) =>
  appendJobs(existing, files.map(makeJob));

/** A queue with one failed row and one untouched row. */
function queueWithFailure(): UploadJob[] {
  const jobs = enqueue([], [pdf("E-101.pdf"), pdf("E-102.pdf")]);
  return failJob(jobs, jobs[0].id, {
    error: "The connection to storage was lost partway through.",
    detail: "Sent 12MB of 40MB.",
  });
}

beforeEach(() => __resetJobIds());

describe("retrying a failed upload", () => {
  it("keeps the file, so the user never re-picks it", () => {
    // The reason retry was impossible before: the File was not kept anywhere.
    const jobs = queueWithFailure();
    const failed = jobs[0];

    expect(failed.state).toBe("failed");
    expect(failed.file).toBeInstanceOf(File);
    expect(failed.file.name).toBe("E-101.pdf");

    const retried = resetForRetry(jobs, failed.id);
    expect(retried[0].file).toBe(failed.file);
  });

  it("puts the row back to waiting and clears the failure", () => {
    const jobs = queueWithFailure();
    const retried = resetForRetry(jobs, jobs[0].id);

    expect(retried[0].state).toBe("waiting");
    expect(retried[0].sent).toBe(0);
    expect(retried[0].error).toBeUndefined();
    expect(retried[0].errorDetail).toBeNull();
  });

  it("keeps the row's identity and position", () => {
    // A retried upload must not vanish and reappear at the bottom of the list —
    // that reads as a different file, not as the same one trying again.
    const jobs = queueWithFailure();
    const retried = resetForRetry(jobs, jobs[0].id);

    expect(retried).toHaveLength(2);
    expect(retried[0].id).toBe(jobs[0].id);
    expect(retried.map(j => j.filename)).toEqual(["E-101.pdf", "E-102.pdf"]);
  });

  it("leaves every other row alone", () => {
    const jobs = queueWithFailure();
    const retried = resetForRetry(jobs, jobs[0].id);
    expect(retried[1]).toBe(jobs[1]);
  });

  it("carries progress from a previous attempt back to zero", () => {
    // Otherwise the bar starts the retry at wherever the failed attempt died.
    let jobs = queueWithFailure();
    jobs = patchJob(jobs, jobs[0].id, { sent: 12 * 1024 * 1024 });
    expect(resetForRetry(jobs, jobs[0].id)[0].sent).toBe(0);
  });

  it("refuses to reset an upload that is still running", () => {
    // Retry on an in-flight transfer would restart something working fine.
    const jobs = patchJob(enqueue([], [pdf("E-101.pdf")]), "upload-1", {
      state: "uploading",
      sent: 500,
    });
    const after = resetForRetry(jobs, "upload-1");
    expect(after[0].state).toBe("uploading");
    expect(after[0].sent).toBe(500);
  });

  it("can be retried more than once", () => {
    // A site connection drops twice as easily as it drops once.
    let jobs = queueWithFailure();
    const id = jobs[0].id;

    for (let attempt = 0; attempt < 3; attempt++) {
      jobs = resetForRetry(jobs, id);
      expect(jobs[0].state).toBe("waiting");
      jobs = failJob(jobs, id, { error: "Dropped again." });
      expect(jobs[0].state).toBe("failed");
    }
    expect(jobs[0].file.name).toBe("E-101.pdf");
  });
});

describe("which failures are worth retrying", () => {
  it("offers retry for a transfer failure", () => {
    const jobs = queueWithFailure();
    expect(jobs[0].retryable).toBe(true);
    expect(retryableJobs(jobs).map(j => j.filename)).toEqual(["E-101.pdf"]);
  });

  it("does NOT offer retry when the file itself is the problem", () => {
    // A 600MB file or a .dwg renamed to .pdf fails identically forever. A retry
    // button there is a button that cannot ever work.
    const jobs = failJob(enqueue([], [pdf("Huge.pdf")]), "upload-1", {
      error: "Huge.pdf is 600MB, over the 500MB limit.",
      retryable: false,
    });

    expect(jobs[0].retryable).toBe(false);
    expect(retryableJobs(jobs)).toHaveLength(0);
  });

  it("never counts a row that has not failed", () => {
    const jobs = enqueue([], [pdf("E-101.pdf")]);
    expect(retryableJobs(jobs)).toHaveLength(0);
  });
});

describe("clearing a failed upload", () => {
  it("removes just that row", () => {
    const jobs = queueWithFailure();
    const after = dismissJob(jobs, jobs[0].id);

    expect(after).toHaveLength(1);
    expect(after[0].filename).toBe("E-102.pdf");
  });

  it("leaves the queue usable afterwards", () => {
    // "Cleared and try again" has to end somewhere you can actually upload
    // from — not in a state needing a reload.
    const jobs = dismissJob(queueWithFailure(), "upload-1");
    const after = enqueue(jobs, [pdf("E-103.pdf")]);

    expect(after.map(j => j.filename)).toEqual(["E-102.pdf", "E-103.pdf"]);
    expect(after[1].state).toBe("waiting");
  });

  it("ignores an id that is not there", () => {
    const jobs = queueWithFailure();
    expect(dismissJob(jobs, "upload-999")).toHaveLength(2);
  });
});

describe("adding files to a queue that already has rows", () => {
  it("KEEPS a failed row instead of wiping it", () => {
    // The regression that made a failure feel unrecoverable: the message
    // explaining what went wrong disappeared the moment you picked another
    // file.
    const jobs = queueWithFailure();
    const after = enqueue(jobs, [pdf("E-200.pdf")]);

    expect(after).toHaveLength(3);
    expect(after[0].state).toBe("failed");
    expect(after[0].error).toMatch(/lost partway/);
    expect(after[0].file).toBe(jobs[0].file);
  });

  it("drops finished rows, which have a sheet to speak for them", () => {
    let jobs = enqueue([], [pdf("Done.pdf")]);
    jobs = patchJob(jobs, jobs[0].id, { state: "done" });

    const after = enqueue(jobs, [pdf("New.pdf")]);
    expect(after.map(j => j.filename)).toEqual(["New.pdf"]);
  });

  it("gives every row its own id, including same-named files", () => {
    // Two "E1.pdf" from different folders are two uploads, and keying on the
    // name would make one overwrite the other's progress.
    const jobs = enqueue([], [pdf("E1.pdf"), pdf("E1.pdf")]);
    expect(jobs[0].id).not.toBe(jobs[1].id);
  });
});

describe("patching by id rather than index", () => {
  it("updates the row it names, whatever position it is in", () => {
    const jobs = enqueue([], [pdf("a.pdf"), pdf("b.pdf"), pdf("c.pdf")]);
    const after = patchJob(jobs, jobs[2].id, { sent: 99 });

    expect(after[2].sent).toBe(99);
    expect(after[0].sent).toBe(0);
    expect(after[1].sent).toBe(0);
  });

  it("still finds the right row after an earlier one is removed", () => {
    // The exact index bug: dismissing a row used to shift every row after it,
    // so an in-flight upload's progress landed on the wrong file.
    const jobs = enqueue([], [pdf("a.pdf"), pdf("b.pdf"), pdf("c.pdf")]);
    const uploadingId = jobs[2].id;

    const shortened = dismissJob(jobs, jobs[0].id);
    const after = patchJob(shortened, uploadingId, { sent: 4096 });

    expect(after.find(j => j.id === uploadingId)?.sent).toBe(4096);
    expect(after.find(j => j.filename === "b.pdf")?.sent).toBe(0);
  });

  it("does nothing for an unknown id", () => {
    const jobs = enqueue([], [pdf("a.pdf")]);
    expect(patchJob(jobs, "upload-999", { sent: 5 })[0].sent).toBe(0);
  });
});

describe("knowing when the queue is busy", () => {
  it("is busy while anything is waiting, uploading or finishing", () => {
    for (const state of ["waiting", "uploading", "finishing"] as const) {
      const jobs = patchJob(enqueue([], [pdf("a.pdf")]), "upload-1", {
        state,
      });
      expect(isBusy(jobs)).toBe(true);
      __resetJobIds();
    }
  });

  it("is not busy when everything has finished or failed", () => {
    let jobs = enqueue([], [pdf("a.pdf"), pdf("b.pdf")]);
    jobs = patchJob(jobs, jobs[0].id, { state: "done" });
    jobs = failJob(jobs, jobs[1].id, { error: "Dropped." });
    expect(isBusy(jobs)).toBe(false);
  });

  it("is not busy for an empty queue", () => {
    expect(isBusy([])).toBe(false);
  });
});

describe("clearing finished rows", () => {
  it("keeps failures and drops successes", () => {
    let jobs = enqueue([], [pdf("ok.pdf"), pdf("bad.pdf")]);
    jobs = patchJob(jobs, jobs[0].id, { state: "done" });
    jobs = failJob(jobs, jobs[1].id, { error: "Dropped." });

    const after = clearFinished(jobs);
    expect(after.map(j => j.filename)).toEqual(["bad.pdf"]);
  });
});

describe("makeJob", () => {
  it("starts a job waiting, unsent and retryable", () => {
    const job = makeJob(pdf("E-101.pdf", 4096));
    expect(job.state).toBe("waiting");
    expect(job.sent).toBe(0);
    expect(job.retryable).toBe(true);
    expect(job.byteSize).toBe(4096);
    expect(job.filename).toBe("E-101.pdf");
  });
});
