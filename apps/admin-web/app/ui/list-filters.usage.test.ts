import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readUiFile(path: string) {
  return readFileSync(join(process.cwd(), "app/ui", path), "utf8");
}

describe("admin list filters", () => {
  it.each([
    ["member-management-panel.tsx", "reloadMembers", "status"],
    ["dish-management-panel.tsx", "reloadDishes", "category"],
    ["package-management-panel.tsx", "reloadPackages", "status"],
    ["package-template-management-panel.tsx", "reloadTemplates", "status"],
    ["task-management-panel.tsx", "refreshTasks", "status"],
    ["system-management-panel.tsx", "reloadAdminUsers", "storeId"],
    ["role-management-panel.tsx", "reloadRoles", "query"],
    ["store-management-panel.tsx", "reloadStores", "type"],
    ["store-management-panel.tsx", "reloadFranchisees", "status"],
  ])("%s wires filter params through %s", (file, reloadName, extraParam) => {
    const source = readUiFile(file);
    const start = source.indexOf(`async function ${reloadName}`);
    const end = source.indexOf("setLoading", start);
    const reloadSource = source.slice(start, end);

    expect(reloadSource).toContain('params.set("query"');
    expect(reloadSource).toContain(`params.set("${extraParam}"`);
    expect(source).toContain("查询");
    expect(source).toContain("重置");
  });

  it("keeps menu management searchable even though it is a local tree list", () => {
    const source = readUiFile("menu-management-panel.tsx");

    expect(source).toContain("levelFilter");
    expect(source).toContain("setQuery");
    expect(source).toContain("没有匹配的菜单");
  });

  it("keeps order list filters searchable, date-bound and resettable", () => {
    const source = readUiFile("order-management-panel.tsx");

    expect(source).toContain('params.set("query"');
    expect(source).toContain('params.set("dateFrom"');
    expect(source).toContain('params.set("dateTo"');
    expect(source).toContain('params.set("status"');
    expect(source).toContain("resetOrderFilters");
    expect(source).toContain("重置");
  });

  it("keeps shipment statistics filters resettable", () => {
    const source = readUiFile("shipment-stats-panel.tsx");

    expect(source).toContain('params.set("status"');
    expect(source).toContain('params.set("dishCategory"');
    expect(source).toContain('params.set("addressKeyword"');
    expect(source).toContain('params.set("dateFrom"');
    expect(source).toContain('params.set("dateTo"');
    expect(source).toContain("resetFilters");
    expect(source).toContain("重置");
    expect(source).toContain("按菜品汇总");
    expect(source).not.toContain("地址汇总");
  });

  it("adds detailed operation log filters for audit lookup", () => {
    const source = readUiFile("operation-logs-panel.tsx");

    expect(source).toContain('params.set("action"');
    expect(source).toContain('params.set("resource"');
    expect(source).toContain('params.set("statusCode"');
    expect(source).toContain('params.set("dateFrom"');
    expect(source).toContain('params.set("dateTo"');
    expect(source).toContain("AdminDatePicker");
  });
});
