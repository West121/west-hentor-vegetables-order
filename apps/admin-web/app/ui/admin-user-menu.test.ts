import { describe, expect, it } from "vitest";

import { buildAdminUserMenuItems } from "./admin-user-menu-model";

describe("admin user menu model", () => {
  it("exposes profile, role switch, operation log and logout actions", () => {
    expect(buildAdminUserMenuItems({ canOpenOperationLogs: true })).toEqual([
      expect.objectContaining({ key: "profile", label: "个人资料" }),
      expect.objectContaining({ key: "role-switch", label: "切换角色" }),
      expect.objectContaining({ key: "operation-logs", label: "操作日志" }),
      expect.objectContaining({ key: "logout", label: "退出登录" }),
    ]);
  });

  it("disables operation logs when the current operator lacks permission", () => {
    const operationLogs = buildAdminUserMenuItems({
      canOpenOperationLogs: false,
    }).find((item) => item.key === "operation-logs");

    expect(operationLogs).toMatchObject({
      disabled: true,
      helper: "需系统管理权限",
    });
  });

  it("keeps profile and role switch as interactive entries", () => {
    const items = buildAdminUserMenuItems({ canOpenOperationLogs: true });

    expect(items.find((item) => item.key === "profile")).toMatchObject({
      disabled: false,
      helper: "查看当前账号资料",
    });
    expect(items.find((item) => item.key === "role-switch")).toMatchObject({
      disabled: false,
      helper: "查看当前角色范围",
    });
  });
});
