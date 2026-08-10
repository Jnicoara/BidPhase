import { and, desc, eq, asc, or, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  InsertProject,
  InsertUserMaterialsDb,
  InsertMasterItem,
  InsertMasterAssembly,
  InsertMasterAssemblyItem,
  InsertMasterLaborRate,
  InsertProjectAssembly,
  InsertProjectAssemblyItem,
  InsertProjectItem,
  InsertBidSummary,
  InsertFeatureFlag,
  FeatureFlag,
  projects,
  userMaterialsDb,
  users,
  masterItems,
  masterAssemblies,
  masterAssemblyItems,
  masterLaborRates,
  projectAssemblies,
  projectAssemblyItems,
  projectItems,
  bidSummary,
  featureFlags,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod", "passwordHash"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    (values as Record<string, unknown>)[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.emailVerified !== undefined) {
    values.emailVerified = user.emailVerified;
    updateSet.emailVerified = user.emailVerified;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function getProjectsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.isArchived, false)))
    .orderBy(desc(projects.updatedAt));
}

export async function searchProjectsByUser(userId: number, query: string) {
  const db = await getDb();
  if (!db) return [];
  const q = `%${query}%`;
  return db.select().from(projects)
    .where(and(
      eq(projects.userId, userId),
      eq(projects.isArchived, false),
      or(
        like(projects.name, q),
        like(projects.customerName, q),
        like(projects.address, q),
      )
    ))
    .orderBy(desc(projects.updatedAt));
}

export async function getProjectById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1);
  return result[0];
}

export async function createProject(data: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(projects).values(data);
  return result[0];
}

export async function updateProject(id: number, userId: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(projects).set({ ...data, updatedAt: new Date() })
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));
}

export async function archiveProject(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(projects).set({ isArchived: true, updatedAt: new Date() })
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));
}

export async function deleteProject(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, userId)));
}

// ─── User Materials Database ───────────────────────────────────────────────────

export async function getUserMaterials(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userMaterialsDb)
    .where(and(eq(userMaterialsDb.userId, userId), eq(userMaterialsDb.isActive, true)))
    .orderBy(asc(userMaterialsDb.category), asc(userMaterialsDb.description));
}

export async function updateMaterialPrice(id: number, userId: number, userPrice: number | null) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(userMaterialsDb)
    .set({ userPrice, lastUpdated: userPrice !== null ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(userMaterialsDb.id, id), eq(userMaterialsDb.userId, userId)));
}

export async function resetMaterialPrice(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(userMaterialsDb)
    .set({ userPrice: null, lastUpdated: null, updatedAt: new Date() })
    .where(and(eq(userMaterialsDb.id, id), eq(userMaterialsDb.userId, userId)));
}

export async function addSingleMaterial(row: InsertUserMaterialsDb) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(userMaterialsDb).values(row);
  return result[0];
}

export async function updateMaterialRow(
  id: number,
  userId: number,
  patch: Partial<Pick<InsertUserMaterialsDb, "description" | "unit" | "category" | "defaultPrice" | "itemCode">>
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(userMaterialsDb)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(userMaterialsDb.id, id), eq(userMaterialsDb.userId, userId)));
}

export async function bulkInsertUserMaterials(rows: InsertUserMaterialsDb[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (rows.length === 0) return;
  await db.insert(userMaterialsDb).values(rows);
}

export async function deleteUserMaterial(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(userMaterialsDb).where(and(eq(userMaterialsDb.id, id), eq(userMaterialsDb.userId, userId)));
}

export async function clearUserMaterials(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(userMaterialsDb).where(eq(userMaterialsDb.userId, userId));
}

// ─── Master Items ─────────────────────────────────────────────────────────────

export async function getMasterItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(masterItems)
    .where(and(eq(masterItems.userId, userId), eq(masterItems.isActive, true)))
    .orderBy(asc(masterItems.category), asc(masterItems.description));
}

export async function getMasterItemById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(masterItems)
    .where(and(eq(masterItems.id, id), eq(masterItems.userId, userId)))
    .limit(1);
  return result[0];
}

