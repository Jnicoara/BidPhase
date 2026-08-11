#!/usr/bin/env node
/**
 * smoke.mjs — drive a RUNNING HelixBid server over its real HTTP API.
 *
 * This is the agent's primary handle on the app. It authenticates the way a
 * browser does, then exercises the Materials library end to end: list, create,
 * fork-on-edit, revert, and the two refusals (removing a starter material,
 * duplicate names). Most work in this repo lands in server/db.ts and
 * server/routers/*, so this covers the layer PRs actually touch.
 *
 * Start the server first (see SKILL.md), then:
 *   node .claude/skills/run-bidphase/smoke.mjs
 *
 * Env:
 *   BASE_URL    skip port probing, e.g. http://localhost:3002
 *   JWT_SECRET  must match the running server. Default: local-dev-secret
 *   OPEN_ID     which user to act as. Default: test-open-id
 *
 * Exit code 0 = every check passed.
 */
import { mintToken } from "./devsession.mjs";

const PORTS = [3000, 3001, 3002, 3003, 3004, 3005];
const OPEN_ID = process.env.OPEN_ID || "test-open-id";

let pass = 0;
const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/**
 * The dev server takes the next free port, so 3000 is not a safe assumption —
 * and a stale server left running from an earlier session WILL answer on 3000
 * with a different JWT_SECRET. So probing for "something responds" is not
 * enough: the port only counts if our token actually authenticates against it.
 */
