import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("task management modal usage", () => {
  it("opens task detail in the shared draggable modal instead of forcing edit mode", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/task-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("Eye");
    expect(source).toContain('mode: "detail"');
    expect(source).toContain("openDetailModal");
    expect(source).toContain('title="查看详情"');
    expect(source).toContain("任务详情");
    expect(source).toContain('modal.mode !== "detail"');
  });
});
