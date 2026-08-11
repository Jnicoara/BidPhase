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
    // ── PDF storage (S3) ──
    pdfUrl: text("pdfUrl"),
    pdfKey: text("pdfKey"),
    pdfFilename: varchar("pdfFilename", { length: 512 }),
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

// ══════════════════════════════════════════════════════════════════════════════
// FOUNDATION (v2 library) — see ASSEMBLIES_PLAN.md
// ══════════════════════════════════════════════════════════════════════════════
// These tables are the new Foundation data model. They live ALONGSIDE the legacy
// master_items / master_assemblies / master_labor_rates tables, which stay in
// place and keep serving the current UI until the step-4 validation gate passes
// (see ASSEMBLIES_PLAN.md BUILD ORDER). Do not wire the two systems together —
// the legacy tables get removed wholesale once the new Library screens prove out.
//
// Baseline vs. user rows (CUSTOMIZATION MODEL):
//   • Baseline row  — userId IS NULL. The shipped starter library. Never edited
//                     by a user; `version` bumps when we publish an update.
//   • Forked row    — userId set, baselineId set. A user's personal copy. The
//                     `baselineVersion` records which baseline version it was
//                     forked from, so a newer baseline surfaces as "update
//                     available" rather than silently overwriting.
//   • Custom row    — userId set, baselineId NULL. No baseline link at all.
//
// "Revert to Original" = copy the baseline's fields back over the forked row and
// reset baselineVersion to the baseline's current version.

/** Curated, NOT user-extendable — doubles as the takeoff layer grouping. */
export const ASSEMBLY_CATEGORIES = [
  "Devices",
  "Lighting",
  "Panels",
  "Equipment Connections",
  "Low Voltage/EMS",
] as const;

export const MATERIAL_UNITS_OF_SALE = ["each", "foot", "box"] as const;
export const LABOR_ROLES = ["apprentice", "journeyman", "foreman"] as const;

