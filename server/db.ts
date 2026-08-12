import { and, desc, eq, asc, isNull, isNotNull, lte, or, like, sql } from "drizzle-orm";
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
  InsertMaterial,
  Material,
  materials,
  InsertLaborRate,
  LaborRate,
  laborRates,
  InsertModifier,
  Modifier,
  ModifierStatus,
  modifiers,
  InsertAssembly,
  Assembly,
  assemblies,
  assemblyMaterials,
  assemblyModifiers,
  InsertPricingDefaults,
  PricingDefaults,
  pricingDefaults,
  InsertBid,
  Bid,
  bids,
  InsertBidLineItem,
  BidLineItem,
  bidLineItems,
  InsertBidPdf,
  BidPdf,
  bidPdfs,
  InsertKit,
  Kit,
  kits,
  kitAssemblies,
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
import { BASELINE_MATERIALS } from "./seed/baselineMaterials";
import { BASELINE_LABOR_RATES } from "./seed/baselineLaborRates";
import { BASELINE_MODIFIERS } from "./seed/baselineModifiers";
import { BASELINE_ASSEMBLIES } from "./seed/baselineAssemblies";
import { BASELINE_KITS } from "./seed/baselineKits";
import { hourlyCostFor } from "../shared/laborRateLookup";

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

// ─── Materials (Foundation library) ───────────────────────────────────────────
//
// NOTE: distinct from `user_materials_db` / getUserMaterials() further up. That
// one is the supply-house price list behind the /matdb screen. This is the
// Foundation catalog that assemblies are built from. The two are expected to
// converge eventually — see the field-copy note on materialContentFields().
//
// Row ownership:
//   userId IS NULL  → baseline library row, shipped with the app, read-only.
//   userId = <id>   → that user's own row, either fully custom or a fork.
//
// A fork stores `baselineId`, which does two jobs: it hides the baseline row it
// replaces from the merged list, and it makes "revert to original" possible.

/**
 * Ownership/bookkeeping columns. Everything NOT listed here is treated as user
 * content and is copied wholesale by fork and revert.
 *
 * This is deliberately a denylist rather than an allowlist: when columns get
 * added to `materials` later (item code, list price, price-updated date — the
 * /matdb fields), they start copying correctly with no change here. An
 * allowlist would silently drop them instead.
 */
const LIBRARY_OWNERSHIP_FIELDS = [
  "id",
  "userId",
  "baselineId",
  "baselineVersion",
  "version",
  "createdAt",
  "updatedAt",
  // Lifecycle, not content. A fresh fork starts `active` from the column
  // default, and reverting a modifier to its starter values must not silently
  // pull an archived row back into the working list.
  "status",
  "archivedAt",
] as const;

/**
 * Run a seeder under a MySQL advisory lock, so two processes cannot both decide
 * a starter row is missing and both insert it.
 *
 * This is not hypothetical: seeding is check-then-insert with no uniqueness
 * constraint to fall back on, and the dev server (which reseeds on every tsx
 * watch restart) plus vitest's parallel test files hit the same database at
 * once. That race duplicated every labor rate and modifier on first run.
 *
 * A named lock is the right tool because the tables cannot express this as a
 * UNIQUE index: baseline rows are keyed by `userId IS NULL`, and MySQL lets any
 * number of NULLs coexist in a unique index.
 */
async function withSeedLock(name: string, run: () => Promise<void>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // 10s is generous for a handful of inserts; on timeout we skip rather than
  // seed unguarded, and the next startup tries again.
  const [rows] = await db.execute(sql`SELECT GET_LOCK(${name}, 10) AS acquired`);
  const acquired = (rows as unknown as Array<{ acquired: number | null }>)[0]?.acquired;
  if (acquired !== 1) {
    console.warn(`[Seed] Could not acquire lock "${name}" — skipping this pass.`);
    return;
  }

  try {
    await run();
  } finally {
    await db.execute(sql`SELECT RELEASE_LOCK(${name})`);
  }
}

/**
 * Drop duplicate baseline rows left by a pre-lock race, keeping the lowest id.
 *
 * Self-healing rather than a migration: the duplicates are data damage, not a
 * schema change, and any database that ran the old seeder concurrently has them.
 * Runs inside the seed lock, before inserting, so it never fights a live writer.
 */
async function dedupeBaselineRows(
  table: "materials" | "labor_rates" | "modifiers" | "assemblies" | "kits"
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Table name is a compile-time constant from the union above, never user input.
  await db.execute(sql.raw(
    `DELETE dupe FROM \`${table}\` dupe
     JOIN \`${table}\` keeper
       ON dupe.name = keeper.name AND dupe.id > keeper.id
     WHERE dupe.userId IS NULL AND keeper.userId IS NULL`
  ));
}

/**
 * Strip ownership columns, leaving only the content worth copying.
 *
 * Shared by materials, labor rates and modifiers — all three have the identical
 * baseline/fork shape, so the copy rule is identical too.
 */
function contentFields<TRow extends object, TInsert>(row: TRow): Partial<TInsert> {
  const copy: Record<string, unknown> = { ...(row as Record<string, unknown>) };
  for (const field of LIBRARY_OWNERSHIP_FIELDS) delete copy[field];
  return copy as Partial<TInsert>;
}

/** Back-compat alias — materials read better with the specific name. */
const materialContentFields = (row: Material) => contentFields<Material, InsertMaterial>(row);

/**
 * Collapse baseline + user rows into the one list a user should see.
 *
 * A user's fork replaces the baseline it came from, so the baseline is dropped.
 * Exported and kept pure so it can be tested without a database, and reused for
 * labor rates / modifiers / assemblies, which have the same ownership shape.
 */
export function mergeLibraryRows<T extends { id: number; userId: number | null; baselineId: number | null }>(
  rows: T[],
  userId: number
): T[] {
  const supersededBaselineIds = new Set<number>();
  for (const row of rows) {
    if (row.userId === userId && row.baselineId != null) supersededBaselineIds.add(row.baselineId);
  }
  return rows.filter(row => !(row.userId === null && supersededBaselineIds.has(row.id)));
}

/** Baseline rows plus the user's own, forked baselines collapsed away. */
export async function getLibraryMaterials(userId: number): Promise<Material[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(materials)
    .where(and(
      or(isNull(materials.userId), eq(materials.userId, userId)),
      eq(materials.isActive, true)
    ))
    .orderBy(asc(materials.name));
  return mergeLibraryRows(rows, userId);
}

/** A single material the user is allowed to see — their own, or a baseline. */
export async function getMaterialById(id: number, userId: number): Promise<Material | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(materials)
    .where(and(
      eq(materials.id, id),
      or(isNull(materials.userId), eq(materials.userId, userId))
    ))
    .limit(1);
  return result[0];
}

/** Create a material owned by the user. Returns the new row id. */
export async function createMaterial(data: InsertMaterial): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(materials).values(data);
  return result.insertId;
}

/**
 * Update one of the user's own materials.
 *
 * Baseline rows have userId IS NULL and so can never match here — that is what
 * keeps them read-only. Ownership columns in `data` are ignored rather than
 * trusted, so a caller cannot reassign a row to another user.
 */
export async function updateMaterial(id: number, userId: number, data: Partial<InsertMaterial>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const safe: Record<string, unknown> = { ...data };
  for (const field of LIBRARY_OWNERSHIP_FIELDS) delete safe[field];
  await db.update(materials).set({ ...safe, updatedAt: new Date() })
    .where(and(eq(materials.id, id), eq(materials.userId, userId)));
}