export async function createMasterItem(data: InsertMasterItem) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(masterItems).values(data);
  return result[0];
}

export async function updateMasterItem(id: number, userId: number, data: Partial<InsertMasterItem>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(masterItems).set({ ...data, updatedAt: new Date() })
    .where(and(eq(masterItems.id, id), eq(masterItems.userId, userId)));
}

export async function deleteMasterItem(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Soft delete
  await db.update(masterItems).set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(masterItems.id, id), eq(masterItems.userId, userId)));
}

export async function bulkInsertMasterItems(rows: InsertMasterItem[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (rows.length === 0) return;
  await db.insert(masterItems).values(rows);
}

// ─── Master Assemblies ────────────────────────────────────────────────────────

export async function getMasterAssemblies(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(masterAssemblies)
    .where(and(eq(masterAssemblies.userId, userId), eq(masterAssemblies.isActive, true)))
    .orderBy(asc(masterAssemblies.name));
}

export async function getMasterAssemblyWithItems(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [assembly] = await db.select().from(masterAssemblies)
    .where(and(eq(masterAssemblies.id, id), eq(masterAssemblies.userId, userId)))
    .limit(1);
  if (!assembly) return undefined;

  const items = await db.select({
    id: masterAssemblyItems.id,
    assemblyId: masterAssemblyItems.assemblyId,
    masterItemId: masterAssemblyItems.masterItemId,
    qty: masterAssemblyItems.qty,
    sortOrder: masterAssemblyItems.sortOrder,
    itemCode: masterItems.itemCode,
    description: masterItems.description,
    unit: masterItems.unit,
    masterMaterialCost: masterItems.masterMaterialCost,
    masterLaborHours: masterItems.masterLaborHours,
    category: masterItems.category,
  })
    .from(masterAssemblyItems)
    .innerJoin(masterItems, eq(masterAssemblyItems.masterItemId, masterItems.id))
    .where(eq(masterAssemblyItems.assemblyId, id))
    .orderBy(asc(masterAssemblyItems.sortOrder));

  return { ...assembly, items };
}

export async function createMasterAssembly(data: InsertMasterAssembly) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(masterAssemblies).values(data);
  return result[0];
}

export async function updateMasterAssembly(id: number, userId: number, data: Partial<InsertMasterAssembly>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(masterAssemblies).set({ ...data, updatedAt: new Date() })
    .where(and(eq(masterAssemblies.id, id), eq(masterAssemblies.userId, userId)));
}

export async function deleteMasterAssembly(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(masterAssemblies).set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(masterAssemblies.id, id), eq(masterAssemblies.userId, userId)));
}

export async function addItemToMasterAssembly(data: InsertMasterAssemblyItem) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(masterAssemblyItems).values(data);
}

export async function updateMasterAssemblyItem(id: number, data: Partial<InsertMasterAssemblyItem>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(masterAssemblyItems).set(data).where(eq(masterAssemblyItems.id, id));
}

export async function removeItemFromMasterAssembly(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(masterAssemblyItems).where(eq(masterAssemblyItems.id, id));
}

// ─── Master Labor Rates ───────────────────────────────────────────────────────

export async function getMasterLaborRates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(masterLaborRates)
    .where(eq(masterLaborRates.userId, userId))
    .orderBy(asc(masterLaborRates.name));
}

export async function createMasterLaborRate(data: InsertMasterLaborRate) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(masterLaborRates).values(data);
  return result[0];
}

export async function updateMasterLaborRate(id: number, userId: number, data: Partial<InsertMasterLaborRate>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(masterLaborRates).set({ ...data, updatedAt: new Date() })
    .where(and(eq(masterLaborRates.id, id), eq(masterLaborRates.userId, userId)));
}

export async function deleteMasterLaborRate(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(masterLaborRates).where(and(eq(masterLaborRates.id, id), eq(masterLaborRates.userId, userId)));
}

