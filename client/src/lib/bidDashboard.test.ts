/**
 * Dashboard ordering and grouping.
 *
 * The rule most worth pinning is where UNDATED bids land. The natural mistake —
 * treating a missing date as zero — sorts them to the very top, burying the
 * deadlines that actually matter behind the ones that have none.
 */
import { describe, it, expect } from "vitest";
import {
  BID_STATUS_ORDER,
  byDueDate,
  byRecentlyUpdated,
  calendarDate,
  comparatorFor,
  dueUrgency,
  groupBidsByStatus,
  type SortableBid,
} from "./bidDashboard";

const bid = (over: Partial<SortableBid> & { name: string }): SortableBid => ({
  id: Math.floor(Math.random() * 1e6),
  status: "Draft",
  dueDate: null,
  updatedAt: "2026-01-01T00:00:00Z",
  ...over,
});

describe("byDueDate", () => {
  it("puts the soonest deadline first", () => {
    const sorted = [
      bid({ name: "later", dueDate: "2026-09-20" }),
      bid({ name: "sooner", dueDate: "2026-09-01" }),
    ].sort(byDueDate);
    expect(sorted.map(b => b.name)).toEqual(["sooner", "later"]);
  });

  it("sorts bids with NO due date to the end, never the top", () => {
    const sorted = [
      bid({ name: "undated" }),
      bid({ name: "dated", dueDate: "2026-09-01" }),
    ].sort(byDueDate);
    expect(sorted.map(b => b.name)).toEqual(["dated", "undated"]);
  });

  it("keeps every undated bid below every dated one, regardless of input order", () => {
    const sorted = [
      bid({ name: "u1" }),
      bid({ name: "d1", dueDate: "2027-01-01" }),
      bid({ name: "u2" }),
      bid({ name: "d2", dueDate: "2026-02-02" }),
      bid({ name: "u3" }),
    ].sort(byDueDate);

    const firstUndated = sorted.findIndex(b => b.dueDate === null);
    const lastDated = sorted.map(b => b.dueDate !== null).lastIndexOf(true);
    expect(firstUndated).toBeGreaterThan(lastDated);
    expect(sorted.slice(0, 2).map(b => b.name)).toEqual(["d2", "d1"]);
  });

  it("orders undated bids among themselves by name, so the list is stable", () => {
    const sorted = [bid({ name: "Zeta" }), bid({ name: "Alpha" })].sort(byDueDate);
    expect(sorted.map(b => b.name)).toEqual(["Alpha", "Zeta"]);
  });

  it("breaks a tie on the same date by name", () => {
    const sorted = [
      bid({ name: "Beta", dueDate: "2026-05-05" }),
      bid({ name: "Alpha", dueDate: "2026-05-05" }),
    ].sort(byDueDate);
    expect(sorted.map(b => b.name)).toEqual(["Alpha", "Beta"]);
  });

  it("accepts Date objects and ISO strings alike", () => {
    const sorted = [
      bid({ name: "string", dueDate: "2026-06-10" }),
      bid({ name: "date", dueDate: new Date("2026-06-01T12:00:00Z") }),
    ].sort(byDueDate);
    expect(sorted.map(b => b.name)).toEqual(["date", "string"]);
  });

  it("treats an unparseable date as no date rather than as year zero", () => {
    const sorted = [
      bid({ name: "garbage", dueDate: "not a date" }),
      bid({ name: "real", dueDate: "2026-06-01" }),
    ].sort(byDueDate);
    expect(sorted.map(b => b.name)).toEqual(["real", "garbage"]);
  });

  it("puts overdue work at the very top, where it belongs", () => {
    const sorted = [
      bid({ name: "future", dueDate: "2099-01-01" }),
      bid({ name: "undated" }),
      bid({ name: "overdue", dueDate: "2020-01-01" }),
    ].sort(byDueDate);
    expect(sorted.map(b => b.name)).toEqual(["overdue", "future", "undated"]);
  });
});

describe("byRecentlyUpdated", () => {
  it("puts the most recently touched first", () => {
    const sorted = [
      bid({ name: "old", updatedAt: "2026-01-01T00:00:00Z" }),
      bid({ name: "new", updatedAt: "2026-08-01T00:00:00Z" }),
    ].sort(byRecentlyUpdated);
    expect(sorted.map(b => b.name)).toEqual(["new", "old"]);
  });

  it("ignores the due date entirely", () => {
    const sorted = [
      bid({ name: "urgent-but-old", dueDate: "2026-01-01", updatedAt: "2026-01-01T00:00:00Z" }),
      bid({ name: "undated-but-recent", updatedAt: "2026-08-01T00:00:00Z" }),
    ].sort(byRecentlyUpdated);
    expect(sorted.map(b => b.name)).toEqual(["undated-but-recent", "urgent-but-old"]);
  });
});

