import { describe, expect, it } from "vitest";
import { validateDirectAnthropicCredential } from "./directAnthropic";

describe("direct Anthropic credential", () => {
  it("authenticates with the server-only API key", async () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    expect(apiKey, "ANTHROPIC_API_KEY must be configured server-side").toBeTruthy();

    await expect(validateDirectAnthropicCredential()).resolves.toBeUndefined();
  }, 20_000);
});
