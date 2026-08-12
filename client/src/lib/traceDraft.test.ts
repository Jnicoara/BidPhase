/**
 * Draft protection for trace work.
 *
 * These matter because the failure they guard against is silent and expensive:
 * a user traces a 40-vertex run around a building, the tab dies, and the work
 * is gone with no way to reconstruct where they had got to. The rules worth
 * pinning are the refusals — a corrupt or stale draft must NOT be offered,
 * because a user will accept whatever is offered and a shortened path measures
 * wrong while looking perfectly fine.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DRAFT_TTL_MS,
  clearDraft,
  hasUnsavedWork,
  loadDraft,
  saveDraft,
} from "./traceDraft";

/** localStorage does not exist in the node test environment. */
function installMemoryStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    },
  });
  return store;
}

const POINTS = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }];

const draft = (over: Partial<Parameters<typeof saveDraft>[0]> = {}) => ({
  sheetId: 1, bidId: 9, runId: null, name: "Feeder",
  pathType: "conduit" as const, points: POINTS, ...over,
});

let store: Map<string, string>;
beforeEach(() => { store = installMemoryStorage(); });

describe("round-tripping a draft", () => {
  it("recovers exactly what was traced", () => {
    saveDraft(draft());
    const recovered = loadDraft(1);
    expect(recovered!.points).toEqual(POINTS);
    expect(recovered!.name).toBe("Feeder");
    expect(recovered!.pathType).toBe("conduit");
    expect(recovered!.bidId).toBe(9);
  });

  it("survives a reload — the point of the whole module", () => {
    saveDraft(draft());
    // A fresh page reads the same backing store; nothing in memory carries over.
    expect(loadDraft(1)!.points).toHaveLength(3);
  });

  it("keeps drafts on different sheets apart", () => {
    // A single "current draft" slot would have one overwrite the other on a
    // sheet switch, which is exactly the silent loss this exists to prevent.
    saveDraft(draft({ sheetId: 1, name: "Sheet one run" }));
    saveDraft(draft({ sheetId: 2, name: "Sheet two run" }));

    expect(loadDraft(1)!.name).toBe("Sheet one run");
    expect(loadDraft(2)!.name).toBe("Sheet two run");
  });

  it("remembers the server row once there is one, so autosave updates in place", () => {
    saveDraft(draft({ runId: 42 }));
    expect(loadDraft(1)!.runId).toBe(42);
  });

  it("clears once the work is committed", () => {
    saveDraft(draft());
    clearDraft(1);
    expect(loadDraft(1)).toBeNull();
  });

  it("returns null when there is nothing stored", () => {
    expect(loadDraft(999)).toBeNull();
  });
});

describe("refusing a draft that cannot be trusted", () => {
  it("refuses one with a non-finite coordinate", () => {
    // Offering this would let a corrupt vertex into a measured length.
    store.set("helixbid:trace-draft:1", JSON.stringify({
      sheetId: 1, bidId: 9, runId: null, name: "Bad", pathType: "conduit",
      points: [{ x: 0, y: 0 }, { x: null, y: 10 }], savedAt: Date.now(),
    }));
    expect(loadDraft(1)).toBeNull();
  });

  it("refuses one whose points are not points", () => {
    store.set("helixbid:trace-draft:1", JSON.stringify({
      sheetId: 1, bidId: 9, name: "Bad", pathType: "conduit",
      points: ["nope", 3], savedAt: Date.now(),
    }));
    expect(loadDraft(1)).toBeNull();
  });

  it("refuses malformed JSON rather than throwing", () => {
    store.set("helixbid:trace-draft:1", "{not json");
    expect(loadDraft(1)).toBeNull();
  });

  it("refuses a draft saved for a different sheet", () => {
    store.set("helixbid:trace-draft:1", JSON.stringify({
      ...draft({ sheetId: 2 }), savedAt: Date.now(),
    }));
    expect(loadDraft(1)).toBeNull();
  });

  it("refuses a draft older than the retention window", () => {
    const now = Date.now();
    store.set("helixbid:trace-draft:1", JSON.stringify({
      ...draft(), savedAt: now - DRAFT_TTL_MS - 1,
    }));
    expect(loadDraft(1, now)).toBeNull();
  });

  it("still offers one just inside the window", () => {
    const now = Date.now();
    store.set("helixbid:trace-draft:1", JSON.stringify({
      ...draft(), savedAt: now - DRAFT_TTL_MS + 1000,
    }));
    expect(loadDraft(1, now)).not.toBeNull();
  });

  it("refuses a single stray click as not worth restoring", () => {
    saveDraft(draft({ points: [{ x: 5, y: 5 }] }));
    expect(loadDraft(1)).toBeNull();
  });

  it("does not throw when storage is unavailable", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => { throw new Error("denied"); },
        setItem: () => { throw new Error("quota"); },
        removeItem: () => { throw new Error("denied"); },
      },
    });
    // Tracing must not break because a backup failed — the server copy stands.
    expect(() => saveDraft(draft())).not.toThrow();
    expect(loadDraft(1)).toBeNull();
    expect(() => clearDraft(1)).not.toThrow();
  });
});

describe("warning before leaving", () => {
  it("warns when the path has grown since the last save", () => {
    expect(hasUnsavedWork(POINTS, 2)).toBe(true);
  });

  it("stays quiet when everything is saved", () => {
    expect(hasUnsavedWork(POINTS, 3)).toBe(false);
  });

  it("stays quiet for a stray click", () => {
    // Warning about one click trains people to dismiss the warning that
    // matters, which costs them the run they actually cared about.
    expect(hasUnsavedWork([{ x: 1, y: 1 }], 0)).toBe(false);
    expect(hasUnsavedWork([], 0)).toBe(false);
  });
});
