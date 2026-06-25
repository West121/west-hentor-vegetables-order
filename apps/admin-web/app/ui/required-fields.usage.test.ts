import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readUiSource(fileName: string) {
  return readFileSync(join(process.cwd(), "app/ui", fileName), "utf8");
}

describe("admin required field markers", () => {
  it("uses a shared red required marker component", () => {
    const source = readUiSource("required-mark.tsx");

    expect(source).toContain("text-red-500");
    expect(source).toContain("RequiredLabel");
    expect(source).toContain("aria-hidden");
  });

  it("marks core admin user and role form fields as required", () => {
    const adminUsers = readUiSource("system-management-panel.tsx");
    const roles = readUiSource("role-management-panel.tsx");

    expect(adminUsers).toContain("<RequiredLabel>登录账号</RequiredLabel>");
    expect(adminUsers).toContain("<RequiredLabel>姓名</RequiredLabel>");
    expect(adminUsers).toContain("<RequiredLabel>初始密码</RequiredLabel>");
    expect(adminUsers).toContain("<RequiredLabel>状态</RequiredLabel>");
    expect(adminUsers).toContain("<RequiredLabel>");
    expect(adminUsers).toContain("角色{loadingRoles ? ");
    expect(roles).toContain("<RequiredLabel>角色名称</RequiredLabel>");
    expect(roles).toContain("<RequiredLabel>角色编码</RequiredLabel>");
    expect(roles).toContain("<RequiredLabel>角色权限</RequiredLabel>");
  });

  it("marks business edit modal fields that block saving as required", () => {
    const member = readUiSource("member-management-panel.tsx");
    const packageTemplate = readUiSource("package-template-management-panel.tsx");
    const packageUser = readUiSource("package-management-panel.tsx");
    const dish = readUiSource("dish-management-panel.tsx");
    const task = readUiSource("task-management-panel.tsx");

    expect(member).toContain("<RequiredLabel>收货人</RequiredLabel>");
    expect(member).toContain("<RequiredLabel>联系电话</RequiredLabel>");
    expect(member).toContain("<RequiredLabel>详细地址</RequiredLabel>");
    expect(member).toContain("required={form.status === \"DISABLED\"}");
    expect(packageTemplate).toContain("<RequiredLabel>套餐名称</RequiredLabel>");
    expect(packageTemplate).toContain("<RequiredLabel>权益名称</RequiredLabel>");
    expect(packageUser).toContain("<RequiredLabel>会员</RequiredLabel>");
    expect(packageUser).toContain("<RequiredLabel>操作原因</RequiredLabel>");
    expect(dish).toContain("<RequiredLabel>菜品名称</RequiredLabel>");
    expect(dish).toContain("<RequiredLabel>调整斤数</RequiredLabel>");
    expect(task).toContain("<RequiredLabel>任务名称</RequiredLabel>");
    expect(task).toContain("<RequiredLabel>关联菜品</RequiredLabel>");
    expect(task).toContain("required");
  });
});
