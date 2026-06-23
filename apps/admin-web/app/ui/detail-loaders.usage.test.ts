import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const panelFiles = [
  "member-management-panel.tsx",
  "package-management-panel.tsx",
  "dish-management-panel.tsx",
  "task-management-panel.tsx",
  "package-template-management-panel.tsx",
  "store-management-panel.tsx",
  "system-management-panel.tsx",
  "order-management-panel.tsx",
];

describe("admin management detail loading", () => {
  it("hydrates edit/detail modals from detail APIs instead of relying only on table rows", () => {
    for (const file of panelFiles) {
      const source = readFileSync(join(process.cwd(), "app/ui", file), "utf8");

      expect(source, file).toContain("loadDetailResource");
      expect(source, file).toMatch(/hydrate[A-Z][A-Za-z]+Detail/);
    }
  });
});
