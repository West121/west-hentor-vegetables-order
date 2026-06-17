import { describe, expect, it } from "vitest";

import { buildObjectPublicUrl, createDishImageObjectKey } from "./object-storage";

describe("object storage helpers", () => {
  it("creates stable dish image object keys with safe extensions", () => {
    expect(
      createDishImageObjectKey({
        fileName: "番茄 活动款.PNG",
        now: new Date("2026-06-17T15:00:00.000Z"),
        randomId: "abc123",
      }),
    ).toBe("dishes/2026/06/17/abc123.png");
  });

  it("builds a public MinIO object URL", () => {
    expect(
      buildObjectPublicUrl("dishes/2026/06/17/abc123.png", {
        bucket: "hentor-assets",
        endpoint: "localhost",
        port: 9000,
        useSSL: false,
      }),
    ).toBe("http://localhost:9000/hentor-assets/dishes/2026/06/17/abc123.png");
  });
});