// ─── Project Assemblies ───────────────────────────────────────────────────────
// All access below is scoped to rows whose parent project belongs to userId —
// project assemblies/items have no userId column of their own, so ownership is
// resolved by walking up to the owning project (same rule as the Master* tables).

export async function getProjectAssemblies(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  const project = await getProjectById(projectId, userId);
  if (!project) return [];
  return db.select().from(projectAssemblies)
    .where(eq(projectAssemblies.projectId, projectId))
    .orderBy(asc(projectAssemblies.sortOrder), asc(projectAssemblies.createdAt));
}

/** Resolve the owning userId for a project assembly, or undefined if it doesn't exist. */
export async function getProjectAssemblyOwnerId(assemblyId: number): Promise<number | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db.select({ userId: projects.userId })
    .from(projectAssemblies)
    .innerJoin(projects, eq(projectAssemblies.projectId, projects.id))
    .where(eq(projectAssemblies.id, assemblyId))
    .limit(1);
  return row?.userId;
}

/** Resolve the owning userId for a project assembly item, or undefined if it doesn't exist. */
async function getProjectAssemblyItemOwnerId(id: number): Promise<number | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db.select({ userId: projects.userId })
    .from(projectAssemblyItems)
    .innerJoin(projectAssemblies, eq(projectAssemblyItems.projectAssemblyId, projectAssemblies.id))
    .innerJoin(projects, eq(projectAssemblies.projectId, projects.id))
    .where(eq(projectAssemblyItems.id, id))
    .limit(1);
  return row?.userId;
}

export async function getProjectAssemblyWithItems(assemblyId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [assembly] = await db.select().from(projectAssemblies)
    .where(eq(projectAssemblies.id, assemblyId))
    .limit(1);
  if (!assembly) return undefined;

  const items = await db.select().from(projectAssemblyItems)
    .where(eq(projectAssemblyItems.projectAssemblyId, assemblyId))
    .orderBy(asc(projectAssemblyItems.sortOrder));

  return { ...assembly, items };
}

export async function getProjectAssembliesWithItems(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  const assemblies = await getProjectAssemblies(projectId, userId);
  return Promise.all(assemblies.map(a => getProjectAssemblyWithItems(a.id)));
}

export async function createProjectAssembly(data: InsertProjectAssembly) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(projectAssemblies).values(data);
  return result;
}

export async function updateProjectAssembly(id: number, userId: number, data: Partial<InsertProjectAssembly>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const ownerId = await getProjectAssemblyOwnerId(id);
  if (ownerId !== userId) return;
  await db.update(projectAssemblies).set({ ...data, updatedAt: new Date() })
    .where(eq(projectAssemblies.id, id));
}

export async function deleteProjectAssembly(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const ownerId = await getProjectAssemblyOwnerId(id);
  if (ownerId !== userId) return;
  await db.delete(projectAssemblies).where(eq(projectAssemblies.id, id));
}

export async function createProjectAssemblyItem(data: InsertProjectAssemblyItem) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(projectAssemblyItems).values(data);
}

export async function updateProjectAssemblyItem(id: number, userId: number, data: Partial<InsertProjectAssemblyItem>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const ownerId = await getProjectAssemblyItemOwnerId(id);
  if (ownerId !== userId) return;
  await db.update(projectAssemblyItems).set({ ...data, updatedAt: new Date() })
    .where(eq(projectAssemblyItems.id, id));
}

export async function resetProjectAssemblyItemToMaster(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const ownerId = await getProjectAssemblyItemOwnerId(id);
  if (ownerId !== userId) return;
  // Reset overrides to master values
  await db.execute(sql`
    UPDATE project_assembly_items
    SET overrideMaterialCost = masterMaterialCost,
        overrideLaborHours = masterLaborHours,
        updatedAt = NOW()
    WHERE id = ${id}
  `);
}

export async function deleteProjectAssemblyItem(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const ownerId = await getProjectAssemblyItemOwnerId(id);
  if (ownerId !== userId) return;
  await db.delete(projectAssemblyItems).where(eq(projectAssemblyItems.id, id));
}

