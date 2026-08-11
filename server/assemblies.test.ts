/**
 * Assemblies: recipe cost, and fork/revert of a parent WITH children.
 *
 * The risky parts, and why:
 *   • Cost has to move when materials, hours, the role, or modifiers move —
 *     and modifiers must ADD. A recipe that quietly compounds over-bids a job.
 *   • Forking has to deep-copy. A fork that copies the header but not the
 *     material lines is an empty recipe that prices at labor only.
 *   • Reverting has to restore the lines too, or the user is left with their
 *     own recipe priced against starter hours.
 *
 * Driven through the router, since those guarantees are the router's contract.
 * Fixture ids are distinct from every other suite (4242/9999, 4243/9998,
 * 5151/5152, 5253/5254) — vitest runs files in parallel.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { eq, inArray, isNull } from "drizzle-orm";
import { appRouter } from "./routers";
import {
  getDb,
  seedBaselineAssemblies,
  seedBaselineLaborRates,
  seedBaselineMaterials,
  seedBaselineModifiers,
} from "./db";
import { assemblies, laborRates, materials, modifiers, users } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";

const USER = 6161;
const OTHER_USER = 6162;

const hasDb = Boolean(process.env.DATABASE_URL);

const callerFor = (userId: number) =>
  appRouter.createCaller({
    user: { id: userId, openId: `test-assemblies-${userId}`, role: "user" },
  } as unknown as TrpcContext);

const caller = () => callerFor(USER);

/** Look up a seeded baseline row id by name. */
async function baselineId(table: "materials" | "modifiers" | "labor_rates", name: string) {
  const db = await getDb();
  const target = table === "materials" ? materials : table === "modifiers" ? modifiers : laborRates;
  const [row] = await db!.select().from(target)
    .where(eq(target.name, name)).limit(1);
  return row.id as number;
}

beforeAll(async () => {
  if (!hasDb) return;
  const db = await getDb();
  if (!db) return;

  for (const id of [USER, OTHER_USER]) {
    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) {
      await db.insert(users).values({
        id, openId: `test-assemblies-${id}`, name: `Assembly test user ${id}`,
      });
    }
  }

  // Assemblies resolve their recipes by name, so their dependencies come first.
  await seedBaselineMaterials();
  await seedBaselineLaborRates();
  await seedBaselineModifiers();
  await seedBaselineAssemblies();
});

beforeEach(async () => {
  if (!hasDb) return;
  const db = await getDb();
  if (!db) return;
  await db.delete(assemblies).where(inArray(assemblies.userId, [USER, OTHER_USER]));
});

describe.skipIf(!hasDb)("starter assemblies", () => {
  it("seeds recipes with their material lines attached", async () => {
    const list = await caller().assemblies.list();
    const duplex = list.find(a => a.name === "Duplex receptacle standard");
    expect(duplex).toBeDefined();

    const detail = await caller().assemblies.get({ id: duplex!.id });
    expect(detail.materials.length).toBe(5);
    expect(detail.materials.map(m => m.name)).toContain("Duplex receptacle");
    expect(detail.materials.find(m => m.name === "12-2 NM-B")?.qty).toBe("25.0000");
  });

  it("only seeds assemblies whose materials all exist", async () => {
    // STARTER_LIBRARY marks 36 materials as missing; anything needing one is
    // skipped rather than shipped half-built and under-priced.
    const db = await getDb();
    const baselines = await db!.select().from(assemblies).where(isNull(assemblies.userId));
    expect(baselines.length).toBeGreaterThan(0);
    for (const assembly of baselines) {
      const detail = await caller().assemblies.get({ id: assembly.id });
      expect(detail.materials.length, `${assembly.name} has no materials`).toBeGreaterThan(0);
    }
  });

  it("carries a project type and a category", async () => {
    const list = await caller().assemblies.list();
    const fan = list.find(a => a.name === "Ceiling fan standard")!;
    expect(fan.category).toBe("Lighting");
    expect(fan.projectType).toBe("residential");
  });

  it("attaches the modifiers a starter opts into", async () => {
    const list = await caller().assemblies.list();
    const fan = list.find(a => a.name === "Ceiling fan standard")!;
    const detail = await caller().assemblies.get({ id: fan.id });
    expect(detail.modifierIds.length).toBe(1);
  });
});

