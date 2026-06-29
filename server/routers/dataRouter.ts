import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

// ─── Materials Database ────────────────────────────────────────────────────────

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
  // ── Materials ──────────────────────────────────────────────────────────────

  /** List all active user materials */
  materials: router({
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

  // ── Assemblies ─────────────────────────────────────────────────────────────

  assemblies: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserAssemblies(ctx.user.id);
    }),

    upsert: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive().optional(),
          name: z.string().min(1).max(255),
          description: z.string().max(2000).optional(),
          unit: z.string().max(32).default("EA"),
          phase: z.string().max(128).optional(),
          category: z.string().max(64).default("all"),
          components: z.array(
            z.object({
              description: z.string().min(1),
              unit: z.string().default("EA"),
              qty_per_unit: z.number().min(0),
              mock_unit_cost: z.number().min(0),
              base_labor_hrs: z.number().min(0),
            })
          ).min(1),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await db.upsertUserAssembly({
          ...input,
          userId: ctx.user.id,
          description: input.description ?? null,
          phase: input.phase ?? null,
        });
        return { success: true, id };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteUserAssembly(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ── Labor Standards ────────────────────────────────────────────────────────

  laborStandards: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserLaborStandards(ctx.user.id);
    }),

    upsert: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive().optional(),
          profileName: z.string().min(1).max(255),
          description: z.string().max(2000).optional(),
          laborMap: z.record(z.string(), z.number().min(0)),
          isDefault: z.boolean().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await db.upsertUserLaborStandard({
          ...input,
          userId: ctx.user.id,
          description: input.description ?? null,
        });
        return { success: true, id };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteUserLaborStandard(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ── API Connectors ─────────────────────────────────────────────────────────

  apiConnectors: router({
    /** List connectors — API keys are never returned */
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserApiConnectors(ctx.user.id);
    }),

    upsert: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive().optional(),
          name: z.string().min(1).max(255),
          connectorType: z.enum(["platt", "rexel", "wesco", "generic_rest"]).default("generic_rest"),
          baseUrl: z.string().url().max(512).optional(),
          apiKey: z.string().max(1024).optional(),
          config: z.record(z.string(), z.unknown()).optional(),
          isActive: z.boolean().default(true),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await db.upsertUserApiConnector({
          ...input,
          userId: ctx.user.id,
          baseUrl: input.baseUrl ?? null,
          apiKey: input.apiKey ?? null,
          config: input.config ?? null,
        });
        return { success: true, id };
      }),

    /** Test a connector by making a lightweight ping request */
    test: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const connector = await db.getUserApiConnectorWithKey(input.id, ctx.user.id);
        if (!connector) throw new TRPCError({ code: "NOT_FOUND", message: "Connector not found." });

        if (!connector.baseUrl) {
          return { success: false, message: "No base URL configured." };
        }

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (connector.apiKey) headers["Authorization"] = `Bearer ${connector.apiKey}`;

          const res = await fetch(connector.baseUrl, {
            method: "GET",
            headers,
            signal: controller.signal,
          });
          clearTimeout(timeout);

          const status = res.ok ? "ok" : "error" as const;
          const db2 = await import("../db");
          await db.upsertUserApiConnector({
            id: connector.id,
            userId: ctx.user.id,
            name: connector.name,
            connectorType: connector.connectorType,
            lastTestedAt: new Date(),
            lastTestStatus: status,
          });

          return { success: res.ok, statusCode: res.status, message: res.ok ? "Connection successful" : `HTTP ${res.status}` };
        } catch (err) {
          return { success: false, message: err instanceof Error ? err.message : "Connection failed" };
        }
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteUserApiConnector(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ── Estimate Sessions ──────────────────────────────────────────────────────

  estimates: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number().int().positive().optional() }))
      .query(async ({ input, ctx }) => {
        return db.getEstimateSessionsByUser(ctx.user.id, input.projectId);
      }),

    save: protectedProcedure
      .input(
        z.object({
          projectId: z.number().int().positive().optional(),
          name: z.string().max(255).optional(),
          category: z.string().max(64),
          crewFactor: z.number().min(0.1).max(10).default(1.0),
          laborRate: z.number().min(0).default(85),
          totalMaterial: z.number().min(0).default(0),
          totalLaborHours: z.number().min(0).default(0),
          totalLaborCost: z.number().min(0).default(0),
          grandTotal: z.number().min(0).default(0),
          rows: z.unknown().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const id = await db.saveEstimateSession({
          ...input,
          userId: ctx.user.id,
          projectId: input.projectId ?? null,
          name: input.name ?? null,
          rows: input.rows ?? null,
        });
        return { success: true, id };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteEstimateSession(input.id, ctx.user.id);
        return { success: true };
      }),
  }),
});
