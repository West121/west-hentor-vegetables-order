import { describe, expect, it } from "vitest";

import { resolveMediaUrl } from "./media";

describe("resolveMediaUrl", () => {
  it("returns empty string for empty input", () => {
    expect(resolveMediaUrl("https://example.com", "")).toBe("");
    expect(resolveMediaUrl("https://example.com", null)).toBe("");
    expect(resolveMediaUrl("https://example.com", undefined)).toBe("");
  });

  it("keeps absolute urls unchanged", () => {
    expect(
      resolveMediaUrl("https://example.com", "https://cdn.example.com/a.jpg"),
    ).toBe("https://cdn.example.com/a.jpg");
    expect(resolveMediaUrl("https://example.com", "wxfile://abc")).toBe(
      "wxfile://abc",
    );
  });

  it("prefixes /uploads urls with apiBaseUrl", () => {
    expect(resolveMediaUrl("https://example.com/", "/uploads/a.jpg")).toBe(
      "https://example.com/uploads/a.jpg",
    );
  });

  it("does not touch other root paths", () => {
    expect(resolveMediaUrl("https://example.com", "/assets/a.jpg")).toBe(
      "/assets/a.jpg",
    );
  });
});
