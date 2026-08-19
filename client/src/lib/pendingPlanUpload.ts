/**
 * A plan file chosen on one screen and uploaded on another.
 *
 * ── Why a handoff exists at all ──────────────────────────────────────────────
 * "Upload a plan" starts on the Dashboard, but a plan cannot exist on its own —
 * `bid_pdfs.bidId` is NOT NULL, so the file has nowhere to go until a bid does.
 * The sequence is therefore: pick the file, create a bid, open its Takeoff
 * screen, and upload there.
 *
 * The alternative was asking for a bid name first and uploading afterwards,
 * which puts a form in front of the one action the button promises. Taking the
 * file first and naming the bid after it is what makes this a single click, and
 * the name is editable the moment the screen opens.
 *
 * ── One-shot, deliberately ───────────────────────────────────────────────────
 * `take` clears as it reads. Without that, a File left sitting here would be
 * picked up again by the next Takeoff screen that mounted — navigating back to
 * a bid's plans would silently re-upload the last file, which is the kind of
 * duplicate nobody would think to look for.
 *
 * ── Module state rather than a context ───────────────────────────────────────
 * The app is one tree behind a hash router, so a module-scoped value survives
 * the navigation intact and needs no provider. A File is a handle to bytes on
 * disk, not the bytes, so holding one costs nothing. It is cleared on read and
 * on an explicit abandon, so nothing accumulates.
 */

let pending: File | null = null;

/** Stash a file for the Takeoff screen that is about to open. */
export function putPendingPlan(file: File) {
  pending = file;
}

/**
 * Read and clear the stashed file.
 *
 * Returns null when there is none, which is the ordinary case — every Takeoff
 * screen opened by any other route calls this and gets nothing.
 */
export function takePendingPlan(): File | null {
  const file = pending;
  pending = null;
  return file;
}

/** Throw away a stash without consuming it — e.g. the bid never got created. */
export function clearPendingPlan() {
  pending = null;
}

/** Whether something is waiting. For tests and assertions, not for logic. */
export function hasPendingPlan(): boolean {
  return pending !== null;
}

/**
 * Turn a filename into a starting bid name.
 *
 * "Harbour Street E1.pdf" → "Harbour Street E1". The extension goes, and so do
 * the separators a file gets when it comes off a phone or a scanner, because
 * "Harbour_Street_E1" is not a job name anyone would type.
 *
 * It only has to be a reasonable STARTING point: the bid name is one click from
 * editable on the screen this opens, and a name derived from the file the user
 * just chose is closer to right than "Untitled bid" ever is.
 */
export function bidNameFromFilename(filename: string): string {
  const withoutExtension = filename.replace(/\.[^./\\]+$/, "");
  const cleaned = withoutExtension
    .replace(/[_]+/g, " ")
    // A run of dots or dashes reads as a separator; a single hyphen inside a
    // sheet number ("E-101") is part of the name and stays.
    .replace(/\.{2,}|-{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Never return nothing: a file called ".pdf" is odd but must not produce a
  // nameless bid, which the create call would reject anyway.
  return cleaned || "New bid";
}

/**
 * A starting name for a bid nobody has named yet.
 *
 * The counting entry point creates the bid before asking anything, the same
 * way the plan upload does — but a plan upload has a filename to work from and
 * this has nothing. Dating it is the next best thing: "Count — Tue 18 Aug"
 * tells you which one you started this morning, where a board of identical
 * "New bid" rows tells you nothing.
 *
 * Takes the clock as a parameter so it can be tested without freezing time.
 */
export function newBidName(now: Date): string {
  // The same shape the Dashboard prints deadlines in, so two dates on one
  // screen do not read as two different date formats.
  const day = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `Count — ${day}`;
}
