import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readUiSource(fileName: string) {
  return readFileSync(join(process.cwd(), "app/ui", fileName), "utf8");
}

describe("admin error feedback", () => {
  it("provides a shared blocking error dialog for failed actions", () => {
    const source = readUiSource("admin-confirm-dialog.tsx");

    expect(source).toContain("export function AdminAlertDialog");
    expect(source).toContain('role="alertdialog"');
    expect(source).toContain("操作失败");
    expect(source).toContain("我知道了");
  });

  it("uses popup errors in editable admin modals instead of inline red banners", () => {
    const modalPanels = [
      "dish-management-panel.tsx",
      "member-management-panel.tsx",
      "order-management-panel.tsx",
      "package-management-panel.tsx",
      "package-template-management-panel.tsx",
      "role-management-panel.tsx",
      "store-management-panel.tsx",
      "system-management-panel.tsx",
      "task-management-panel.tsx",
    ];

    for (const fileName of modalPanels) {
      const source = readUiSource(fileName);

      expect(source).toContain("AdminAlertDialog");
      expect(source).toContain("onClose={() => setError(null)}");
      expect(source).not.toContain("{error ? (\n                <div");
      expect(source).not.toContain("{error ? (\n              <div");
    }
  });
});
