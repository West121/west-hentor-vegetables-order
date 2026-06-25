import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("role management usage", () => {
  it("exposes a guarded delete action for roles", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/role-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("deleteRole");
    expect(source).toContain('method: "DELETE"');
    expect(source).toContain("删除角色");
    expect(source).toContain("AdminConfirmDialog");
    expect(source).toContain("openDeleteConfirm");
    expect(source).toContain("该角色已分配给后台用户，不能删除");
    expect(source).not.toContain("再次点击");
  });
});