describe.skipIf(!hasDb)("recipe cost", () => {
  /** Build a small assembly with known numbers so the math is checkable by hand. */
  async function buildFixture(overrides: Partial<{
    hours: number; modifierIds: number[]; laborRateId: number | null;
  }> = {}) {
    const journeymanId = await baselineId("labor_rates", "Journeyman");
    const duplexId = await baselineId("materials", "Duplex receptacle");   // $1.50 each
    const boxId = await baselineId("materials", "Single-gang box");        // $1.25 each

    const created = await caller().assemblies.create({
      name: `Cost fixture ${Date.now()}${Math.random()}`,
      category: "Devices",
      trade: "electrical",
      projectType: "both",
      baseLaborHours: overrides.hours ?? 1,
      laborRateId: overrides.laborRateId !== undefined ? overrides.laborRateId : journeymanId,
      materials: [
        { materialId: duplexId, qty: 2 },
        { materialId: boxId, qty: 2 },
      ],
      modifierIds: overrides.modifierIds ?? [],
    });
    return created!;
  }

  it("adds up materials times quantity", async () => {
    const assembly = await buildFixture();
    const priced = await caller().assemblies.price({ id: assembly.id });
    // (1.50 × 2) + (1.25 × 2) = 5.50
    expect(priced.line.materialCost).toBeCloseTo(5.5, 10);
  });

  it("prices labor as hours times the role's rate", async () => {
    const assembly = await buildFixture({ hours: 2 });
    const priced = await caller().assemblies.price({ id: assembly.id });
    // Journeyman $38 × 2 h
    expect(priced.line.laborCost).toBeCloseTo(76, 10);
    expect(priced.line.directCost).toBeCloseTo(81.5, 10);
  });

  it("moves when the hours move", async () => {
    const assembly = await buildFixture({ hours: 1 });
    const before = await caller().assemblies.price({ id: assembly.id });
    await caller().assemblies.update({ id: assembly.id, baseLaborHours: 3 });
    const after = await caller().assemblies.price({ id: assembly.id });
    expect(after.line.laborCost).toBeCloseTo(before.line.laborCost * 3, 10);
  });

  it("moves when the labor role changes", async () => {
    const assembly = await buildFixture({ hours: 1 });
    const apprenticeId = await baselineId("labor_rates", "Apprentice");
    await caller().assemblies.update({ id: assembly.id, laborRateId: apprenticeId });
    const priced = await caller().assemblies.price({ id: assembly.id });
    expect(priced.line.laborCost).toBeCloseTo(22, 10);
  });

  it("prices a salaried role off its derived hourly rate", async () => {
    const pmId = await baselineId("labor_rates", "Project Manager");
    const assembly = await buildFixture({ hours: 1, laborRateId: pmId });
    const priced = await caller().assemblies.price({ id: assembly.id });
    // $60,000 ÷ 2,080 ≈ $28.85
    expect(priced.line.laborCost).toBeCloseTo(28.85, 1);
  });

  it("prices labor at zero and flags it when no role is picked", async () => {
    const assembly = await buildFixture({ hours: 5, laborRateId: null });
    const priced = await caller().assemblies.price({ id: assembly.id });
    expect(priced.line.laborCost).toBe(0);
    expect(priced.laborRateMissing).toBe(true);
  });

  it("moves when materials are added or removed", async () => {
    const assembly = await buildFixture();
    const wireNutsId = await baselineId("materials", "Wire nuts"); // $0.08
    await caller().assemblies.update({
      id: assembly.id,
      materials: [{ materialId: wireNutsId, qty: 10 }],
    });
    const priced = await caller().assemblies.price({ id: assembly.id });
    expect(priced.line.materialCost).toBeCloseTo(0.8, 10);
  });

  it("ADDS modifiers rather than compounding them", async () => {
    const heightId = await baselineId("modifiers", "Working at height");        // +12%
    const overtimeId = await baselineId("modifiers", "Scheduled overtime");     // +20%
    const assembly = await buildFixture({ hours: 10, modifierIds: [heightId, overtimeId] });

    const priced = await caller().assemblies.price({ id: assembly.id });
    // 10 h × (1 + 0.32) = 13.2 h. Compounding would give 1.12 × 1.20 = 13.44 h.
    expect(priced.line.modifierPct).toBeCloseTo(0.32, 10);
    expect(priced.line.adjustedLaborHours).toBeCloseTo(13.2, 10);
    expect(priced.line.adjustedLaborHours).not.toBeCloseTo(13.44, 3);
  });

  it("changes cost when a modifier is toggled off", async () => {
    const heightId = await baselineId("modifiers", "Working at height");
    const assembly = await buildFixture({ hours: 10, modifierIds: [heightId] });
    const withModifier = await caller().assemblies.price({ id: assembly.id });

    await caller().assemblies.update({ id: assembly.id, modifierIds: [] });
    const without = await caller().assemblies.price({ id: assembly.id });

    expect(withModifier.line.laborCost).toBeGreaterThan(without.line.laborCost);
    expect(without.line.modifierPct).toBe(0);
  });

  it("scales the whole line by quantity", async () => {
    const assembly = await buildFixture({ hours: 1 });
    const one = await caller().assemblies.price({ id: assembly.id, quantity: 1 });
    const ten = await caller().assemblies.price({ id: assembly.id, quantity: 10 });
    expect(ten.line.directCost).toBeCloseTo(one.line.directCost * 10, 8);
  });

  it("returns direct cost only when no profit method is given", async () => {
    const assembly = await buildFixture();
    const priced = await caller().assemblies.price({ id: assembly.id });
    expect(priced.bid).toBeNull();
  });

  it("applies overhead before profit", async () => {
    const assembly = await buildFixture({ hours: 1 });
    const priced = await caller().assemblies.price({
      id: assembly.id,
      overhead: { enabled: true, mode: "percentage", value: 0.1 },
      profit: { method: "markup", value: 0.2 },
    });
    // materials 5.50 + labor (1 h × $38) = 43.50 direct
    //   → +10% overhead = 47.85 → +20% markup = 57.42
    expect(priced.bid?.directCost).toBeCloseTo(43.5, 2);
    expect(priced.bid?.overheadAmount).toBeCloseTo(4.35, 2);
    expect(priced.bid?.costWithOverhead).toBeCloseTo(47.85, 2);
    expect(priced.bid?.finalPrice).toBeCloseTo(57.42, 2);
  });

  it("gives a higher price for target margin than markup at the same rate", async () => {
    const assembly = await buildFixture({ hours: 1 });
    const markup = await caller().assemblies.price({
      id: assembly.id, profit: { method: "markup", value: 0.2 },
    });
    const margin = await caller().assemblies.price({
      id: assembly.id, profit: { method: "margin", value: 0.2 },
    });
    expect(margin.bid!.finalPrice).toBeGreaterThan(markup.bid!.finalPrice);
  });
});

