import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  InsertProject,
  InsertCountSession,
  InsertMaterialRow,
  InsertUserMaterialsDb,
  InsertUserAssembly,
  InsertUserLaborStandard,
  InsertUserApiConnector,
  InsertEstimateSession,
  InsertPlanImage,
  countSessions,
  estimateSessions,
  materialRows,
  planImages,
  projects,
  userApiConnectors,
  userAssemblies,
  userLaborStandards,
  userMaterialsDb,
  users,
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

// ─── Count Sessions ────────────────────────────────────────────────────────────

export async function getCountSessionsByProject(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(countSessions)
    .where(and(eq(countSessions.projectId, projectId), eq(countSessions.userId, userId)))
    .orderBy(countSessions.createdAt);
}

export async function upsertCountSession(data: InsertCountSession & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (data.id) {
    await db.update(countSessions).set({ ...data, updatedAt: new Date() })
      .where(and(eq(countSessions.id, data.id), eq(countSessions.userId, data.userId)));
    return data.id;
  }
  const result = await db.insert(countSessions).values(data);
  return (result as unknown as { insertId: number }).insertId;
}

export async function deleteCountSession(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(countSessions).where(and(eq(countSessions.id, id), eq(countSessions.userId, userId)));
}

// ─── Material Rows ─────────────────────────────────────────────────────────────

export async function getMaterialRowsByProject(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(materialRows)
    .where(and(eq(materialRows.projectId, projectId), eq(materialRows.userId, userId)))
    .orderBy(materialRows.sortOrder, materialRows.createdAt);
}

export async function upsertMaterialRow(data: InsertMaterialRow & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (data.id) {
    await db.update(materialRows).set({ ...data, updatedAt: new Date() })
      .where(and(eq(materialRows.id, data.id), eq(materialRows.userId, data.userId)));
    return data.id;
  }
  const result = await db.insert(materialRows).values(data);
  return (result as unknown as { insertId: number }).insertId;
}

export async function deleteMaterialRow(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(materialRows).where(and(eq(materialRows.id, id), eq(materialRows.userId, userId)));
}

// ─── User Materials Database ───────────────────────────────────────────────────

export async function getUserMaterials(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userMaterialsDb)
    .where(and(eq(userMaterialsDb.userId, userId), eq(userMaterialsDb.isActive, true)))
    .orderBy(userMaterialsDb.description);
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

// ─── User Assemblies ───────────────────────────────────────────────────────────

export async function getUserAssemblies(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userAssemblies)
    .where(and(eq(userAssemblies.userId, userId), eq(userAssemblies.isActive, true)))
    .orderBy(userAssemblies.name);
}

export async function upsertUserAssembly(data: InsertUserAssembly & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (data.id) {
    await db.update(userAssemblies).set({ ...data, updatedAt: new Date() })
      .where(and(eq(userAssemblies.id, data.id), eq(userAssemblies.userId, data.userId)));
    return data.id;
  }
  const result = await db.insert(userAssemblies).values(data);
  return (result as unknown as { insertId: number }).insertId;
}

export async function deleteUserAssembly(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(userAssemblies).where(and(eq(userAssemblies.id, id), eq(userAssemblies.userId, userId)));
}

// ─── User Labor Standards ──────────────────────────────────────────────────────

export async function getUserLaborStandards(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userLaborStandards)
    .where(eq(userLaborStandards.userId, userId))
    .orderBy(desc(userLaborStandards.isDefault), userLaborStandards.profileName);
}

export async function upsertUserLaborStandard(data: InsertUserLaborStandard & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (data.id) {
    await db.update(userLaborStandards).set({ ...data, updatedAt: new Date() })
      .where(and(eq(userLaborStandards.id, data.id), eq(userLaborStandards.userId, data.userId)));
    return data.id;
  }
  const result = await db.insert(userLaborStandards).values(data);
  return (result as unknown as { insertId: number }).insertId;
}

export async function deleteUserLaborStandard(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(userLaborStandards).where(and(eq(userLaborStandards.id, id), eq(userLaborStandards.userId, userId)));
}

// ─── User API Connectors ───────────────────────────────────────────────────────

export async function getUserApiConnectors(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // Never return apiKey to the caller — strip it before returning
  const rows = await db.select().from(userApiConnectors)
    .where(eq(userApiConnectors.userId, userId))
    .orderBy(userApiConnectors.name);
  return rows.map(({ apiKey: _apiKey, ...rest }) => rest);
}

export async function getUserApiConnectorWithKey(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userApiConnectors)
    .where(and(eq(userApiConnectors.id, id), eq(userApiConnectors.userId, userId)))
    .limit(1);
  return result[0];
}

export async function upsertUserApiConnector(data: InsertUserApiConnector & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (data.id) {
    await db.update(userApiConnectors).set({ ...data, updatedAt: new Date() })
      .where(and(eq(userApiConnectors.id, data.id), eq(userApiConnectors.userId, data.userId)));
    return data.id;
  }
  const result = await db.insert(userApiConnectors).values(data);
  return (result as unknown as { insertId: number }).insertId;
}

export async function deleteUserApiConnector(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(userApiConnectors).where(and(eq(userApiConnectors.id, id), eq(userApiConnectors.userId, userId)));
}

// ─── Estimate Sessions ─────────────────────────────────────────────────────────

export async function getEstimateSessionsByUser(userId: number, projectId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = projectId
    ? and(eq(estimateSessions.userId, userId), eq(estimateSessions.projectId, projectId))
    : eq(estimateSessions.userId, userId);
  return db.select().from(estimateSessions)
    .where(conditions)
    .orderBy(desc(estimateSessions.createdAt));
}

export async function saveEstimateSession(data: InsertEstimateSession) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(estimateSessions).values(data);
  return (result as unknown as { insertId: number }).insertId;
}

export async function deleteEstimateSession(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(estimateSessions).where(and(eq(estimateSessions.id, id), eq(estimateSessions.userId, userId)));
}

// ─── Plan Images ───────────────────────────────────────────────────────────────

export async function getPlanImagesByProject(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(planImages)
    .where(and(eq(planImages.projectId, projectId), eq(planImages.userId, userId)))
    .orderBy(planImages.sortOrder, planImages.createdAt);
}

export async function insertPlanImage(data: InsertPlanImage) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(planImages).values(data);
  return (result as unknown as { insertId: number }).insertId;
}

export async function deletePlanImage(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(planImages).where(and(eq(planImages.id, id), eq(planImages.userId, userId)));
}
