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
});
