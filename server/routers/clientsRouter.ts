/**
 * Clients API.
 *
 * Who the work is for, as a record rather than a string retyped on every bid.
 * See the `clients` table comment in drizzle/schema.ts for what this is
 * foundational to — historical bid search, sales tax reading the job address,
 * and government-bid contract fields. None of those are built here; this is
 * ordinary CRUD plus the link to a bid, and it stops there deliberately.
 *
 * ── Assigning is a bid edit, not a client edit ───────────────────────────────
 * `bids.update` already owns every field on a bid, so `clientId` joins it there
 * rather than growing an `assign` mutation here that would write to the same
 * column by a second path. The one procedure in this file that touches bids is
 * `bids`, which reads.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, scoped } from "../_core/trpc";
import { CLIENT_KINDS } from "../../drizzle/schema";
import * as db from "../db";

/**
 * This router's gate: a query needs `clients.view`, a mutation needs `clients.edit`.
 * Chosen by operation type in `scoped` so a route added later is covered
 * without anyone remembering to tag it. See _core/trpc.ts.
 */
const procedure = scoped("clients.view", "clients.edit");

const nameSchema = z.string().trim().min(1).max(255);

/**
 * Optional free text, emptied to null.
 *
 * "" and NULL mean the same thing on every one of these fields — nothing was
 * entered — and collapsing them at the edge is what stops a blank string from
 * beating a real value in resolveBidClient (shared/bidClient.ts). Same `|| null`
 * the bid's own proposal fields get in bidsRouter.
 */
const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional();

async function requireClient(id: number, userId: number) {
  const client = await db.getClientById(id, userId);
  if (!client)
    throw new TRPCError({ code: "NOT_FOUND", message: "Client not found." });
  return client;
}

export const clientsRouter = router({
  /** Live clients, A–Z, each with how many bids point at it. */
  list: procedure.query(async ({ ctx }) => {
    const [rows, counts] = await Promise.all([
      db.getClientsByUser(ctx.scope.dataUserId),
      db.countBidsPerClient(ctx.scope.dataUserId),
    ]);
    return rows.map(client => ({
      ...client,
      bidCount: counts.get(client.id) ?? 0,
    }));
  }),

  /** Archived clients. Kept indefinitely — nothing purges a client. */
  archived: procedure.query(async ({ ctx }) => {
    return db.getArchivedClients(ctx.scope.dataUserId);
  }),

  get: procedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      return requireClient(input.id, ctx.scope.dataUserId);
    }),

  /**
   * Every bid for this client, newest first, archived ones included.
   *
   * The archived ones are the point: "what did I quote them last time" is a
   * question about history, and a bid being off the dashboard does not make it
   * stop having happened.
   */
  bids: procedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      await requireClient(input.id, ctx.scope.dataUserId);
      return db.getBidsForClient(input.id, ctx.scope.dataUserId);
    }),

  create: procedure
    .input(
      z.object({
        name: nameSchema,
        kind: z.enum(CLIENT_KINDS).default("company"),
        contactName: optionalText(255),
        address: optionalText(512),
        phone: optionalText(64),
        email: optionalText(320),
        notes: optionalText(4000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = await db.createClient({
        userId: ctx.scope.dataUserId,
        name: input.name,
        kind: input.kind,
        contactName: input.contactName || null,
        address: input.address || null,
        phone: input.phone || null,
        email: input.email || null,
        notes: input.notes || null,
      });
      return db.getClientById(id, ctx.scope.dataUserId);
    }),

  update: procedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: nameSchema.optional(),
        kind: z.enum(CLIENT_KINDS).optional(),
        contactName: optionalText(255),
        address: optionalText(512),
        phone: optionalText(64),
        email: optionalText(320),
        notes: optionalText(4000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...rest } = input;
      await requireClient(id, ctx.scope.dataUserId);

      const patch: Record<string, unknown> = {};
      if (rest.name !== undefined) patch.name = rest.name;
      if (rest.kind !== undefined) patch.kind = rest.kind;
      // Omitting a key leaves it alone; passing null or "" clears it.
      for (const field of [
        "contactName",
        "address",
        "phone",
        "email",
        "notes",
      ] as const) {
        if (rest[field] !== undefined) patch[field] = rest[field] || null;
      }

      if (Object.keys(patch).length > 0)
        await db.updateClient(id, ctx.scope.dataUserId, patch);
      return db.getClientById(id, ctx.scope.dataUserId);
    }),

  /**
   * Take a client off the working list.
   *
   * Deliberately the only removal offered. There is no delete-forever here, in
   * contrast to bids: destroying the row would null `clientId` on every bid
   * that pointed at it, which unpicks exactly the history this record exists to
   * hold. Archiving keeps the link intact and the name printable.
   */
  archive: procedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const client = await requireClient(input.id, ctx.scope.dataUserId);
      if (client.archivedAt)
        return {
          success: true,
          archivedAt: client.archivedAt,
          alreadyArchived: true,
        };
      const now = new Date();
      await db.archiveClient(input.id, ctx.scope.dataUserId, now);
      return { success: true, archivedAt: now, alreadyArchived: false };
    }),

  restore: procedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const client = await requireClient(input.id, ctx.scope.dataUserId);
      if (!client.archivedAt) return { success: true, alreadyLive: true };
      await db.restoreClient(input.id, ctx.scope.dataUserId);
      return { success: true, alreadyLive: false };
    }),
});
