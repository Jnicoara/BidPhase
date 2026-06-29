import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const projectsRouter = router({
  /** List all non-archived projects for the current user */
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getProjectsByUser(ctx.user.id);
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
        category: z.enum(["residential", "commercial", "industrial", "infrastructure"]).default("commercial"),
        description: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.createProject({
        userId: ctx.user.id,
        name: input.name,
        category: input.category,
        description: input.description ?? null,
      });
      const projects = await db.getProjectsByUser(ctx.user.id);
      return projects[0]; // most recently updated = just created
    }),

  /** Update project name, category, or description */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(255).optional(),
        category: z.enum(["residential", "commercial", "industrial", "infrastructure"]).optional(),
        description: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      await db.updateProject(id, ctx.user.id, data);
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
