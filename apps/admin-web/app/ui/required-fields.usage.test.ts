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

    expect(adminUsers).toContain('label="登录账号"');
    expect(adminUsers).toContain('label="姓名"');
    expect(adminUsers).toContain('label="初始密码"');
    expect(adminUsers).toContain('label="状态"');
    expect(adminUsers).toContain('label={loadingRoles ? "角色（刷新中）" : "角色"}');
    expect(roles).toContain('label="角色名称"');
    expect(roles).toContain('label="角色编码"');
    expect(roles).toContain('label="角色权限"');
    expect(roles).toContain("validateRoleForm");
    expect(roles).toContain("请选择至少一个角色权限");
  });

  it("marks business edit modal fields that block saving as required", () => {
    const member = readUiSource("member-management-panel.tsx");
    const packageTemplate = readUiSource("package-template-management-panel.tsx");
    const packageUser = readUiSource("package-management-panel.tsx");
    const dish = readUiSource("dish-management-panel.tsx");
    const task = readUiSource("task-management-panel.tsx");

    expect(member).toContain('label="收货人"');
    expect(member).toContain('label="联系电话"');
    expect(member).toContain('label="详细地址"');
    expect(member).toContain("required={form.status === \"DISABLED\"}");
    expect(packageTemplate).toContain('label="套餐名称"');
    expect(packageTemplate).toContain('label="权益名称"');
    expect(packageUser).toContain('label="会员"');
    expect(packageUser).toContain('label="操作原因"');
    expect(dish).toContain('label="菜品名称"');
    expect(dish).toContain('label="起订步进"');
    expect(task).toContain('label="任务名称"');
    expect(task).toContain('label="关联菜品"');
    expect(task).toContain("validateTaskForm");
    expect(task).toContain("请选择至少一个关联菜品");
  });
});
