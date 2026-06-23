import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("store management detail modal usage", () => {
  it("keeps reserved store and franchisee panels hidden from the admin page", () => {
    const pageSource = readFileSync(
      join(process.cwd(), "app/dashboard-client.tsx"),
      "utf8",
    );
    const panelSource = readFileSync(
      join(process.cwd(), "app/ui/store-management-panel.tsx"),
      "utf8",
    );

    expect(pageSource).not.toContain("StoreManagementPanel");
    expect(pageSource).not.toContain('activeSection === "stores"');
    expect(pageSource).not.toContain('activeSection === "franchisees"');
    expect(panelSource).toContain('mode === "stores"');
    expect(panelSource).toContain('mode === "franchisees"');
  });

  it("opens store and franchisee detail in shared draggable modals without entering edit mode", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/store-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("Eye");
    expect(source).toContain('mode: "detail-store"');
    expect(source).toContain('mode: "detail-franchisee"');
    expect(source).toContain("openDetailStore");
    expect(source).toContain("openDetailFranchisee");
    expect(source).toContain('title="查看详情"');
    expect(source).toContain('modal.mode !== "detail-store"');
    expect(source).toContain('modal.mode !== "detail-franchisee"');
    expect(source).toContain('readOnly={isDetailModal}');
    expect(source).toContain('disabled={isDetailModal');
  });
});