describe("comparatorFor", () => {
  it("uses deadlines for the stages still in play", () => {
    expect(comparatorFor("Draft")).toBe(byDueDate);
    expect(comparatorFor("Active")).toBe(byDueDate);
  });

  it("uses recency for the stages already decided", () => {
    expect(comparatorFor("Won")).toBe(byRecentlyUpdated);
    expect(comparatorFor("Lost")).toBe(byRecentlyUpdated);
  });
});

describe("groupBidsByStatus", () => {
  it("returns all four columns in a fixed order, even when empty", () => {
    const groups = groupBidsByStatus([]);
    expect(groups.map(g => g.status)).toEqual([...BID_STATUS_ORDER]);
    expect(groups.every(g => g.bids.length === 0)).toBe(true);
  });

  it("files each bid under its own status", () => {
    const groups = groupBidsByStatus([
      bid({ name: "d", status: "Draft" }),
      bid({ name: "a", status: "Active" }),
      bid({ name: "w", status: "Won" }),
      bid({ name: "l", status: "Lost" }),
    ]);
    expect(groups.map(g => g.bids.map(b => b.name))).toEqual([["d"], ["a"], ["w"], ["l"]]);
  });

  it("sorts each column by its own rule, not one rule for all", () => {
    const groups = groupBidsByStatus([
      // Draft sorts by deadline...
      bid({ name: "draft-undated", status: "Draft", updatedAt: "2026-09-01T00:00:00Z" }),
      bid({ name: "draft-due", status: "Draft", dueDate: "2026-09-10", updatedAt: "2026-01-01T00:00:00Z" }),
      // ...while Won sorts by recency, ignoring deadlines entirely.
      bid({ name: "won-old", status: "Won", dueDate: "2026-01-01", updatedAt: "2026-01-01T00:00:00Z" }),
      bid({ name: "won-new", status: "Won", updatedAt: "2026-09-01T00:00:00Z" }),
    ]);

    const draft = groups.find(g => g.status === "Draft")!;
    const won = groups.find(g => g.status === "Won")!;
    expect(draft.bids.map(b => b.name)).toEqual(["draft-due", "draft-undated"]);
    expect(won.bids.map(b => b.name)).toEqual(["won-new", "won-old"]);
  });

  it("drops a bid with an unrecognised status rather than misfiling it", () => {
    // Landing in the wrong column is worse than being visibly absent.
    const groups = groupBidsByStatus([bid({ name: "weird", status: "Archived" })]);
    expect(groups.flatMap(g => g.bids)).toHaveLength(0);
  });

  it("does not mutate the array it was given", () => {
    const input = [
      bid({ name: "b", status: "Draft", dueDate: "2026-02-01" }),
      bid({ name: "a", status: "Draft", dueDate: "2026-01-01" }),
    ];
    const order = input.map(b => b.name);
    groupBidsByStatus(input);
    expect(input.map(b => b.name)).toEqual(order);
  });
});

describe("calendarDate", () => {
  it("reads a stored YYYY-MM-DD as that calendar day, not UTC midnight", () => {
    // The bug this exists to prevent: `new Date("2026-08-14")` is UTC midnight,
    // which formats as the 13th anywhere behind UTC — a deadline off by a day.
    const date = calendarDate("2026-08-14")!;
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7); // August
    expect(date.getDate()).toBe(14);
  });

  it("survives a round trip through toLocaleDateString", () => {
    const rendered = calendarDate("2026-01-01")!.toLocaleDateString("en-US", {
      month: "short", day: "numeric",
    });
    expect(rendered).toBe("Jan 1");
  });

  it("returns null for nothing and for junk", () => {
    expect(calendarDate(null)).toBeNull();
    expect(calendarDate("not a date")).toBeNull();
  });
});

describe("dueUrgency", () => {
  const now = new Date("2026-08-11T15:00:00Z");

  it("reports no urgency when there is no deadline", () => {
    expect(dueUrgency(null, now)).toBe("none");
  });

  it("counts a deadline earlier today as due TODAY, not overdue", () => {
    // The clock passing 09:00 does not make a bid due today late.
    expect(dueUrgency("2026-08-11", now)).toBe("today");
  });

  it("flags a past date as overdue", () => {
    expect(dueUrgency("2026-08-10", now)).toBe("overdue");
  });

  it("flags the next few days as soon, and beyond that as later", () => {
    expect(dueUrgency("2026-08-13", now)).toBe("soon");
    expect(dueUrgency("2026-08-14", now)).toBe("soon");
    expect(dueUrgency("2026-08-20", now)).toBe("later");
  });
});