/** Soft-delete one of the user's own materials — assemblies may still point at it. */
export async function deactivateMaterial(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(materials).set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(materials.id, id), eq(materials.userId, userId)));
}

/**
 * Give the user their own editable copy of a baseline material.
 * Idempotent — forking twice returns the existing copy instead of duplicating.
 */
export async function forkMaterial(baselineId: number, userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const [existing] = await db.select().from(materials)
    .where(and(eq(materials.userId, userId), eq(materials.baselineId, baselineId)))
    .limit(1);
  if (existing) return existing.id;

  const [baseline] = await db.select().from(materials)
    .where(and(eq(materials.id, baselineId), isNull(materials.userId)))
    .limit(1);
  if (!baseline) throw new Error("Baseline material not found");

  // Cast: materialContentFields returns Partial, but `name` is always present
  // on a real row, so the result satisfies InsertMaterial.
  const [result] = await db.insert(materials).values({
    ...materialContentFields(baseline),
    userId,
    baselineId: baseline.id,
    baselineVersion: baseline.version,
  } as InsertMaterial);
  return result.insertId;
}

/**
 * Discard the user's edits and restore the current baseline content.
 *
 * The row id is kept rather than deleting and re-reading the baseline, so
 * anything already referencing this material keeps working.
 */
export async function revertMaterialToBaseline(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const [fork] = await db.select().from(materials)
    .where(and(eq(materials.id, id), eq(materials.userId, userId)))
    .limit(1);
  if (!fork) throw new Error("Material not found");
  if (fork.baselineId == null) throw new Error("Material is fully custom — there is no original to revert to");

  const [baseline] = await db.select().from(materials)
    .where(and(eq(materials.id, fork.baselineId), isNull(materials.userId)))
    .limit(1);
  if (!baseline) throw new Error("Baseline material no longer exists");

  await db.update(materials)
    .set({
      ...materialContentFields(baseline),
      // Re-stamp the version so any future "update available" check starts clean.
      baselineVersion: baseline.version,
      updatedAt: new Date(),
    })
    .where(and(eq(materials.id, id), eq(materials.userId, userId)));
}

/**
 * Seed the shipped baseline materials. Called at server startup; a no-op once
 * they exist. Matched by name, so renaming a baseline row here would insert a
 * new one rather than rename the old — intentional, since users may have forked it.
 */
export async function seedBaselineMaterials(): Promise<void> {
  await withSeedLock("helixbid:seed:materials", seedBaselineMaterialsUnlocked);
}

async function seedBaselineMaterialsUnlocked(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await dedupeBaselineRows("materials");

  const existing = await db.select({ name: materials.name }).from(materials)
    .where(isNull(materials.userId));
  const alreadySeeded = new Set(existing.map(row => row.name));

  const missing = BASELINE_MATERIALS
    .filter(m => !alreadySeeded.has(m.name))
    .map(m => ({
      name: m.name,
      unitOfSale: m.unitOfSale,
      costPerUnit: m.costPerUnit,
      category: m.category,
      searchAliases: m.searchAliases,
      defaultQty: m.defaultQty != null ? m.defaultQty.toFixed(4) : null,
      userId: null,
    }));

  if (missing.length > 0) await db.insert(materials).values(missing);

  await backfillMaterialMetadata();
}

/**
 * Bring catalog metadata — `category` and `searchAliases` — up to date on rows
 * that predate those columns.
 *
 * Two passes, both idempotent and both cheap enough to run on every startup:
 *
 *  1. Baseline rows are re-stamped from BASELINE_MATERIALS unconditionally.
 *    They are app-owned and read-only to users, so the seed file stays the
 *    authority — re-shelving a material or adding slang to it there fixes live
 *    databases for free, with no migration.
 *  2. User forks that are still NULL inherit from the baseline they came from.
 *    Only NULL is touched: a value the user chose is theirs to keep, and a fork
 *    is allowed to sit on a different shelf than its original.
 *
 * Fully custom rows (no baselineId) are left alone — there is nothing to
 * inherit from, and guessing would be worse than leaving them blank.
 */
async function backfillMaterialMetadata(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const baselines = await db.select({
    id: materials.id,
    name: materials.name,
    category: materials.category,
    searchAliases: materials.searchAliases,
    defaultQty: materials.defaultQty,
  }).from(materials).where(isNull(materials.userId));

  const seedByName = new Map(BASELINE_MATERIALS.map(m => [m.name, m]));
  const seedById = new Map<number, (typeof BASELINE_MATERIALS)[number]>();

  for (const row of baselines) {
    const intended = seedByName.get(row.name);
    if (!intended) continue; // a baseline row no longer in the seed file
    seedById.set(row.id, intended);

    const patch: Partial<InsertMaterial> = {};
    if (row.category !== intended.category) patch.category = intended.category;
    if (row.searchAliases !== intended.searchAliases) patch.searchAliases = intended.searchAliases;

    const wantQty = intended.defaultQty != null ? intended.defaultQty.toFixed(4) : null;
    if (row.defaultQty !== wantQty) patch.defaultQty = wantQty;

    if (Object.keys(patch).length > 0) {
      await db.update(materials).set(patch).where(eq(materials.id, row.id));
    }
  }

  const staleForks = await db.select({
    id: materials.id,
    baselineId: materials.baselineId,
    category: materials.category,
    searchAliases: materials.searchAliases,
    defaultQty: materials.defaultQty,
  })
    .from(materials)
    .where(and(
      isNotNull(materials.userId),
      isNotNull(materials.baselineId),
      or(
        isNull(materials.category),
        isNull(materials.searchAliases),
        isNull(materials.defaultQty)
      )
    ));

  for (const fork of staleForks) {
    const source = fork.baselineId != null ? seedById.get(fork.baselineId) : undefined;
    if (!source) continue;

    const patch: Partial<InsertMaterial> = {};
    if (fork.category === null) patch.category = source.category;
    if (fork.searchAliases === null) patch.searchAliases = source.searchAliases;
    // A fork made before this column existed shows NULL, which the builder
    // reads as "1" — so a forked box of wire nuts would lose its suggestion.
    // Only NULL is filled; a material with no default legitimately stays NULL.
    if (fork.defaultQty === null && source.defaultQty != null) {
      patch.defaultQty = source.defaultQty.toFixed(4);
    }
    if (Object.keys(patch).length > 0) {
      await db.update(materials).set(patch).where(eq(materials.id, fork.id));
    }
  }
}

// ─── Labor Rates (Foundation library) ─────────────────────────────────────────
//
// Same ownership model as Materials: userId NULL is a shipped starter row, a
// user editing one gets a fork, revert restores the starter content.
//
// A salaried role stores annualSalary and annualHours and NEVER a computed
// rate — see effectiveHourlyRate in shared/pricing.ts for why.

/** Starter rows plus the user's own, forked starters collapsed away. */
export async function getLibraryLaborRates(userId: number): Promise<LaborRate[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(laborRates)
    .where(and(
      or(isNull(laborRates.userId), eq(laborRates.userId, userId)),
      eq(laborRates.isActive, true)
    ))
    .orderBy(asc(laborRates.name));
  return mergeLibraryRows(rows, userId);
}

