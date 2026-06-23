import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("system settings modal usage", () => {
  it("edits system settings in the shared draggable modal instead of inline form actions", () => {
    const source = readFileSync(
      join(process.cwd(), "app/ui/system-settings-panel.tsx"),
      "utf8",
    );

    expect(source).toContain("openEditModal");
    expect(source).toContain("编辑设置");
    expect(source).toContain("modalOpen");
    expect(source).toContain("canCloseAdminModal");
    expect(source).toContain("hasAdminFormChanges");
    expect(source).toContain("编辑系统设置");
    expect(source).toContain("设置保存后会影响小程序登录、协议、客服和截单规则");
    expect(source).toContain("配送省份");
    expect(source).toContain("配送城市");
    expect(source).toContain("配送范围限制");
    expect(source).toContain("登录页主标题");
    expect(source).toContain("登录页图片链接");
    expect(source).toContain("为空表示不限城市");
    expect(source).toContain('title={fullscreen ? "退出全屏" : "全屏"}');
    expect(source).not.toContain("onClick={saveSettings}\n            type=\"button\"\n          >\n            <Save size={16} />");
  });
});
