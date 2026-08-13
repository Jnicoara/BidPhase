/**
 * Modifier lifecycle: active → archived → restored, and the one destructive path.
 *
 * Driven through the tRPC router rather than db.ts directly, because the rules
 * worth protecting are the router's: that nothing is destroyed from the working
 * list, that Delete Forever refuses anything not already archived, and — the
 * subtle one — that archiving a STARTER modifier never resurrects it.
 *
 * That last case is why the tombstone exists. A starter row is shared, so
 * archiving forks it and the fork is the only thing hiding the starter from the
 * list. Hard-deleting that fork would bring the starter straight back.
 *
 * Fixture user ids are distinct from every other suite (materialsLibrary uses
 * 4242/9999, materialsRouter 4243/9998) — vitest runs files in parallel and
 * shared ids delete each other's rows mid-run.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { eq, inArray, isNull } from "drizzle-orm";
import { appRouter } from "./routers";
import { getDb, seedBaselineModifiers } from "./db";
import { modifiers, users } from "../drizzle/schema";
import { BASELINE_MODIFIERS } from "./seed/baselineModifiers";
import type { TrpcContext } from "./_core/context";

const USER = 5253;
const OTHER_USER = 5254;

const hasDb = Boolean(process.env.DATABASE_URL);

const callerFor = (userId: number) =>
  appRouter.createCaller({
    user: { id: userId, openId: `test-modifiers-${userId}`, role: "user" },
  } as unknown as TrpcContext);

const caller = () => callerFor(USER);

beforeAll(async () => {
  if (!hasDb) return;
  const db = await getDb();
  if (!db) return;

  for (const id of [USER, OTHER_USER]) {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!existing) {
      await db.insert(users).values({
        id,
        openId: `test-modifiers-${id}`,
        name: `Modifier test user ${id}`,
      });
    }
  }
  await seedBaselineModifiers();
});

/** Every test starts from "user owns nothing", so ordering never matters. */
beforeEach(async () => {
  if (!hasDb) return;
  const db = await getDb();
  if (!db) return;
  await db
    .delete(modifiers)
    .where(inArray(modifiers.userId, [USER, OTHER_USER]));
});

describe.skipIf(!hasDb)("starter modifiers", () => {
  it("seeds exactly the five starters, deliberately not more", async () => {
    const db = await getDb();
    const baselines = await db!
      .select()
      .from(modifiers)
      .where(isNull(modifiers.userId));
    for (const seeded of BASELINE_MODIFIERS) {
      expect(
        baselines.some(b => b.name === seeded.name),
        `missing ${seeded.name}`
      ).toBe(true);
    }
    expect(BASELINE_MODIFIERS).toHaveLength(5);
  });

  it("stores percentages as exact fractions", async () => {
    const rows = await caller().modifiers.list();
    const height = rows.find(r => r.name === "Working at height");
    expect(height?.laborAdjustmentPctValue).toBeCloseTo(0.12, 10);
  });

  it("shows every starter in the working list and nothing archived", async () => {
    expect(
      (await caller().modifiers.list({ status: "active" })).length
    ).toBeGreaterThanOrEqual(5);
    expect(await caller().modifiers.list({ status: "archived" })).toHaveLength(
      0
    );
  });
});

