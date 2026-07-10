import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("admin header user menu usage", () => {
  it("uses the designed dropdown user menu instead of a bare logout button", () => {
    const pageSource = readFileSync(
      join(process.cwd(), "app/dashboard-client.tsx"),
      "utf8",
    );

    expect(pageSource).toContain("AdminUserMenu");
    expect(pageSource).not.toContain("<LogoutButton />");
  });

  it("opens profile, role and layout panels from the user dropdown", () => {
    const menuSource = readFileSync(
      join(process.cwd(), "app/ui/admin-user-menu.tsx"),
      "utf8",
    );

    expect(menuSource).toContain(
      'type ActivePanel = "profile" | "password" | "roles" | "layout"',
    );
    expect(menuSource).toContain("openPanel(\"profile\")");
    expect(menuSource).toContain("openPanel(\"roles\")");
    expect(menuSource).toContain("openPanel(\"layout\")");
    expect(menuSource).toContain("账号资料");
    expect(menuSource).toContain("角色范围");
    expect(menuSource).toContain("布局设置");
    expect(menuSource).toContain("LayoutModePreview");
    expect(menuSource).toContain("layoutModeOptions");
    expect(menuSource).toContain("垂直菜单");
    expect(menuSource).toContain("双列菜单");
    expect(menuSource).toContain("水平菜单");
    expect(menuSource).toContain("内容全屏");
    expect(menuSource).toContain("内容");
    expect(menuSource).toContain("信息密度");
    expect(menuSource).toContain("侧边栏");
    expect(menuSource).toContain("writeAdminLayoutPreferences");
    expect(menuSource).toContain("notifyAdminShellPreferencesChanged");
  });
});