describe.skipIf(!hasDb)("fork and revert", () => {
  async function starter() {
    const list = await caller().assemblies.list();
    return list.find(a => a.name === "Single-pole switch" && a.userId === null)!;
  }

  it("editing a starter forks it and leaves the shipped row alone", async () => {
    const original = await starter();
    const result = await caller().assemblies.update({ id: original.id, baseLaborHours: 2.5 });

    expect(result.forked).toBe(true);
    expect(result.assembly?.userId).toBe(USER);
    expect(result.assembly?.id).not.toBe(original.id);

    const db = await getDb();
    const [shared] = await db!.select().from(assemblies).where(eq(assemblies.id, original.id));
    expect(Number(shared.baseLaborHours)).toBeCloseTo(0.6, 4);
  });

  it("the fork carries the whole recipe, not just the header", async () => {
    const original = await starter();
    const before = await caller().assemblies.get({ id: original.id });

    const result = await caller().assemblies.update({ id: original.id, baseLaborHours: 2.5 });
    const forked = await caller().assemblies.get({ id: result.assembly!.id });

    expect(forked.materials.length).toBe(before.materials.length);
    expect(forked.materials.map(m => m.name).sort())
      .toEqual(before.materials.map(m => m.name).sort());
  });

  it("the fork replaces its starter in the list", async () => {
    const original = await starter();
    await caller().assemblies.update({ id: original.id, baseLaborHours: 2.5 });

    const after = await caller().assemblies.list();
    expect(after.filter(a => a.name === "Single-pole switch")).toHaveLength(1);
    expect(after.find(a => a.name === "Single-pole switch")?.userId).toBe(USER);
  });

  it("a second edit does not fork again", async () => {
    const original = await starter();
    const first = await caller().assemblies.update({ id: original.id, baseLaborHours: 2.5 });
    const second = await caller().assemblies.update({
      id: first.assembly!.id, baseLaborHours: 3,
    });
    expect(second.forked).toBe(false);
  });

  it("reverting restores the starter hours AND the starter recipe", async () => {
    const original = await starter();
    const before = await caller().assemblies.get({ id: original.id });

    const forked = await caller().assemblies.update({
      id: original.id,
      baseLaborHours: 9,
      materials: [{ materialId: before.materials[0].materialId, qty: 99 }],
    });
    const edited = await caller().assemblies.get({ id: forked.assembly!.id });
    expect(edited.materials).toHaveLength(1);

    const reverted = await caller().assemblies.revert({ id: forked.assembly!.id });
    expect(Number(reverted!.baseLaborHours)).toBeCloseTo(0.6, 4);
    expect(reverted!.materials.length).toBe(before.materials.length);
    expect(reverted!.id).toBe(forked.assembly!.id);
  });

  it("reverting restores the modifier set too", async () => {
    const list = await caller().assemblies.list();
    const fan = list.find(a => a.name === "Ceiling fan standard")!;
    const forked = await caller().assemblies.update({ id: fan.id, modifierIds: [] });
    expect(forked.assembly?.modifierIds).toHaveLength(0);

    const reverted = await caller().assemblies.revert({ id: forked.assembly!.id });
    expect(reverted!.modifierIds).toHaveLength(1);
  });

  it("a reverted assembly prices exactly like the starter again", async () => {
    const original = await starter();
    const starterPrice = await caller().assemblies.price({ id: original.id });

    const forked = await caller().assemblies.update({ id: original.id, baseLaborHours: 9 });
    await caller().assemblies.revert({ id: forked.assembly!.id });
    const revertedPrice = await caller().assemblies.price({ id: forked.assembly!.id });

    expect(revertedPrice.line.directCost).toBeCloseTo(starterPrice.line.directCost, 6);
  });

  it("refuses to revert an assembly built from scratch", async () => {
    const created = await caller().assemblies.create({
      name: `Scratch ${Date.now()}`, category: "Devices", trade: "electrical",
      projectType: null, baseLaborHours: 1, laborRateId: null, materials: [], modifierIds: [],
    });
    await expect(caller().assemblies.revert({ id: created!.id })).rejects.toThrow(/no original/i);
  });

  it("one user's fork does not change another user's list", async () => {
    const original = await starter();
    await caller().assemblies.update({ id: original.id, baseLaborHours: 9 });

    const other = await callerFor(OTHER_USER).assemblies.list();
    const theirs = other.find(a => a.name === "Single-pole switch")!;
    expect(theirs.userId).toBeNull();
    expect(Number(theirs.baseLaborHours)).toBeCloseTo(0.6, 4);
  });

  it("refuses to remove a starter but removes a custom one", async () => {
    const original = await starter();
    await expect(caller().assemblies.remove({ id: original.id }))
      .rejects.toThrow(/cannot be removed/i);

    const created = await caller().assemblies.create({
      name: `Disposable ${Date.now()}`, category: "Devices", trade: "electrical",
      projectType: null, baseLaborHours: 1, laborRateId: null, materials: [], modifierIds: [],
    });
    await caller().assemblies.remove({ id: created!.id });
    expect((await caller().assemblies.list()).some(a => a.id === created!.id)).toBe(false);
  });

  it("refuses a duplicate name", async () => {
    await expect(caller().assemblies.create({
      name: "Single-pole switch", category: "Devices", trade: "electrical",
      projectType: null, baseLaborHours: 1, laborRateId: null, materials: [], modifierIds: [],
    })).rejects.toThrow(/already exists/i);
  });
});
