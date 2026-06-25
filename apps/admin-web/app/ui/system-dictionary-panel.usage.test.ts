import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("system dictionary panel usage", () => {
  it("manages dictionaries and dictionary items with icon tooltips", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/system-dictionary-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("系统字典");
    expect(source).toContain("字典管理");
    expect(source).toContain("/api/admin/dictionaries/${encodeURIComponent(code)}");
    expect(source).toContain("/api/admin/dictionaries/${encodeURIComponent(activeDictionary.code)}");
    expect(source).toContain("新增字典");
    expect(source).toContain("新增字典项");
    expect(source).toContain("CUSTOM_DICT_");
    expect(source).toContain("删除字典项");
    expect(source).toContain("删除字典");
    expect(source).toContain("AdminConfirmDialog");
    expect(source).toContain("deleteCandidate");
    expect(source).not.toContain("再次点击");
    expect(source).not.toContain("pendingDeleteCode");
    expect(source).toContain("aria-label=");
    expect(source).toContain("title=");
  });
});
