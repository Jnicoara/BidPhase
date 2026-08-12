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

  /**
   * When this account finished the first-run flow. NULL = brand new.
   *
   * Drives one thing only: whether signing in lands on the welcome screen or
   * the Dashboard. Stored as a timestamp rather than a boolean because "when"
   * answers questions "whether" cannot — how long an account sat before its
   * first bid, whether a user who reported being lost had actually seen it.
   *
   * The migration that added this column stamps every EXISTING account, so
   * nobody who already uses the app is shown a welcome screen for a product
   * they have been using for months.
   */
  onboardingCompletedAt: timestamp("onboardingCompletedAt"),

  /**
   * When the user dismissed the getting-started checklist. NULL = still shown.
   *
   * Separate from onboarding completion on purpose: finishing first-run means
   * "I have a rate and I am going to build a bid", while dismissing the
   * checklist means "stop showing me this". A user may well do the second
   * without doing the rest of the first, and the checklist can be brought back
   * at any time — which is why this clears rather than latching.
   */
  checklistDismissedAt: timestamp("checklistDismissedAt"),
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

/**
 * WHERE a placed item sits on a job — the second layer axis (phase 2d).
 *
 * Deliberately not a property of the assembly. A duplex receptacle is always
 * "Devices" (its Category, which travels with the library item), but the same
 * receptacle can be in a wall on one job and in a ceiling on another — so this
 * is tagged on the PLACED item at the moment it is counted.
 * See ASSEMBLIES_PLAN.md § LAYERS.
 *
 * Trade-agnostic on purpose: "Underground" means the same thing for electrical
 * conduit and plumbing pipe, and that shared vocabulary is what makes
 * cross-trade conflict visibility possible later.
 */
export const TAKEOFF_LOCATIONS = [
  "Underground",
  "Slab/Floor",
  "Wall",
  "Ceiling/Overhead",
  "Exposed",
  "Roof",
] as const;
export type TakeoffLocation = (typeof TAKEOFF_LOCATIONS)[number];

export const MATERIAL_UNITS_OF_SALE = ["each", "foot", "box"] as const;

/**
 * How a labor role is paid.
 *
 * Replaces the old fixed LABOR_ROLES enum (apprentice/journeyman/foreman):
 * roles are a contractor's own org chart, so the NAME is free text and only the
 * pay shape is constrained. Nothing consumed the old enum — labor_rates had no
 * router or screen — so it was dropped rather than migrated.
 */
export const LABOR_RATE_TYPES = ["hourly", "salary"] as const;
export type LaborRateType = (typeof LABOR_RATE_TYPES)[number];

/**
 * Lifecycle of a modifier.
 *
 *   active   — in the working list.
 *   archived — removed from the working list but restorable. This is what
 *              "delete" does; there is no hard delete from the active list.
 *   deleted  — a tombstone, shown nowhere and not restorable.
 *
 * The tombstone exists because of the fork model. Archiving a starter modifier
 * forks it, and that fork is what hides the shared starter row from the list.
 * Hard-deleting the fork would resurrect the starter, so "Delete Forever" on a
 * starter-derived row marks it `deleted` instead. Fully custom rows have no
 * starter to suppress and ARE hard-deleted.
 */
export const LIBRARY_STATUSES = ["active", "archived", "deleted"] as const;
export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

/**
 * Modifiers had this first; materials, assemblies and kits now share it.
 *
 * Kept as an alias rather than renamed everywhere so the enum's stored values
 * are provably identical across the four tables — a second list with the same
 * three strings is a list that can drift.
 */
export const MODIFIER_STATUSES = LIBRARY_STATUSES;
export type ModifierStatus = LibraryStatus;

/**
 * Residential / Commercial / Both — a FILTER on the assembly library, never a
 * structural split (ASSEMBLIES_PLAN.md § DATA MODEL). Materials, labor rates
 * and modifiers stay shared across both; where labor genuinely differs, the
 * user forks the one assembly rather than the catalog being duplicated.
 *
 * Not the same axis as `trade`, which separates electrical from plumbing/HVAC
 * for unlock gating. Do not wire the two together.
 */
