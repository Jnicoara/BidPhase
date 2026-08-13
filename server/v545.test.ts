/**
 * v5.45 — Integration tests for new routers
 * Tests: masterItems, masterAssemblies, masterLaborRates, bidSummary
 */
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-open-id",
      name: "Test User",
      email: "test@test.com",
      role: "admin",
      loginMethod: "manus",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("masterItems router", () => {
  let createdId: number;

  it("creates a master item", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = (await caller.masterItems.create({
      itemCode: "TEST-001",
      description: "Test Item v545",
      unit: "EA",
      masterMaterialCost: 10.5,
      masterLaborHours: 0.25,
    })) as { id?: number; description?: string };
    expect(result.id).toBeTypeOf("number");
    expect(result.description).toBe("Test Item v545");
    createdId = result.id!;
  });

  it("lists master items and finds the created one", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const items = await caller.masterItems.list();
    expect(Array.isArray(items)).toBe(true);
    const found = items.find(i => i.id === createdId);
    expect(found).toBeDefined();
  });

  it("updates a master item", async () => {
    if (!createdId) return;
    const caller = appRouter.createCaller(createAdminCtx());
    await expect(
      caller.masterItems.update({
        id: createdId,
        description: "Updated Test Item v545",
        masterMaterialCost: 12.0,
      })
    ).resolves.not.toThrow();
  });

  it("deletes a master item", async () => {
    if (!createdId) return;
    const caller = appRouter.createCaller(createAdminCtx());
    await expect(
      caller.masterItems.delete({ id: createdId })
    ).resolves.not.toThrow();
  });
});

describe("masterLaborRates router", () => {
  let rateId: number;

  it("creates a labor rate", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = (await caller.masterLaborRates.create({
      name: "Journeyman v545",
      ratePerHour: 85.0,
    })) as { id?: number; name?: string };
    expect(result.id).toBeTypeOf("number");
    expect(result.name).toBe("Journeyman v545");
    rateId = result.id!;
  });

  it("lists labor rates and finds the created one", async () => {
    if (!rateId) return;
    const caller = appRouter.createCaller(createAdminCtx());
    const rates = await caller.masterLaborRates.list();
    expect(Array.isArray(rates)).toBe(true);
    expect(rates.some(r => r.id === rateId)).toBe(true);
  });

  it("deletes a labor rate", async () => {
    if (!rateId) return;
    const caller = appRouter.createCaller(createAdminCtx());
    await expect(
      caller.masterLaborRates.delete({ id: rateId })
    ).resolves.not.toThrow();
  });
});

describe("masterAssemblies router", () => {
  let assemblyId: number;

  it("creates a master assembly", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = (await caller.masterAssemblies.create({
      name: "Test Assembly v545",
      description: "A test assembly",
    })) as { id?: number; name?: string };
    expect(result.id).toBeTypeOf("number");
    expect(result.name).toBe("Test Assembly v545");
    assemblyId = result.id!;
  });

  it("lists master assemblies and finds the created one", async () => {
    if (!assemblyId) return;
    const caller = appRouter.createCaller(createAdminCtx());
    const list = await caller.masterAssemblies.list();
    expect(Array.isArray(list)).toBe(true);
    expect(list.some(a => a.id === assemblyId)).toBe(true);
  });

  it("deletes a master assembly", async () => {
    if (!assemblyId) return;
    const caller = appRouter.createCaller(createAdminCtx());
    await expect(
      caller.masterAssemblies.delete({ id: assemblyId })
    ).resolves.not.toThrow();
  });
});

describe("bidSummary router", () => {
  let testProjectId: number;

  it("creates a project for bid summary test", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const project = await caller.projects.create({
      name: "Bid Summary Test Project",
      category: "commercial",
    });
    expect(project.id).toBeTypeOf("number");
    testProjectId = project.id;
  });

  it("upserts a bid summary", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.bidSummary.upsert({
      projectId: testProjectId,
      percentageLaborFactor: 1.1,
      lumpSumHours: 8,
      markupPct: 15,
      defaultLaborRateId: null,
    });
    expect(result).toBeDefined();
  });

  it("retrieves the upserted bid summary", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const fetched = await caller.bidSummary.get({ projectId: testProjectId });
    expect(fetched).not.toBeNull();
    expect(parseFloat(String(fetched?.percentageLaborFactor))).toBeCloseTo(1.1);
    expect(parseFloat(String(fetched?.lumpSumHours))).toBeCloseTo(8);
    expect(parseFloat(String(fetched?.markupPct))).toBeCloseTo(15);
  });

  it("cleans up test project", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    await expect(
      caller.projects.delete({ id: testProjectId })
    ).resolves.not.toThrow();
  });
});
