/**
 * The Dashboard → Takeoff plan handoff.
 *
 * "Upload a plan" takes the file before a bid exists, creates one named after
 * it, and lands on that bid's Takeoff screen where the upload actually starts.
 * Two things about that are worth pinning down:
 *
 *   • the stash is ONE-SHOT. A File left behind would be picked up by the next
 *     Takeoff screen to mount, so navigating back to a bid's plans would
 *     silently upload the last file again — a duplicate nobody would think to
 *     look for, on a screen where duplicates cost money.
 *
 *   • the derived bid name has to be a name. It is the first thing the user
 *     sees on the new bid, and "Harbour_Street_E1.pdf" is not a job name.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  bidNameFromFilename,
  clearPendingPlan,
  hasPendingPlan,
  newBidName,
  putPendingPlan,
  takePendingPlan,
} from "./pendingPlanUpload";

const pdf = (name: string) =>
  new File([new Uint8Array(8)], name, { type: "application/pdf" });

beforeEach(() => clearPendingPlan());

describe("the handoff", () => {
  it("hands over exactly the file it was given", () => {
    const file = pdf("E-101.pdf");
    putPendingPlan(file);
    expect(takePendingPlan()).toBe(file);
  });

  it("clears as it reads, so nothing uploads twice", () => {
    putPendingPlan(pdf("E-101.pdf"));
    expect(takePendingPlan()).not.toBeNull();
    // The second Takeoff screen to mount must get nothing.
    expect(takePendingPlan()).toBeNull();
  });

  it("returns null when nothing was stashed", () => {
    // The ordinary case: every Takeoff screen opened any other way asks and
    // gets nothing.
    expect(takePendingPlan()).toBeNull();
  });

  it("can be abandoned without being consumed", () => {
    // What happens when the bid fails to create — the file must not sit there
    // waiting to ambush the next plans screen.
    putPendingPlan(pdf("E-101.pdf"));
    expect(hasPendingPlan()).toBe(true);
    clearPendingPlan();
    expect(hasPendingPlan()).toBe(false);
    expect(takePendingPlan()).toBeNull();
  });

  it("keeps only the most recent file", () => {
    putPendingPlan(pdf("first.pdf"));
    const second = pdf("second.pdf");
    putPendingPlan(second);
    expect(takePendingPlan()).toBe(second);
    expect(takePendingPlan()).toBeNull();
  });
});

describe("naming the bid after the file", () => {
  it("drops the extension", () => {
    expect(bidNameFromFilename("Harbour Street E1.pdf")).toBe(
      "Harbour Street E1"
    );
    // Case does not matter — a scanner writes .PDF as often as .pdf.
    expect(bidNameFromFilename("Harbour Street E1.PDF")).toBe(
      "Harbour Street E1"
    );
  });

  it("turns underscores into spaces", () => {
    // How a file arrives off a phone, a scanner or a shared drive.
    expect(bidNameFromFilename("Harbour_Street_E1.pdf")).toBe(
      "Harbour Street E1"
    );
  });

  it("keeps a hyphen that is part of a sheet number", () => {
    // "E-101" is the name of the sheet, not two words. Stripping single
    // hyphens would mangle the most common naming convention in the trade.
    expect(bidNameFromFilename("E-101 Power Plan.pdf")).toBe(
      "E-101 Power Plan"
    );
  });

  it("collapses runs of separators and whitespace", () => {
    expect(bidNameFromFilename("Harbour---Street.pdf")).toBe("Harbour Street");
    expect(bidNameFromFilename("Harbour   Street.pdf")).toBe("Harbour Street");
    expect(bidNameFromFilename("  Harbour Street  .pdf")).toBe(
      "Harbour Street"
    );
  });

  it("only drops the LAST extension", () => {
    // A file that has been through a converter often carries two.
    expect(bidNameFromFilename("Plans.v2.pdf")).toBe("Plans.v2");
  });

  it("never returns an empty name", () => {
    // bids.create rejects a blank name, so this would fail the whole flow at
    // the last moment with an error about something the user never typed.
    expect(bidNameFromFilename(".pdf")).toBe("New bid");
    expect(bidNameFromFilename("___.pdf")).toBe("New bid");
    expect(bidNameFromFilename("")).toBe("New bid");
  });

  it("leaves an already-tidy name alone", () => {
    expect(bidNameFromFilename("Maple Street duplex.pdf")).toBe(
      "Maple Street duplex"
    );
  });
});

describe("newBidName", () => {
  it("names a counted bid for the day it was started", () => {
    // The counting entry point creates the bid before asking anything, so this
    // is what lands on the board. A date is what tells two of them apart.
    expect(newBidName(new Date(2026, 7, 18))).toBe("Count — Tue, Aug 18");
  });

  it("never returns something empty", () => {
    // The create call rejects a blank name, and this is the only thing between
    // the Quick bid card and that rejection.
    expect(newBidName(new Date(2026, 0, 1)).trim().length).toBeGreaterThan(0);
  });

  it("takes the clock as a parameter", () => {
    // Not Date.now() internally — otherwise the assertion above could only be
    // written by freezing time, and nothing here would be testable.
    const a = newBidName(new Date(2026, 7, 18));
    const b = newBidName(new Date(2026, 7, 19));
    expect(a).not.toBe(b);
  });
});
