/**
 * The same-origin upload route answers to the COMPANY, not to the uploader.
 *
 * ── Why this is its own file ─────────────────────────────────────────────────
 * server/planUpload.test.ts covers `checkProxyUpload`, a pure function, and is
 * deliberately free of mocks and fixtures. These tests need the opposite —
 * a real company, several members, and a faked session — so they live apart
 * rather than dragging `vi.mock` into a file whose whole point is not needing
 * it.
 *
 * ── The bug being pinned ─────────────────────────────────────────────────────
 * The handler scoped by `user.id`, the signed-in person, while every row in
 * this app is filed under the company OWNER's id. Those are the same number
 * only for an owner in their own company, so for an admin or an estimator the
 * route looked up a bid that (to it) did not exist and answered "Bid not
 * found" — and had it got past that, the key it minted carried the actor's id
 * and `confirmAttach` would have refused it.
 *
 * It hid for as long as this route was only a fallback behind the direct
 * browser PUT. With the storage bucket's CORS rule still unapplied the direct
 * path fails for everyone, so the fallback is the only way a plan gets
 * attached — and it worked for exactly one person per company.
 *
 * ── What these tests can and cannot reach ────────────────────────────────────
 * Everything up to the moment storage is called. There are no Forge
 * credentials outside deployed infrastructure, so a request that passes every
 * check ends at the storage step — and that is the assertion: getting AS FAR
 * AS storage is the proof that scoping and permission let it through. Nothing
 * here pretends to test the transfer.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";
import type { Request, Response } from "express";

vi.mock("./_core/sdk", () => ({
  sdk: { authenticateRequest: vi.fn() },
}));

import { sdk } from "./_core/sdk";
import { planUploadHandler } from "./planUpload";
import { getDb } from "./db";
import { bids, companies, companyMembers, users } from "../drizzle/schema";

const OWNER = 9921;
const ADMIN = 9922;
const ESTIMATOR = 9923;
const VIEWER = 9924;
const OUTSIDER = 9925;
const ALL = [OWNER, ADMIN, ESTIMATOR, VIEWER, OUTSIDER];

const hasDb = Boolean(process.env.DATABASE_URL);
const uniq = () => `${Date.now()}${Math.random()}`;

/** A response that records what the handler said, rather than sending it. */
function fakeResponse() {
  const recorded: { status: number; body: unknown } = { status: 0, body: null };
  const res = {
    status(code: number) {
      recorded.status = code;
      return this;
    },
    json(body: unknown) {
      recorded.body = body;
      return this;
    },
  } as unknown as Response;
  return { res, recorded };
}

/**
 * A request carrying a body, because the handler streams `req` onward.
 *
 * Content-Length is what `checkProxyUpload` reads, so it has to be present and
 * under the fallback's ceiling or the request is refused before scoping is
 * ever consulted — which would make these tests pass for the wrong reason.
 */
function fakeRequest(bidId: number, filename = "Electrical Plans.pdf") {
  return {
    query: { bidId: String(bidId), filename },
    headers: { "content-length": String(4 * 1024 * 1024) },
  } as unknown as Request;
}

const asUser = (id: number) =>
  vi.mocked(sdk.authenticateRequest).mockResolvedValue({
    id,
    openId: `test-plan-scope-${id}`,
    role: "user",
    accessTier: "standard",
  } as never);

