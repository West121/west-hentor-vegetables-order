import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readUiFile(path: string) {
  return readFileSync(join(process.cwd(), "app/ui", path), "utf8");
}

const paginatedPanels = [
  "dish-management-panel.tsx",
  "kuaidi-printer-management-panel.tsx",
  "member-management-panel.tsx",
  "operation-logs-panel.tsx",
  "order-management-panel.tsx",
  "package-management-panel.tsx",
  "package-template-management-panel.tsx",
  "role-management-panel.tsx",
  "store-management-panel.tsx",
  "system-management-panel.tsx",
  "task-management-panel.tsx",
];

describe("admin pagination", () => {
  it("exposes a shadcn-style page size selector with standard options", () => {
    const source = readUiFile("admin-pagination.tsx");

    expect(source).toContain("AdminSelect");
    expect(source).toContain("PAGE_SIZE_OPTIONS = [10, 20, 50, 100]");
    expect(source).toContain("每页数量");
    expect(source).toContain("onPageSizeChange");
  });

  it.each(paginatedPanels)("%s wires page size changes back to list loading", (file) => {
    const source = readUiFile(file);
    const paginationCount = source.match(/<AdminPagination/g)?.length ?? 0;
    const pageSizeHandlerCount = source.match(/onPageSizeChange=/g)?.length ?? 0;

    expect(paginationCount, file).toBeGreaterThan(0);
    expect(pageSizeHandlerCount, file).toBe(paginationCount);
    expect(source, file).toContain("pageSize =");
  });
});