export const PROJECT_TYPES = ["residential", "commercial", "both"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

/**
 * How the material catalog is shelved. Curated, NOT user-extendable.
 *
 * Declaration order is the display order on the Materials screen — keep them in
 * the order an estimator walks a job (wire, raceway, boxes, devices, gear).
 *
 * Deliberately NOT the same axis as ASSEMBLY_CATEGORIES above: that groups
 * assemblies by what they accomplish ("Lighting"), this groups materials by
 * what they physically are ("Conduit Fittings"). Do not merge them.
 */
/**
 * The shelves the material catalog is filed on.
 *
 * Order matters — it is the order sections render in on the Materials screen,
 * and it runs roughly in the order work happens: wire and raceway first, then
 * what gets mounted in them, then equipment, then the small parts and
 * consumables that go in every van.
 *
 * ── Adding one is an ALTER, so add deliberately ──────────────────────────────
 * This is a mysqlEnum, unlike `assemblies.trade` which is a varchar precisely
 * so new trades need no migration. The difference is intentional: a trade is an
 * open set the app unlocks, whereas a category is a curated list the user picks
 * from and never adds to, and keeping it an enum is what stops a typo becoming
 * a nineteenth shelf. Append rather than reorder or rename — the value is
 * stored, so a rename orphans every row already carrying the old text.
 */
export const MATERIAL_CATEGORIES = [
  "Wire & Cable",
  "Conduit",
  "Conduit Fittings",
  "Boxes",
  "Receptacles",
  "Switches",
  "Wall Plates & Misc",
  "Panels & Breakers",
  "Lighting Hardware",
  "Grounding & Bonding",
  "Life Safety",
  "Low Voltage",
  "Connectors & Terminations",
  "Strut & Supports",
  "Fasteners & Anchors",
  "Equipment & Appliances",
  "Distribution Equipment",
  "Consumables",
] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

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
    /**
     * Nullable on purpose. Rows created before this column existed are honestly
     * uncategorised rather than wrongly guessed, and a quick add does not force
     * a filing decision. The UI shelves NULL under "Uncategorized", last.
     */
    category: mysqlEnum("category", MATERIAL_CATEGORIES),
    /**
     * Which trade's catalog this belongs to. Same varchar-not-enum treatment as
     * `assemblies.trade`, for the same reason: unlocking is gated at the app
     * layer so a new trade is content, not a migration.
     *
     * Low-voltage parts ship as "low-voltage" rather than "electrical" because
     * structured cabling, coax and landscape lighting are a different trade's
     * material list even when the same contractor pulls both — an electrical
     * estimator scrolling for a receptacle should not wade through Cat6 jacks.
     */
    trade: varchar("trade", { length: 64 }).default("electrical").notNull(),
    /**
     * A short clarifier, shown under the name. Deliberately sparse: it exists
     * only where two catalog entries could genuinely be mistaken for each other
     * — "#10 THHN" solid against "#10 THHN stranded", plastic boxes against
     * metal — and is left NULL on everything self-explanatory. A description on
     * every row is a description nobody reads.
     */
    description: varchar("description", { length: 512 }),
    /**
     * Optional note for the brand or part number the user actually buys.
     *
     * The catalog itself is generic on purpose — "Wire nuts", not a Ideal
     * 30-176 — because a shipped catalog naming one manufacturer is wrong for
     * everyone who buys another. This is where a user records that their supply
     * house stocks a particular part, without the shipped names pretending to.
     */
    brandNote: varchar("brandNote", { length: 255 }),
    /**
     * Trade slang the catalog name does not contain, space-separated, so an
     * electrician finds "Duplex receptacle" by typing "plug" and "4\" square
     * box" by typing "1900". Matched as loose text by smartSearch, which scores
     * it below the item's real name — an alias should surface a material, never
     * outrank one that genuinely matches.
     *
     * Same shape as the older CATALOG's `searchAliases` field, deliberately, so
     * the two can converge later. Nullable: an alias-less material still works.
     */
    searchAliases: text("searchAliases"),
    /**
     * Suggested quantity when this material is added to an assembly. NULL = 1.
     *
     * Exists for the consumables nobody uses one of — you do not fit a single
     * wire nut to a device. Only a handful of materials set it, and it is a
     * SUGGESTION: the builder pre-fills it and the estimator edits it like any
     * other quantity. Adding more is a data change, not a code change.
     */
    defaultQty: decimal("defaultQty", { precision: 10, scale: 4 }),

    /**
     * active / archived / deleted — the lifecycle Modifiers has had since
     * Foundation, extended here so removing a material is recoverable.
     *
     * Archived rows are hidden from every working list but keep their id, so
     * anything that referenced one still resolves. Unlike an archived BID there
     * is no expiry: these are lightweight records with no attached files, so
     * keeping one costs nothing and a countdown would only invent a deadline
     * for the user to miss.
     */
    status: mysqlEnum("status", LIBRARY_STATUSES).default("active").notNull(),
    /** When it was archived. Shown in the archive; nothing expires from it. */
    archivedAt: timestamp("archivedAt"),

    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => [
    index("materials_userId_idx").on(t.userId),
    index("materials_baselineId_idx").on(t.baselineId),
    index("materials_status_idx").on(t.status),
    index("materials_status_idx").on(t.status),
    index("materials_trade_idx").on(t.trade),
    index("materials_category_idx").on(t.category),
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

    /** Free text. Roles are the contractor's own org chart, not a fixed list. */
    name: varchar("name", { length: 255 }).notNull(),
    rateType: mysqlEnum("rateType", LABOR_RATE_TYPES).default("hourly").notNull(),

    /** The rate for an hourly role. Ignored when rateType is "salary". */
    hourlyCost: decimal("hourlyCost", { precision: 10, scale: 4 }).default("0").notNull(),

    /**
     * Salary inputs, kept RAW and separate from any computed rate.
     *
     * The effective hourly rate is derived on read (see effectiveHourlyRate in
     * shared/pricing.ts), never stored — storing it would let the number drift
     * out of step with the salary and hours it came from. Both stay editable
     * because a contractor revises them independently: a raise changes the
     * salary, a shop that really works 1,900 productive hours changes the hours.
     */
    annualSalary: decimal("annualSalary", { precision: 12, scale: 2 }),
    annualHours: decimal("annualHours", { precision: 8, scale: 2 }),

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

    /** active / archived / deleted — see MODIFIER_STATUSES. */
    status: mysqlEnum("status", MODIFIER_STATUSES).default("active").notNull(),
    /** When it left the active list. Orders the Archived view, newest first. */
    archivedAt: timestamp("archivedAt"),

    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => [
    index("modifiers_userId_idx").on(t.userId),
    index("modifiers_baselineId_idx").on(t.baselineId),
    index("modifiers_status_idx").on(t.status),
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
    /** Optional library filter. See PROJECT_TYPES. */
    projectType: mysqlEnum("projectType", PROJECT_TYPES),
    baseLaborHours: decimal("baseLaborHours", { precision: 10, scale: 4 }).default("0").notNull(),

    /**
     * Which role does this work. Nullable, and "set null" on delete rather than
     * cascade: losing a labor rate must not silently delete the recipe that
     * referenced it. The UI shows such an assembly as needing a role picked.
     */
    laborRateId: int("laborRateId").references(() => laborRates.id, { onDelete: "set null" }),

    /** active / archived / deleted. See materials.status — same lifecycle. */
    status: mysqlEnum("status", LIBRARY_STATUSES).default("active").notNull(),
    archivedAt: timestamp("archivedAt"),

    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => [
    index("assemblies_userId_idx").on(t.userId),
    index("assemblies_baselineId_idx").on(t.baselineId),
    index("assemblies_status_idx").on(t.status),
    index("assemblies_status_idx").on(t.status),
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

    /**
     * Company-wide productivity adjustment, as a fraction (0.10 = +10% hours).
     *
     * Applied at calculation time as a final multiplier AFTER job-condition
     * modifiers have been summed — a separate step, never added into them. See
     * applyProductivityToHours in shared/pricing.ts for why that separation
     * matters. Ships at 0: no adjustment until the contractor has a reason.
     *
     * Signed, so scale(4) with a negative range — a crew that beats book hours
     * is as real as one that does not.
     */
    productivityPct: decimal("productivityPct", { precision: 6, scale: 4 }).default("0").notNull(),

    defaultLaborRateId: int("defaultLaborRateId").references(() => laborRates.id, { onDelete: "set null" }),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }
);

export type PricingDefaults = typeof pricingDefaults.$inferSelect;
export type InsertPricingDefaults = typeof pricingDefaults.$inferInsert;

// ─── Bids ─────────────────────────────────────────────────────────────────────
// The Foundation bid layer. Deliberately NOT the legacy `projects` table, which
// belongs to the master_* system and carries PDF/takeoff state — see the divider
// comment above. Do not wire the two together.

export const BID_STATUSES = ["Draft", "Active", "Won", "Lost"] as const;
export type BidStatus = (typeof BID_STATUSES)[number];

export const bids = mysqlTable(
  "bids",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 255 }).notNull(),
    status: mysqlEnum("status", BID_STATUSES).default("Draft").notNull(),
    /** Trades unlocked for this bid. One bid may mix line items from several. */
    trades: json("trades").$type<string[]>(),

    /**
     * When the bid is due to be submitted. Nullable on purpose — plenty of work
     * is quoted without a firm deadline, and a fake date would sort ahead of
     * real ones on the dashboard.
     *
     * A DATE, not a timestamp: a deadline is a day, and storing a time would
     * invite timezone drift into something the user thinks of as "the 14th".
     */
    dueDate: date("dueDate", { mode: "string" }),

    /**
     * Per-bid pricing overrides. NULL means "inherit the company default" from
     * `pricing_defaults`, and inheritance is per GROUP, not per field:
     *
     *   overheadEnabled NULL → the whole overhead group is inherited.
     *   profitMethod    NULL → the whole profit group is inherited.
     *
     * Grouping them avoids the half-overridden state where a bid has its own
     * profit percentage but the company's method — which reads as a bug to a
     * user and silently changes the price when the company default moves.
     */
    overheadEnabled: boolean("overheadEnabled"),
    overheadMode: mysqlEnum("overheadMode", ["percentage", "flat"]),
    overheadValue: decimal("overheadValue", { precision: 12, scale: 4 }),
    profitMethod: mysqlEnum("profitMethod", ["markup", "margin"]),
    profitValue: decimal("profitValue", { precision: 6, scale: 4 }),
    /**
     * Per-bid productivity override. NULL inherits the company default.
     *
     * A single column rather than a group, because unlike overhead and profit
     * there is no second field it could be half-overridden against.
     */
    productivityPct: decimal("productivityPct", { precision: 6, scale: 4 }),

    /**
     * When the bid was archived, or NULL if it is live. This single column is
     * the whole archive state — there is deliberately no companion boolean.
     *
     * A flag plus a timestamp can disagree (archived with no date, dated but
     * not archived), and the retention window is computed FROM this value, so a
     * drifted pair would either delete something early or keep it forever. One
     * column cannot drift. `archivedAt IS NULL` is the live test everywhere.
     *
     * Independent of `status`: a bid may be archived while Draft, Active, Won
     * or Lost. Archiving is "get it off my dashboard", not an outcome.
     *
     * Retention is RETENTION_DAYS from this instant — see shared/retention.ts.
     *
     * MySQL TIMESTAMP carries no fractional seconds, so this truncates DOWN to
     * the whole second: the deadline is second-accurate, and a purge can fire
     * up to 999ms early. Irrelevant against a 30-day window swept once a day,
     * and not worth an fsp(3) column to chase.
     */
    archivedAt: timestamp("archivedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => [
    index("bids_userId_idx").on(t.userId),
    index("bids_status_idx").on(t.status),
    // The purge sweep scans this across every user, so it cannot be a table
    // scan that grows with the whole bid history.
    index("bids_archivedAt_idx").on(t.archivedAt),
  ]
);