/** A single labor rate the user may see — their own, or a starter. */
export async function getLaborRateById(id: number, userId: number): Promise<LaborRate | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(laborRates)
    .where(and(
      eq(laborRates.id, id),
      or(isNull(laborRates.userId), eq(laborRates.userId, userId))
    ))
    .limit(1);
  return result[0];
}

export async function createLaborRate(data: InsertLaborRate): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(laborRates).values(data);
  return result.insertId;
}

/** Update one of the user's own rates. Starter rows have userId NULL and never match. */
export async function updateLaborRate(id: number, userId: number, data: Partial<InsertLaborRate>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const safe: Record<string, unknown> = { ...data };
  for (const field of LIBRARY_OWNERSHIP_FIELDS) delete safe[field];
  await db.update(laborRates).set({ ...safe, updatedAt: new Date() })
    .where(and(eq(laborRates.id, id), eq(laborRates.userId, userId)));
}

/** Soft-delete — assemblies may already price against this role. */
export async function deactivateLaborRate(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(laborRates).set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(laborRates.id, id), eq(laborRates.userId, userId)));
}

/** Give the user their own editable copy of a starter rate. Idempotent. */
export async function forkLaborRate(baselineId: number, userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const [existing] = await db.select().from(laborRates)
    .where(and(eq(laborRates.userId, userId), eq(laborRates.baselineId, baselineId)))
    .limit(1);
  if (existing) return existing.id;

  const [baseline] = await db.select().from(laborRates)
    .where(and(eq(laborRates.id, baselineId), isNull(laborRates.userId)))
    .limit(1);
  if (!baseline) throw new Error("Baseline labor rate not found");

  const [result] = await db.insert(laborRates).values({
    ...contentFields<LaborRate, InsertLaborRate>(baseline),
    userId,
    baselineId: baseline.id,
    baselineVersion: baseline.version,
  } as InsertLaborRate);
  return result.insertId;
}

/** Discard the user's edits, restoring the starter content. Keeps the row id. */
export async function revertLaborRateToBaseline(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const [fork] = await db.select().from(laborRates)
    .where(and(eq(laborRates.id, id), eq(laborRates.userId, userId)))
    .limit(1);
  if (!fork) throw new Error("Labor rate not found");
  if (fork.baselineId == null) {
    throw new Error("Labor rate was created from scratch — there is no original to revert to");
  }

  const [baseline] = await db.select().from(laborRates)
    .where(and(eq(laborRates.id, fork.baselineId), isNull(laborRates.userId)))
    .limit(1);
  if (!baseline) throw new Error("Baseline labor rate no longer exists");

  await db.update(laborRates)
    .set({
      ...contentFields<LaborRate, InsertLaborRate>(baseline),
      baselineVersion: baseline.version,
      updatedAt: new Date(),
    })
    .where(and(eq(laborRates.id, id), eq(laborRates.userId, userId)));
}

/** Seed the shipped starter roles. Idempotent, matched by name. */
export async function seedBaselineLaborRates(): Promise<void> {
  await withSeedLock("helixbid:seed:labor_rates", async () => {
    const db = await getDb();
    if (!db) return;

    await dedupeBaselineRows("labor_rates");

    const existing = await db.select({ name: laborRates.name }).from(laborRates)
      .where(isNull(laborRates.userId));
    const alreadySeeded = new Set(existing.map(row => row.name));

    const missing = BASELINE_LABOR_RATES
      .filter(r => !alreadySeeded.has(r.name))
      .map(r => ({ ...r, userId: null }));

    if (missing.length > 0) await db.insert(laborRates).values(missing);
  });
}

// ─── Modifiers (Foundation library) ───────────────────────────────────────────
//
// Ownership works exactly as it does for materials and labor rates. What is
// different is the lifecycle: modifiers are never hard-deleted out of the
// working list, they are archived and can be restored. See MODIFIER_STATUSES.
//
// `isActive` on this table is vestigial — `status` is authoritative. It is left
// at its default so the column shape still matches the other library tables.

/**
 * Modifiers in one lifecycle state.
 *
 * Merge runs BEFORE the status filter, and that order matters: a user's fork
 * hides the starter row it came from regardless of what state the fork is in,
 * which is exactly how archiving a starter modifier makes it disappear from the
 * active list without touching the shared row.
 */
export async function getLibraryModifiers(
  userId: number,
  status: ModifierStatus = "active"
): Promise<Modifier[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(modifiers)
    .where(or(isNull(modifiers.userId), eq(modifiers.userId, userId)))
    .orderBy(asc(modifiers.name));

  return mergeLibraryRows(rows, userId).filter(row => row.status === status);
}

export async function getModifierById(id: number, userId: number): Promise<Modifier | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(modifiers)
    .where(and(
      eq(modifiers.id, id),
      or(isNull(modifiers.userId), eq(modifiers.userId, userId))
    ))
    .limit(1);
  return result[0];
}

export async function createModifier(data: InsertModifier): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(modifiers).values(data);
  return result.insertId;
}

export async function updateModifier(id: number, userId: number, data: Partial<InsertModifier>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const safe: Record<string, unknown> = { ...data };
  for (const field of LIBRARY_OWNERSHIP_FIELDS) delete safe[field];
  await db.update(modifiers).set({ ...safe, updatedAt: new Date() })
    .where(and(eq(modifiers.id, id), eq(modifiers.userId, userId)));
}

export async function forkModifier(baselineId: number, userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const [existing] = await db.select().from(modifiers)
    .where(and(eq(modifiers.userId, userId), eq(modifiers.baselineId, baselineId)))
    .limit(1);
  if (existing) return existing.id;

  const [baseline] = await db.select().from(modifiers)
    .where(and(eq(modifiers.id, baselineId), isNull(modifiers.userId)))
    .limit(1);
  if (!baseline) throw new Error("Baseline modifier not found");

  const [result] = await db.insert(modifiers).values({
    ...contentFields<Modifier, InsertModifier>(baseline),
    userId,
    baselineId: baseline.id,
    baselineVersion: baseline.version,
  } as InsertModifier);
  return result.insertId;
}

export async function revertModifierToBaseline(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const [fork] = await db.select().from(modifiers)
    .where(and(eq(modifiers.id, id), eq(modifiers.userId, userId)))
    .limit(1);
  if (!fork) throw new Error("Modifier not found");
  if (fork.baselineId == null) {
    throw new Error("Modifier was created from scratch — there is no original to revert to");
  }

  const [baseline] = await db.select().from(modifiers)
    .where(and(eq(modifiers.id, fork.baselineId), isNull(modifiers.userId)))
    .limit(1);
  if (!baseline) throw new Error("Baseline modifier no longer exists");

  await db.update(modifiers)
    .set({
      ...contentFields<Modifier, InsertModifier>(baseline),
      baselineVersion: baseline.version,
      updatedAt: new Date(),
    })
    .where(and(eq(modifiers.id, id), eq(modifiers.userId, userId)));
}

/**
 * Move a modifier out of the working list. Returns the row that holds the
 * archived state — for a starter that is a NEW fork id, not the id passed in.
 */
export async function archiveModifier(id: number, userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const target = await getModifierById(id, userId);
  if (!target) throw new Error("Modifier not found");

  // A starter row is shared with every other user, so it cannot itself be
  // archived. Fork first; the fork then hides the starter from the list.
  const ownId = target.userId === null ? await forkModifier(id, userId) : id;

  await db.update(modifiers)
    .set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(modifiers.id, ownId), eq(modifiers.userId, userId)));
  return ownId;
}