// ─── Project Items (Standalone) ───────────────────────────────────────────────
// Same rule as above: project items have no userId column, so ownership is
// resolved by walking up to the owning project.

export async function getProjectItems(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  const project = await getProjectById(projectId, userId);
  if (!project) return [];
  return db.select().from(projectItems)
    .where(eq(projectItems.projectId, projectId))
    .orderBy(asc(projectItems.sortOrder), asc(projectItems.createdAt));
}

/** Resolve the owning userId for a project item, or undefined if it doesn't exist. */
async function getProjectItemOwnerId(id: number): Promise<number | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db.select({ userId: projects.userId })
    .from(projectItems)
    .innerJoin(projects, eq(projectItems.projectId, projects.id))
    .where(eq(projectItems.id, id))
    .limit(1);
  return row?.userId;
}

export async function createProjectItem(data: InsertProjectItem) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(projectItems).values(data);
}

export async function updateProjectItem(id: number, userId: number, data: Partial<InsertProjectItem>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const ownerId = await getProjectItemOwnerId(id);
  if (ownerId !== userId) return;
  await db.update(projectItems).set({ ...data, updatedAt: new Date() })
    .where(eq(projectItems.id, id));
}

export async function resetProjectItemToMaster(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const ownerId = await getProjectItemOwnerId(id);
  if (ownerId !== userId) return;
  await db.execute(sql`
    UPDATE project_items
    SET overrideMaterialCost = masterMaterialCost,
        overrideLaborHours = masterLaborHours,
        updatedAt = NOW()
    WHERE id = ${id}
  `);
}

export async function deleteProjectItem(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const ownerId = await getProjectItemOwnerId(id);
  if (ownerId !== userId) return;
  await db.delete(projectItems).where(eq(projectItems.id, id));
}

// ─── Bid Summary ──────────────────────────────────────────────────────────────
// bidSummary has no userId column either — scoped via the owning project.

export async function getBidSummary(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const project = await getProjectById(projectId, userId);
  if (!project) return undefined;
  const result = await db.select().from(bidSummary)
    .where(eq(bidSummary.projectId, projectId))
    .limit(1);
  return result[0];
}

export async function upsertBidSummary(data: InsertBidSummary, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const project = await getProjectById(data.projectId, userId);
  if (!project) return;
  await db.insert(bidSummary).values(data).onDuplicateKeyUpdate({
    set: {
      percentageLaborFactor: data.percentageLaborFactor,
      lumpSumHours: data.lumpSumHours,
      markupPct: data.markupPct,
      defaultLaborRateId: data.defaultLaborRateId,
      updatedAt: new Date(),
    },
  });
}

// ─── Feature Flags ────────────────────────────────────────────────────────────

/** Return all feature flags (admin use). */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(featureFlags).orderBy(featureFlags.flagKey);
}

/** Return a single flag by key. */
export async function getFeatureFlag(flagKey: string): Promise<FeatureFlag | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(featureFlags).where(eq(featureFlags.flagKey, flagKey)).limit(1);
  return result[0];
}

/** Upsert a feature flag (insert or update). */
export async function upsertFeatureFlag(data: InsertFeatureFlag): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(featureFlags).values(data).onDuplicateKeyUpdate({
    set: {
      label: data.label,
      description: data.description,
      enabledForContractors: data.enabledForContractors,
      updatedAt: new Date(),
    },
  });
}

/** Seed default flags if they don't exist yet. Called at server startup. */
export async function seedDefaultFeatureFlags(): Promise<void> {
  const defaults: InsertFeatureFlag[] = [
    {
      flagKey: "enable_labor_units",
      label: "Enable Labor Units for Contractors",
      description:
        "When ON, contractors can view, input, and calculate totals using Labor Units (Hours) fields on assemblies and takeoffs. When OFF, all labor-related UI and data is completely hidden from contractors.",
      enabledForContractors: false,
    },
  ];

  for (const flag of defaults) {
    const existing = await getFeatureFlag(flag.flagKey);
    if (!existing) {
      await upsertFeatureFlag(flag);
    }
  }
}
