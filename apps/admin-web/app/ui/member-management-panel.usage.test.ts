import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("member management modal usage", () => {
  it("separates read-only member detail from member editing", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/member-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("Eye");
    expect(source).toContain('type MemberModalMode = "detail" | "edit"');
    expect(source).toContain("openDetailModal");
    expect(source).toContain('title="查看详情"');
    expect(source).toContain("编辑会员");
    expect(source).toContain('modalMode === "detail"');
    expect(source).toContain('readOnly={modalMode === "detail"}');
    expect(source).toContain('{modalMode === "detail" ? "关闭" : "取消"}');
    expect(source).toContain('modalMode !== "detail"');
  });

  it("edits member default address with region fields and readable order summaries", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/member-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("defaultAddress");
    expect(source).toContain("province");
    expect(source).toContain("city");
    expect(source).toContain("district");
    expect(source).toContain("详细地址");
    expect(source).toContain("receiverName");
    expect(source).toContain("receiverPhone");
    expect(source).toContain("formatRecentOrder");
    expect(source).toContain("dishNameSnapshot");
    expect(source).not.toContain("弹窗工作模式");
    expect(source).not.toContain("标题栏可拖拽");
  });

  it("exposes member import through the member list panel", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/member-management-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("导入会员");
    expect(source).toContain("导入会员套餐");
    expect(source).toContain("FormData");
    expect(source).toContain("/api/admin/members/import");
    expect(source).toContain("/api/admin/user-packages/import");
    expect(source).toContain("IMPORT_FILE_ACCEPT");
    expect(source).toContain("支持 .xlsx、.xls、.csv");
    expect(source).not.toContain("parseMemberImportText");
    expect(source).not.toContain("选择 CSV/TXT");
  });
});
