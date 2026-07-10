import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const adminUiFiles = [
  "delivery-range-panel.tsx",
  "dish-management-panel.tsx",
  "menu-management-panel.tsx",
  "member-management-panel.tsx",
  "operation-logs-panel.tsx",
  "order-management-panel.tsx",
  "package-template-management-panel.tsx",
  "shipment-stats-panel.tsx",
  "store-management-panel.tsx",
  "store-switcher.tsx",
  "system-management-panel.tsx",
  "task-management-panel.tsx",
];

describe("admin shadcn select usage", () => {
  it("does not render native select controls in admin UI panels", () => {
    for (const fileName of adminUiFiles) {
      const source = readFileSync(
        join(process.cwd(), "app/ui", fileName),
        "utf8",
      );

      expect(source, fileName).not.toContain("<select");
      expect(source, fileName).not.toContain("<option");
      expect(source, fileName).not.toContain("</select>");
    }
  });

  it("keeps empty-value options compatible with shadcn select", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/admin-select.tsx"),
      "utf8",
    );

    expect(source).toContain('from "@/components/ui/select"');
    expect(source).toContain("EMPTY_SELECT_VALUE");
    expect(source).toContain("toSelectValue");
    expect(source).toContain("fromSelectValue");
    expect(source).toContain("<SelectGroup");
    expect(source).toContain("<SelectItem");
  });
});