// ─── Materials ────────────────────────────────────────────────────────────────
// Cost only. Labor lives on the assembly, never on the material.
export const materials = mysqlTable(
  "materials",
  {
    id: int("id").autoincrement().primaryKey(),
    /** NULL = baseline library row. Set = belongs to that user. */
    userId: int("userId").references(() => users.id, { onDelete: "cascade" }),
    /** The baseline row this was forked from. NULL = baseline itself, or fully custom. */
    baselineId: int("baselineId"),
    /** Baseline `version` at fork time — drives the "update available" nudge. */
    baselineVersion: int("baselineVersion"),
    /** Bumped when a baseline row is republished. Meaningless on user rows. */
    version: int("version").default(1).notNull(),

    name: varchar("name", { length: 512 }).notNull(),
    unitOfSale: mysqlEnum("unitOfSale", MATERIAL_UNITS_OF_SALE).default("each").notNull(),
    costPerUnit: decimal("costPerUnit", { precision: 10, scale: 4 }).default("0").notNull(),

    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => [
    index("materials_userId_idx").on(t.userId),
    index("materials_baselineId_idx").on(t.baselineId),
  ]
);

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = typeof materials.$inferInsert;

// ─── Labor Rates ──────────────────────────────────────────────────────────────
// Fully separate from assemblies — an assembly stores hours, never a rate.
export const laborRates = mysqlTable(
  "labor_rates",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").references(() => users.id, { onDelete: "cascade" }),
    baselineId: int("baselineId"),
    baselineVersion: int("baselineVersion"),
    version: int("version").default(1).notNull(),

    role: mysqlEnum("role", LABOR_ROLES).notNull(),
    hourlyCost: decimal("hourlyCost", { precision: 10, scale: 4 }).default("0").notNull(),

    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => [
    index("labor_rates_userId_idx").on(t.userId),
    index("labor_rates_baselineId_idx").on(t.baselineId),
  ]
);

export type LaborRate = typeof laborRates.$inferSelect;
export type InsertLaborRate = typeof laborRates.$inferInsert;

// ─── Modifiers ────────────────────────────────────────────────────────────────
// Adjust labor hours by a percentage. CRITICAL: multiple modifiers on one line
// item ADD together, never compound. +15% height and +10% outdoor = +25% total,
// NOT 1.15 × 1.10. The pricing engine in shared/pricing.ts enforces this.
export const modifiers = mysqlTable(
  "modifiers",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").references(() => users.id, { onDelete: "cascade" }),
    baselineId: int("baselineId"),
    baselineVersion: int("baselineVersion"),
    version: int("version").default(1).notNull(),

    name: varchar("name", { length: 255 }).notNull(),
    /** Fractional labor adjustment: 0.15 = +15% hours, -0.10 = -10% hours. */
    laborAdjustmentPct: decimal("laborAdjustmentPct", { precision: 6, scale: 4 }).default("0").notNull(),
    /**
     * "global"   — shared list (height, outdoor, retrofit); assemblies opt in.
     * "assembly" — one-off for a single assembly (e.g. isolated ground).
     */
    scope: mysqlEnum("scope", ["global", "assembly"]).default("global").notNull(),

    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => [
    index("modifiers_userId_idx").on(t.userId),
    index("modifiers_baselineId_idx").on(t.baselineId),
  ]
);

export type Modifier = typeof modifiers.$inferSelect;
export type InsertModifier = typeof modifiers.$inferInsert;

// ─── Assemblies ───────────────────────────────────────────────────────────────
// A reusable recipe: materials + base labor hours + applicable modifiers.
export const assemblies = mysqlTable(
  "assemblies",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").references(() => users.id, { onDelete: "cascade" }),
    baselineId: int("baselineId"),
    baselineVersion: int("baselineVersion"),
    version: int("version").default(1).notNull(),

    name: varchar("name", { length: 255 }).notNull(),
    /** Curated list — users pick, never add. Also drives takeoff layer grouping. */
    category: mysqlEnum("category", ASSEMBLY_CATEGORIES).notNull(),
    /** Unlock-gated at the app layer, not the schema, so new trades need no migration. */
    trade: varchar("trade", { length: 64 }).default("electrical").notNull(),
    baseLaborHours: decimal("baseLaborHours", { precision: 10, scale: 4 }).default("0").notNull(),

    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => [
    index("assemblies_userId_idx").on(t.userId),
    index("assemblies_baselineId_idx").on(t.baselineId),
    index("assemblies_category_idx").on(t.category),
    index("assemblies_trade_idx").on(t.trade),
  ]
);

export type Assembly = typeof assemblies.$inferSelect;
export type InsertAssembly = typeof assemblies.$inferInsert;

// ─── Assembly Materials ───────────────────────────────────────────────────────
// Which materials (and how many) make up an assembly.
export const assemblyMaterials = mysqlTable(
  "assembly_materials",
  {
    id: int("id").autoincrement().primaryKey(),
    assemblyId: int("assemblyId").notNull().references(() => assemblies.id, { onDelete: "cascade" }),
    materialId: int("materialId").notNull().references(() => materials.id, { onDelete: "cascade" }),
    qty: decimal("qty", { precision: 10, scale: 4 }).default("1").notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
  },
  t => [
    index("assembly_materials_assemblyId_idx").on(t.assemblyId),
    index("assembly_materials_materialId_idx").on(t.materialId),
  ]
);

export type AssemblyMaterial = typeof assemblyMaterials.$inferSelect;
export type InsertAssemblyMaterial = typeof assemblyMaterials.$inferInsert;

// ─── Assembly Modifiers ───────────────────────────────────────────────────────
// Which modifiers are *applicable* to an assembly. Being applicable is not the
// same as being applied — a takeoff line item chooses which of these to switch
// on. Global modifiers are opted into here; assembly-scoped ones live here only.
export const assemblyModifiers = mysqlTable(
  "assembly_modifiers",
  {
    id: int("id").autoincrement().primaryKey(),
    assemblyId: int("assemblyId").notNull().references(() => assemblies.id, { onDelete: "cascade" }),
    modifierId: int("modifierId").notNull().references(() => modifiers.id, { onDelete: "cascade" }),
    sortOrder: int("sortOrder").default(0).notNull(),
  },
  t => [
    index("assembly_modifiers_assemblyId_idx").on(t.assemblyId),
    index("assembly_modifiers_modifierId_idx").on(t.modifierId),
  ]
);

export type AssemblyModifier = typeof assemblyModifiers.$inferSelect;
export type InsertAssemblyModifier = typeof assemblyModifiers.$inferInsert;

// ─── Pricing Defaults ─────────────────────────────────────────────────────────
// Company-level defaults that auto-fill new estimates. The per-project override
// layer is deliberately NOT here — that belongs to Bid/Project structure (build
// step 3), so this table stays the single company-wide source.
export const pricingDefaults = mysqlTable(
  "pricing_defaults",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),

    // Overhead — optional, applied BEFORE profit.
    overheadEnabled: boolean("overheadEnabled").default(false).notNull(),
    overheadMode: mysqlEnum("overheadMode", ["percentage", "flat"]).default("percentage").notNull(),
    /** Fraction when percentage (0.10 = 10%); currency amount when flat. */
    overheadValue: decimal("overheadValue", { precision: 12, scale: 4 }).default("0").notNull(),

    // Profit — the method is always an explicit choice, never assumed.
    profitMethod: mysqlEnum("profitMethod", ["markup", "margin"]).default("markup").notNull(),
    /** Fraction: 0.20 = 20% markup, or 20% target margin, per profitMethod. */
    profitValue: decimal("profitValue", { precision: 6, scale: 4 }).default("0").notNull(),

    defaultLaborRateId: int("defaultLaborRateId").references(() => laborRates.id, { onDelete: "set null" }),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }
);

export type PricingDefaults = typeof pricingDefaults.$inferSelect;
export type InsertPricingDefaults = typeof pricingDefaults.$inferInsert;

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