/** Put an archived modifier back in the working list. */
export async function restoreModifier(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(modifiers)
    .set({ status: "active", archivedAt: null, updatedAt: new Date() })
    .where(and(eq(modifiers.id, id), eq(modifiers.userId, userId)));
}

/**
 * Permanent, unrecoverable removal. Only ever reached from the Archived view.
 *
 * A fully custom row is really deleted. A row forked from a starter becomes a
 * `deleted` tombstone instead: the fork is the only thing hiding the shared
 * starter row, so dropping it would resurrect the very modifier the user just
 * said to remove forever. Either way it is gone from every view, permanently.
 */
export async function deleteModifierForever(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const [row] = await db.select().from(modifiers)
    .where(and(eq(modifiers.id, id), eq(modifiers.userId, userId)))
    .limit(1);
  if (!row) throw new Error("Modifier not found");

  if (row.baselineId == null) {
    await db.delete(modifiers).where(and(eq(modifiers.id, id), eq(modifiers.userId, userId)));
    return;
  }

  await db.update(modifiers)
    .set({ status: "deleted", updatedAt: new Date() })
    .where(and(eq(modifiers.id, id), eq(modifiers.userId, userId)));
}

/** Seed the shipped starter modifiers. Idempotent, matched by name. */
export async function seedBaselineModifiers(): Promise<void> {
  await withSeedLock("helixbid:seed:modifiers", async () => {
    const db = await getDb();
    if (!db) return;

    await dedupeBaselineRows("modifiers");

    const existing = await db.select({ name: modifiers.name }).from(modifiers)
      .where(isNull(modifiers.userId));
    const alreadySeeded = new Set(existing.map(row => row.name));

    const missing = BASELINE_MODIFIERS
      .filter(m => !alreadySeeded.has(m.name))
      .map(m => ({ ...m, userId: null }));

    if (missing.length > 0) await db.insert(modifiers).values(missing);
  });
}

// ─── Assemblies (Foundation library) ──────────────────────────────────────────
//
// Same ownership model as the other library tables, with one difference that
// drives most of the code below: an assembly has CHILDREN — its material lines
// and its applicable modifiers. Fork and revert therefore have to deep-copy,
// and an edit that changes the recipe has to replace the child rows.
//
// Child rows are replaced wholesale (delete-then-insert) rather than diffed.
// A recipe is a handful of lines, the write is inside one request, and diffing
// would buy nothing but a chance to leave orphans behind.

/** One material line with the material's own data joined in. */
export type AssemblyMaterialLine = {
  id: number;
  materialId: number;
  qty: string;
  sortOrder: number;
  name: string;
  unitOfSale: Material["unitOfSale"];
  costPerUnit: string;
  category: Material["category"];
};

export type AssemblyDetail = Assembly & {
  materials: AssemblyMaterialLine[];
  /** Ids of the modifiers switched on for this assembly. */
  modifierIds: number[];
};

/** Starter assemblies plus the user's own, forked starters collapsed away. */
export async function getLibraryAssemblies(userId: number): Promise<Assembly[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(assemblies)
    .where(and(
      or(isNull(assemblies.userId), eq(assemblies.userId, userId)),
      eq(assemblies.isActive, true)
    ))
    .orderBy(asc(assemblies.name));
  return mergeLibraryRows(rows, userId);
}

export async function getAssemblyById(id: number, userId: number): Promise<Assembly | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(assemblies)
    .where(and(
      eq(assemblies.id, id),
      or(isNull(assemblies.userId), eq(assemblies.userId, userId))
    ))
    .limit(1);
  return result[0];
}

/** Material lines for an assembly, with each material's current cost joined in. */
export async function getAssemblyMaterialLines(assemblyId: number): Promise<AssemblyMaterialLine[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: assemblyMaterials.id,
      materialId: assemblyMaterials.materialId,
      qty: assemblyMaterials.qty,
      sortOrder: assemblyMaterials.sortOrder,
      name: materials.name,
      unitOfSale: materials.unitOfSale,
      costPerUnit: materials.costPerUnit,
      category: materials.category,
    })
    .from(assemblyMaterials)
    .innerJoin(materials, eq(assemblyMaterials.materialId, materials.id))
    .where(eq(assemblyMaterials.assemblyId, assemblyId))
    .orderBy(asc(assemblyMaterials.sortOrder), asc(assemblyMaterials.id));
  return rows;
}

export async function getAssemblyModifierIds(assemblyId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ modifierId: assemblyModifiers.modifierId })
    .from(assemblyModifiers)
    .where(eq(assemblyModifiers.assemblyId, assemblyId))
    .orderBy(asc(assemblyModifiers.sortOrder), asc(assemblyModifiers.id));
  return rows.map(r => r.modifierId);
}

/** An assembly and everything it is made of. */
export async function getAssemblyDetail(id: number, userId: number): Promise<AssemblyDetail | undefined> {
  const assembly = await getAssemblyById(id, userId);
  if (!assembly) return undefined;
  const [materialLines, modifierIds] = await Promise.all([
    getAssemblyMaterialLines(id),
    getAssemblyModifierIds(id),
  ]);
  return { ...assembly, materials: materialLines, modifierIds };
}

export async function createAssembly(data: InsertAssembly): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(assemblies).values(data);
  return result.insertId;
}

export async function updateAssembly(id: number, userId: number, data: Partial<InsertAssembly>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const safe: Record<string, unknown> = { ...data };
  for (const field of LIBRARY_OWNERSHIP_FIELDS) delete safe[field];
  await db.update(assemblies).set({ ...safe, updatedAt: new Date() })
    .where(and(eq(assemblies.id, id), eq(assemblies.userId, userId)));
}

/** Soft-delete — projects may already reference this assembly. */
export async function deactivateAssembly(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(assemblies).set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(assemblies.id, id), eq(assemblies.userId, userId)));
}

/** Replace an assembly's material lines wholesale. */
export async function setAssemblyMaterials(
  assemblyId: number,
  lines: Array<{ materialId: number; qty: string }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(assemblyMaterials).where(eq(assemblyMaterials.assemblyId, assemblyId));
  if (lines.length === 0) return;
  await db.insert(assemblyMaterials).values(
    lines.map((line, index) => ({
      assemblyId,
      materialId: line.materialId,
      qty: line.qty,
      sortOrder: index,
    }))
  );
}

/** Replace which modifiers apply to an assembly. */
export async function setAssemblyModifiers(assemblyId: number, modifierIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(assemblyModifiers).where(eq(assemblyModifiers.assemblyId, assemblyId));
  if (modifierIds.length === 0) return;
  await db.insert(assemblyModifiers).values(
    modifierIds.map((modifierId, index) => ({ assemblyId, modifierId, sortOrder: index }))
  );
}

/**
 * Give the user their own editable copy of a starter assembly, children and all.
 * Idempotent — forking twice returns the existing copy.
 */
