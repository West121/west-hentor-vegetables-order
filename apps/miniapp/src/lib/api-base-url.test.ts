import { describe, expect, it } from "vitest";

import { resolveApiBaseUrl } from "./api-base-url-model";

describe("resolveApiBaseUrl", () => {
  it("uses the production API only for released miniapps", () => {
    expect(resolveApiBaseUrl("release")).toBe("https://mmprd.hentor.com:8103");
  });

  it("uses the test API for development and trial versions", () => {
    expect(resolveApiBaseUrl("develop")).toBe("https://mmprd.hentor.com:8203");
    expect(resolveApiBaseUrl("trial")).toBe("https://mmprd.hentor.com:8203");
    expect(resolveApiBaseUrl(undefined)).toBe("https://mmprd.hentor.com:8203");
  });
});