async function findBaseUrl(token) {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  const rejected = [];
  for (const port of PORTS) {
    const base = `http://localhost:${port}`;
    try {
      const res = await fetch(`${base}/api/trpc/auth.me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(2000),
      });
      const body = await res.json().catch(() => null);
      if (body?.result?.data?.json?.openId) return base;
      if (body) rejected.push(port);
    } catch {
      // port not listening — try the next
    }
  }
  if (rejected.length) {
    throw new Error(
      `A server answered on port(s) ${rejected.join(", ")} but rejected the token.\n` +
      `Almost always a stale dev server started with a different JWT_SECRET.\n` +
      `Kill it, or point at the right one with BASE_URL=http://localhost:<port>.`
    );
  }
  throw new Error(`No dev server found on ports ${PORTS.join(", ")}. Start it first (see SKILL.md).`);
}

/**
 * tRPC v11 + superjson over plain HTTP.
 * Queries take ?input={"json":…}; mutations POST {"json":…}; both unwrap to
 * result.data.json. Errors come back as error.json.message with HTTP 200/4xx.
 */
function makeClient(baseUrl, token) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  async function unwrap(res, path) {
    const body = await res.json().catch(() => null);
    if (body?.error) throw new Error(`${path}: ${body.error.json?.message ?? "unknown error"}`);
    return body?.result?.data?.json;
  }

  return {
    async query(path, input) {
      const qs = input === undefined ? "" : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
      return unwrap(await fetch(`${baseUrl}/api/trpc/${path}${qs}`, { headers }), path);
    },
    async mutate(path, input) {
      const res = await fetch(`${baseUrl}/api/trpc/${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ json: input }),
      });
      return unwrap(res, path);
    },
  };
}

async function expectReject(label, promise, pattern) {
  try {
    await promise;
    check(label, false, "expected a rejection but it succeeded");
  } catch (e) {
    check(label, pattern.test(e.message), `got: ${e.message}`);
  }
}

const token = await mintToken(OPEN_ID);
const baseUrl = await findBaseUrl(token);
console.log(`\nServer:  ${baseUrl}`);
console.log(`Acting as: ${OPEN_ID}\n`);

const api = makeClient(baseUrl, token);

// ── Auth ────────────────────────────────────────────────────────────────────
console.log("auth");
const me = await api.query("auth.me");
check("auth.me returns the signed-in user", me?.openId === OPEN_ID, `got ${me?.openId}`);

await expectReject(
  "unauthenticated calls are refused",
  makeClient(baseUrl, "not-a-real-token").query("materials.list"),
  /login|unauthor/i
);

// ── Library listing ─────────────────────────────────────────────────────────
console.log("\nmaterials.list");
const initial = await api.query("materials.list");
check("starter library is seeded", initial.length >= 28, `got ${initial.length} rows`);
check("baseline rows are owned by nobody", initial.some(m => m.userId === null));

const names = initial.map(m => m.name);
check("no duplicate names in the merged list", new Set(names).size === names.length);

// ── Create ──────────────────────────────────────────────────────────────────
console.log("\nmaterials.create");
const uniqueName = `Smoke widget ${Date.now()}`;
const created = await api.mutate("materials.create", { name: uniqueName, unitOfSale: "box", costPerUnit: 12.34 });
check("creates a user-owned material", created?.userId != null);
check("stores cost exactly", Number(created?.costPerUnit) === 12.34, `got ${created?.costPerUnit}`);

await expectReject(
  "refuses a duplicate name",
  api.mutate("materials.create", { name: uniqueName, unitOfSale: "each", costPerUnit: 1 }),
  /already exists/i
);
await expectReject(
  "refuses a cost too large for the column",
  api.mutate("materials.create", { name: `Too big ${Date.now()}`, unitOfSale: "each", costPerUnit: 1_000_000 }),
  /./
);

// ── Fork on edit ────────────────────────────────────────────────────────────
// Normalise first: a previous run may already have forked this row.
console.log("\nmaterials.update (fork on edit)");
const TARGET = "Wire nuts";
const before = (await api.query("materials.list")).find(m => m.name === TARGET);
if (before?.baselineId != null) await api.mutate("materials.revert", { id: before.id });

const target = (await api.query("materials.list")).find(m => m.name === TARGET);
const wasBaseline = target.userId === null;

const edited = await api.mutate("materials.update", { id: target.id, costPerUnit: 0.99 });
check("editing a starter material forks it", wasBaseline ? edited.forked === true : true);
check("the edit lands on a user-owned row", edited.material?.userId != null);
check("the fork points back at its baseline", edited.material?.baselineId != null);
check("the new cost is saved", Number(edited.material?.costPerUnit) === 0.99);

const afterFork = await api.query("materials.list");
check(
  "the fork replaces the baseline — still exactly one row for it",
  afterFork.filter(m => m.name === TARGET).length === 1
);
check("total row count is unchanged by forking", afterFork.length === initial.length + 1,
  `${afterFork.length} vs expected ${initial.length + 1}`);

// A second edit must NOT fork again.
const second = await api.mutate("materials.update", { id: edited.material.id, costPerUnit: 0.77 });
check("editing an existing copy does not fork again", second.forked === false);

// ── Revert ──────────────────────────────────────────────────────────────────
console.log("\nmaterials.revert");
const reverted = await api.mutate("materials.revert", { id: edited.material.id });
check("revert keeps the same row id", reverted?.id === edited.material.id);
check("revert restores the starter cost", Number(reverted?.costPerUnit) === 0.08, `got ${reverted?.costPerUnit}`);
check("the row is still the user's own copy after revert", reverted?.baselineId != null);

await expectReject(
  "refuses to revert a from-scratch material",
  api.mutate("materials.revert", { id: created.id }),
  /no original/i
);

// ── Deactivate ──────────────────────────────────────────────────────────────
console.log("\nmaterials.deactivate");
const baselineRow = (await api.query("materials.list")).find(m => m.userId === null);
await expectReject(
  "refuses to remove a starter material",
  api.mutate("materials.deactivate", { id: baselineRow.id }),
  /cannot be removed/i
);

await api.mutate("materials.deactivate", { id: created.id });
const afterRemove = await api.query("materials.list");
check("removing a user material hides it", !afterRemove.some(m => m.id === created.id));

// ── Result ──────────────────────────────────────────────────────────────────
console.log(`\n${pass} passed, ${failures.length} failed`);
if (failures.length) {
  console.log(`\nFailed:\n${failures.map(f => `  - ${f}`).join("\n")}`);
  process.exit(1);
}
console.log("Smoke OK\n");
