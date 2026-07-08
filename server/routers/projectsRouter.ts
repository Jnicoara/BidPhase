import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

const PROJECT_STATUS = ["Bidding", "Won", "In Progress", "Lost"] as const;

export const projectsRouter = router({
  /** List all non-archived projects for the current user */
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getProjectsByUser(ctx.user.id);
  }),

  /** Search projects by name, customer, or address */
  search: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!input.query.trim()) return db.getProjectsByUser(ctx.user.id);
      return db.searchProjectsByUser(ctx.user.id, input.query.trim());
    }),

  /** Get a single project by id (must belong to current user) */
  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const project = await db.getProjectById(input.id, ctx.user.id);
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found." });
      return project;
    }),

  /** Create a new project */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        customerName: z.string().max(255).optional(),
        address: z.string().max(512).optional(),
        bidDate: z.string().optional(), // ISO date string "YYYY-MM-DD"
        notes: z.string().max(10000).optional(),
        status: z.enum(PROJECT_STATUS).optional(),
        description: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.createProject({
        userId: ctx.user.id,
        name: input.name,
        category: "electrical",
        description: input.description ?? null,
        customerName: input.customerName ?? null,
        address: input.address ?? null,
        bidDate: input.bidDate ? new Date(input.bidDate) : null,
        notes: input.notes ?? null,
        status: input.status ?? "Bidding",
      });
      const projects = await db.getProjectsByUser(ctx.user.id);
      return projects[0]; // most recently updated = just created
    }),

  /** Update project fields including expanded v5.45 fields */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(255).optional(),
        customerName: z.string().max(255).nullable().optional(),
        address: z.string().max(512).nullable().optional(),
        bidDate: z.string().nullable().optional(), // ISO date string "YYYY-MM-DD" or null
        notes: z.string().max(10000).nullable().optional(),
        status: z.enum(PROJECT_STATUS).optional(),
        description: z.string().max(2000).nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, bidDate, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (bidDate !== undefined) {
        data.bidDate = bidDate ? new Date(bidDate) : null;
      }
      await db.updateProject(id, ctx.user.id, data as Parameters<typeof db.updateProject>[2]);
      return { success: true };
    }),

  /** Archive a project (soft delete) */
  archive: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await db.archiveProject(input.id, ctx.user.id);
      return { success: true };
    }),

  /** Permanently delete a project and all its data */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteProject(input.id, ctx.user.id);
      return { success: true };
    }),
});
