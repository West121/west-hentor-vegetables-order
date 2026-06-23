import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("admin menu search", () => {
  it("uses the global navigation tree as a hierarchical command search", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/admin-menu-search.tsx"),
      "utf8",
    );

    expect(source).toContain("groups: AdminNavGroup[]");
    expect(source).toContain("搜索菜单 / 功能");
    expect(source).toContain("group.items.filter");
    expect(source).toContain("group.label");
    expect(source).toContain("item.label");
    expect(source).toContain("没有匹配的菜单");
    expect(source).toContain("metaKey || event.ctrlKey");
    expect(source).toContain('params.set("section", section)');
  });

  it("replaces the order-specific top search placeholder", () => {
    const source = readFileSync(
      join(process.cwd(), "app/dashboard-client.tsx"),
      "utf8",
    );

    expect(source).toContain("<AdminMenuSearch groups={navGroups} />");
    expect(source).not.toContain("搜索订单号 / 手机号 / 菜品");
  });
});
