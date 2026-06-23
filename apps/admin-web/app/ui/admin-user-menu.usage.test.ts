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

  it("opens profile and role panels from the user dropdown", () => {
    const menuSource = readFileSync(
      join(process.cwd(), "app/ui/admin-user-menu.tsx"),
      "utf8",
    );

    expect(menuSource).toContain("type ActivePanel = \"profile\" | \"roles\"");
    expect(menuSource).toContain("openPanel(\"profile\")");
    expect(menuSource).toContain("openPanel(\"roles\")");
    expect(menuSource).toContain("账号资料");
    expect(menuSource).toContain("角色范围");
  });
});
