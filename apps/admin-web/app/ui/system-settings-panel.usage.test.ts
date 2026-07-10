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
    expect(source).toContain("AdminRichTextEditor");
    expect(source).toContain("用户协议富文本");
    expect(source).toContain("隐私政策富文本");
    expect(source).toContain("协议富文本");
    expect(source).toContain("协议内容");
    expect(source).not.toContain("截单时间");
    expect(source).not.toContain("每日截单时间");
    expect(source).not.toContain("[\"每日截单\"");
    expect(source).not.toContain("DeliveryRangePicker");
    expect(source).not.toContain("全省配送");
    expect(source).not.toContain("选中省份表示该省全部城市可配送");
    expect(source).not.toContain("编辑配送范围");
    expect(source).toContain("登录页主标题");
    expect(source).toContain("登录页图片");
    expect(source).toContain("uploadLoginImage");
    expect(source).toContain("上传图片");
    expect(source).not.toContain("登录页图片链接");
    expect(source).not.toContain("用户协议备用链接");
    expect(source).not.toContain("隐私政策备用链接");
    expect(source).toContain("首页菜品列数");
    expect(source).toContain("首页菜品每行数量");
    expect(source).toContain("homeDishColumns");
    expect(source).toContain("每行 ${currentForm.homeDishColumns} 个");
    expect(source).not.toContain("deliveryScopeText");
    expect(source).toContain("AdminDraggableModal");
    expect(source).not.toContain("onClick={saveSettings}\n            type=\"button\"\n          >\n            <Save size={16} />");
  });
});