describe.skipIf(!hasDb)("who may upload a plan through the fallback", () => {
  let bidId = 0;
  let outsiderBidId = 0;

  beforeAll(async () => {
    if (!hasDb) return;
    const database = await getDb();
    if (!database) return;
    for (const id of ALL) {
      const [existing] = await database
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      if (!existing) {
        await database.insert(users).values({
          id,
          openId: `test-plan-scope-${id}`,
          name: `Plan scope user ${id}`,
        });
      }
    }
  });

  beforeEach(async () => {
    if (!hasDb) return;
    vi.mocked(sdk.authenticateRequest).mockReset();
    const database = await getDb();
    if (!database) return;

    await database.delete(bids).where(inArray(bids.userId, ALL));
    await database
      .delete(companyMembers)
      .where(inArray(companyMembers.userId, ALL));
    await database.delete(companies).where(inArray(companies.ownerUserId, ALL));

    const [company] = await database
      .insert(companies)
      .values({ name: `Plan scope Co ${uniq()}`, ownerUserId: OWNER });
    for (const [userId, role] of [
      [OWNER, "owner"],
      [ADMIN, "admin"],
      [ESTIMATOR, "estimator"],
      [VIEWER, "viewer"],
    ] as const) {
      await database.insert(companyMembers).values({
        companyId: company.insertId,
        userId,
        role,
        status: "active",
      });
    }

    const [other] = await database
      .insert(companies)
      .values({ name: `Rival Co ${uniq()}`, ownerUserId: OUTSIDER });
    await database.insert(companyMembers).values({
      companyId: other.insertId,
      userId: OUTSIDER,
      role: "owner",
      status: "active",
    });

    // Bids are filed under the company owner, as every other path files them.
    const [bid] = await database
      .insert(bids)
      .values({ userId: OWNER, name: `Plan scope bid ${uniq()}` });
    bidId = bid.insertId;
    const [theirs] = await database
      .insert(bids)
      .values({ userId: OUTSIDER, name: `Rival bid ${uniq()}` });
    outsiderBidId = theirs.insertId;
  });

  /**
   * Reaching storage means every check passed.
   *
   * With no Forge credentials the storage call fails, and the handler turns
   * that into a 502 with its own sentence. That is the success signal here:
   * a 404 or a 403 would mean the request was stopped on ownership or on
   * permission, which is exactly what is being tested.
   */
  function reachedStorage(recorded: { status: number; body: unknown }) {
    return (
      recorded.status === 502 ||
      (recorded.status === 200 && recorded.body !== null)
    );
  }

  it("lets the owner upload to their own bid", async () => {
    asUser(OWNER);
    const { res, recorded } = fakeResponse();
    await planUploadHandler(fakeRequest(bidId), res);
    expect(reachedStorage(recorded)).toBe(true);
  });

  it("lets an admin upload to the company's bid", async () => {
    // The regression. This answered 404 "Bid not found" because the bid is
    // filed under the owner and the handler looked it up under the admin.
    asUser(ADMIN);
    const { res, recorded } = fakeResponse();
    await planUploadHandler(fakeRequest(bidId), res);
    expect(recorded.status).not.toBe(404);
    expect(reachedStorage(recorded)).toBe(true);
  });

  it("lets an estimator upload, because building bids is the job", async () => {
    asUser(ESTIMATOR);
    const { res, recorded } = fakeResponse();
    await planUploadHandler(fakeRequest(bidId), res);
    expect(recorded.status).not.toBe(404);
    expect(reachedStorage(recorded)).toBe(true);
  });

  it("refuses a viewer, who cannot change a bid through tRPC either", async () => {
    // The route sits outside tRPC and so outside `scoped("bids.view",
    // "bids.edit")`. Without its own check the weaker path would be the real
    // rule, and a read-only account could push files into company storage.
    asUser(VIEWER);
    const { res, recorded } = fakeResponse();
    await planUploadHandler(fakeRequest(bidId), res);
    expect(recorded.status).toBe(403);
    expect(String((recorded.body as { message: string }).message)).toMatch(
      /viewer/i
    );
  });

  it("will not let one company upload into another's bid", async () => {
    asUser(OWNER);
    const { res, recorded } = fakeResponse();
    await planUploadHandler(fakeRequest(outsiderBidId), res);
    expect(recorded.status).toBe(404);
  });

  it("refuses a request with no session", async () => {
    vi.mocked(sdk.authenticateRequest).mockRejectedValue(
      new Error("no session")
    );
    const { res, recorded } = fakeResponse();
    await planUploadHandler(fakeRequest(bidId), res);
    expect(recorded.status).toBe(401);
  });

  it("refuses a cron identity", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({
      id: -1,
      openId: "cron-abc",
      isCron: true,
    } as never);
    const { res, recorded } = fakeResponse();
    await planUploadHandler(fakeRequest(bidId), res);
    expect(recorded.status).toBe(403);
  });
});
