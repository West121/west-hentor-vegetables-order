import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("favicon route", () => {
  it("serves a small branded icon without a missing favicon request", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    await expect(response.text()).resolves.toContain("HanYang Fresh");
  });
});
