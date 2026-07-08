import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { CATALOG } from "../../client/src/lib/materialCatalog";
import * as db from "../db";

// ─── Materials Database ────────────────────────────────────────────────────────
// Stores user-imported material catalog entries (CSV/JSON upload via Settings).
// Used by the CatalogPicker search in the Unit Count panel.

const materialItemSchema = z.object({
  itemCode: z.string().max(128).optional(),
  category: z.string().max(128).optional(),
  description: z.string().min(1).max(512),
  unit: z.string().max(32).default("EA"),
  defaultPrice: z.number().min(0).optional(),
  userPrice: z.number().min(0).optional(),
  // Legacy field — kept for backward compat with CatalogPicker
  unitMaterialCost: z.number().min(0).default(0),
  baseLaborHours: z.number().min(0).default(0),
  phase: z.string().max(128).optional(),
  source: z.string().max(64).default("custom"),
  externalSku: z.string().max(128).optional(),
});

export const dataRouter = router({
  materials: router({
    /** List all active user materials, ordered by category then description */
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserMaterials(ctx.user.id);
    }),

    /**
     * Bulk import materials from a parsed CSV upload.
     * When replaceAll=true, the entire existing database is wiped first.
     */
    bulkImport: protectedProcedure
      .input(
        z.object({
          items: z.array(materialItemSchema).min(1).max(10000),
          replaceAll: z.boolean().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (input.replaceAll) {
          await db.clearUserMaterials(ctx.user.id);
        }
        const rows = input.items.map((item) => ({
          ...item,
          userId: ctx.user.id,
          itemCode: item.itemCode ?? null,
          category: item.category ?? null,
          phase: item.phase ?? null,
          externalSku: item.externalSku ?? null,
          defaultPrice: item.defaultPrice ?? null,
          userPrice: item.userPrice ?? null,
          // Mirror defaultPrice into unitMaterialCost for backward compat
          unitMaterialCost: item.defaultPrice ?? item.unitMaterialCost ?? 0,
        }));
        await db.bulkInsertUserMaterials(rows);
        return { success: true, count: rows.length };
      }),

    /**
     * Set the userPrice for a single material row.
     * Automatically stamps lastUpdated to now.
     * Pass null to clear the userPrice (same as reset but without confirmation).
     */
    updatePrice: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          userPrice: z.number().min(0).nullable(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await db.updateMaterialPrice(input.id, ctx.user.id, input.userPrice);
        return { success: true };
      }),

    /**
     * Reset userPrice + lastUpdated to null for a single row.
     * Returns the item to its defaultPrice baseline.
     */
    resetPrice: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await db.resetMaterialPrice(input.id, ctx.user.id);
        return { success: true };
      }),

    /**
     * Add a single custom material row manually (no CSV required).
     */
    addSingle: protectedProcedure
      .input(materialItemSchema)
      .mutation(async ({ input, ctx }) => {
        await db.addSingleMaterial({
          ...input,
          userId: ctx.user.id,
          itemCode: input.itemCode ?? null,
          category: input.category ?? null,
          phase: input.phase ?? null,
          externalSku: input.externalSku ?? null,
          defaultPrice: input.defaultPrice ?? null,
          userPrice: input.userPrice ?? null,
          unitMaterialCost: input.defaultPrice ?? input.unitMaterialCost ?? 0,
        });
        return { success: true };
      }),

    /**
     * Update description/unit/category/itemCode/defaultPrice for a single row.
     */
    updateRow: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          description: z.string().min(1).max(512).optional(),
          unit: z.string().max(32).optional(),
          category: z.string().max(128).nullable().optional(),
          itemCode: z.string().max(128).nullable().optional(),
          defaultPrice: z.number().min(0).nullable().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, ...patch } = input;
        await db.updateMaterialRow(id, ctx.user.id, patch as Parameters<typeof db.updateMaterialRow>[2]);
        return { success: true };
      }),

    /** Delete a single material row */
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteUserMaterial(input.id, ctx.user.id);
        return { success: true };
      }),

    /** Clear all user materials */
    clear: protectedProcedure.mutation(async ({ ctx }) => {
      await db.clearUserMaterials(ctx.user.id);
      return { success: true };
    }),

    /** Check whether the user has any materials in their database */
    hasMaterials: protectedProcedure.query(async ({ ctx }) => {
      const items = await db.getUserMaterials(ctx.user.id);
      return { count: items.length, hasData: items.length > 0 };
    }),

    /**
     * Seed the user's material database from the built-in master catalog.
     * When replaceAll=true, wipes existing data first and returns a snapshot
     * of the old data so the client can offer an Undo action.
     */
    seedFromCatalog: protectedProcedure
      .input(z.object({ replaceAll: z.boolean().default(false) }))
      .mutation(async ({ input, ctx }) => {
        // Capture snapshot BEFORE wiping so the client can undo
        let snapshot: Awaited<ReturnType<typeof db.getUserMaterials>> = [];
        if (input.replaceAll) {
          snapshot = await db.getUserMaterials(ctx.user.id);
          await db.clearUserMaterials(ctx.user.id);
        }
        const rows = CATALOG.map((item) => ({
          userId: ctx.user.id,
          itemCode: item.id,
          category: item.category,
          description: item.description,
          unit: item.unit,
          defaultPrice: item.unitPrice,
          userPrice: null,
          unitMaterialCost: item.unitPrice,
          baseLaborHours: 0,
          phase: null,
          source: "catalog" as const,
          externalSku: null,
        }));
        await db.bulkInsertUserMaterials(rows);
        return { success: true, count: rows.length, snapshot };
      }),

    /**
     * Upsert a userPrice for a material matched by description (case-insensitive keyword match).
     * Used by the price sync prompt when user edits a price in Unit Count or the run tool.
     * - If a row with a matching description exists, its userPrice is updated.
     * - If no match is found, a new row is inserted with the given price as both defaultPrice and userPrice.
     * Returns { updated: true } if an existing row was found, { updated: false } if a new row was inserted.
     */
    upsertPriceByDescription: protectedProcedure
      .input(
        z.object({
          description: z.string().min(1).max(512),
          userPrice: z.number().min(0),
          category: z.string().max(128).optional(),
          unit: z.string().max(32).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const allMaterials = await db.getUserMaterials(ctx.user.id);
        // Case-insensitive substring match on description
        const needle = input.description.toLowerCase().trim();
        const match = allMaterials.find(
          (m) => m.description.toLowerCase().includes(needle) ||
                 needle.includes(m.description.toLowerCase())
        );
        if (match) {
          await db.updateMaterialPrice(match.id, ctx.user.id, input.userPrice);
          return { updated: true, id: match.id };
        } else {
          // Insert a new row so the price is tracked going forward
          await db.addSingleMaterial({
            userId: ctx.user.id,
            description: input.description,
            category: input.category ?? null,
            unit: input.unit ?? "EA",
            defaultPrice: input.userPrice,
            userPrice: input.userPrice,
            unitMaterialCost: input.userPrice,
            baseLaborHours: 0,
            phase: null,
            source: "custom",
            itemCode: null,
            externalSku: null,
          });
          return { updated: false };
        }
      }),

    /**
     * Restore a snapshot of user materials (used for Undo after catalog reload).
     * Wipes current data and re-inserts the snapshot rows.
     */
    restoreSnapshot: protectedProcedure
      .input(
        z.object({
          snapshot: z.array(
            z.object({
              description: z.string(),
              category: z.string().nullable(),
              itemCode: z.string().nullable(),
              unit: z.string(),
              defaultPrice: z.number().nullable(),
              userPrice: z.number().nullable(),
              unitMaterialCost: z.number(),
              baseLaborHours: z.number(),
              phase: z.string().nullable(),
              source: z.string(),
              externalSku: z.string().nullable(),
              lastUpdated: z.string().nullable(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await db.clearUserMaterials(ctx.user.id);
        if (input.snapshot.length > 0) {
          const rows = input.snapshot.map((item) => ({
            userId: ctx.user.id,
            itemCode: item.itemCode,
            category: item.category,
            description: item.description,
            unit: item.unit,
            defaultPrice: item.defaultPrice,
            userPrice: item.userPrice,
            unitMaterialCost: item.unitMaterialCost,
            baseLaborHours: item.baseLaborHours,
            phase: item.phase,
            source: item.source,
            externalSku: item.externalSku,
          }));
          await db.bulkInsertUserMaterials(rows);
        }
        return { success: true, count: input.snapshot.length };
      }),
  }),
});
