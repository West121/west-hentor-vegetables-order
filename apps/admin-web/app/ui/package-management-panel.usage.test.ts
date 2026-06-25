import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("package management reserved purchase entry", () => {
  it("renders the WeChat package purchase placeholder as a disabled entry", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/package-management-panel.tsx"),
      "utf8",
    );
    const reservedEntry = source.match(
      /<button[\s\S]*?购买套餐预留[\s\S]*?<\/button>/,
    )?.[0];

    expect(reservedEntry).toBeTruthy();
    expect(reservedEntry).toContain("disabled");
    expect(reservedEntry).toContain("微信支付暂未开放");
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
    expect(source).toContain('title="查看详情"');
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
});
