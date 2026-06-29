import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  index,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  /** Bcrypt hash of the user's password — null for OAuth-only accounts */
  passwordHash: text("passwordHash"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Projects ─────────────────────────────────────────────────────────────────
export const projects = mysqlTable(
  "projects",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    category: mysqlEnum("category", ["residential", "commercial", "industrial", "infrastructure"]).default("commercial").notNull(),
    description: text("description"),
    metadata: json("metadata"),
    isArchived: boolean("isArchived").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("projects_userId_idx").on(t.userId)]
);

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ─── Count Sessions ────────────────────────────────────────────────────────────
export const countSessions = mysqlTable(
  "count_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    color: varchar("color", { length: 32 }),
    symbol: varchar("symbol", { length: 64 }),
    pins: json("pins").notNull().$type<Array<{ x: number; y: number; pageIndex?: number }>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("count_sessions_projectId_idx").on(t.projectId),
    index("count_sessions_userId_idx").on(t.userId),
  ]
);

export type CountSession = typeof countSessions.$inferSelect;
export type InsertCountSession = typeof countSessions.$inferInsert;

// ─── Material Rows ─────────────────────────────────────────────────────────────
export const materialRows = mysqlTable(
  "material_rows",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    description: varchar("description", { length: 512 }).notNull(),
    qty: float("qty").notNull().default(1),
    unit: varchar("unit", { length: 32 }).default("EA"),
    unitMaterialCost: float("unitMaterialCost").default(0),
    laborHours: float("laborHours").default(0),
    notes: text("notes"),
    sortOrder: int("sortOrder").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("material_rows_projectId_idx").on(t.projectId),
    index("material_rows_userId_idx").on(t.userId),
  ]
);

export type MaterialRow = typeof materialRows.$inferSelect;
export type InsertMaterialRow = typeof materialRows.$inferInsert;

// ─── User Materials Database ───────────────────────────────────────────────────
export const userMaterialsDb = mysqlTable(
  "user_materials_db",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    itemCode: varchar("itemCode", { length: 128 }),
    description: varchar("description", { length: 512 }).notNull(),
    unit: varchar("unit", { length: 32 }).default("EA"),
    unitMaterialCost: float("unitMaterialCost").default(0),
    baseLaborHours: float("baseLaborHours").default(0),
    phase: varchar("phase", { length: 128 }),
    source: varchar("source", { length: 64 }).default("custom"),
    externalSku: varchar("externalSku", { length: 128 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("user_materials_db_userId_idx").on(t.userId)]
);

export type UserMaterialsDb = typeof userMaterialsDb.$inferSelect;
export type InsertUserMaterialsDb = typeof userMaterialsDb.$inferInsert;

// ─── User Assemblies ───────────────────────────────────────────────────────────
export const userAssemblies = mysqlTable(
  "user_assemblies",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    unit: varchar("unit", { length: 32 }).default("EA"),
    phase: varchar("phase", { length: 128 }),
    category: varchar("category", { length: 64 }).default("all"),
    components: json("components").notNull().$type<Array<{
      description: string;
      unit: string;
      qty_per_unit: number;
      mock_unit_cost: number;
      base_labor_hrs: number;
    }>>(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("user_assemblies_userId_idx").on(t.userId)]
);

export type UserAssembly = typeof userAssemblies.$inferSelect;
export type InsertUserAssembly = typeof userAssemblies.$inferInsert;

// ─── User Labor Standards ──────────────────────────────────────────────────────
export const userLaborStandards = mysqlTable(
  "user_labor_standards",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    profileName: varchar("profileName", { length: 255 }).notNull(),
    description: text("description"),
    laborMap: json("laborMap").notNull().$type<Record<string, number>>(),
    isDefault: boolean("isDefault").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("user_labor_standards_userId_idx").on(t.userId)]
);

export type UserLaborStandard = typeof userLaborStandards.$inferSelect;
export type InsertUserLaborStandard = typeof userLaborStandards.$inferInsert;

// ─── User API Connectors ───────────────────────────────────────────────────────
export const userApiConnectors = mysqlTable(
  "user_api_connectors",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    connectorType: mysqlEnum("connectorType", ["platt", "rexel", "wesco", "generic_rest"]).default("generic_rest").notNull(),
    baseUrl: varchar("baseUrl", { length: 512 }),
    apiKey: text("apiKey"),
    config: json("config"),
    isActive: boolean("isActive").default(true).notNull(),
    lastTestedAt: timestamp("lastTestedAt"),
    lastTestStatus: mysqlEnum("lastTestStatus", ["ok", "error", "untested"]).default("untested"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("user_api_connectors_userId_idx").on(t.userId)]
);

export type UserApiConnector = typeof userApiConnectors.$inferSelect;
export type InsertUserApiConnector = typeof userApiConnectors.$inferInsert;

// ─── Estimate Sessions ─────────────────────────────────────────────────────────
export const estimateSessions = mysqlTable(
  "estimate_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").references(() => projects.id, { onDelete: "set null" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }),
    category: varchar("category", { length: 64 }).notNull(),
    crewFactor: float("crewFactor").notNull().default(1.0),
    laborRate: float("laborRate").notNull().default(85),
    totalMaterial: float("totalMaterial").default(0),
    totalLaborHours: float("totalLaborHours").default(0),
    totalLaborCost: float("totalLaborCost").default(0),
    grandTotal: float("grandTotal").default(0),
    rows: json("rows"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("estimate_sessions_userId_idx").on(t.userId),
    index("estimate_sessions_projectId_idx").on(t.projectId),
  ]
);

export type EstimateSession = typeof estimateSessions.$inferSelect;
export type InsertEstimateSession = typeof estimateSessions.$inferInsert;

// ─── Plan Images ───────────────────────────────────────────────────────────────
export const planImages = mysqlTable(
  "plan_images",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    filename: varchar("filename", { length: 512 }).notNull(),
    storageKey: varchar("storageKey", { length: 512 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 1024 }).notNull(),
    mimeType: varchar("mimeType", { length: 128 }),
    fileSizeBytes: int("fileSizeBytes"),
    pageCount: int("pageCount"),
    sortOrder: int("sortOrder").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [
    index("plan_images_projectId_idx").on(t.projectId),
    index("plan_images_userId_idx").on(t.userId),
  ]
);

export type PlanImage = typeof planImages.$inferSelect;
export type InsertPlanImage = typeof planImages.$inferInsert;