export type Bid = typeof bids.$inferSelect;
export type InsertBid = typeof bids.$inferInsert;

// ─── Bid PDFs (plan sheets) ───────────────────────────────────────────────────
/**
 * Plan PDFs attached to a bid. Takeoff redesign, phase 1.
 *
 * A bid holds MANY of these, unlike the legacy `projects` row which carried a
 * single `pdfUrl`/`pdfKey`/`pdfFilename` triple inline. Real jobs arrive as a
 * set — electrical sheets, a spec book, an addendum issued a week later — and
 * the one-PDF-per-job shape forced the user to pick which one mattered.
 *
 * The file itself lives in S3 under `storageKey`; nothing here holds bytes.
 * `onDelete: "cascade"` from `bids` is what makes the retention purge a single
 * DELETE on the bid — see server/scheduled/purgeArchivedBids.ts.
 */
export const bidPdfs = mysqlTable(
  "bid_pdfs",
  {
    id: int("id").autoincrement().primaryKey(),
    bidId: int("bidId").notNull().references(() => bids.id, { onDelete: "cascade" }),
    /**
     * Denormalised from the bid so an ownership check is one query, not two.
     * Every read still filters on it — a storage key is guessable enough that
     * "you had the id" must never be the only thing standing in the way.
     */
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),

    /** What the user called it. Shown in the sheet list; never used as a path. */
    filename: varchar("filename", { length: 512 }).notNull(),
    /** S3 object key from storagePut(). Resolved through /manus-storage/<key>. */
    storageKey: varchar("storageKey", { length: 1024 }).notNull(),
    byteSize: int("byteSize").default(0).notNull(),
    /**
     * Filled in by the client after the document first opens, because counting
     * pages means parsing the PDF and only the viewer has a parser. NULL means
     * "not opened yet", which the list shows as a blank rather than "0 pages" —
     * a real zero-page PDF and an unread one must not look alike.
     */
    pageCount: int("pageCount"),

    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => [
    index("bid_pdfs_bidId_idx").on(t.bidId),
    index("bid_pdfs_userId_idx").on(t.userId),
  ]
);

