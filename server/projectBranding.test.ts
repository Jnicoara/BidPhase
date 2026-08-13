import { describe, expect, it } from "vitest";

describe("managed HelixBid branding", () => {
  it("uses HelixBid as the managed deployment title", () => {
    expect(process.env.VITE_APP_TITLE).toBe("HelixBid");
  });
});