export async function forkAssembly(baselineId: number, userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const [existing] = await db.select().from(assemblies)
    .where(and(eq(assemblies.userId, userId), eq(assemblies.baselineId, baselineId)))
    .limit(1);
  if (existing) return existing.id;

  const [baseline] = await db.select().from(assemblies)
    .where(and(eq(assemblies.id, baselineId), isNull(assemblies.userId)))
    .limit(1);
  if (!baseline) throw new Error("Baseline assembly not found");

  const [result] = await db.insert(assemblies).values({
    ...contentFields<Assembly, InsertAssembly>(baseline),
    userId,
    baselineId: baseline.id,
    baselineVersion: baseline.version,
  } as InsertAssembly);
  const forkId = result.insertId;

  // The recipe is the assembly — a fork without its lines is an empty shell.
  await copyAssemblyChildren(baseline.id, forkId);
  return forkId;
}

/** Copy material lines and modifier links from one assembly onto another. */
async function copyAssemblyChildren(fromAssemblyId: number, toAssemblyId: number) {
  const [lines, modifierIds] = await Promise.all([
    getAssemblyMaterialLines(fromAssemblyId),
    getAssemblyModifierIds(fromAssemblyId),
  ]);
  await setAssemblyMaterials(
    toAssemblyId,
    lines.map(line => ({ materialId: line.materialId, qty: line.qty }))
  );
  await setAssemblyModifiers(toAssemblyId, modifierIds);
}

/**
 * Discard the user's edits and restore the starter recipe — fields AND children.
 * Keeps the row id so anything already pointing at this assembly keeps working.
 */
export async function revertAssemblyToBaseline(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const [fork] = await db.select().from(assemblies)
    .where(and(eq(assemblies.id, id), eq(assemblies.userId, userId)))
    .limit(1);
  if (!fork) throw new Error("Assembly not found");
  if (fork.baselineId == null) {
    throw new Error("Assembly was created from scratch — there is no original to revert to");
  }

  const [baseline] = await db.select().from(assemblies)
    .where(and(eq(assemblies.id, fork.baselineId), isNull(assemblies.userId)))
    .limit(1);
  if (!baseline) throw new Error("Baseline assembly no longer exists");

  await db.update(assemblies)
    .set({
      ...contentFields<Assembly, InsertAssembly>(baseline),
      baselineVersion: baseline.version,
      updatedAt: new Date(),
    })
    .where(and(eq(assemblies.id, id), eq(assemblies.userId, userId)));

  // Reverting the header without the lines would leave the user's edited recipe
  // priced against the starter's hours — worse than either state alone.
  await copyAssemblyChildren(baseline.id, id);
}

/**
 * Seed the shipped starter assemblies.
 *
 * Runs AFTER materials, labor rates and modifiers, because every line is
 * resolved by name against those catalogs. An assembly whose materials are not
 * all present is skipped rather than half-built — a recipe missing lines prices
 * the job too low, which is worse than the recipe being absent.
 */
export async function seedBaselineAssemblies(): Promise<void> {
  await withSeedLock("helixbid:seed:assemblies", async () => {
    const db = await getDb();
    if (!db) return;

    await dedupeBaselineRows("assemblies");

    const existingRows = await db.select({ name: assemblies.name }).from(assemblies)
      .where(isNull(assemblies.userId));
    const alreadySeeded = new Set(existingRows.map(row => row.name));

    const pending = BASELINE_ASSEMBLIES.filter(a => !alreadySeeded.has(a.name));
    if (pending.length === 0) return;

    const baselineMaterialRows = await db.select({ id: materials.id, name: materials.name })
      .from(materials).where(isNull(materials.userId));
    const materialIdByName = new Map(baselineMaterialRows.map(row => [row.name, row.id]));

    const baselineModifierRows = await db.select({ id: modifiers.id, name: modifiers.name })
      .from(modifiers).where(isNull(modifiers.userId));
    const modifierIdByName = new Map(baselineModifierRows.map(row => [row.name, row.id]));

    for (const spec of pending) {
      const lines = spec.materials.map(line => ({
        materialId: materialIdByName.get(line.material),
        qty: line.qty.toFixed(4),
      }));
      if (lines.some(line => line.materialId === undefined)) {
        const missing = spec.materials
          .filter(line => !materialIdByName.has(line.material))
          .map(line => line.material);
        console.warn(
          `[BaselineAssemblies] Skipping "${spec.name}" — missing materials: ${missing.join(", ")}`
        );
        continue;
      }

      const [result] = await db.insert(assemblies).values({
        userId: null,
        name: spec.name,
        category: spec.category,
        projectType: spec.projectType,
        baseLaborHours: spec.baseLaborHours.toFixed(4),
      });
      const assemblyId = result.insertId;

      await setAssemblyMaterials(
        assemblyId,
        lines as Array<{ materialId: number; qty: string }>
      );

      const modifierIds = (spec.modifiers ?? [])
        .map(name => modifierIdByName.get(name))
        .filter((id): id is number => id !== undefined);
      await setAssemblyModifiers(assemblyId, modifierIds);
    }
  });
}

// ─── Pricing Defaults (company level) ─────────────────────────────────────────

/** The shipped defaults for a user who has never opened the settings. */
const FALLBACK_PRICING_DEFAULTS = {
  overheadEnabled: false,
  overheadMode: "percentage" as const,
  overheadValue: "0",
  profitMethod: "markup" as const,
  profitValue: "0",
};

/** A user's company-level pricing defaults, creating the row on first read. */
export async function getPricingDefaults(userId: number): Promise<PricingDefaults | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const [existing] = await db.select().from(pricingDefaults)
    .where(eq(pricingDefaults.userId, userId)).limit(1);
  if (existing) return existing;

  await db.insert(pricingDefaults).values({ userId, ...FALLBACK_PRICING_DEFAULTS });
  const [created] = await db.select().from(pricingDefaults)
    .where(eq(pricingDefaults.userId, userId)).limit(1);
  return created;
}

export async function updatePricingDefaults(
  userId: number,
  data: Partial<InsertPricingDefaults>
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await getPricingDefaults(userId); // ensure the row exists
  const safe: Record<string, unknown> = { ...data };
  delete safe.id;
  delete safe.userId;
  await db.update(pricingDefaults).set({ ...safe, updatedAt: new Date() })
    .where(eq(pricingDefaults.userId, userId));
}

// ─── Bids ─────────────────────────────────────────────────────────────────────

/** The live bids — everything not sitting in the archive. */
export async function getBidsByUser(userId: number): Promise<Bid[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bids)
    .where(and(eq(bids.userId, userId), isNull(bids.archivedAt)))
    .orderBy(desc(bids.updatedAt));
}

export async function getBidById(id: number, userId: number): Promise<Bid | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db.select().from(bids)
    .where(and(eq(bids.id, id), eq(bids.userId, userId))).limit(1);
  return row;
}

export async function createBid(data: InsertBid): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(bids).values(data);
  return result.insertId;
}

export async function updateBid(id: number, userId: number, data: Partial<InsertBid>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const safe: Record<string, unknown> = { ...data };
  delete safe.id;
  delete safe.userId;
  await db.update(bids).set({ ...safe, updatedAt: new Date() })
    .where(and(eq(bids.id, id), eq(bids.userId, userId)));
}

/**
 * Move a bid to the archive, starting its retention clock.
 *
 * `now` is a parameter rather than `new Date()` because this instant is what
 * the countdown and the eventual deletion are both measured from — a test that
 * cannot set it cannot check either. See shared/retention.ts.
 *
 * Re-archiving an already-archived bid does NOT restart the clock: the guard on
 * `archivedAt IS NULL` means a stray second call cannot quietly buy another 30
 * days, which would let something sit in the archive forever.
 */