export type BidPdf = typeof bidPdfs.$inferSelect;
export type InsertBidPdf = typeof bidPdfs.$inferInsert;

// ─── Plan sheets (one row per page) ───────────────────────────────────────────
/**
 * One page of an attached PDF, with the two things that make it workable: what
 * it is CALLED, and what it is drawn AT. Takeoff redesign, phase 2a.
 *
 * ── Why a row per page rather than deriving on the fly ───────────────────────
 * Both facts are per-page and both are editable. A 40-sheet set has 40 names
 * the user may correct and up to 40 different scales — a detail sheet at
 * 3/4"=1'-0" sits in the same document as a site plan at 1"=40'. Nothing about
 * either can be recomputed from the PDF once a human has touched it, so it is
 * stored.
 *
 * Rows are created when a document is first opened, from the PDF's outline
 * where it has one. Idempotent: reopening never duplicates or overwrites.
 */
export const SHEET_NAME_SOURCES = ["bookmark", "default", "user"] as const;
export type SheetNameSource = (typeof SHEET_NAME_SOURCES)[number];

export const SCALE_SOURCES = ["detected", "manual", "none"] as const;
export type ScaleSourceValue = (typeof SCALE_SOURCES)[number];

export const bidPdfSheets = mysqlTable(
  "bid_pdf_sheets",
  {
    id: int("id").autoincrement().primaryKey(),
    bidPdfId: int("bidPdfId").notNull().references(() => bidPdfs.id, { onDelete: "cascade" }),
    /** Denormalised for one-query ownership checks, as on bid_pdfs. */
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),

    /** 1-based, matching how pdfjs and every human count pages. */
    pageNumber: int("pageNumber").notNull(),

    /**
     * What the sheet is called. Never null and never blank — an unnamed sheet
     * makes the index a list of numbers to hunt through, which is the thing the
     * index exists to replace. Falls back to "Sheet N" at creation.
     */
    name: varchar("name", { length: 255 }).notNull(),
    /**
     * Where the name came from. `user` is sticky: a re-scan of the document
     * must never overwrite a name someone typed.
     */
    nameSource: mysqlEnum("nameSource", SHEET_NAME_SOURCES).default("default").notNull(),

    /**
     * Real-world distance per unit of paper — `1/4" = 1'-0"` is 48. NULL means
     * no scale is set, which is honest: it makes every later measuring feature
     * refuse rather than quietly measure against a guess.
     */
    scaleRatio: decimal("scaleRatio", { precision: 14, scale: 6 }),
    /** How the scale reads, e.g. `1/4" = 1'-0"`. Display only; ratio governs. */
    scaleText: varchar("scaleText", { length: 64 }),
    scaleSource: mysqlEnum("scaleSource", SCALE_SOURCES).default("none").notNull(),
    /**
     * What auto-detection found, kept even when it was NOT applied.
     *
     * A low-confidence reading is still useful to a person — "the sheet says
     * 3/4\" = 1'-0\" somewhere" is a head start on typing it — so it is offered
     * as a suggestion rather than thrown away or silently trusted.
     */
    detectedScaleText: varchar("detectedScaleText", { length: 255 }),

    /**
     * The sheet states it is NOT TO SCALE.
     *
     * Phase 2a detected this but only held it in browser state, so it vanished
     * on reload. It has to be stored, because phase 2b uses it as a hard gate:
     * a sheet marked N.T.S. cannot be measured unless a human sets a scale by
     * hand. See measurabilityOf() in shared/takeoffQuantities.ts — a drawing
     * saying its own geometry is untrustworthy is not something to infer again
     * each session.
     */
    notToScale: boolean("notToScale").default(false).notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => [
    index("bid_pdf_sheets_bidPdfId_idx").on(t.bidPdfId),
    index("bid_pdf_sheets_userId_idx").on(t.userId),
  ]
);

