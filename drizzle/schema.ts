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
  decimal,
  date,
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
  role: mysqlEnum("role", ["user", "admin", "contractor"]).default("user").notNull(),
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
    category: mysqlEnum("category", ["electrical"]).default("electrical").notNull(),
    description: text("description"),
    // ── v5.45 expanded fields ──
    customerName: varchar("customerName", { length: 255 }),
    address: varchar("address", { length: 512 }),
    bidDate: date("bidDate"),
    notes: text("notes"),
    status: mysqlEnum("status", ["Bidding", "Won", "In Progress", "Lost"]).default("Bidding").notNull(),
    metadata: json("metadata"),
    isArchived: boolean("isArchived").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("projects_userId_idx").on(t.userId)]
);

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ─── User Materials Database ───────────────────────────────────────────────────
export const userMaterialsDb = mysqlTable(
  "user_materials_db",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    itemCode: varchar("itemCode", { length: 128 }),
    category: varchar("category", { length: 128 }),
    description: varchar("description", { length: 512 }).notNull(),
    unit: varchar("unit", { length: 32 }).default("EA"),
    unitMaterialCost: float("unitMaterialCost").default(0),
    defaultPrice: float("defaultPrice"),
    userPrice: float("userPrice"),
    lastUpdated: timestamp("lastUpdated"),
    baseLaborHours: float("baseLaborHours").default(0),
    phase: varchar("phase", { length: 128 }),
    source: varchar("source", { length: 64 }).default("custom"),
    externalSku: varchar("externalSku", { length: 128 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("user_materials_db_userId_idx").on(t.userId),
    index("user_materials_db_category_idx").on(t.category),
  ]
);

export type UserMaterialsDb = typeof userMaterialsDb.$inferSelect;
export type InsertUserMaterialsDb = typeof userMaterialsDb.$inferInsert;

// ─── Master Items ─────────────────────────────────────────────────────────────
// User's personal master catalog of materials/items with baseline pricing & labor.
export const masterItems = mysqlTable(
  "master_items",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    itemCode: varchar("itemCode", { length: 128 }),
    category: varchar("category", { length: 128 }),
    description: varchar("description", { length: 512 }).notNull(),
    unit: varchar("unit", { length: 32 }).default("EA").notNull(),
    masterMaterialCost: decimal("masterMaterialCost", { precision: 10, scale: 4 }).default("0").notNull(),
    masterLaborHours: decimal("masterLaborHours", { precision: 10, scale: 4 }).default("0").notNull(),
    notes: text("notes"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("master_items_userId_idx").on(t.userId),
    index("master_items_category_idx").on(t.category),
  ]
);

export type MasterItem = typeof masterItems.$inferSelect;
export type InsertMasterItem = typeof masterItems.$inferInsert;

// ─── Master Assemblies ────────────────────────────────────────────────────────
// Named groups of master items (e.g. "20A Duplex Outlet Rough-In").
export const masterAssemblies = mysqlTable(
  "master_assemblies",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    phase: varchar("phase", { length: 128 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("master_assemblies_userId_idx").on(t.userId)]
);

export type MasterAssembly = typeof masterAssemblies.$inferSelect;
export type InsertMasterAssembly = typeof masterAssemblies.$inferInsert;

// ─── Master Assembly Items ────────────────────────────────────────────────────
// Join table: which master items (and qty) belong to a master assembly.
export const masterAssemblyItems = mysqlTable(
  "master_assembly_items",
  {
    id: int("id").autoincrement().primaryKey(),
    assemblyId: int("assemblyId").notNull().references(() => masterAssemblies.id, { onDelete: "cascade" }),
    masterItemId: int("masterItemId").notNull().references(() => masterItems.id, { onDelete: "cascade" }),
    qty: decimal("qty", { precision: 10, scale: 4 }).default("1").notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
  },
  (t) => [
    index("master_assembly_items_assemblyId_idx").on(t.assemblyId),
    index("master_assembly_items_masterItemId_idx").on(t.masterItemId),
  ]
);

export type MasterAssemblyItem = typeof masterAssemblyItems.$inferSelect;
export type InsertMasterAssemblyItem = typeof masterAssemblyItems.$inferInsert;

// ─── Master Labor Rates ───────────────────────────────────────────────────────
export const masterLaborRates = mysqlTable(
  "master_labor_rates",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    ratePerHour: decimal("ratePerHour", { precision: 10, scale: 4 }).default("0").notNull(),
    type: mysqlEnum("type", ["journeyman", "apprentice", "foreman"]).default("journeyman").notNull(),
    isDefault: boolean("isDefault").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [index("master_labor_rates_userId_idx").on(t.userId)]
);

export type MasterLaborRate = typeof masterLaborRates.$inferSelect;
export type InsertMasterLaborRate = typeof masterLaborRates.$inferInsert;

// ─── Project Assemblies ───────────────────────────────────────────────────────
// Instances of master assemblies added to a specific project bid.
export const projectAssemblies = mysqlTable(
  "project_assemblies",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    masterAssemblyId: int("masterAssemblyId").references(() => masterAssemblies.id, { onDelete: "set null" }),
    name: varchar("name", { length: 255 }).notNull(),
    phase: varchar("phase", { length: 128 }),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("project_assemblies_projectId_idx").on(t.projectId),
  ]
);

export type ProjectAssembly = typeof projectAssemblies.$inferSelect;
export type InsertProjectAssembly = typeof projectAssemblies.$inferInsert;

// ─── Project Assembly Items ───────────────────────────────────────────────────
// Snapshot of each item inside a project assembly, with override values.
export const projectAssemblyItems = mysqlTable(
  "project_assembly_items",
  {
    id: int("id").autoincrement().primaryKey(),
    projectAssemblyId: int("projectAssemblyId").notNull().references(() => projectAssemblies.id, { onDelete: "cascade" }),
    masterItemId: int("masterItemId").references(() => masterItems.id, { onDelete: "set null" }),
    itemCode: varchar("itemCode", { length: 128 }),
    description: varchar("description", { length: 512 }).notNull(),
    unit: varchar("unit", { length: 32 }).default("EA").notNull(),
    qty: decimal("qty", { precision: 10, scale: 4 }).default("1").notNull(),
    // Master values — static reference, never auto-updated after snapshot
    masterMaterialCost: decimal("masterMaterialCost", { precision: 10, scale: 4 }).default("0").notNull(),
    masterLaborHours: decimal("masterLaborHours", { precision: 10, scale: 4 }).default("0").notNull(),
    // Override values — default to master on creation, editable per-project
    overrideMaterialCost: decimal("overrideMaterialCost", { precision: 10, scale: 4 }).default("0").notNull(),
    overrideLaborHours: decimal("overrideLaborHours", { precision: 10, scale: 4 }).default("0").notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("project_assembly_items_assemblyId_idx").on(t.projectAssemblyId),
  ]
);

export type ProjectAssemblyItem = typeof projectAssemblyItems.$inferSelect;
export type InsertProjectAssemblyItem = typeof projectAssemblyItems.$inferInsert;

// ─── Project Items (Standalone) ───────────────────────────────────────────────
// Individual items added directly to a project (not inside an assembly).
export const projectItems = mysqlTable(
  "project_items",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
    masterItemId: int("masterItemId").references(() => masterItems.id, { onDelete: "set null" }),
    itemCode: varchar("itemCode", { length: 128 }),
    description: varchar("description", { length: 512 }).notNull(),
    unit: varchar("unit", { length: 32 }).default("EA").notNull(),
    qty: decimal("qty", { precision: 10, scale: 4 }).default("1").notNull(),
    phase: varchar("phase", { length: 128 }),
    masterMaterialCost: decimal("masterMaterialCost", { precision: 10, scale: 4 }).default("0").notNull(),
    masterLaborHours: decimal("masterLaborHours", { precision: 10, scale: 4 }).default("0").notNull(),
    overrideMaterialCost: decimal("overrideMaterialCost", { precision: 10, scale: 4 }).default("0").notNull(),
    overrideLaborHours: decimal("overrideLaborHours", { precision: 10, scale: 4 }).default("0").notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [
    index("project_items_projectId_idx").on(t.projectId),
  ]
);

export type ProjectItem = typeof projectItems.$inferSelect;
export type InsertProjectItem = typeof projectItems.$inferInsert;

// ─── Bid Summary ──────────────────────────────────────────────────────────────
// One row per project — stores global labor adjustment settings.
export const bidSummary = mysqlTable(
  "bid_summary",
  {
    id: int("id").autoincrement().primaryKey(),
    projectId: int("projectId").notNull().unique().references(() => projects.id, { onDelete: "cascade" }),
    // Labor adjustments
    percentageLaborFactor: decimal("percentageLaborFactor", { precision: 6, scale: 4 }).default("1.0000").notNull(),
    lumpSumHours: decimal("lumpSumHours", { precision: 10, scale: 4 }).default("0").notNull(),
    // Material markup
    markupPct: decimal("markupPct", { precision: 6, scale: 4 }).default("0").notNull(),
    // Default labor rate to use for cost calculation
    defaultLaborRateId: int("defaultLaborRateId").references(() => masterLaborRates.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }
);

export type BidSummary = typeof bidSummary.$inferSelect;
export type InsertBidSummary = typeof bidSummary.$inferInsert;

// ─── Feature Flags ────────────────────────────────────────────────────────────
// Admin-controlled toggles that gate features for the Contractor role.
// Each row is identified by a unique flagKey string.
export const featureFlags = mysqlTable("feature_flags", {
  id: int("id").autoincrement().primaryKey(),
  flagKey: varchar("flagKey", { length: 128 }).notNull().unique(),
  label: varchar("label", { length: 255 }).notNull(),
  description: text("description"),
  enabledForContractors: boolean("enabledForContractors").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = typeof featureFlags.$inferInsert;