export async function archiveBid(id: number, userId: number, now: Date = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(bids).set({ archivedAt: now, updatedAt: now })
    .where(and(eq(bids.id, id), eq(bids.userId, userId), isNull(bids.archivedAt)));
}

/**
 * Take a bid back out of the archive, in full.
 *
 * Clearing `archivedAt` is the entire operation: it stops the countdown, puts
 * the bid back on the dashboard, and — because the PDFs were never detached,
 * only carried along by the bid — restores its plans with it. Nothing about the
 * bid's status, pricing or line items was touched on the way in, so there is
 * nothing to put back.
 */
export async function restoreBid(id: number, userId: number, now: Date = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(bids).set({ archivedAt: null, updatedAt: now })
    .where(and(eq(bids.id, id), eq(bids.userId, userId), isNotNull(bids.archivedAt)));
}

/** The archive, soonest-to-expire first — the order the user needs to act in. */
export async function getArchivedBids(userId: number): Promise<Bid[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bids)
    .where(and(eq(bids.userId, userId), isNotNull(bids.archivedAt)))
    .orderBy(asc(bids.archivedAt));
}

/**
 * Destroy a bid and everything hanging off it. There is no undo past here.
 *
 * Line items and PDF rows go by `onDelete: "cascade"`, so this is one DELETE.
 * The S3 objects behind those PDF rows are NOT removed — see
 * server/scheduled/purgeArchivedBids.ts for why, and what it costs.
 */
export async function deleteBidForever(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(bids).where(and(eq(bids.id, id), eq(bids.userId, userId)));
}

/**
 * Every bid whose retention window has closed, across ALL users.
 *
 * Deliberately not user-scoped: the purge is a system sweep, not something a
 * user runs. The cutoff is computed once from the injected `now` and compared
 * against stored instants, so the boundary is exact rather than rounded to a
 * day — see shared/retention.ts on why the display rounds and this does not.
 */
export async function getExpiredArchivedBids(now: Date, retentionDays: number): Promise<Bid[]> {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  return db.select().from(bids)
    .where(and(isNotNull(bids.archivedAt), lte(bids.archivedAt, cutoff)))
    .orderBy(asc(bids.archivedAt));
}

// ─── Bid PDFs (plan sheets) ───────────────────────────────────────────────────

/** Sheets attached to a bid, in the order the user put them. */
export async function getBidPdfs(bidId: number, userId: number): Promise<BidPdf[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bidPdfs)
    .where(and(eq(bidPdfs.bidId, bidId), eq(bidPdfs.userId, userId)))
    .orderBy(asc(bidPdfs.sortOrder), asc(bidPdfs.id));
}

export async function getBidPdf(id: number, userId: number): Promise<BidPdf | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db.select().from(bidPdfs)
    .where(and(eq(bidPdfs.id, id), eq(bidPdfs.userId, userId))).limit(1);
  return row;
}

export async function createBidPdf(data: InsertBidPdf): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(bidPdfs).values(data);
  return result.insertId;
}

/** Next free slot, so a newly attached sheet lands at the bottom of the list. */
export async function nextBidPdfSortOrder(bidId: number, userId: number): Promise<number> {
  const rows = await getBidPdfs(bidId, userId);
  return rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
}

/**
 * Record how many pages a document turned out to have.
 *
 * Written by the viewer after the document opens, because parsing a PDF to
 * count pages needs a PDF parser and the server has none.
 */
export async function setBidPdfPageCount(id: number, userId: number, pageCount: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(bidPdfs).set({ pageCount, updatedAt: new Date() })
    .where(and(eq(bidPdfs.id, id), eq(bidPdfs.userId, userId)));
}

export async function deleteBidPdf(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(bidPdfs).where(and(eq(bidPdfs.id, id), eq(bidPdfs.userId, userId)));
}

// ─── Bid line items ───────────────────────────────────────────────────────────

export async function getBidLineItems(bidId: number): Promise<BidLineItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bidLineItems)
    .where(eq(bidLineItems.bidId, bidId))
    .orderBy(asc(bidLineItems.sortOrder), asc(bidLineItems.id));
}

export async function getBidLineItem(id: number, bidId: number): Promise<BidLineItem | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db.select().from(bidLineItems)
    .where(and(eq(bidLineItems.id, id), eq(bidLineItems.bidId, bidId))).limit(1);
  return row;
}

/** Next free sort position, so appended lines land at the bottom. */
async function nextBidSortOrder(bidId: number): Promise<number> {
  const rows = await getBidLineItems(bidId);
  return rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
}

/**
 * Take a live assembly and freeze its cost inputs onto a bid.
 *
 * This is the snapshot boundary. Everything the assembly currently resolves to
 * — its materials at today's prices, its hours, its role's rate, its modifier
 * total — is copied onto the line and never consulted again. Editing the
 * library assembly afterwards has no effect on this bid, which is the whole
 * point (ASSEMBLIES_PLAN.md § PROJECT ESTIMATES).
 */
export async function addAssemblyToBid(
  bidId: number,
  userId: number,
  assemblyId: number,
  qty: number,
  unitLabel: string | null = null,
  options: { merge?: boolean } = {}
): Promise<{ id: number; merged: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const detail = await getAssemblyDetail(assemblyId, userId);
  if (!detail) throw new Error("Assembly not found");

  /**
   * Quick-bid counts the same assembly over and over ("another six
   * receptacles"), and one row per keystroke-batch would bury the bid in
   * duplicates. With `merge` it finds the existing line for this assembly and
   * unit and adds to its quantity instead.
   *
   * The existing line KEEPS its original snapshot. That is the correct reading:
   * the estimator is counting more of a thing already priced on this bid, not
   * re-pricing it at today's rates. Taking a fresh snapshot here would make the
   * same assembly cost two different amounts within one bid depending on when
   * each was counted. Callers wanting a fresh snapshot omit `merge` — the
   * default — and get a new line, which is what the Bids screen does.
   */
  if (options.merge) {
    const existing = await db.select().from(bidLineItems)
      .where(and(
        eq(bidLineItems.bidId, bidId),
        eq(bidLineItems.assemblyId, detail.id),
        unitLabel === null ? isNull(bidLineItems.unitLabel) : eq(bidLineItems.unitLabel, unitLabel)
      ))
      .limit(1);

    if (existing[0]) {
      const merged = Number(existing[0].qty) + qty;
      await db.update(bidLineItems)
        .set({ qty: merged.toFixed(4), updatedAt: new Date() })
        .where(eq(bidLineItems.id, existing[0].id));
      return { id: existing[0].id, merged: true };
    }
  }

  const [activeModifiers, rates] = await Promise.all([
    getLibraryModifiers(userId, "active"),
    getLibraryLaborRates(userId),
  ]);

  const applied = activeModifiers.filter(m => detail.modifierIds.includes(m.id));
  const modifierPct = applied.reduce((sum, m) => sum + Number(m.laborAdjustmentPct), 0);

  // Resolved through the shared lookup so a forked role still prices — the
  // snapshot must freeze the rate the assembly ACTUALLY means, not zero.
  const laborRate = hourlyCostFor(rates, detail.laborRateId);

  const materialCost = detail.materials.reduce(
    (sum, line) => sum + Number(line.costPerUnit) * Number(line.qty),
    0
  );

  const [result] = await db.insert(bidLineItems).values({
    bidId,
    assemblyId: detail.id,
    name: detail.name,
    qty: qty.toFixed(4),
    unitLabel,
    snapshotMaterialCost: materialCost.toFixed(4),
    snapshotLaborHours: Number(detail.baseLaborHours).toFixed(4),
    snapshotModifierPct: modifierPct.toFixed(4),
    snapshotLaborRate: laborRate.toFixed(4),
    snapshotModifierNames: applied.map(m => m.name),
    sortOrder: await nextBidSortOrder(bidId),
  });
  return { id: result.insertId, merged: false };
}