export type BidPdfSheet = typeof bidPdfSheets.$inferSelect;
export type InsertBidPdfSheet = typeof bidPdfSheets.$inferInsert;

// ─── Traced runs (takeoff phase 2b) ───────────────────────────────────────────
/**
 * One physical raceway traced on a sheet: a conduit route, or a cable run.
 *
 * ── What is stored, and what is recomputed ───────────────────────────────────
 * The POINTS are the measurement. Everything else — length, footage, wire — is
 * derived from them through shared/takeoffGeometry.ts and never stored as the
 * only copy, so a bill of materials can never disagree with the geometry it
 * came from.
 *
 * `lengthInches` and `scaleRatioUsed` are cached alongside anyway, for one
 * reason: if the sheet's scale is edited later, every run traced against the
 * old scale silently changes length. Keeping what was used at trace time lets
 * the app SAY that rather than quietly re-pricing a run the user already
 * checked. It is evidence, not the source of truth.
 */
export const RUN_PATH_TYPES = ["conduit", "cable"] as const;
export type RunPathType = (typeof RUN_PATH_TYPES)[number];

/** Draft = still being traced or autosaved; committed = the user finished. */
export const RUN_STATUSES = ["draft", "committed"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const takeoffRuns = mysqlTable(
  "takeoff_runs",
  {
    id: int("id").autoincrement().primaryKey(),
    bidId: int("bidId").notNull().references(() => bids.id, { onDelete: "cascade" }),
    sheetId: int("sheetId").notNull().references(() => bidPdfSheets.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 255 }).notNull(),
    /**
     * conduit — a pipe with wire pulled through it. Conduit is counted once
     *           for the run; wire is counted per circuit (see takeoff_run_circuits).
     * cable   — Romex/MC. The cable IS the raceway; there is no conduit line.
     */
    pathType: mysqlEnum("pathType", RUN_PATH_TYPES).default("conduit").notNull(),

    /**
     * The traced vertices, in PDF PAGE POINTS — never screen pixels, which
     * depend on zoom. `[{x,y}, …]`, in click order.
     */
    points: json("points").$type<{ x: number; y: number }[]>().notNull(),

    /** Cached from the points at save time. Recomputed on read; see header. */
    lengthInches: decimal("lengthInches", { precision: 14, scale: 4 }),
    /** The sheet scale this was measured against, to detect a later change. */
    scaleRatioUsed: decimal("scaleRatioUsed", { precision: 14, scale: 6 }),

    status: mysqlEnum("status", RUN_STATUSES).default("draft").notNull(),

    /** WHERE the raceway sits. Same axis as a stamp's; see TAKEOFF_LOCATIONS. */
    location: mysqlEnum("location", TAKEOFF_LOCATIONS),

    /**
     * This path was proposed by AI rather than traced by hand.
     *
     * Never treated as final: a suggested run stays visibly a suggestion until
     * the user accepts it, and accepting is what clears this. Nothing in the
     * bill of materials counts a suggestion.
     */
    isSuggestion: boolean("isSuggestion").default(false).notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => [
    index("takeoff_runs_bidId_idx").on(t.bidId),
    index("takeoff_runs_sheetId_idx").on(t.sheetId),
    index("takeoff_runs_userId_idx").on(t.userId),
  ]
);

export type TakeoffRun = typeof takeoffRuns.$inferSelect;
export type InsertTakeoffRun = typeof takeoffRuns.$inferInsert;

/**
 * A circuit pulled through a run. Many circuits may share one run.
 *
 * This is the shared-run mechanism: the RUN is traced once and carries the
 * conduit footage; each circuit here carries its own wire footage, which is
 * the full run length times its own conductor count.
 */
export const takeoffRunCircuits = mysqlTable(
  "takeoff_run_circuits",
  {
    id: int("id").autoincrement().primaryKey(),
    runId: int("runId").notNull().references(() => takeoffRuns.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),

    /** "Ckt 12", "Panel A-3" — the estimator's own label. */
    name: varchar("name", { length: 255 }).notNull(),
    /**
     * Conductors pulled for THIS circuit through the run.
     *
     * Entered, never derived. Whether a circuit is 2 wires and a ground or
     * three phases and a neutral is something the estimator knows and the app
     * does not, and guessing it would put a wrong wire quantity on a bid.
     */
    conductorCount: int("conductorCount").default(3).notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => [
    index("takeoff_run_circuits_runId_idx").on(t.runId),
    index("takeoff_run_circuits_userId_idx").on(t.userId),
  ]
);

export type TakeoffRunCircuit = typeof takeoffRunCircuits.$inferSelect;
export type InsertTakeoffRunCircuit = typeof takeoffRunCircuits.$inferInsert;

// ─── Stamps (takeoff phase 2c) ────────────────────────────────────────────────
/**
 * One placed instance of an assembly on a sheet — a single click of the stamp
 * tool.
 *
 * ── One row per drop, not a quantity field ───────────────────────────────────
 * The alternative would be one row per assembly carrying a count. A row per
 * drop is what makes each instance individually selectable and removable, which
 * a misclick requires, and it is what lets the drawing show WHERE each one is.
 * The quantity an estimator wants is then just how many rows there are, derived
 * rather than stored — so a count can never drift from the marks on the plan.
 *
 * `assemblyName` is a snapshot taken at drop time, for the same reason bid
 * lines snapshot theirs: archiving or renaming the assembly later must not
 * make an existing takeoff unreadable.
 */
export const takeoffStamps = mysqlTable(
  "takeoff_stamps",
  {
    id: int("id").autoincrement().primaryKey(),
    bidId: int("bidId").notNull().references(() => bids.id, { onDelete: "cascade" }),
    sheetId: int("sheetId").notNull().references(() => bidPdfSheets.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),

    /** Provenance. Null once the library assembly is gone; the name remains. */
    assemblyId: int("assemblyId").references(() => assemblies.id, { onDelete: "set null" }),
    /** What it was called when it was dropped. Never re-read from the library. */
    assemblyName: varchar("assemblyName", { length: 255 }).notNull(),
    /**
     * The assembly's Category at drop time — the System layer this mark belongs
     * to. Snapshotted for the same reason the name is: an archived or deleted
     * assembly must not make an existing takeoff unfilterable.
     */
    assemblyCategory: varchar("assemblyCategory", { length: 64 }),
    /**
     * WHERE this one sits. Null means the user has not said yet, which the
     * Location filter shows as its own "Unassigned" band rather than hiding.
     */
    location: mysqlEnum("location", TAKEOFF_LOCATIONS),

    /** Where it sits, in PDF PAGE POINTS — never screen pixels, which zoom. */
    x: decimal("x", { precision: 12, scale: 4 }).notNull(),
    y: decimal("y", { precision: 12, scale: 4 }).notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => [
    index("takeoff_stamps_bidId_idx").on(t.bidId),
    index("takeoff_stamps_sheetId_idx").on(t.sheetId),
    index("takeoff_stamps_userId_idx").on(t.userId),
  ]
);

export type TakeoffStamp = typeof takeoffStamps.$inferSelect;
export type InsertTakeoffStamp = typeof takeoffStamps.$inferInsert;

// ─── Symbol → assembly links (takeoff phase 2c) ───────────────────────────────
/**
 * "This symbol on the legend means that assembly."
 *
 * ── Scope: the user's own library, not one bid ───────────────────────────────
 * Deliberately keyed to the USER and not to a bid or a sheet. An electrician
 * meets the same legend symbols on job after job, and the point of linking one
 * is that the next set of plans costs nothing to interpret. Scoping this per
 * bid would mean re-linking every symbol on every job, which is most of the
 * work the feature exists to remove.
 *
 * ASSEMBLIES_PLAN.md § TAKEOFF PAGE REDESIGN anticipates going further —
 * "legend memory per architect", so links learned on one firm's drawings carry
 * to the next set from the same firm. That needs a notion of who drew the plans,
 * which nothing captures yet. Per user is the widest scope available today and
 * is a strict subset of that, so nothing here has to be undone to get there.
 *
 * ── Identity comes from the user, not from image recognition ─────────────────
 * Reading a symbol off a drawing is the AI phase's job. Here the user boxes a
 * symbol on the legend and names it, and that name is the key. The stored crop
 * is only so they recognise it again.
 */
export const symbolLinks = mysqlTable(
  "symbol_links",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),

    /** What the user calls the symbol. Matched case-insensitively via `key`. */
    label: varchar("label", { length: 255 }).notNull(),
    /** Lower-cased, collapsed label — the thing uniqueness is judged on. */
    lookupKey: varchar("lookupKey", { length: 255 }).notNull(),

    /**
     * The assembly it means. Nullable on purpose: a symbol can be captured from
     * a legend and left unlinked, which is exactly the "which assembly does
     * this match?" state the first click resolves.
     */
    assemblyId: int("assemblyId").references(() => assemblies.id, { onDelete: "set null" }),

    /**
     * A small PNG data URL of the boxed region, so the legend panel shows the
     * symbol rather than only its name. Nullable — a link is still useful
     * without a picture, and the picture must never be what makes it work.
     */
    thumbnail: text("thumbnail"),

    /** Where it was first captured, for reference. Not a scoping key. */
    capturedFromSheetId: int("capturedFromSheetId")
      .references(() => bidPdfSheets.id, { onDelete: "set null" }),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => [
    index("symbol_links_userId_idx").on(t.userId),
    index("symbol_links_lookupKey_idx").on(t.lookupKey),
  ]
);

export type SymbolLink = typeof symbolLinks.$inferSelect;
export type InsertSymbolLink = typeof symbolLinks.$inferInsert;

// ─── Bid Line Items ───────────────────────────────────────────────────────────
/**
 * One assembly placed into a bid, at a quantity, with its cost SNAPSHOT.
 *
 * The snapshot is the point of this table (ASSEMBLIES_PLAN.md § PROJECT
 * ESTIMATES): the four pricing inputs are frozen when the line is added, so a
 * submitted bid never changes because a material price or labor rate moved
 * afterwards. `assemblyId` is kept for provenance only and is `set null` on
 * delete — deleting a library assembly must never alter a bid that used it.
 *
 * Only the raw INPUTS are stored, never a computed total. Every figure the UI
 * shows is recomputed from these through shared/pricing.ts, so a line can never
 * disagree with the engine that priced it.
 */
export const bidLineItems = mysqlTable(
  "bid_line_items",
  {
    id: int("id").autoincrement().primaryKey(),
    bidId: int("bidId").notNull().references(() => bids.id, { onDelete: "cascade" }),
    /** Provenance only. Null once the source assembly is gone. */
    assemblyId: int("assemblyId").references(() => assemblies.id, { onDelete: "set null" }),

    /** Assembly name at add time — the bid reads the same after a rename. */
    name: varchar("name", { length: 255 }).notNull(),
    qty: decimal("qty", { precision: 10, scale: 4 }).default("1").notNull(),

    /**
     * Which repeating unit this line belongs to, e.g. "Room 101". NULL for a
     * one-off line. Mass-duplicate copies a whole unit's lines under new labels.
     */
    unitLabel: varchar("unitLabel", { length: 128 }),

    /**
     * The kit this line came from, by NAME at add time — provenance for display,
     * never a live link. Deliberately not a foreign key: a kit is a shortcut for
     * adding several assemblies at once, and once they are on the bid each line
     * stands on its own and is separately editable. Renaming or deleting the kit
     * afterwards must not touch the bid.
     */
    sourceKitName: varchar("sourceKitName", { length: 255 }),

    // ── The snapshot: four inputs, frozen ──
    /** Material cost for ONE of this assembly. */
    snapshotMaterialCost: decimal("snapshotMaterialCost", { precision: 12, scale: 4 }).default("0").notNull(),
    /** Base labor hours before modifiers. */
    snapshotLaborHours: decimal("snapshotLaborHours", { precision: 10, scale: 4 }).default("0").notNull(),
    /** Summed modifier fraction, e.g. 0.32 for +32%. Already added, not compounded. */
    snapshotModifierPct: decimal("snapshotModifierPct", { precision: 6, scale: 4 }).default("0").notNull(),
    /** Hourly cost of the role assigned at add time. */
    snapshotLaborRate: decimal("snapshotLaborRate", { precision: 10, scale: 4 }).default("0").notNull(),
    /** Modifier names at add time, for showing why the hours are what they are. */
    snapshotModifierNames: json("snapshotModifierNames").$type<string[]>(),
    snapshotAt: timestamp("snapshotAt").defaultNow().notNull(),

    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => [
    index("bid_line_items_bidId_idx").on(t.bidId),
    index("bid_line_items_unitLabel_idx").on(t.unitLabel),
  ]
);

export type BidLineItem = typeof bidLineItems.$inferSelect;
export type InsertBidLineItem = typeof bidLineItems.$inferInsert;

// ─── Kits ─────────────────────────────────────────────────────────────────────
/**
 * A named bundle of assemblies at fixed quantities — "Bedroom package" being
 * 4 receptacles, a switch and a light.
 *
 * ── Scope, deliberately narrow ───────────────────────────────────────────────
 *  • A kit holds ASSEMBLIES only, never raw materials. One level of nesting:
 *    Kit → Assemblies → Materials. No kits inside kits.
 *  • Quantities are set BY HAND from the estimator's own judgement. Nothing
 *    here derives a count from square footage, room dimensions or code spacing
 *    — that is a separate, much larger feature and is not being built.
 *  • A kit is a shortcut for adding several assemblies to a bid at once. It is
 *    not a thing that lives on the bid: adding one produces ordinary line
 *    items, each snapshotted and each independently editable afterwards.
 *
 * Same baseline/fork ownership as every other library table.
 */
export const kits = mysqlTable(
  "kits",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").references(() => users.id, { onDelete: "cascade" }),
    baselineId: int("baselineId"),
    baselineVersion: int("baselineVersion"),
    version: int("version").default(1).notNull(),

    name: varchar("name", { length: 255 }).notNull(),
    description: varchar("description", { length: 512 }),

    /** active / archived / deleted. See materials.status — same lifecycle. */
    status: mysqlEnum("status", LIBRARY_STATUSES).default("active").notNull(),
    archivedAt: timestamp("archivedAt"),

    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => [
    index("kits_userId_idx").on(t.userId),
    index("kits_baselineId_idx").on(t.baselineId),
    index("kits_status_idx").on(t.status),
    index("kits_status_idx").on(t.status),
  ]
);

export type Kit = typeof kits.$inferSelect;
export type InsertKit = typeof kits.$inferInsert;

/** Which assemblies are in a kit, and how many of each. */
export const kitAssemblies = mysqlTable(
  "kit_assemblies",
  {
    id: int("id").autoincrement().primaryKey(),
    kitId: int("kitId").notNull().references(() => kits.id, { onDelete: "cascade" }),
    assemblyId: int("assemblyId").notNull().references(() => assemblies.id, { onDelete: "cascade" }),
    qty: decimal("qty", { precision: 10, scale: 4 }).default("1").notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
  },
  t => [
    index("kit_assemblies_kitId_idx").on(t.kitId),
    index("kit_assemblies_assemblyId_idx").on(t.assemblyId),
  ]
);

export type KitAssembly = typeof kitAssemblies.$inferSelect;
export type InsertKitAssembly = typeof kitAssemblies.$inferInsert;

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
