import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("admin login visual panel", () => {
  it("keeps the left side as a vegetable photo wall without marketing copy or stats", () => {
    const source = readFileSync(join(process.cwd(), "app/login/page.tsx"), "utf8");

    expect((source.match(/<img/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(source).toContain("grid-cols-2");
    expect(source).not.toContain("从套餐、预订到配送任务");
    expect(source).not.toContain("总部 + 加盟门店统一运营");
    expect(source).not.toContain("text-5xl");
  });
});