export async function updateBidLineItem(
  id: number,
  bidId: number,
  data: Partial<InsertBidLineItem>
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const safe: Record<string, unknown> = { ...data };
  delete safe.id;
  delete safe.bidId;
  await db.update(bidLineItems).set({ ...safe, updatedAt: new Date() })
    .where(and(eq(bidLineItems.id, id), eq(bidLineItems.bidId, bidId)));
}

export async function deleteBidLineItem(id: number, bidId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(bidLineItems)
    .where(and(eq(bidLineItems.id, id), eq(bidLineItems.bidId, bidId)));
}

/** Distinct unit labels present on a bid, in first-appearance order. */
export async function getBidUnitLabels(bidId: number): Promise<string[]> {
  const rows = await getBidLineItems(bidId);
  const seen: string[] = [];
  for (const row of rows) {
    if (row.unitLabel && !seen.includes(row.unitLabel)) seen.push(row.unitLabel);
  }
  return seen;
}

/**
 * Copy a repeating unit N times, auto-numbering the copies.
 *
 * The source is every line carrying `sourceUnitLabel` — a hotel room type, a
 * floor-plan spec. Copies are plain rows from the moment they exist: nothing
 * links them back to the source, so editing "Room 104" later touches only that
 * room, which is what the product asks for.
 *
 * Labels that would collide with one already on the bid are skipped rather than
 * silently duplicated, and the skipped list is returned so the caller can say so.
 */
export async function duplicateBidUnit(
  bidId: number,
  sourceUnitLabel: string,
  baseName: string,
  startNumber: number,
  count: number
): Promise<{ created: string[]; skipped: string[] }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const all = await getBidLineItems(bidId);
  const source = all.filter(row => row.unitLabel === sourceUnitLabel);
  if (source.length === 0) throw new Error(`No line items found for unit "${sourceUnitLabel}"`);

  const existingLabels = new Set(all.map(row => row.unitLabel).filter(Boolean) as string[]);
  let sortOrder = await nextBidSortOrder(bidId);

  const created: string[] = [];
  const skipped: string[] = [];
  const rows: InsertBidLineItem[] = [];

  for (let index = 0; index < count; index++) {
    const label = `${baseName} ${startNumber + index}`;
    if (existingLabels.has(label)) { skipped.push(label); continue; }
    existingLabels.add(label);
    created.push(label);

    for (const line of source) {
      rows.push({
        bidId,
        assemblyId: line.assemblyId,
        name: line.name,
        qty: line.qty,
        unitLabel: label,
        // Copies inherit the SOURCE's snapshot rather than re-reading the
        // library: 200 hotel rooms generated from one template must all price
        // identically, even if a material moved between add and duplicate.
        snapshotMaterialCost: line.snapshotMaterialCost,
        snapshotLaborHours: line.snapshotLaborHours,
        snapshotModifierPct: line.snapshotModifierPct,
        snapshotLaborRate: line.snapshotLaborRate,
        snapshotModifierNames: line.snapshotModifierNames,
        snapshotAt: line.snapshotAt,
        sortOrder: sortOrder++,
      });
    }
  }

  if (rows.length > 0) await db.insert(bidLineItems).values(rows);
  return { created, skipped };
}

// ─── Recently used materials ──────────────────────────────────────────────────

/**
 * Materials this user has most recently put into one of their own assemblies.
 *
 * Powers the "start here" list the Assembly Builder shows before anything is
 * typed. Ordered by the assembly_materials row id, which is insertion order and
 * therefore recency, and de-duplicated so a material used ten times appears
 * once, at its most recent position.
 *
 * Scoped to the user's OWN assemblies — the shipped starter recipes are not
 * something this user reached for, so counting them would put the same handful
 * of materials at the top for everybody, forever.
 */
export async function getRecentMaterialsForUser(userId: number, limit = 8): Promise<Material[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({ materialId: assemblyMaterials.materialId, at: assemblyMaterials.id })
    .from(assemblyMaterials)
    .innerJoin(assemblies, eq(assemblyMaterials.assemblyId, assemblies.id))
    .where(and(eq(assemblies.userId, userId), eq(assemblies.isActive, true)))
    .orderBy(desc(assemblyMaterials.id))
    .limit(limit * 8); // over-fetch, then de-duplicate down to `limit`

  const seen: number[] = [];
  for (const row of rows) {
    if (!seen.includes(row.materialId)) seen.push(row.materialId);
    if (seen.length >= limit) break;
  }
  if (seen.length === 0) return [];

  // Re-read through the library view so forks and visibility rules apply.
  const visible = await getLibraryMaterials(userId);
  const byId = new Map(visible.map(m => [m.id, m]));
  return seen.map(id => byId.get(id)).filter((m): m is Material => Boolean(m));
}

// ─── Duplicating an assembly ──────────────────────────────────────────────────

/**
 * Copy an assembly into a brand-new, fully independent one.
 *
 * Distinct from forkAssembly, and the difference matters: a fork REPLACES its
 * starter in the user's library and remembers where it came from, so it can be
 * reverted. A duplicate is a separate assembly that stands alongside the
 * original with `baselineId` NULL — no link back, nothing to revert to, and
 * editing it can never affect what it was copied from.
 */
export async function duplicateAssembly(
  sourceId: number,
  userId: number,
  newName: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const source = await getAssemblyById(sourceId, userId);
  if (!source) throw new Error("Assembly not found");

  const [result] = await db.insert(assemblies).values({
    ...contentFields<Assembly, InsertAssembly>(source),
    name: newName,
    userId,
    // The whole point: no baseline link, so this is nobody's copy but its own.
    baselineId: null,
    baselineVersion: null,
  } as InsertAssembly);
  const newId = result.insertId;

  await copyAssemblyChildren(source.id, newId);
  return newId;
}

// ─── Kits ─────────────────────────────────────────────────────────────────────

export type KitItemLine = {
  id: number;
  assemblyId: number;
  qty: string;
  sortOrder: number;
  name: string;
  category: Assembly["category"];
  baseLaborHours: string;
  laborRateId: number | null;
};

export type KitDetail = Kit & { items: KitItemLine[] };

/** Starter kits plus the user's own, forked starters collapsed away. */
export async function getLibraryKits(userId: number): Promise<Kit[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(kits)
    .where(and(
      or(isNull(kits.userId), eq(kits.userId, userId)),
      eq(kits.isActive, true)
    ))
    .orderBy(asc(kits.name));
  return mergeLibraryRows(rows, userId);
}

export async function getKitById(id: number, userId: number): Promise<Kit | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db.select().from(kits)
    .where(and(eq(kits.id, id), or(isNull(kits.userId), eq(kits.userId, userId))))
    .limit(1);
  return row;
}

