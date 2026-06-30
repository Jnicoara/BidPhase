import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

// ─── Materials Database ────────────────────────────────────────────────────────
// Stores user-imported material catalog entries (CSV/JSON upload via Settings).
// Used by the CatalogPicker search in the Unit Count panel.

const materialItemSchema = z.object({
  itemCode: z.string().max(128).optional(),
  description: z.string().min(1).max(512),
  unit: z.string().max(32).default("EA"),
  unitMaterialCost: z.number().min(0).default(0),
  baseLaborHours: z.number().min(0).default(0),
  phase: z.string().max(128).optional(),
  source: z.string().max(64).default("custom"),
  externalSku: z.string().max(128).optional(),
});

export const dataRouter = router({
  materials: router({
    /** List all active user materials */
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserMaterials(ctx.user.id);
    }),

    /** Bulk import materials from a parsed CSV/JSON upload */
    bulkImport: protectedProcedure
      .input(
        z.object({
          items: z.array(materialItemSchema).min(1).max(5000),
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
          phase: item.phase ?? null,
          externalSku: item.externalSku ?? null,
        }));
        await db.bulkInsertUserMaterials(rows);
        return { success: true, count: rows.length };
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
  }),
});
