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
    expect(source).toContain('data-icon="inline-start"');
    expect(source).toContain("查看");
    expect(source).toContain("后台用户详情");
    expect(source).toContain('modal.mode !== "detail"');
    expect(source).toContain('readOnly={modal.mode === "detail"}');
    expect(source).toContain('disabled={modal.mode === "detail"}');
  });

  it("uses compact radio and searchable multi-select controls inside the admin user modal", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/system-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("AdminRadioGroup");
    expect(source).toContain("AdminSearchMultiSelect");
    expect(source).toContain('name="admin-user-status"');
    expect(source).toContain('searchPlaceholder="搜索角色名称或编码"');
    expect(source).not.toContain('type="checkbox"');
  });

  it("lets administrators assign data scope when creating or editing backend users", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/system-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("storeIds");
    expect(source).toContain("请选择至少一个数据范围");
    expect(source).toContain("数据范围");
    expect(source).toContain("formHasAllDataScope");
    expect(source).toContain("超级管理员默认可访问全部数据");
    expect(source).toContain('searchPlaceholder="搜索数据范围"');
    expect(source).toContain('placeholder="请选择数据范围"');
    expect(source).toContain("formatDataScope");
    expect(source).toContain("未分配");
  });

  it("uses demo-friendly data scope labels while keeping store ids as the submitted value", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/system-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain('const ADMIN_USER_STORE_SCOPE_LABEL = "系统数据"');
    expect(source).toContain("formatAssignableDataScopeLabel");
    expect(source).toContain("label: formatAssignableDataScopeLabel(store)");
    expect(source).toContain("helper: store.name");
    expect(source).toContain("value: store.id");
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
    expect(source).toContain("setFormErrors(validationErrors)");
    expect(source).toContain("getFirstFormError");
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

  it("lets super administrators delete non-super-admin backend users", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/system-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("deleteCandidate");
    expect(source).toContain("canDeleteAdminUser");
    expect(source).toContain("删除后台用户");
    expect(source).toContain("DELETE");
    expect(source).toContain("Trash2");
  });
});
