import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("package management reserved purchase entry", () => {
  it("removes the WeChat package purchase placeholder from the user package page", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/package-management-panel.tsx"),
      "utf8",
    );

    expect(source).not.toContain("购买套餐预留");
    expect(source).not.toContain("微信支付暂未开放");
  });

  it("opens user package detail in the shared draggable modal without an operation form", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/package-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("Eye");
    expect(source).toContain(
      'type ModalMode = "adjust" | "delete" | "detail" | "freeze" | "unfreeze"',
    );
    expect(source).toContain('openModal(item, "detail")');
    expect(source).toContain('data-icon="inline-start"');
    expect(source).toContain("查看");
    expect(source).toContain("用户套餐详情");
    expect(source).toContain('modal.mode !== "detail"');
    expect(source).toContain('{modal.mode === "detail" ? "关闭" : "取消"}');
  });

  it("supports manual user package creation and guarded deletion", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/package-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("新增用户套餐");
    expect(source).toContain('fetch("/api/admin/user-packages"');
    expect(source).toContain('openModal(item, "delete")');
    expect(source).toContain("已有订单记录的套餐请使用冻结");
    expect(source).toContain('method: isAdjust ? "PATCH" : isDelete ? "DELETE" : "POST"');
  });

  it("keeps template-derived package totals read-only during creation", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/package-management-panel.tsx"),
      "utf8",
    );
    const createPayload = source.match(
      /fetch\("\/api\/admin\/user-packages"[\s\S]*?method: "POST"/,
    )?.[0];

    expect(source).toContain("updateCreateTemplate(templateId)");
    expect(source).toContain("readOnly");
    expect(createPayload).toBeTruthy();
    expect(createPayload).not.toContain("totalTimes: createForm.totalTimes");
    expect(createPayload).not.toContain("weightLimitJin: createForm.weightLimitJin");
  });

  it("keeps package summary cards independent from list filters", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/package-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("function shouldRefreshPackageSummary");
    expect(source).toContain("filters.statusFilter === \"ALL\"");
    expect(source).toContain("!filters.query.trim()");
    expect(source).toContain("if (shouldRefreshPackageSummary(filters))");
    expect(source).toContain("setSummary(nextList.summary)");
  });

  it("shows package detail and usage records in the detail modal", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/package-management-panel.tsx"),
      "utf8",
    );
    const modelSource = readFileSync(
      join(process.cwd(), "app/ui/package-management-model.ts"),
      "utf8",
    );

    expect(modelSource).toContain("benefits?: Array");
    expect(source).toContain("套餐详情");
    expect(source).toContain("附加权益");
    expect(source).toContain("使用明细");
    expect(source).toContain("共 {packageUsageRows(modal.item).length} 条");
    expect(source).toContain("packageUsageRows(modal.item)");
    expect(source).toContain("订单内容");
    expect(source).toContain("formatPackageOrderContent(order)");
    expect(source).toContain("AdminOverflowText");
    expect(source).toContain("ORDER_STATUS_LABELS");
    expect(source).toContain("暂无使用明细");
  });
});
