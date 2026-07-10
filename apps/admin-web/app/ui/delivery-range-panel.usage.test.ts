import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("delivery range panel usage", () => {
  it("moves delivery range editing into a dedicated system management panel", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/delivery-range-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("DeliveryRangePanel");
    expect(source).toContain("DeliveryRangePicker");
    expect(source).toContain("配送范围");
    expect(source).toContain("编辑配送范围");
    expect(source).toContain("保存范围");
    expect(source).toContain("全省配送");
    expect(source).toContain("选中省份表示该省全部城市可配送");
    expect(source).toContain("deliveryScopeText");
    expect(source).toContain("/api/admin/system-settings");
    expect(source).toContain("buildSystemSettingsPayload");
    expect(source).toContain("AdminDraggableModal");
  });
});
