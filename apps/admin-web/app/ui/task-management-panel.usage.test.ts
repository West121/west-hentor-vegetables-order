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
    expect(source).toContain('data-icon="inline-start"');
    expect(source).toContain("查看");
    expect(source).toContain("任务详情");
    expect(source).toContain('modal.mode !== "detail"');
  });

  it("supports canceling pending or future tasks with an icon tooltip", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/task-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("Ban");
    expect(source).toContain("canCancelTask");
    expect(source).toContain("cancelTask");
    expect(source).toContain("/cancel");
    expect(source).toContain('aria-label="取消任务"');
    expect(source).toContain("已结束或已停用任务不可取消");
  });

  it("uses system dictionary labels when choosing task dishes", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/task-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("categoryOptions?: DishCategoryOption[]");
    expect(source).toContain("categoryLabelByCode");
    expect(source).not.toContain("CATEGORY_LABELS");
  });

  it("validates required task fields inline before calling the backend", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/task-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("validateTaskForm");
    expect(source).toContain("AdminFormField");
    expect(source).toContain("请输入任务名称");
    expect(source).toContain("请选择开始时间");
    expect(source).toContain("请选择至少一个关联菜品");
    expect(source).toContain("请为已选菜品填写总重量");
    expect(source).toContain("totalWeightJin");
    expect(source).toContain("hasTaskFormErrors(validationErrors)");
    expect(source).toContain("aria-invalid={invalid}");
  });
});