describe.skipIf(!hasDb)("archive and restore", () => {
  it("archiving removes it from the working list", async () => {
    const before = await caller().modifiers.list({ status: "active" });
    const target = before.find(r => r.name === "Night shift work")!;

    await caller().modifiers.archive({ id: target.id });

    const after = await caller().modifiers.list({ status: "active" });
    expect(after.some(r => r.name === "Night shift work")).toBe(false);
  });

  it("archiving a starter forks it — the shared row is never touched", async () => {
    const before = await caller().modifiers.list({ status: "active" });
    const starter = before.find(r => r.name === "Weekend work")!;
    expect(starter.userId).toBeNull();

    const { id: archivedId } = await caller().modifiers.archive({
      id: starter.id,
    });
    expect(archivedId).not.toBe(starter.id);

    const db = await getDb();
    const [sharedRow] = await db!
      .select()
      .from(modifiers)
      .where(eq(modifiers.id, starter.id));
    expect(sharedRow.userId).toBeNull();
    expect(sharedRow.status).toBe("active");
  });

  it("puts the archived modifier in the Archived view", async () => {
    const before = await caller().modifiers.list({ status: "active" });
    const target = before.find(r => r.name === "Scheduled overtime")!;
    await caller().modifiers.archive({ id: target.id });

    const archived = await caller().modifiers.list({ status: "archived" });
    expect(archived.some(r => r.name === "Scheduled overtime")).toBe(true);
    expect(
      archived.find(r => r.name === "Scheduled overtime")?.archivedAt
    ).toBeTruthy();
  });

  it("restoring returns it to the working list", async () => {
    const before = await caller().modifiers.list({ status: "active" });
    const target = before.find(r => r.name === "Working at height")!;
    const { id } = await caller().modifiers.archive({ id: target.id });

    await caller().modifiers.restore({ id });

    const active = await caller().modifiers.list({ status: "active" });
    expect(active.some(r => r.name === "Working at height")).toBe(true);
    expect(await caller().modifiers.list({ status: "archived" })).toHaveLength(
      0
    );
  });

  it("restoring clears the archived timestamp", async () => {
    const before = await caller().modifiers.list({ status: "active" });
    const { id } = await caller().modifiers.archive({ id: before[0].id });
    const restored = await caller().modifiers.restore({ id });
    expect(restored?.archivedAt).toBeNull();
  });

  it("does not archive one user's modifier for another user", async () => {
    const before = await caller().modifiers.list({ status: "active" });
    const target = before.find(r => r.name === "Weekend work")!;
    await caller().modifiers.archive({ id: target.id });

    const otherActive = await callerFor(OTHER_USER).modifiers.list({
      status: "active",
    });
    expect(otherActive.some(r => r.name === "Weekend work")).toBe(true);
  });

  it("refuses to restore something that is not archived", async () => {
    const active = await caller().modifiers.list({ status: "active" });
    const custom = await caller().modifiers.create({
      name: `Custom ${Date.now()}`,
      laborAdjustmentPct: 0.05,
    });
    expect(active.length).toBeGreaterThan(0);
    await expect(
      caller().modifiers.restore({ id: custom!.id })
    ).rejects.toThrow(/not archived/i);
  });
});

describe.skipIf(!hasDb)("delete forever", () => {
  it("refuses to delete straight from the working list", async () => {
    const created = await caller().modifiers.create({
      name: `Straight delete ${Date.now()}`,
      laborAdjustmentPct: 0.05,
    });
    await expect(
      caller().modifiers.deleteForever({ id: created!.id })
    ).rejects.toThrow(/archived/i);
  });

  it("hard-deletes a fully custom modifier once archived", async () => {
    const created = await caller().modifiers.create({
      name: `Custom gone ${Date.now()}`,
      laborAdjustmentPct: 0.3,
    });
    await caller().modifiers.archive({ id: created!.id });
    await caller().modifiers.deleteForever({ id: created!.id });

    const db = await getDb();
    const rows = await db!
      .select()
      .from(modifiers)
      .where(eq(modifiers.id, created!.id));
    expect(rows).toHaveLength(0);
  });

  it("a permanently deleted starter does NOT come back to the working list", async () => {
    // The whole reason the tombstone exists. Deleting the fork outright would
    // stop it hiding the shared starter row, and the modifier would reappear.
    const before = await caller().modifiers.list({ status: "active" });
    const starter = before.find(
      r => r.name === "Occupied building / renovation"
    )!;

    const { id } = await caller().modifiers.archive({ id: starter.id });
    await caller().modifiers.deleteForever({ id });

    const active = await caller().modifiers.list({ status: "active" });
    const archived = await caller().modifiers.list({ status: "archived" });
    expect(active.some(r => r.name === "Occupied building / renovation")).toBe(
      false
    );
    expect(
      archived.some(r => r.name === "Occupied building / renovation")
    ).toBe(false);
  });

  it("leaves the shared starter row intact for everyone else", async () => {
    const before = await caller().modifiers.list({ status: "active" });
    const starter = before.find(r => r.name === "Night shift work")!;
    const { id } = await caller().modifiers.archive({ id: starter.id });
    await caller().modifiers.deleteForever({ id });

    const otherActive = await callerFor(OTHER_USER).modifiers.list({
      status: "active",
    });
    expect(otherActive.some(r => r.name === "Night shift work")).toBe(true);
  });

  it("never surfaces a tombstone in either view", async () => {
    const before = await caller().modifiers.list({ status: "active" });
    const { id } = await caller().modifiers.archive({ id: before[0].id });
    await caller().modifiers.deleteForever({ id });

    const active = await caller().modifiers.list({ status: "active" });
    const archived = await caller().modifiers.list({ status: "archived" });
    expect([...active, ...archived].some(r => r.id === id)).toBe(false);
  });
});

