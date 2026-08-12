/**
 * Archive / restore / delete-forever for Materials, Assemblies and Kits.
 *
 * These three used to hide a row by setting `isActive = false`, with no way
 * back from any screen — a delete wearing a softer name. They now share the
 * lifecycle Modifiers has had since Foundation, and this suite exists to prove
 * they genuinely share it rather than having grown three lookalikes:
 *
 *   • removing archives and NEVER hard-deletes;
 *   • an archived row is invisible to the working list but fully restorable;
 *   • permanent deletion refuses anything not already archived, so there is no
 *     path from a list straight to destruction;
 *   • deleting a FORK forever must not resurrect the starter it was hiding.
 *
 * That last one is the subtle rule and the reason this is one shared
 * implementation: the fork is the only thing suppressing the shipped row, so
 * dropping it would bring back the very item the user just removed for good.
 *
 * Fixture ids are distinct from every other suite — vitest runs files in
 * parallel and shared ids delete each other's rows mid-run.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { appRouter } from "./routers";
import {
  getDb,
  seedBaselineAssemblies,
  seedBaselineKits,
  seedBaselineLaborRates,
  seedBaselineMaterials,
  seedBaselineModifiers,
} from "./db";
import { assemblies, kits, materials, users } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";

const USER = 7979;
const OTHER_USER = 7980;

const hasDb = Boolean(process.env.DATABASE_URL);

const callerFor = (userId: number) =>
  appRouter.createCaller({
    user: { id: userId, openId: `test-lib-archive-${userId}`, role: "user" },
  } as unknown as TrpcContext);

const caller = () => callerFor(USER);

const unique = () => `${Date.now()}${Math.floor(Math.random() * 1e6)}`;

beforeAll(async () => {
  if (!hasDb) return;
  const database = await getDb();
  if (!database) return;

  for (const id of [USER, OTHER_USER]) {
    const [existing] = await database.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) {
      await database.insert(users).values({
        id, openId: `test-lib-archive-${id}`, name: `Library archive user ${id}`,
      });
    }
  }

  await seedBaselineMaterials().catch(() => {});
  await seedBaselineLaborRates().catch(() => {});
  await seedBaselineModifiers().catch(() => {});
  await seedBaselineAssemblies().catch(() => {});
  await seedBaselineKits().catch(() => {});
});

beforeEach(async () => {
  if (!hasDb) return;
  const database = await getDb();
  if (!database) return;
  // Only the fixture users' own rows; the shared baseline stays put.
  await database.delete(kits).where(inArray(kits.userId, [USER, OTHER_USER]));
  await database.delete(assemblies).where(inArray(assemblies.userId, [USER, OTHER_USER]));
  await database.delete(materials).where(inArray(materials.userId, [USER, OTHER_USER]));
});

// ── Materials ────────────────────────────────────────────────────────────────

describe.skipIf(!hasDb)("removing a material archives it", () => {
  async function ownMaterial(name = `Test material ${unique()}`) {
    const created = await caller().materials.create({ name, costPerUnit: 1.5 });
    return created!;
  }

  it("takes it off the working list without destroying it", async () => {
    const material = await ownMaterial();
    await caller().materials.archive({ id: material.id });

    const working = await caller().materials.list();
    expect(working.find(m => m.id === material.id)).toBeUndefined();

    // Still there, and still readable — hidden, not gone.
    const archived = await caller().materials.list({ status: "archived" });
    expect(archived.find(m => m.id === material.id)).toBeDefined();
  });

  it("restores it fully", async () => {
    const material = await ownMaterial();
    await caller().materials.archive({ id: material.id });
    await caller().materials.restore({ id: material.id });

    const working = await caller().materials.list();
    expect(working.find(m => m.id === material.id)).toBeDefined();
    expect(await caller().materials.list({ status: "archived" })).toHaveLength(0);
  });

  it("keeps its cost and name across the round trip", async () => {
    const material = await ownMaterial("Round trip material " + unique());
    await caller().materials.archive({ id: material.id });
    await caller().materials.restore({ id: material.id });

    const back = await caller().materials.get({ id: material.id });
    expect(back.name).toBe(material.name);
    expect(Number(back.costPerUnit)).toBe(1.5);
  });

  it("has no expiry — an old archive is still restorable", async () => {
    // Unlike an archived BID, nothing purges these. Asserted by there being no
    // date-driven filter at all: the row comes back whenever it is asked for.
    const material = await ownMaterial();
    await caller().materials.archive({ id: material.id });
    const archived = await caller().materials.list({ status: "archived" });
    expect(archived.find(m => m.id === material.id)).toBeDefined();
  });

  it("refuses to archive a starter", async () => {
    const starters = await caller().materials.list();
    const starter = starters.find(m => m.userId === null)!;
    await expect(
      caller().materials.archive({ id: starter.id })
    ).rejects.toThrow(/starter library/i);
  });

  it("refuses another user's material", async () => {
    const material = await ownMaterial();
    await expect(
      callerFor(OTHER_USER).materials.archive({ id: material.id })
    ).rejects.toThrow(/not found/i);
  });
});

describe.skipIf(!hasDb)("deleting a material forever", () => {
  async function archivedMaterial() {
    const created = await caller().materials.create({
      name: `Doomed material ${unique()}`, costPerUnit: 2,
    });
    await caller().materials.archive({ id: created!.id });
    return created!;
  }

  it("refuses anything still on the working list", async () => {
    // No path from a list straight to destruction — archive first, confirm
    // again from the archive.
    const created = await caller().materials.create({
      name: `Live material ${unique()}`, costPerUnit: 2,
    });
    await expect(
      caller().materials.deleteForever({ id: created!.id })
    ).rejects.toThrow(/archived/i);

    expect(await caller().materials.get({ id: created!.id })).toBeTruthy();
  });

  it("removes an archived one for good", async () => {
    const material = await archivedMaterial();
    await caller().materials.deleteForever({ id: material.id });

    expect(await caller().materials.list({ status: "archived" })).toHaveLength(0);
    await expect(caller().materials.get({ id: material.id })).rejects.toThrow(/not found/i);
  });

  it("does NOT resurrect the starter when a fork is deleted forever", async () => {
    // The subtle one. A fork is the only thing hiding its starter, so dropping
    // the row would bring back the very material the user just removed.
    const starters = await caller().materials.list();
    const starter = starters.find(m => m.userId === null)!;
    const starterName = starter.name;

    const forked = await caller().materials.update({ id: starter.id, costPerUnit: 99 });
    const forkId = forked.material!.id;
    expect(forked.forked).toBe(true);

    await caller().materials.archive({ id: forkId });
    await caller().materials.deleteForever({ id: forkId });

    const working = await caller().materials.list();
    expect(working.find(m => m.name === starterName)).toBeUndefined();
    expect(await caller().materials.list({ status: "archived" })).toHaveLength(0);
  });

  it("refuses another user's archived material", async () => {
    const material = await archivedMaterial();
    await expect(
      callerFor(OTHER_USER).materials.deleteForever({ id: material.id })
    ).rejects.toThrow(/not found/i);
  });
});

// ── Assemblies ───────────────────────────────────────────────────────────────

describe.skipIf(!hasDb)("removing an assembly archives it", () => {
  async function ownAssembly() {
    const created = await caller().assemblies.create({
      name: `Test assembly ${unique()}`, category: "Devices", baseLaborHours: 0.5,
    });
    return created!;
  }

  it("archives rather than hard-deleting, and restores", async () => {
    const assembly = await ownAssembly();
    await caller().assemblies.archive({ id: assembly.id });

    expect((await caller().assemblies.list()).find(a => a.id === assembly.id)).toBeUndefined();
    expect(
      (await caller().assemblies.list({ status: "archived" })).find(a => a.id === assembly.id)
    ).toBeDefined();

    await caller().assemblies.restore({ id: assembly.id });
    expect((await caller().assemblies.list()).find(a => a.id === assembly.id)).toBeDefined();
  });

  it("keeps its recipe across the round trip", async () => {
    const assembly = await ownAssembly();
    await caller().assemblies.archive({ id: assembly.id });
    await caller().assemblies.restore({ id: assembly.id });

    const back = await caller().assemblies.get({ id: assembly.id });
    expect(back.name).toBe(assembly.name);
    expect(Number(back.baseLaborHours)).toBe(0.5);
  });

  it("refuses permanent deletion of a live assembly", async () => {
    const assembly = await ownAssembly();
    await expect(
      caller().assemblies.deleteForever({ id: assembly.id })
    ).rejects.toThrow(/archived/i);
  });

  it("deletes an archived one for good", async () => {
    const assembly = await ownAssembly();
    await caller().assemblies.archive({ id: assembly.id });
    await caller().assemblies.deleteForever({ id: assembly.id });
    await expect(caller().assemblies.get({ id: assembly.id })).rejects.toThrow(/not found/i);
  });

  it("refuses to archive a starter", async () => {
    const starter = (await caller().assemblies.list()).find(a => a.userId === null)!;
    await expect(
      caller().assemblies.archive({ id: starter.id })
    ).rejects.toThrow(/starter/i);
  });
});

// ── Kits ─────────────────────────────────────────────────────────────────────

describe.skipIf(!hasDb)("removing a kit archives it", () => {
  async function ownKit() {
    const created = await caller().kits.create({ name: `Test kit ${unique()}` });
    return created!;
  }

  it("archives rather than hard-deleting, and restores", async () => {
    const kit = await ownKit();
    await caller().kits.archive({ id: kit.id });

    expect((await caller().kits.list()).find(k => k.id === kit.id)).toBeUndefined();
    expect(
      (await caller().kits.list({ status: "archived" })).find(k => k.id === kit.id)
    ).toBeDefined();

    await caller().kits.restore({ id: kit.id });
    expect((await caller().kits.list()).find(k => k.id === kit.id)).toBeDefined();
  });

  it("refuses permanent deletion of a live kit", async () => {
    const kit = await ownKit();
    await expect(caller().kits.deleteForever({ id: kit.id })).rejects.toThrow(/archived/i);
  });

  it("deletes an archived one for good", async () => {
    const kit = await ownKit();
    await caller().kits.archive({ id: kit.id });
    await caller().kits.deleteForever({ id: kit.id });
    await expect(caller().kits.get({ id: kit.id })).rejects.toThrow(/not found/i);
  });

  it("refuses to archive a starter", async () => {
    const starter = (await caller().kits.list()).find(k => k.userId === null)!;
    await expect(caller().kits.archive({ id: starter.id })).rejects.toThrow(/starter/i);
  });
});

// ── The shape all four share ─────────────────────────────────────────────────

describe.skipIf(!hasDb)("every library table behaves the same way", () => {
  it("archives out of the working list and into the archive, everywhere", async () => {
    const material = (await caller().materials.create({
      name: `Uniform material ${unique()}`, costPerUnit: 1,
    }))!;
    const assembly = (await caller().assemblies.create({
      name: `Uniform assembly ${unique()}`, category: "Devices", baseLaborHours: 1,
    }))!;
    const kit = (await caller().kits.create({ name: `Uniform kit ${unique()}` }))!;

    await caller().materials.archive({ id: material.id });
    await caller().assemblies.archive({ id: assembly.id });
    await caller().kits.archive({ id: kit.id });

    expect(await caller().materials.list({ status: "archived" })).toHaveLength(1);
    expect(await caller().assemblies.list({ status: "archived" })).toHaveLength(1);
    expect(await caller().kits.list({ status: "archived" })).toHaveLength(1);

    for (const list of [
      await caller().materials.list(),
      await caller().assemblies.list(),
      await caller().kits.list(),
    ]) {
      expect(list.every(row => row.status === "active")).toBe(true);
    }
  });

  it("refuses permanent deletion from the working list on all three", async () => {
    const material = (await caller().materials.create({
      name: `Guarded material ${unique()}`, costPerUnit: 1,
    }))!;
    const assembly = (await caller().assemblies.create({
      name: `Guarded assembly ${unique()}`, category: "Devices", baseLaborHours: 1,
    }))!;
    const kit = (await caller().kits.create({ name: `Guarded kit ${unique()}` }))!;

    await expect(caller().materials.deleteForever({ id: material.id })).rejects.toThrow(/archived/i);
    await expect(caller().assemblies.deleteForever({ id: assembly.id })).rejects.toThrow(/archived/i);
    await expect(caller().kits.deleteForever({ id: kit.id })).rejects.toThrow(/archived/i);
  });
});
