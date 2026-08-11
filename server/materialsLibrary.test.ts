/**
 * Tests for the Foundation material library data layer (server/db.ts § Materials).
 *
 * Named materialsLibrary rather than materials to avoid colliding with
 * materials.test.ts, which covers the older /matdb supply-house price list.
 *
 * The merge tests are pure and always run. The rest need a database and are
 * skipped without DATABASE_URL, matching how v545.test.ts expects a real DB.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { eq, inArray } from "drizzle-orm";
import {
  createMaterial,
  deactivateMaterial,
  forkMaterial,
  getDb,
  getLibraryMaterials,
  getMaterialById,
  mergeLibraryRows,
  revertMaterialToBaseline,
  seedBaselineMaterials,
  updateMaterial,
} from "./db";
import { materials, users } from "../drizzle/schema";
import { BASELINE_MATERIALS } from "./seed/baselineMaterials";

const USER = 4242;
const OTHER_USER = 9999;

// ─── mergeLibraryRows — pure, no database ─────────────────────────────────────

describe("mergeLibraryRows", () => {
  const baseline = (id: number) => ({ id, userId: null, baselineId: null });
  const owned = (id: number, baselineId: number | null) => ({ id, userId: USER, baselineId });

  it("returns baseline rows untouched when the user has forked nothing", () => {
    const rows = [baseline(1), baseline(2)];
    expect(mergeLibraryRows(rows, USER).map(r => r.id)).toEqual([1, 2]);
  });

  it("hides a baseline row once the user has forked it", () => {
    const rows = [baseline(1), baseline(2), owned(50, 1)];
    expect(mergeLibraryRows(rows, USER).map(r => r.id)).toEqual([2, 50]);
  });

  it("keeps fully custom rows, which supersede nothing", () => {
    const rows = [baseline(1), owned(50, null)];
    expect(mergeLibraryRows(rows, USER).map(r => r.id)).toEqual([1, 50]);
  });

  it("does not let another user's fork hide a baseline row", () => {
    const rows = [baseline(1), { id: 60, userId: OTHER_USER, baselineId: 1 }];
    expect(mergeLibraryRows(rows, USER).map(r => r.id)).toEqual([1, 60]);
  });

  it("preserves input ordering", () => {
    const rows = [baseline(3), owned(50, 3), baseline(1)];
    expect(mergeLibraryRows(rows, USER).map(r => r.id)).toEqual([50, 1]);
  });
});

// ─── Database-backed behaviour ────────────────────────────────────────────────

const hasDb = Boolean(process.env.DATABASE_URL);

/**
 * `materials.userId` is a real foreign key, so the test users have to exist
 * before any user-owned row can be inserted. Both users and their materials are
 * disposable fixtures — wiped at the start of each run so repeats stay clean.
 */
beforeAll(async () => {
  if (!hasDb) return;
  const db = await getDb();
  if (!db) return;

  for (const id of [USER, OTHER_USER]) {
    const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing) {
      await db.insert(users).values({
        id,
        openId: `test-materials-library-${id}`,
        name: `Materials library test user ${id}`,
      });
    }
  }

  await db.delete(materials).where(inArray(materials.userId, [USER, OTHER_USER]));
});

describe.skipIf(!hasDb)("baseline material seeding", () => {
  beforeAll(async () => {
    await seedBaselineMaterials();
  });

  it("seeds every starter material as a baseline row", async () => {
    const rows = await getLibraryMaterials(USER);
    for (const seeded of BASELINE_MATERIALS) {
      const found = rows.find(r => r.name === seeded.name && r.userId === null);
      expect(found, `missing baseline material: ${seeded.name}`).toBeDefined();
    }
  });

  it("is idempotent — running it twice does not duplicate rows", async () => {
    await seedBaselineMaterials();
    const rows = await getLibraryMaterials(USER);
    const duplicated = rows.filter(r => r.userId === null && r.name === "20A breaker");
    expect(duplicated).toHaveLength(1);
  });

  it("stores cost as an exact decimal, not a rounded float", async () => {
    const rows = await getLibraryMaterials(USER);
    const wireNuts = rows.find(r => r.name === "Wire nuts" && r.userId === null);
    expect(Number(wireNuts?.costPerUnit)).toBeCloseTo(0.08, 10);
  });
});

