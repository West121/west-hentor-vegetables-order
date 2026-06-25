import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("system management user modal usage", () => {
  it("opens admin user detail in the shared draggable modal without entering edit mode", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/system-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("Eye");
    expect(source).toContain('mode: "detail"');
    expect(source).toContain("openDetailModal");
    expect(source).toContain('title="查看详情"');
    expect(source).toContain("后台用户详情");
    expect(source).toContain('modal.mode !== "detail"');
    expect(source).toContain('readOnly={modal.mode === "detail"}');
    expect(source).toContain('disabled={modal.mode === "detail"}');
  });

  it("uses styled status and role controls inside the admin user modal", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/system-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("grid h-11 grid-cols-2");
    expect(source).toContain("aria-pressed={checked}");
    expect(source).not.toContain('type="checkbox"');
  });

  it("refreshes role options before creating or editing admin users", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/system-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("roleOptions");
    expect(source).toContain("reloadRoleOptions");
    expect(source).toContain("/api/admin/roles?page=1&pageSize=200");
    expect(source).toContain("void reloadRoleOptions");
  });

  it("shows concrete validation messages before saving admin users", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/system-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("function validateAdminUserForm");
    expect(source).toContain("请输入登录账号");
    expect(source).toContain("请输入用户姓名");
    expect(source).toContain("初始密码至少需要 8 位");
    expect(source).toContain("新密码至少需要 8 位");
    expect(source).toContain("请选择后台角色");
    expect(source).toContain("const validationMessage = validateAdminUserForm");
    expect(source).not.toContain("请求参数不完整");
  });

  it("lets operators show and hide password inputs when creating or resetting users", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/system-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("EyeOff");
    expect(source).toContain("passwordVisible");
    expect(source).toContain('title={passwordVisible ? "隐藏密码" : "显示密码"}');
    expect(source).toContain('type={passwordVisible ? "text" : "password"}');
    expect(source).toContain("setPasswordVisible(false)");
  });
});
