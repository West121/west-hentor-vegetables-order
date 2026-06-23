import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("package template management modal usage", () => {
  it("opens package template detail in the shared draggable modal without entering edit mode", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/package-template-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("Eye");
    expect(source).toContain('mode: "detail"');
    expect(source).toContain("openDetailModal");
    expect(source).toContain('title="查看详情"');
    expect(source).toContain("套餐模板详情");
    expect(source).toContain('modal.mode !== "detail"');
    expect(source).toContain('readOnly={modal.mode === "detail"}');
    expect(source).toContain('disabled={modal.mode === "detail"}');
  });
});