describe.skipIf(!hasDb)("fork and revert", () => {
  let baselineId: number;

  beforeAll(async () => {
    await seedBaselineMaterials();
    const rows = await getLibraryMaterials(USER);
    const baseline = rows.find(r => r.userId === null && r.name === "Duplex receptacle");
    baselineId = baseline!.id;
  });

  it("forking produces a user-owned copy that points back at the baseline", async () => {
    const forkId = await forkMaterial(baselineId, USER);
    const fork = await getMaterialById(forkId, USER);
    expect(fork?.userId).toBe(USER);
    expect(fork?.baselineId).toBe(baselineId);
    expect(fork?.name).toBe("Duplex receptacle");
  });

  it("forking twice returns the same copy rather than duplicating", async () => {
    const first = await forkMaterial(baselineId, USER);
    const second = await forkMaterial(baselineId, USER);
    expect(second).toBe(first);
  });

  it("the fork replaces its baseline in the merged list", async () => {
    const forkId = await forkMaterial(baselineId, USER);
    const rows = await getLibraryMaterials(USER);
    expect(rows.some(r => r.id === baselineId)).toBe(false);
    expect(rows.some(r => r.id === forkId)).toBe(true);
  });

  it("reverting restores baseline content and keeps the same row id", async () => {
    const forkId = await forkMaterial(baselineId, USER);
    await updateMaterial(forkId, USER, { costPerUnit: "99.0000", name: "My edited receptacle" });

    const edited = await getMaterialById(forkId, USER);
    expect(edited?.name).toBe("My edited receptacle");

    await revertMaterialToBaseline(forkId, USER);
    const reverted = await getMaterialById(forkId, USER);
    expect(reverted?.id).toBe(forkId);
    expect(reverted?.name).toBe("Duplex receptacle");
    expect(Number(reverted?.costPerUnit)).toBeCloseTo(1.5, 10);
  });

  it("refuses to revert a fully custom material", async () => {
    const customId = await createMaterial({ userId: USER, name: "Custom widget", unitOfSale: "each", costPerUnit: "3.0000" });
    await expect(revertMaterialToBaseline(customId, USER)).rejects.toThrow(/no original/i);
  });
});

describe.skipIf(!hasDb)("ownership", () => {
  let baselineId: number;

  beforeAll(async () => {
    await seedBaselineMaterials();
    const rows = await getLibraryMaterials(USER);
    baselineId = rows.find(r => r.userId === null)!.id;
  });

  it("baseline rows cannot be edited directly", async () => {
    const before = await getMaterialById(baselineId, USER);
    await updateMaterial(baselineId, USER, { name: "hijacked" });
    const after = await getMaterialById(baselineId, USER);
    expect(after?.name).toBe(before?.name);
  });

  it("baseline rows cannot be deactivated by a user", async () => {
    await deactivateMaterial(baselineId, USER);
    const rows = await getLibraryMaterials(USER);
    expect(rows.some(r => r.id === baselineId)).toBe(true);
  });

  it("one user cannot read another user's material", async () => {
    const id = await createMaterial({ userId: OTHER_USER, name: "Private to other user", unitOfSale: "each", costPerUnit: "1.0000" });
    expect(await getMaterialById(id, USER)).toBeUndefined();
    expect(await getMaterialById(id, OTHER_USER)).toBeDefined();
  });

  it("one user cannot edit another user's material", async () => {
    const id = await createMaterial({ userId: OTHER_USER, name: "Not yours", unitOfSale: "each", costPerUnit: "1.0000" });
    await updateMaterial(id, USER, { name: "hijacked" });
    const row = await getMaterialById(id, OTHER_USER);
    expect(row?.name).toBe("Not yours");
  });

  it("ownership columns in an update payload are ignored", async () => {
    const id = await createMaterial({ userId: USER, name: "Stays mine", unitOfSale: "each", costPerUnit: "1.0000" });
    await updateMaterial(id, USER, { name: "Renamed", userId: OTHER_USER } as never);
    const row = await getMaterialById(id, USER);
    expect(row?.name).toBe("Renamed");
    expect(row?.userId).toBe(USER);
  });

  it("deactivating a user's own material removes it from the list", async () => {
    const id = await createMaterial({ userId: USER, name: "Temporary", unitOfSale: "each", costPerUnit: "1.0000" });
    await deactivateMaterial(id, USER);
    const rows = await getLibraryMaterials(USER);
    expect(rows.some(r => r.id === id)).toBe(false);
  });
});