describe.skipIf(!hasDb)("editing", () => {
  it("editing a starter forks it and leaves the original alone", async () => {
    const before = await caller().modifiers.list({ status: "active" });
    const starter = before.find(r => r.name === "Weekend work")!;

    const result = await caller().modifiers.update({
      id: starter.id,
      laborAdjustmentPct: 0.25,
    });
    expect(result.forked).toBe(true);
    expect(result.modifier?.laborAdjustmentPctValue).toBeCloseTo(0.25, 10);

    const db = await getDb();
    const [shared] = await db!
      .select()
      .from(modifiers)
      .where(eq(modifiers.id, starter.id));
    expect(Number(shared.laborAdjustmentPct)).toBeCloseTo(0.1, 10);
  });

  it("a second edit does not fork again", async () => {
    const before = await caller().modifiers.list({ status: "active" });
    const starter = before.find(r => r.name === "Weekend work")!;
    const first = await caller().modifiers.update({
      id: starter.id,
      laborAdjustmentPct: 0.25,
    });
    const second = await caller().modifiers.update({
      id: first.modifier!.id,
      laborAdjustmentPct: 0.3,
    });
    expect(second.forked).toBe(false);
  });

  it("reverting restores the starter percentage", async () => {
    const before = await caller().modifiers.list({ status: "active" });
    const starter = before.find(r => r.name === "Working at height")!;
    const forked = await caller().modifiers.update({
      id: starter.id,
      laborAdjustmentPct: 0.9,
    });

    const reverted = await caller().modifiers.revert({
      id: forked.modifier!.id,
    });
    expect(reverted?.laborAdjustmentPctValue).toBeCloseTo(0.12, 10);
  });

  it("reverting an archived fork leaves it archived", async () => {
    // Status is lifecycle, not content — revert restores values, not visibility.
    const before = await caller().modifiers.list({ status: "active" });
    const starter = before.find(r => r.name === "Weekend work")!;
    const { id } = await caller().modifiers.archive({ id: starter.id });

    await caller().modifiers.revert({ id });

    expect(
      (await caller().modifiers.list({ status: "archived" })).some(
        r => r.id === id
      )
    ).toBe(true);
    expect(
      (await caller().modifiers.list({ status: "active" })).some(
        r => r.id === id
      )
    ).toBe(false);
  });

  it("refuses a duplicate name in the working list", async () => {
    const name = `Dupe ${Date.now()}`;
    await caller().modifiers.create({ name, laborAdjustmentPct: 0.1 });
    await expect(
      caller().modifiers.create({ name, laborAdjustmentPct: 0.2 })
    ).rejects.toThrow(/already exists/i);
  });

  it("allows reusing a name that is only sitting in the archive", async () => {
    const name = `Reusable ${Date.now()}`;
    const created = await caller().modifiers.create({
      name,
      laborAdjustmentPct: 0.1,
    });
    await caller().modifiers.archive({ id: created!.id });

    const again = await caller().modifiers.create({
      name,
      laborAdjustmentPct: 0.2,
    });
    expect(again?.name).toBe(name);
  });

  it("refuses a modifier that would remove more than all the labor", async () => {
    await expect(
      caller().modifiers.create({
        name: `Bad ${Date.now()}`,
        laborAdjustmentPct: -1.5,
      })
    ).rejects.toThrow();
  });
});
