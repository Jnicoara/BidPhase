/**
 * Is the navigation helper pointed at a model the gateway actually has?
 *
 * ── The failure this exists to stop ──────────────────────────────────────────
 * A wrong model id does not throw at startup, does not fail a type check and
 * does not show the user an error. The request is simply rejected, the helper
 * returns its "I'm not sure" fallback, and the feature looks like it works and
 * never answers. It shipped that way once already — pointed at an OpenAI id, on
 * an app that otherwise only talks to Claude — and nothing anywhere caught it.
 *
 * So the id is checked against the live list rather than against a hardcoded
 * copy of it. A hardcoded copy would only ever assert that two constants in
 * this repo agree with each other, which is the thing that was already true
 * while the id was wrong.
 *
 * ── Why it skips instead of failing without a key ────────────────────────────
 * `listLLMModels` needs BUILT_IN_FORGE_API_KEY. Local checkouts and CI often do
 * not have it, and a test that fails there would be turned off within a week —
 * at which point it stops guarding anything. Skipping keeps it honest: it is
 * silent where it cannot know, and definitive wherever a credential exists,
 * which includes any environment the feature could actually run in.
 */
import { describe, it, expect } from "vitest";
import { listLLMModels } from "./_core/llm";
import { NAVIGATION_MODEL } from "./routers/navigationRouter";

const hasGateway = !!process.env.BUILT_IN_FORGE_API_KEY;

describe("navigation helper model", () => {
  it("is a Claude model", () => {
    // One vendor. The alias suggester already uses Claude and the co-pilot
    // will; a second provider for a feature this small buys nothing and costs
    // a set of credentials to manage. This assertion is cheap and runs
    // everywhere, unlike the live check below.
    expect(NAVIGATION_MODEL.toLowerCase()).toContain("claude");
  });

  it("is a Haiku-class model, not a heavier tier", () => {
    // Deciding "which of eleven screens" is lookup, not reasoning. If this ever
    // needs to change, it should be a deliberate edit with a reason, not a
    // silent upgrade that multiplies the cost of a help feature.
    expect(NAVIGATION_MODEL.toLowerCase()).toContain("haiku");
  });

  it.skipIf(!hasGateway)("exists on the connected gateway", async () => {
    const models = await listLLMModels();
    const available = models.data.map(m => m.id);

    expect(
      available,
      `NAVIGATION_MODEL "${NAVIGATION_MODEL}" is not offered by this gateway.\n` +
        `Available ids:\n  ${available.join("\n  ")}`
    ).toContain(NAVIGATION_MODEL);
  });

  it.skipIf(!hasGateway)("the gateway offers at least one Claude model", async () => {
    // Separate from the check above so a failure says which problem it is: the
    // id being wrong, or the gateway not carrying Claude at all. Those need
    // completely different fixes and the distinction is invisible otherwise.
    const models = await listLLMModels();
    const claude = models.data.map(m => m.id).filter(id => id.toLowerCase().includes("claude"));

    expect(
      claude.length,
      `This gateway offers no Claude models at all. Available ids:\n  ${models.data
        .map(m => m.id)
        .join("\n  ")}`
    ).toBeGreaterThan(0);
  });
});