export async function getKitItems(kitId: number): Promise<KitItemLine[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: kitAssemblies.id,
      assemblyId: kitAssemblies.assemblyId,
      qty: kitAssemblies.qty,
      sortOrder: kitAssemblies.sortOrder,
      name: assemblies.name,
      category: assemblies.category,
      baseLaborHours: assemblies.baseLaborHours,
      laborRateId: assemblies.laborRateId,
    })
    .from(kitAssemblies)
    .innerJoin(assemblies, eq(kitAssemblies.assemblyId, assemblies.id))
    .where(eq(kitAssemblies.kitId, kitId))
    .orderBy(asc(kitAssemblies.sortOrder), asc(kitAssemblies.id));
}

export async function getKitDetail(id: number, userId: number): Promise<KitDetail | undefined> {
  const kit = await getKitById(id, userId);
  if (!kit) return undefined;
  return { ...kit, items: await getKitItems(id) };
}

export async function createKit(data: InsertKit): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(kits).values(data);
  return result.insertId;
}

export async function updateKit(id: number, userId: number, data: Partial<InsertKit>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const safe: Record<string, unknown> = { ...data };
  for (const field of LIBRARY_OWNERSHIP_FIELDS) delete safe[field];
  await db.update(kits).set({ ...safe, updatedAt: new Date() })
    .where(and(eq(kits.id, id), eq(kits.userId, userId)));
}

export async function deactivateKit(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(kits).set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(kits.id, id), eq(kits.userId, userId)));
}

/** Replace a kit's contents wholesale — same rule as assembly children. */
export async function setKitItems(
  kitId: number,
  items: Array<{ assemblyId: number; qty: string }>
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(kitAssemblies).where(eq(kitAssemblies.kitId, kitId));
  if (items.length === 0) return;
  await db.insert(kitAssemblies).values(
    items.map((item, index) => ({
      kitId,
      assemblyId: item.assemblyId,
      qty: item.qty,
      sortOrder: index,
    }))
  );
}

export async function forkKit(baselineId: number, userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const [existing] = await db.select().from(kits)
    .where(and(eq(kits.userId, userId), eq(kits.baselineId, baselineId)))
    .limit(1);
  if (existing) return existing.id;

  const [baseline] = await db.select().from(kits)
    .where(and(eq(kits.id, baselineId), isNull(kits.userId)))
    .limit(1);
  if (!baseline) throw new Error("Baseline kit not found");

  const [result] = await db.insert(kits).values({
    ...contentFields<Kit, InsertKit>(baseline),
    userId,
    baselineId: baseline.id,
    baselineVersion: baseline.version,
  } as InsertKit);
  const forkId = result.insertId;

  const items = await getKitItems(baseline.id);
  await setKitItems(forkId, items.map(i => ({ assemblyId: i.assemblyId, qty: i.qty })));
  return forkId;
}

export async function revertKitToBaseline(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const [fork] = await db.select().from(kits)
    .where(and(eq(kits.id, id), eq(kits.userId, userId))).limit(1);
  if (!fork) throw new Error("Kit not found");
  if (fork.baselineId == null) {
    throw new Error("Kit was created from scratch — there is no original to revert to");
  }

  const [baseline] = await db.select().from(kits)
    .where(and(eq(kits.id, fork.baselineId), isNull(kits.userId))).limit(1);
  if (!baseline) throw new Error("Baseline kit no longer exists");

  await db.update(kits)
    .set({
      ...contentFields<Kit, InsertKit>(baseline),
      baselineVersion: baseline.version,
      updatedAt: new Date(),
    })
    .where(and(eq(kits.id, id), eq(kits.userId, userId)));

  const items = await getKitItems(baseline.id);
  await setKitItems(id, items.map(i => ({ assemblyId: i.assemblyId, qty: i.qty })));
}

/** Copy a kit into a new, independent one. Same distinction as duplicateAssembly. */
export async function duplicateKit(
  sourceId: number,
  userId: number,
  newName: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const source = await getKitById(sourceId, userId);
  if (!source) throw new Error("Kit not found");

  const [result] = await db.insert(kits).values({
    ...contentFields<Kit, InsertKit>(source),
    name: newName,
    userId,
    baselineId: null,
    baselineVersion: null,
  } as InsertKit);
  const newId = result.insertId;

  const items = await getKitItems(source.id);
  await setKitItems(newId, items.map(i => ({ assemblyId: i.assemblyId, qty: i.qty })));
  return newId;
}

/**
 * Add every assembly in a kit to a bid, snapshotting each one.
 *
 * A kit does NOT become a row on the bid. It expands into ordinary line items,
 * which is what makes the per-item quantities editable afterwards — one bedroom
 * needing a fifth receptacle is just an edit to that line, with no kit-shaped
 * container in the way.
 *
 * Each line snapshots independently through the existing addAssemblyToBid, so
 * kit lines and hand-added lines are the same kind of thing and price
 * identically. `qty` multiplies through: 2 × "Bedroom package" containing
 * 4 receptacles lands 8 receptacles.
 */
export async function addKitToBid(
  bidId: number,
  userId: number,
  kitId: number,
  qty: number,
  unitLabel: string | null = null
): Promise<{ lineIds: number[]; kitName: string; skipped: string[] }> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const kit = await getKitDetail(kitId, userId);
  if (!kit) throw new Error("Kit not found");

  const lineIds: number[] = [];
  const skipped: string[] = [];

  for (const item of kit.items) {
    try {
      const { id } = await addAssemblyToBid(
        bidId, userId, item.assemblyId, Number(item.qty) * qty, unitLabel
      );
      await db.update(bidLineItems)
        .set({ sourceKitName: kit.name })
        .where(eq(bidLineItems.id, id));
      lineIds.push(id);
    } catch {
      // One unreachable assembly must not abandon the rest of the kit
      // half-added; report it instead.
      skipped.push(item.name);
    }
  }

  return { lineIds, kitName: kit.name, skipped };
}

/** Seed the shipped starter kits. Runs after assemblies, matched by name. */
export async function seedBaselineKits(): Promise<void> {
  await withSeedLock("helixbid:seed:kits", async () => {
    const db = await getDb();
    if (!db) return;

    await dedupeBaselineRows("kits");

    const existingRows = await db.select({ name: kits.name }).from(kits)
      .where(isNull(kits.userId));
    const alreadySeeded = new Set(existingRows.map(row => row.name));

    const pending = BASELINE_KITS.filter(k => !alreadySeeded.has(k.name));
    if (pending.length === 0) return;

    const baselineAssemblies = await db.select({ id: assemblies.id, name: assemblies.name })
      .from(assemblies).where(isNull(assemblies.userId));
    const idByName = new Map(baselineAssemblies.map(row => [row.name, row.id]));

    for (const spec of pending) {
      const items = spec.items.map(item => ({
        assemblyId: idByName.get(item.assembly),
        qty: item.qty.toFixed(4),
      }));
      if (items.some(item => item.assemblyId === undefined)) {
        const missing = spec.items
          .filter(item => !idByName.has(item.assembly))
          .map(item => item.assembly);
        console.warn(`[BaselineKits] Skipping "${spec.name}" — missing assemblies: ${missing.join(", ")}`);
        continue;
      }

      const [result] = await db.insert(kits).values({
        userId: null,
        name: spec.name,
        description: spec.description,
      });
      await setKitItems(result.insertId, items as Array<{ assemblyId: number; qty: string }>);
    }
  });
}
