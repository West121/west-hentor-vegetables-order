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
    expect(source).not.toContain("截单时间");
    expect(source).not.toContain("每日截单时间");
    expect(source).not.toContain("[\"每日截单\"");
    expect(source).toContain("DeliveryRangePicker");
    expect(source).toContain("全省配送");
    expect(source).toContain("选中省份表示该省全部城市可配送");
    expect(source).toContain("登录页主标题");
    expect(source).toContain("登录页图片链接");
    expect(source).toContain("首页菜品列数");
    expect(source).toContain("首页菜品每行数量");
    expect(source).toContain("homeDishColumns");
    expect(source).toContain("每行 ${currentForm.homeDishColumns} 个");
    expect(source).toContain("deliveryScopeText");
    expect(source).toContain('title={fullscreen ? "退出全屏" : "全屏"}');
    expect(source).not.toContain("onClick={saveSettings}\n            type=\"button\"\n          >\n            <Save size={16} />");
  });
});
